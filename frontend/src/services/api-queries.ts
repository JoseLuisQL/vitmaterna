import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from './api';
import { isOnline } from './network';
import { enqueue } from './outbox';

/** Fecha de hoy en formato YYYY-MM-DD (para dedupe de cola offline). */
const todayISO = () => new Date().toISOString().split('T')[0];

// Helper to safely extract date + time
const combineDateTime = (fecha: string, hora: string) => {
  if (!fecha) return new Date().toISOString();
  try {
    const d = new Date(fecha);
    if (hora) {
      const t = new Date(hora);
      d.setHours(t.getUTCHours(), t.getUTCMinutes(), 0, 0);
    }
    return d.toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
};

const mapAppointment = (appt: any) => ({
  id: appt.id || appt._id,
  date: combineDateTime(appt.fecha, appt.hora),
  patientName: appt.gestante?.user ? `${appt.gestante.user.firstName} ${appt.gestante.user.lastName}` : 'Paciente',
  type: appt.motivo || 'Control Prenatal',
  status: appt.estado || 'programada',
  location: appt.observaciones || 'Consultorio 102',
  gestanteId: appt.gestanteId,
  riskLevel: appt.gestante?.nivelRiesgo === 'rojo' ? 'Alto' : appt.gestante?.nivelRiesgo === 'amarillo' ? 'Medio' : 'Bajo',
  // Datos de la solicitud de reprogramación (para que el obstetra apruebe/rechace).
  fechaReprogramada: appt.fechaReprogramada || null,
  horaReprogramada: appt.horaReprogramada || null,
  motivoReprogramacion: appt.motivoReprogramacion || null,
  modalidad: appt.modalidad || 'establecimiento',
});

const mapPatient = (gestante: any) => {
  const age = gestante.user?.fechaNacimiento 
    ? new Date().getFullYear() - new Date(gestante.user.fechaNacimiento).getFullYear()
    : gestante.ageAtRegistration || 28;
    
  return {
    id: gestante.id || gestante._id,
    firstName: gestante.user?.firstName || '',
    lastName: gestante.user?.lastName || '',
    documentNumber: gestante.dni || gestante.user?.dni || '',
    age,
    riskLevel: gestante.nivelRiesgo === 'rojo' ? 'Alto' : gestante.nivelRiesgo === 'amarillo' ? 'Medio' : 'Bajo',
    // Predicción de inasistencia calculada por el servidor (utils/noShowPrediction).
    noShowRisk: gestante.riesgoInasistencia
      ? {
          level: gestante.riesgoInasistencia.level as 'bajo' | 'medio' | 'alto',
          score: gestante.riesgoInasistencia.score as number,
          motivos: (gestante.riesgoInasistencia.motivos || []) as string[],
        }
      : null,
  };
};

const mapPatientProfile = (g: any) => {
  if (!g) return null;
  // La fecha de nacimiento vive en el perfil de la gestante (no en user). Si no
  // hay, se usa la edad registrada. Se evita el "28" fijo que confundía.
  const fechaNac = g.fechaNacimiento || g.user?.fechaNacimiento;
  const age = fechaNac
    ? new Date().getFullYear() - new Date(fechaNac).getFullYear()
    : (g.ageAtRegistration ?? null);

  // Edad gestacional / trimestre: se calcula desde la FPP (por FUM o por eco).
  let currentWeek: string | null = null;
  let currentTrimester: number | null = null;
  const fppRef = g.fppFum || g.fppEco;
  if (fppRef) {
    const today = new Date();
    const fpp = new Date(fppRef);
    const diffTime = fpp.getTime() - today.getTime();
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    const calculated = 40 - diffWeeks;
    if (calculated > 0 && calculated <= 42) {
      currentWeek = calculated.toString();
      currentTrimester = calculated <= 13 ? 1 : calculated <= 27 ? 2 : 3;
    }
  }

  // Calcular IMC si hay datos
  let imc: string | null = null;
  if (g.pesoHabitual && g.talla) {
    const tallaMt = g.talla > 3 ? g.talla / 100 : g.talla;
    imc = (g.pesoHabitual / (tallaMt * tallaMt)).toFixed(1);
  }

  return {
    id: g.id || g._id,
    firstName: g.user?.firstName || '',
    lastName: g.user?.lastName || '',
    documentNumber: g.dni || g.user?.dni || '',
    phone: g.user?.phone || '',
    age,
    riskLevel: g.nivelRiesgo === 'rojo' ? 'Alto' : g.nivelRiesgo === 'amarillo' ? 'Medio' : 'Bajo',
    currentWeek,
    currentTrimester,
    estimatedDueDate: g.fppFum || g.fppEco || null,
    bloodType: ((g.grupoSanguineo || '') + (g.factorRh || '')) || null,
    imc,
    fum: g.fum ? new Date(g.fum).toLocaleDateString('es-PE') : null,
    // Valores crudos (ISO) para edición por el obstetra.
    fumRaw: g.fum ? new Date(g.fum).toISOString().split('T')[0] : null,
    fppEcoRaw: g.fppEco ? new Date(g.fppEco).toISOString().split('T')[0] : null,
    grupoSanguineo: g.grupoSanguineo || null,
    factorRh: g.factorRh || null,
    pesoHabitual: g.pesoHabitual || null,
    talla: g.talla || null,
    // Datos personales
    historiaClinica: g.historiaClinica || null,
    fechaNacimiento: fechaNac ? new Date(fechaNac).toLocaleDateString('es-PE') : null,
    address: g.direccion || g.user?.address || null,
    localidad: g.localidad || null,
    domicilioLat: g.domicilioLat != null ? Number(g.domicilioLat) : null,
    domicilioLng: g.domicilioLng != null ? Number(g.domicilioLng) : null,
    referenciaDom: g.referenciaDom || null,
    maritalStatus: g.estadoCivil || null,
    occupation: g.ocupacion || null,
    education: g.nivelEstudios || null,
    sisCode: g.codigoSis || null,
    phoneAcompanante: g.acompanantePhone || null,
    // Antecedentes obstétricos (el backend usa partosVaginales).
    gestaciones: g.gestaciones ?? null,
    partos: g.partosVaginales ?? g.partos ?? null,
    cesareas: g.cesareas ?? null,
    abortos: g.abortos ?? null,
    // Antecedentes como texto
    background: (g.antecedentes || []).map((a: any) => `${a.tipo}: ${a.condicion} ${a.detalle ? `(${a.detalle})` : ''}`),
    // Antecedentes estructurados (para gestionar/eliminar desde la ficha)
    antecedentes: (g.antecedentes || []).map((a: any) => ({
      id: a.id,
      tipo: a.tipo,
      condicion: a.condicion,
      detalle: a.detalle || null,
    })),
    // Citas (para banner de estado: próxima cita programada/confirmada).
    appointments: (g.appointments || []).map((a: any) => ({
      id: a.id,
      fecha: a.fecha,
      estado: a.estado,
      motivo: a.motivo,
      numeroControl: a.numeroControl ?? null,
    })),
    // Controles prenatales
    controls: (g.prenatalControls || []).map((c: any) => ({
      id: c.id,
      date: c.fecha,
      // egSemanas/peso/etc. pueden venir como string (Decimal de Prisma): se
      // convierten a número para las gráficas (chart-kit exige números).
      week: c.egSemanas != null ? Number(c.egSemanas) : null,
      bloodPressure: `${c.presionSistolica || 120}/${c.presionDiastolica || 80}`,
      weight: c.peso != null ? Number(c.peso) : null,
      fetalHeartRate: c.fcf != null ? Number(c.fcf) : null,
      alturaUterina: c.alturaUterina != null ? Number(c.alturaUterina) : null,
      temperatura: c.temperatura != null ? Number(c.temperatura) : null,
      observaciones: c.observaciones || null,
    })),
    // Laboratorio (desde LabResults)
    laboratorio: (() => {
      const labs = g.labResults || [];
      const findLab = (tipo: string, toma?: number) => 
        labs.find((l: any) => l.tipoExamen && l.tipoExamen.toLowerCase() === tipo.toLowerCase() && (!toma || l.numeroToma === toma));
      const hb1 = findLab('hemoglobina', 1);
      const hb2 = findLab('hemoglobina', 2);
      const hb3 = findLab('hemoglobina', 3);
      return {
        hemoglobina1: hb1?.valorNumerico || null,
        hemoglobina2: hb2?.valorNumerico || null,
        hemoglobina3: hb3?.valorNumerico || null,
        glucemia: findLab('glucemia')?.valor || null,
        vdrl: findLab('vdrl')?.resultado || null,
        vih: findLab('vih')?.resultado || null,
        hepatitisB: findLab('hepatitis_b')?.resultado || null,
        examenOrina: findLab('orina')?.resultado || null,
        pap: findLab('pap')?.resultado || null,
        grupoSanguineo: g.grupoSanguineo || null,
        factorRh: g.factorRh || null,
      };
    })(),
    // Vacunas
    vacunas: (g.vaccinationRecords || []).map((v: any) => ({
      nombre: v.vacuna,
      semana: v.egSemanasAplicacion,
      aplicada: v.estado === 'aplicada',
    })),
    // Suplementos / tratamientos
    suplementos: (g.treatments || []).map((t: any) => ({
      id: t.id,
      nombre: t.nombre,
      dosis: t.dosis,
      frecuencia: t.frecuencia,
      estado: t.estado || 'activo',
      indicaciones: t.indicaciones || null,
      diasTomados: (t.supplementLogs || [])
        .filter((l: any) => l.tomado)
        .map((l: any) => l.fecha?.split('T')[0] || ''),
      diasOmitidos: (t.supplementLogs || [])
        .filter((l: any) => !l.tomado)
        .map((l: any) => l.fecha?.split('T')[0] || ''),
      totalDias: t.duracionDias || 30,
    })),
    // Resumen clínico autogenerado por el servidor (utils/clinicalSummary).
    resumenClinico: g.resumenClinico
      ? {
          texto: g.resumenClinico.texto as string,
          alertas: (g.resumenClinico.alertas || []) as string[],
          destacados: g.resumenClinico.destacados || null,
        }
      : null,
  };
};


// Gestante Endpoints

export const fetchGestanteDashboard = async () => {
  try {
    const [appointmentsRes, treatmentsRes, meRes] = await Promise.all([
      api.get('/appointments', { params: { limit: 1, sort: 'asc', future: true } }),
      api.get('/clinical/treatments', { params: { today: true } }),
      api.get('/auth/me'),
    ]);
    return {
      nextAppointment: appointmentsRes.data?.data?.[0] ? mapAppointment(appointmentsRes.data.data[0]) : null,
      todayTreatments: treatmentsRes.data?.data || [],
      profile: meRes.data?.data?.profile || null,
    };
  } catch (e) {
    console.warn('Gestante Dashboard fetch failed:', e);
    return { nextAppointment: null, todayTreatments: [], profile: null };
  }
};

export const fetchAppointments = async () => {
  try {
    const res = await api.get('/appointments');
    return (res.data?.data || []).map(mapAppointment);
  } catch (e) {
    console.warn('Appointments fetch failed:', e);
    return [];
  }
};

export interface AdherenceAchievement {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  desbloqueado: boolean;
}

export interface AdherenceGamification {
  rachaActual: number;
  mejorRacha: number;
  totalDiasTomados: number;
  logros: AdherenceAchievement[];
  mensaje: string;
}

export interface TreatmentsResponse {
  treatments: any[];
  gamificacion: AdherenceGamification | null;
}

export const fetchTreatments = async (): Promise<TreatmentsResponse> => {
  try {
    const res = await api.get('/clinical/treatments');
    return {
      treatments: res.data?.data || [],
      gamificacion: res.data?.gamificacion ?? null,
    };
  } catch (e) {
    if (__DEV__) console.warn('Treatments fetch failed:', e);
    return { treatments: [], gamificacion: null };
  }
};

export const logTreatment = async (treatmentId: string) => {
  const endpoint = `/clinical/treatments/${treatmentId}/log`;
  const payload = { tomado: true, dedupeKey: `supplement:${treatmentId}:${todayISO()}` };

  // Offline: encolar para reenviar al reconectar (idempotente por día).
  if (!isOnline()) {
    enqueue({
      type: 'supplement_log',
      endpoint,
      method: 'POST',
      payload,
      dedupeKey: payload.dedupeKey,
      invalidate: [['treatments'], ['gestanteDashboard'], ['adherence']],
    });
    return { data: { queued: true } };
  }

  // Online: enviar directo.
  const res = await api.post(endpoint, payload);
  return res.data;
};

/**
 * Reporta un signo de alarma. Offline-first: si no hay red, encola el envío
 * (idempotente por tipo+descr+minuto) para reenviar al reconectar.
 * Devuelve { queued: true } cuando quedó en cola.
 */
export const reportDangerSign = async (body: {
  tipo_signo: string;
  descripcion?: string;
  severidad?: string;
}): Promise<{ queued?: boolean } | any> => {
  const endpoint = '/clinical/danger-signs';
  const dedupeKey = `danger:${body.tipo_signo}:${body.descripcion || ''}:${new Date()
    .toISOString()
    .slice(0, 16)}`;
  const payload = { ...body, dedupeKey };

  if (!isOnline()) {
    enqueue({
      type: 'danger_sign',
      endpoint,
      method: 'POST',
      payload,
      dedupeKey,
      invalidate: [['notifications']],
    });
    return { queued: true };
  }

  const res = await api.post(endpoint, payload);
  return res.data;
};

/** Aplica de forma optimista el consumo de hoy a un tratamiento. */
const applyTakenToday = (t: any) => {
  const today = todayISO();
  const diasTomados: string[] = Array.isArray(t.diasTomados) ? t.diasTomados : [];
  if (diasTomados.includes(today)) return t;
  const nuevosDias = [today, ...diasTomados];
  const totalDias = t.totalDias || t.duracionDias || 30;
  return {
    ...t,
    diasTomados: nuevosDias,
    totalDias,
    adherencia: totalDias > 0 ? Math.round((nuevosDias.length / totalDias) * 100) : 0,
    taken: true,
  };
};

// Obstetra Endpoints

export const fetchObstetraDashboard = async () => {
  try {
    const [patientsRes, appointmentsRes, alertsRes] = await Promise.all([
      api.get('/patients', { params: { limit: 1000 } }).catch(e => {
        console.error('Failed to fetch patients for dashboard', e);
        return { data: { data: [] } };
      }),
      api.get('/appointments', { params: { today: true } }).catch(e => {
        console.error('Failed to fetch appointments for dashboard', e);
        return { data: { data: [] } };
      }),
      api.get('/clinical/danger-signs', { params: { estado: 'pendiente' } }).catch(e => {
        console.error('Failed to fetch alerts for dashboard', e);
        return { data: { data: [] } };
      }),
    ]);
    
    const patients = patientsRes.data?.data || [];
    const appointments = appointmentsRes.data?.data || [];
    const alertsList = alertsRes.data?.data || [];
    
    const riskDistribution = {
      low: patients.filter((p: any) => p.nivelRiesgo === 'verde').length,
      medium: patients.filter((p: any) => p.nivelRiesgo === 'amarillo').length,
      high: patients.filter((p: any) => p.nivelRiesgo === 'rojo').length,
    };

    return { 
      totalPatients: patients.length, 
      appointmentsToday: appointments.length, 
      alerts: alertsList.length,
      completed: appointments.filter((a: any) => a.estado === 'completada').length,
      riskDistribution,
    };
  } catch (e) {
    console.error('Dashboard fetch failed completely:', e);
    return { totalPatients: 0, appointmentsToday: 0, alerts: 0, completed: 0, riskDistribution: { low: 0, medium: 0, high: 0 } };
  }
};

export const fetchPatients = async (search?: string) => {
  try {
    const res = await api.get('/patients', { params: { search } });
    return (res.data?.data || []).map(mapPatient);
  } catch (e) {
    console.warn('Patients fetch failed:', e);
    return [];
  }
};

export const fetchPatientProfile = async (id: string) => {
  try {
    const res = await api.get(`/patients/${id}`);
    return mapPatientProfile(res.data?.data);
  } catch (e) {
    console.warn('Patient Profile fetch failed:', e);
    return null;
  }
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/patients', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patientsInfinite'] });
      queryClient.invalidateQueries({ queryKey: ['obstetraDashboard'] });
    },
  });
};

