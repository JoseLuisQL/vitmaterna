import { z } from 'zod';

export const createPrenatalControlSchema = {
  body: z.object({
    gestanteId: z.string().uuid(),
    obstetraId: z.string().uuid(),
    appointmentId: z.string().uuid().optional(),
    numeroControl: z.number().int().positive(),
    egSemanas: z.number().int().nonnegative(),
    trimestre: z.number().int().min(1).max(3).optional(),
    peso: z.number().positive().optional(),
    temperatura: z.number().positive().optional(),
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

export const createSupplementLogSchema = {
  params: z.object({
    treatmentId: z.string().uuid(),
  }),
  body: z.object({
    gestanteId: z.string().uuid(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tomado: z.boolean().default(true),
    notas: z.string().optional(),
  }),
};

export const createDangerSignSchema = {
  body: z.object({
    tipo_signo: z.string().min(1),
    descripcion: z.string().optional(),
    severidad: z.enum(['leve', 'moderado', 'grave']).optional(),
  }),
};
