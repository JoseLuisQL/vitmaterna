import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';

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
});

const mapPatient = (gestante: any) => {
  const age = gestante.user?.fechaNacimiento 
    ? new Date().getFullYear() - new Date(gestante.user.fechaNacimiento).getFullYear()
    : gestante.ageAtRegistration || 28;
    
  return {
    id: gestante.id || gestante._id,
    firstName: gestante.user?.firstName || '',
    lastName: gestante.user?.lastName || '',
    documentNumber: gestante.user?.dni || '',
    age,
    riskLevel: gestante.nivelRiesgo === 'rojo' ? 'Alto' : gestante.nivelRiesgo === 'amarillo' ? 'Medio' : 'Bajo',
  };
};

const mapPatientProfile = (g: any) => {
  if (!g) return null;
  const age = g.user?.fechaNacimiento 
    ? new Date().getFullYear() - new Date(g.user.fechaNacimiento).getFullYear()
    : g.ageAtRegistration || 28;

  let currentWeek = '12';
  let currentTrimester = 2;
  if (g.fppFum) {
    const today = new Date();
    const fpp = new Date(g.fppFum);
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
    documentNumber: g.user?.dni || '',
    phone: g.user?.phone || '',
    age,
    riskLevel: g.nivelRiesgo === 'rojo' ? 'Alto' : g.nivelRiesgo === 'amarillo' ? 'Medio' : 'Bajo',
    currentWeek,
    currentTrimester,
    estimatedDueDate: g.fppFum || g.fppEco || null,
    bloodType: (g.grupoSanguineo || '') + (g.factorRh || ''),
    imc,
    fum: g.fum ? new Date(g.fum).toLocaleDateString('es-PE') : null,
    pesoHabitual: g.pesoHabitual || null,
    talla: g.talla || null,
    // Datos personales
    address: g.direccion || g.user?.address || null,
    maritalStatus: g.estadoCivil || null,
    occupation: g.ocupacion || null,
    education: g.nivelEstudios || null,
    sisCode: g.codigoSis || null,
    // Antecedentes obstétricos
    gestaciones: g.gestaciones ?? null,
    partos: g.partos ?? null,
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
    // Controles prenatales
    controls: (g.prenatalControls || []).map((c: any) => ({
      id: c.id,
      date: c.fecha,
      week: c.egSemanas,
      bloodPressure: `${c.presionSistolica || 120}/${c.presionDiastolica || 80}`,
      weight: c.peso || 0,
      fetalHeartRate: c.fcf || 0,
      alturaUterina: c.alturaUterina || null,
      temperatura: c.temperatura || null,
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

export const fetchTreatments = async () => {
  try {
    const res = await api.get('/clinical/treatments');
    return res.data?.data || [];
  } catch (e) {
    console.warn('Treatments fetch failed:', e);
    return [];
  }
};

export const logTreatment = async (treatmentId: string) => {
  const res = await api.post(`/clinical/treatments/${treatmentId}/log`);
  return res.data;
};

const todayISO = () => new Date().toISOString().split('T')[0];

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
      queryClient.invalidateQueries({ queryKey: ['obstetraDashboard'] });
    },
  });
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
export const useTreatments = () => useQuery({ queryKey: ['treatments'], queryFn: fetchTreatments });

export const useLogTreatment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logTreatment,
    // Actualización optimista: refleja el consumo de hoy al instante en
    // la lista de tratamientos (adherencia, calendario y progreso) y en el
    // dashboard, sin esperar al servidor.
    onMutate: async (treatmentId: string) => {
      await queryClient.cancelQueries({ queryKey: ['treatments'] });
      const prevTreatments = queryClient.getQueryData<any[]>(['treatments']);
      const prevDashboard = queryClient.getQueryData<any>(['gestanteDashboard']);

      queryClient.setQueryData<any[]>(['treatments'], (old) =>
        Array.isArray(old)
          ? old.map((t) => ((t.id || t._id) === treatmentId ? applyTakenToday(t) : t))
          : old,
      );

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
export const usePatients = (search?: string) => useQuery({ queryKey: ['patients', search], queryFn: () => fetchPatients(search) });
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

export const useEducation = () =>
  useQuery({ queryKey: ['education'], queryFn: fetchEducation });

export const useMyProfile = () => useQuery({
  queryKey: ['myProfile'],
  queryFn: fetchMyProfile
});

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
    mutationFn: async (id: string) => {
      const res = await api.patch(`/appointments/${id}/status`, { estado: 'confirmada' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['gestanteDashboard'] });
    },
  });
};

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