/**
 * Verifica la disponibilidad de un DNI antes de registrar (validación en vivo).
 * Devuelve `true` si el DNI YA está en uso (existe una gestante), `false` si
 * está libre. El endpoint responde 200 cuando existe y 404 cuando no.
 */
export const checkDniExists = async (dni: string): Promise<boolean> => {
  try {
    await api.get('/patients/buscar', { params: { dni } });
    return true; // 200 → ya existe
  } catch (e: any) {
    if (e?.response?.status === 404) return false; // libre
    throw e; // otros errores (red, auth) se propagan
  }
};

export const createControl = async (data: any) => {
  const res = await api.post('/clinical/controls', data);
  return res.data;
};

export const createAppointment = async (data: any) => {
  const res = await api.post('/appointments', data);
  return res.data;
};

export const fetchTodayAppointments = async () => {
  try {
    const res = await api.get('/appointments', { params: { today: true } });
    return (res.data?.data || []).map(mapAppointment);
  } catch (e) {
    console.warn('Today Appointments fetch failed:', e);
    return [];
  }
};

export const useGestanteDashboard = () => useQuery({ queryKey: ['gestanteDashboard'], queryFn: fetchGestanteDashboard });
export const useAppointments = () => useQuery({ queryKey: ['appointments'], queryFn: fetchAppointments });

