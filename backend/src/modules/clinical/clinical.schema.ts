import { z } from 'zod';

export const createPrenatalControlSchema = {
  body: z.object({
    gestanteId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional(),
    obstetraId: z.string().uuid().optional(),
    appointmentId: z.string().uuid().optional(),
    numeroControl: z.number().int().positive().optional(),
    egSemanas: z.number().int().nonnegative().optional(),
    week: z.union([z.string(), z.number()]).optional(),
    weight: z.union([z.string(), z.number()]).optional(),
    bloodPressure: z.string().optional(),
    fetalHeartRate: z.union([z.string(), z.number()]).optional(),
    fundalHeight: z.union([z.string(), z.number()]).optional(),
    indications: z.string().optional(),
    trimestre: z.number().int().min(1).max(3).optional(),
    peso: z.number().positive().optional(),
    temperatura: z.union([z.string(), z.number()]).optional(),
    presionSistolica: z.number().int().positive().optional(),
    presionDiastolica: z.number().int().positive().optional(),
    pulsoMaterno: z.number().int().positive().optional(),
    alturaUterina: z.number().positive().optional(),
    situacion: z.string().optional(),
    presentacion: z.string().optional(),
    posicion: z.string().optional(),
    fcf: z.number().int().positive().optional(),
    movimientoFetal: z.string().optional(),
    proteinuria: z.string().optional(),
    edema: z.string().optional(),
    reflejoOsteotendinoso: z.number().int().optional(),
    examenPezon: z.string().optional(),
    indicacionHierro: z.string().optional(),
    indicacionCalcio: z.string().optional(),
    indicacionAcidoFolico: z.string().optional(),
    orientacion: z.array(z.string()).optional(),
    ecografiaControl: z.string().optional(),
    perfilBiofisico: z.string().optional(),
    visitaDomiciliaria: z.boolean().optional(),
    planParto: z.string().optional(),
    proximaCita: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    establecimiento: z.string().optional(),
    responsable: z.string().optional(),
    nroFormatoSis: z.string().optional(),
    observaciones: z.string().optional(),
  }),
};

export const getPrenatalControlsSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createTreatmentSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    obstetraId: z.string().uuid().optional(),
    nombre: z.string().min(3),
    tipo: z.enum(['acido_folico', 'sulfato_ferroso', 'calcio', 'otro']).optional(),
    dosis: z.string(),
    frecuencia: z.string(),
    viaAdministracion: z.string().default('oral'),
    horaToma: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    indicaciones: z.string().optional(),
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    duracionDias: z.number().int().positive().optional(),
  }),
};

export const getTreatmentsSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createAntecedenteSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    tipo: z.enum(['familiar', 'personal']),
    condicion: z.string().min(1).max(100),
    detalle: z.string().optional(),
  }),
};

export const getAntecedentesSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const deleteAntecedenteSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const updateTreatmentSchema = {
  params: z.object({
    treatmentId: z.string().uuid(),
  }),
  body: z
    .object({
      dosis: z.string().min(1).optional(),
      frecuencia: z.string().min(1).optional(),
      viaAdministracion: z.string().optional(),
      horaToma: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
      indicaciones: z.string().nullable().optional(),
      fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      duracionDias: z.number().int().positive().optional(),
      estado: z.enum(['activo', 'suspendido', 'completado']).optional(),
      motivoSuspension: z.string().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: 'Debe enviar al menos un campo a modificar',
    })
    .refine((d) => d.estado !== 'suspendido' || (d.motivoSuspension && d.motivoSuspension.trim().length > 0), {
      message: 'Al suspender un tratamiento se requiere el motivo (justificación clínica)',
      path: ['motivoSuspension'],
    }),
};

export const createSupplementLogSchema = {
  params: z.object({
    treatmentId: z.string().uuid(),
  }),
  body: z.object({
    gestanteId: z.string().uuid().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    tomado: z.boolean().default(true),
    notas: z.string().optional(),
    // Clave de deduplicación para reenvíos de la cola offline (opcional).
    dedupeKey: z.string().optional(),
  }),
};