/**
 * Citas en crudo (sin mapear) para la pantalla de la gestante. Comparte la
 * query key ['appointments'] para que el tiempo real y las invalidaciones
 * apliquen también aquí; usa `select` para devolver el array crudo del backend.
 */
export const fetchAppointmentsRaw = async () => {
  try {
    const res = await api.get('/appointments');
    return res.data?.data || [];
  } catch (e) {
    if (__DEV__) console.warn('Appointments (raw) fetch failed:', e);
    return [];
  }
};
export const useGestanteAppointments = () =>
  useQuery({ queryKey: ['appointments', 'raw'], queryFn: fetchAppointmentsRaw });

/**
 * Citas filtradas en el servidor (scope/estado/búsqueda/rango). Devuelve los
 * datos crudos del backend, ya ordenados por prioridad. Comparte el namespace
 * ['appointments'] para que el tiempo real las invalide.
 */
export interface AppointmentFilters {
  scope?: 'hoy' | 'proximas' | 'historial' | 'todas';
  estado?: string;
  modalidad?: 'establecimiento' | 'domiciliaria';
  search?: string;
  desde?: string;
  hasta?: string;
}
export const fetchAppointmentsFiltered = async (filters: AppointmentFilters) => {
  try {
    const params: Record<string, string> = {};
    if (filters.scope) params.scope = filters.scope;
    if (filters.estado) params.estado = filters.estado;
    if (filters.modalidad) params.modalidad = filters.modalidad;
    if (filters.search && filters.search.trim()) params.search = filters.search.trim();
    if (filters.desde) params.desde = filters.desde;
    if (filters.hasta) params.hasta = filters.hasta;
    const res = await api.get('/appointments', { params });
    return res.data?.data || [];
  } catch (e) {
    if (__DEV__) console.warn('Appointments (filtered) fetch failed:', e);
    return [];
  }
};
export const useAppointmentsFiltered = (filters: AppointmentFilters) =>
  useQuery({
    queryKey: ['appointments', 'filtered', filters],
    queryFn: () => fetchAppointmentsFiltered(filters),
  });

/**
 * Tratamientos de la gestante. La query cachea `{ treatments, gamificacion }`;
 * este hook expone solo el array para mantener la compatibilidad con la pantalla.
 */
export const useTreatments = () =>
  useQuery({
    queryKey: ['treatments'],
    queryFn: fetchTreatments,
    select: (d: TreatmentsResponse) => d.treatments,
  });

/** Racha y logros de adherencia (gamificación) — comparte la query de tratamientos. */
export const useAdherenceGamification = () =>
  useQuery({
    queryKey: ['treatments'],
    queryFn: fetchTreatments,
    select: (d: TreatmentsResponse) => d.gamificacion,
  });

export const useLogTreatment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logTreatment,
    // Actualización optimista: refleja el consumo de hoy al instante en
    // la lista de tratamientos (adherencia, calendario y progreso) y en el
    // dashboard, sin esperar al servidor.
    onMutate: async (treatmentId: string) => {
      await queryClient.cancelQueries({ queryKey: ['treatments'] });
      const prevTreatments = queryClient.getQueryData<TreatmentsResponse>(['treatments']);
      const prevDashboard = queryClient.getQueryData<any>(['gestanteDashboard']);

      // La caché ahora guarda { treatments, gamificacion }: se actualiza el array
      // interno de tratamientos manteniendo la forma del objeto.
      queryClient.setQueryData<TreatmentsResponse>(['treatments'], (old) => {
        if (!old || !Array.isArray(old.treatments)) return old;
        return {
          ...old,
          treatments: old.treatments.map((t) =>
            (t.id || t._id) === treatmentId ? applyTakenToday(t) : t,
          ),
        };
      });

      queryClient.setQueryData<any>(['gestanteDashboard'], (old: any) => {
        if (!old?.todayTreatments) return old;
        return {
          ...old,
          todayTreatments: old.todayTreatments.map((t: any) =>
            (t.id || t._id) === treatmentId ? applyTakenToday(t) : t,
          ),
        };
      });

      return { prevTreatments, prevDashboard };
    },
    onError: (_err, _id, context) => {
      // Revertir si falla
      if (context?.prevTreatments) queryClient.setQueryData(['treatments'], context.prevTreatments);
      if (context?.prevDashboard) queryClient.setQueryData(['gestanteDashboard'], context.prevDashboard);
    },
    onSettled: () => {
      // Reconciliar con el servidor (adherencia real recalculada)
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      queryClient.invalidateQueries({ queryKey: ['gestanteDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['adherence'] });
    },
  });
};