export const createDangerSignSchema = {
  body: z.object({
    tipo_signo: z.string().min(1),
    descripcion: z.string().optional(),
    severidad: z.enum(['leve', 'moderado', 'grave']).optional(),
    // Clave de deduplicación para reenvíos de la cola offline (opcional).
    dedupeKey: z.string().optional(),
  }),
};

export const getDangerSignsSchema = {
  query: z.object({
    estado: z.enum(['pendiente', 'atendido', 'derivado']).optional(),
    gestanteId: z.string().uuid().optional(),
  }),
};

export const updateDangerSignSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      estado: z.enum(['pendiente', 'atendido', 'derivado']).optional(),
      accionTomada: z.string().max(1000).optional(),
    })
    .refine((d) => d.estado !== undefined || d.accionTomada !== undefined, {
      message: 'Debe indicar al menos el estado o la acción tomada',
    }),
};

export const createLabResultSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    obstetraId: z.string().uuid().optional(),
    tipoExamen: z.string().min(1),
    numeroToma: z.number().int().positive().optional(),
    valor: z.string().optional(),
    valorNumerico: z.number().optional(),
    valorCorregido: z.number().optional(),
    unidad: z.string().optional(),
    resultado: z.string().optional(),
    fechaExamen: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    egSemanas: z.number().int().nonnegative().optional(),
    observaciones: z.string().optional(),
  }),
};

export const getLabResultsSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createUltrasoundSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    tipo: z.enum(['genetica', 'morfologica', 'bienestar_fetal']),
    numero: z.number().int().positive().optional(),
    egSemanas: z.number().int().nonnegative().optional(),
    egPorEco: z.number().int().nonnegative().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    resultado: z.string().optional(),
    hallazgos: z.string().optional(),
  }),
};

export const getUltrasoundsSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createVaccinationRecordSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    vacuna: z.string().min(1),
    dosisNumero: z.number().int().positive().optional(),
    egSemanasAplicacion: z.number().int().nonnegative().optional(),
    fechaAplicacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    estado: z.enum(['pendiente', 'aplicada', 'no_aplica']).optional(),
  }),
};

export const getVaccinationRecordsSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createPathologySchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    codigoCie10: z.string().min(1),
    descripcion: z.string().optional(),
    fechaDiagnostico: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    estado: z.enum(['activa', 'resuelta', 'seguimiento']).optional(),
  }),
};

export const getPathologiesSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createMentalHealthScreeningSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    obstetraId: z.string().uuid().optional(),
    respuestas: z.record(z.any()),
    puntajeP1_18: z.number().int().nonnegative().optional(),
    puntajeP19_22: z.number().int().nonnegative().optional(),
    pregunta23: z.boolean().optional(),
    puntajeP24_28: z.number().int().nonnegative().optional(),
    resultado: z.string().optional(),
    derivacion: z.boolean().optional(),
    observaciones: z.string().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
};

export const getMentalHealthScreeningsSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createViolenceScreeningSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    obstetraId: z.string().uuid().optional(),
    respuestas: z.record(z.any()),
    puntajeTotal: z.number().int().nonnegative().optional(),
    tamizajePositivo: z.boolean().optional(),
    derivacion: z.boolean().optional(),
    observaciones: z.string().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
};

export const getViolenceScreeningsSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createDentalRecordSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    estadoBucal: z.string().optional(),
    caries: z.string().optional(),
    tratamientos: z.string().optional(),
    codigoCie10: z.string().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
};

export const getDentalRecordsSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createNutritionalCounselingSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    obstetraId: z.string().uuid().optional(),
    historialAlimentario: z.string().optional(),
    frecuenciaAlimentacion: z.number().int().optional(),
    consumoAnimales: z.boolean().optional(),
    consumoMenestras: z.boolean().optional(),
    consumoFrutas: z.boolean().optional(),
    salYodada: z.boolean().optional(),
    acuerdos: z.string().optional(),
    sesionDemostrativa: z.boolean().optional(),
    fechaSesionDemo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    responsableDemo: z.string().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
};

export const getNutritionalCounselingSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

export const createWeightRecordSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    egSemanas: z.number().int().nonnegative(),
    peso: z.number().positive(),
  }),
};

export const getWeightRecordsSchema = {
  params: z.object({
    gestanteId: z.string().uuid(),
  }),
};