export const useObstetraDashboard = () => useQuery({ queryKey: ['obstetraDashboard'], queryFn: fetchObstetraDashboard });

// ── Indicadores de la tesis (Objetivo 1 y 2, con filtro de periodo) ──

export interface ThesisIndicators {
  periodo: { desde: string | null; hasta: string | null };
  objetivo1_seguimiento: {
    gestantesActivas: number;
    promedioControles: number;
    pctCon6Controles: number;
    pctCon8Controles: number;
    pctCaptacionTemprana: number;
    citasTotales: number;
    citasAsistidas: number;
    citasNoAsistidas: number;
    citasReprogramadas: number;
    tasaAsistencia: number;
    tasaInasistencia: number;
  };
  objetivo2_adherencia: {
    tratamientosEvaluados: number;
    adherenciaPromedio: number;
    pctBuenaAdherencia: number;
    pctTratamientosCompletados: number;
    vacunasTotal: number;
    vacunasAplicadas: number;
    pctVacunasAplicadas: number;
  };
}

export const fetchThesisIndicators = async (
  startDate?: string,
  endDate?: string,
): Promise<ThesisIndicators> => {
  const res = await api.get('/reports/indicadores', {
    params: { startDate: startDate || undefined, endDate: endDate || undefined },
  });
  return res.data?.data;
};

/** Indicadores de la tesis; pasa startDate/endDate para comparar línea base vs intervención. */
export const useThesisIndicators = (startDate?: string, endDate?: string) =>
  useQuery({
    queryKey: ['thesisIndicators', startDate || '', endDate || ''],
    queryFn: () => fetchThesisIndicators(startDate, endDate),
  });
export const usePatients = (search?: string) => useQuery({ queryKey: ['patients', search], queryFn: () => fetchPatients(search) });

/** Nivel de riesgo en el formato que entiende el backend (semáforo). */
export type NivelRiesgoFiltro = 'verde' | 'amarillo' | 'rojo';

/** Página de pacientes con metadatos de paginación. */
const PATIENTS_PAGE_SIZE = 15;
export const fetchPatientsPage = async (
  search: string,
  page: number,
  nivelRiesgo?: NivelRiesgoFiltro,
) => {
  const res = await api.get('/patients', {
    params: {
      search: search || undefined,
      nivelRiesgo: nivelRiesgo || undefined,
      page,
      limit: PATIENTS_PAGE_SIZE,
    },
  });
  const items = (res.data?.data || []).map(mapPatient);
  const meta = res.data?.meta || { page, totalPages: 1, total: items.length };
  return {
    items,
    page: meta.page ?? page,
    totalPages: meta.totalPages ?? 1,
    total: meta.total ?? items.length,
  };
};

/**
 * Lista de pacientes con scroll infinito (carga por páginas). El backend ya
 * ordena por fecha de registro descendente (la última registrada primero).
 * El filtro de riesgo se aplica EN EL BACKEND para que el conteo y los
 * resultados sean reales (no solo sobre las páginas ya cargadas).
 */
export const usePatientsInfinite = (search?: string, nivelRiesgo?: NivelRiesgoFiltro) =>
  useInfiniteQuery({
    queryKey: ['patientsInfinite', search || '', nivelRiesgo || ''],
    queryFn: ({ pageParam }) => fetchPatientsPage(search || '', pageParam as number, nivelRiesgo),
    initialPageParam: 1,
    getNextPageParam: (last: { page: number; totalPages: number }) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });
export const usePatientProfile = (id: string) => useQuery({ queryKey: ['patient', id], queryFn: () => fetchPatientProfile(id), enabled: !!id });

export const useCreateControl = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createControl,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['obstetraDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const useTodayAppointments = () => useQuery({ queryKey: ['todayAppointments'], queryFn: fetchTodayAppointments });

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/patients/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['gestanteDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const fetchMyProfile = async () => {
  const res = await api.get('/auth/me');
  return res.data?.data || null;
};

export interface EducationContentItem {
  id: string;
  titulo: string;
  contenido: string;
  tipo?: string;
  categoria?: string;
  trimestre?: number | null;
  semanaInicio?: number | null;
  semanaFin?: number | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  duracionMin?: number | null;
}

export interface EducationResponse {
  currentTrimester: number;
  contents: EducationContentItem[];
}

export const fetchEducation = async (): Promise<EducationResponse> => {
  const res = await api.get('/education');
  const data = res.data?.data || {};
  return {
    currentTrimester: data.currentTrimester || 1,
    contents: Array.isArray(data.contents) ? data.contents : [],
  };
};

// El contenido educativo cambia muy poco: se mantiene "fresco" 10 min para
// evitar refetches y ahorrar datos móviles.
const STABLE_STALE_TIME = 10 * 60 * 1000;

export const useEducation = () =>
  useQuery({ queryKey: ['education'], queryFn: fetchEducation, staleTime: STABLE_STALE_TIME });

/**
 * Obtiene un contenido educativo por id (sin filtrar por trimestre). Permite
 * abrir un contenido recomendado vía chat aunque no esté en el feed "Para ti".
 */
export const useEducationContentById = (id: string, enabled = true) =>
  useQuery({
    queryKey: ['educationContent', id],
    enabled: !!id && enabled,
    staleTime: STABLE_STALE_TIME,
    queryFn: async (): Promise<EducationContentItem | null> => {
      const res = await api.get(`/education/${id}`);
      return res.data?.data || null;
    },
  });

/** Lista de contenido educativo para que el obstetra elija qué recomendar. */
export const useEducationCatalog = () =>
  useQuery({
    queryKey: ['educationCatalog'],
    staleTime: STABLE_STALE_TIME,
    queryFn: async (): Promise<EducationContentItem[]> => {
      const res = await api.get('/education/catalog');
      return res.data?.data || [];
    },
  });

/** Registra una vista de contenido educativo (best-effort, no bloquea la UI). */
export const registerContentView = async (contentId: string): Promise<void> => {
  try {
    await api.post(`/education/${contentId}/view`);
  } catch {
    /* no crítico */
  }
};

/** El obstetra recomienda un contenido educativo a una gestante (vía chat + push). */
export const useRecommendContent = () =>
  useMutation({
    mutationFn: async (vars: { gestanteId: string; contentId: string; nota?: string }) => {
      const res = await api.post('/chat/recommend-content', vars);
      return res.data;
    },
  });

export const useMyProfile = () => useQuery({
  queryKey: ['myProfile'],
  queryFn: fetchMyProfile
});

// ── Preferencias de notificación (RF-7.13) ──
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: { push?: boolean; sms?: boolean; whatsapp?: boolean }) => {
      const res = await api.patch('/auth/me', { notificationPreferences: prefs });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    },
  });
};

// ── Bandeja de notificaciones in-app (Fase 7) ──

export interface AppNotification {
  id: string;
  tipo: string;
  titulo: string | null;
  mensaje: string;
  datos?: Record<string, any> | null;
  leidaAt: string | null;
  createdAt: string;
  categoria?: 'clinica' | 'cita' | 'sistema';
  prioridad?: 'alta' | 'normal';
}

export const fetchNotifications = async (soloNoLeidas = false): Promise<AppNotification[]> => {
  const res = await api.get('/notifications', { params: { soloNoLeidas } });
  return res.data?.data || [];
};

export const fetchUnreadCount = async (): Promise<number> => {
  try {
    const res = await api.get('/notifications/unread-count');
    return res.data?.data?.count || 0;
  } catch {
    return 0;
  }
};

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: () => fetchNotifications(false) });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: fetchUnreadCount,
    refetchInterval: 60 * 1000, // refresca el badge cada minuto
  });

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/notifications/${id}/read`);
      return res.data;
    },
    // Optimista: marca leída al instante en la lista y baja el contador del badge.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData<AppNotification[]>(['notifications']);
      queryClient.setQueryData<AppNotification[]>(['notifications'], (old) =>
        Array.isArray(old)
          ? old.map((n) => (n.id === id && !n.leidaAt ? { ...n, leidaAt: new Date().toISOString() } : n))
          : old,
      );
      queryClient.setQueryData<number>(['notifications', 'unread'], (c) =>
        typeof c === 'number' && c > 0 ? c - 1 : c,
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch('/notifications/read-all');
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData<AppNotification[]>(['notifications']);
      const now = new Date().toISOString();
      queryClient.setQueryData<AppNotification[]>(['notifications'], (old) =>
        Array.isArray(old) ? old.map((n) => (n.leidaAt ? n : { ...n, leidaAt: now })) : old,
      );
      queryClient.setQueryData<number>(['notifications', 'unread'], 0);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

/** Elimina UNA notificación (optimista: la quita de la lista y ajusta el badge). */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/notifications/${id}`);
      return res.data;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData<AppNotification[]>(['notifications']);
      const removed = prev?.find((n) => n.id === id);
      queryClient.setQueryData<AppNotification[]>(['notifications'], (old) =>
        Array.isArray(old) ? old.filter((n) => n.id !== id) : old,
      );
      // Si la eliminada estaba sin leer, baja el badge.
      if (removed && !removed.leidaAt) {
        queryClient.setQueryData<number>(['notifications', 'unread'], (c) =>
          typeof c === 'number' && c > 0 ? c - 1 : c,
        );
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

/**
 * Limpia la bandeja: borra todas o solo las leídas (`soloLeidas`).
 */
export const useClearNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (soloLeidas: boolean = false) => {
      const res = await api.delete('/notifications', { params: { soloLeidas } });
      return res.data;
    },
    onMutate: async (soloLeidas: boolean = false) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData<AppNotification[]>(['notifications']);
      queryClient.setQueryData<AppNotification[]>(['notifications'], (old) => {
        if (!Array.isArray(old)) return old;
        return soloLeidas ? old.filter((n) => !n.leidaAt) : [];
      });
      if (!soloLeidas) queryClient.setQueryData<number>(['notifications', 'unread'], 0);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useCreateLabResult = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/labs', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
    },
  });
};

export const useCreateVaccine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/vaccines', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
    },
  });
};

export const useCreateTreatment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/treatments', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      if (variables.gestanteId) {
        queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
      }
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
    },
  });
};

export const useCreatePathology = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/pathologies', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
    },
  });
};

export const useCreateMentalHealthScreening = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/screenings/mental', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
    },
  });
};

export const useCreateViolenceScreening = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/screenings/violence', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
    },
  });
};

export const useCreateNutritionalCounseling = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/nutritional-counseling', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
    },
  });
};

export const useCreateWeightRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/weight-records', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
    },
  });
};

export const useConfirmAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // La gestante confirma su cita; el backend notifica al obstetra.
    mutationFn: async (id: string) => {
      const res = await api.patch(`/appointments/${id}/confirm`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['gestanteDashboard'] });
    },
  });
};

// ── Flujo de reprogramación con aprobación (Fase 2) ──

/** La gestante SOLICITA reprogramar; queda pendiente de aprobación del obstetra. */
export const useRequestReschedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      fecha,
      hora,
      motivoReprogramacion,
    }: {
      id: string;
      fecha: string;
      hora: string;
      motivoReprogramacion: string;
    }) => {
      const res = await api.patch(`/appointments/${id}/request-reschedule`, {
        fecha,
        hora,
        motivoReprogramacion,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['gestanteDashboard'] });
    },
  });
};

/** El obstetra APRUEBA o RECHAZA una solicitud de reprogramación. */
export const useResolveReschedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      aprobar,
      motivo,
    }: {
      id: string;
      aprobar: boolean;
      motivo?: string;
    }) => {
      const res = await api.patch(`/appointments/${id}/resolve-reschedule`, { aprobar, motivo });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['todayAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['obstetraDashboard'] });
    },
  });
};

/** Horarios disponibles de un día (agenda inteligente). */
export const fetchAppointmentAvailability = async (fecha: string, obstetraId?: string) => {
  const res = await api.get('/appointments/availability', { params: { fecha, obstetraId } });
  return res.data?.data?.slots || [];
};

export const useAppointmentAvailability = (fecha: string | null, obstetraId?: string) =>
  useQuery({
    queryKey: ['availability', fecha, obstetraId],
    queryFn: () => fetchAppointmentAvailability(fecha as string, obstetraId),
    enabled: !!fecha,
  });

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'asistida' | 'no_asistida' | 'cancelada' | 'reprogramada' }) => {
      const res = await api.patch(`/appointments/${id}/status`, { estado: status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['todayAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['gestanteDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['obstetraDashboard'] });
    },
  });
};

// ── Visita domiciliaria ──

export interface HomeVisit {
  id: string;
  numeroVisita: number;
  fecha: string;
  horaLlegada?: string | null;
  duracionMin?: number | null;
  motivo: string;
  acciones: string;
  acuerdos?: string | null;
  lat?: number | null;
  lng?: number | null;
  firmaGestante: boolean;
  firmaObstetra: boolean;
  obstetra?: { cop?: string; user?: { firstName: string; lastName: string } };
}

export const fetchHomeVisits = async (gestanteId: string): Promise<HomeVisit[]> => {
  const res = await api.get(`/home-visits/${gestanteId}`);
  return res.data?.data || [];
};

export const useHomeVisits = (gestanteId: string) =>
  useQuery({ queryKey: ['homeVisits', gestanteId], queryFn: () => fetchHomeVisits(gestanteId), enabled: !!gestanteId });

export const useCreateHomeVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/home-visits', data);
      return res.data;
    },
    onSuccess: (_, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['homeVisits', variables.gestanteId] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const useDeleteHomeVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; gestanteId: string }) => {
      const res = await api.delete(`/home-visits/visit/${id}`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['homeVisits', variables.gestanteId] });
    },
  });
};

/** El obstetra convierte una cita en visita domiciliaria. */
export const useConvertToHomeVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, observaciones }: { id: string; observaciones?: string }) => {
      const res = await api.patch(`/appointments/${id}/convertir-domiciliaria`, { observaciones });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['todayAppointments'] });
    },
  });
};

/** Registra/actualiza la ubicación GPS del domicilio de la gestante. */
export const useUpdateUbicacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, domicilioLat, domicilioLng, referenciaDom }: { id: string; domicilioLat: number; domicilioLng: number; referenciaDom?: string }) => {
      const res = await api.patch(`/patients/${id}/ubicacion`, { domicilioLat, domicilioLng, referenciaDom });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    },
  });
};

// ── Antecedentes (RF-2.03) ──

export const useCreateAntecedente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { gestanteId: string; tipo: 'familiar' | 'personal'; condicion: string; detalle?: string }) => {
      const res = await api.post('/clinical/antecedentes', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
      queryClient.invalidateQueries({ queryKey: ['antecedentes', variables.gestanteId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};

export const useDeleteAntecedente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; gestanteId: string }) => {
      const res = await api.delete(`/clinical/antecedentes/${id}`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
      queryClient.invalidateQueries({ queryKey: ['antecedentes', variables.gestanteId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};

// ── Ecografías (RF-2.08) ──

export const useCreateUltrasound = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/ultrasounds', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
    },
  });
};

// ── Odontograma (RF-5.12) ──

export const useCreateDentalRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/clinical/dental', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
    },
  });
};

// ── Modificar / suspender tratamiento (RF-4.10) ──

export const useUpdateTreatment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ treatmentId, data }: { treatmentId: string; gestanteId?: string; data: any }) => {
      const res = await api.patch(`/clinical/treatments/${treatmentId}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      if (variables.gestanteId) {
        queryClient.invalidateQueries({ queryKey: ['patient', variables.gestanteId] });
      }
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
    },
  });
};

// ── Signos de alarma de una gestante (gestión en su ficha clínica) ──

export interface PatientDangerSign {
  id: string;
  tipoSigno: string;
  descripcion?: string | null;
  severidad?: string | null;
  estado: string; // pendiente | atendido | derivado
  accionTomada?: string | null;
  createdAt: string;
}

export const usePatientDangerSigns = (gestanteId: string) =>
  useQuery({
    queryKey: ['dangerSigns', gestanteId],
    queryFn: async (): Promise<PatientDangerSign[]> => {
      const res = await api.get('/clinical/danger-signs', { params: { gestanteId } });
      return (res.data?.data || []).map((d: any) => ({
        id: d.id,
        tipoSigno: d.tipoSigno,
        descripcion: d.descripcion,
        severidad: d.severidad,
        estado: d.estado,
        accionTomada: d.accionTomada,
        createdAt: d.createdAt || d.fechaReporte,
      }));
    },
    enabled: !!gestanteId,
  });

export const useUpdateDangerSign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; gestanteId: string; estado: 'atendido' | 'derivado' }) => {
      const accionTomada = estado === 'atendido' ? 'Atendido por el obstetra' : 'Derivado al equipo de salud';
      const res = await api.patch(`/clinical/danger-signs/${id}`, { estado, accionTomada });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dangerSigns', variables.gestanteId] });
      queryClient.invalidateQueries({ queryKey: ['obstetraDashboard'] });
    },
  });
};
