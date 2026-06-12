import { z } from 'zod';

export const createPatientSchema = {
  body: z.object({
    dni: z.string().length(8, 'El DNI debe tener 8 dígitos'),
    firstName: z.string().min(2, 'El nombre es muy corto'),
    lastName: z.string().min(2, 'Los apellidos son muy cortos'),
    phone: z.string().optional(),
    fechaNacimiento: z.string().optional(),
  }),
};

export const getPatientsSchema = {
  query: z.object({
    search: z.string().optional(),
    obstetraId: z.string().uuid().optional(),
    estado: z.enum(['activa', 'parto', 'puerperio', 'inactiva']).optional(),
    nivelRiesgo: z.enum(['verde', 'amarillo', 'rojo']).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
};

export const getPatientByIdSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la gestante debe ser un UUID válido'),
  }),
};

export const buscarPatientSchema = {
  query: z.object({
    dni: z.string().length(8, 'El DNI debe tener 8 dígitos'),
  }),
};

export const updateUbicacionSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la gestante debe ser un UUID válido'),
  }),
  body: z.object({
    domicilioLat: z.number().min(-90).max(90),
    domicilioLng: z.number().min(-180).max(180),
    referenciaDom: z.string().optional(),
  }),
};

export const updatePatientSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la gestante debe ser un UUID válido'),
  }),
  body: z.object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    historiaClinica: z.string().nullable().optional(),
    fechaNacimiento: z.string().nullable().optional(),
    ageAtRegistration: z.number().nullable().optional(),
    direccion: z.string().nullable().optional(),
    localidad: z.string().nullable().optional(),
    domicilioLat: z.number().min(-90).max(90).nullable().optional(),
    domicilioLng: z.number().min(-180).max(180).nullable().optional(),
    referenciaDom: z.string().nullable().optional(),
    departamento: z.string().nullable().optional(),
    provincia: z.string().nullable().optional(),
    distrito: z.string().nullable().optional(),
    establecimiento: z.string().nullable().optional(),
    codigoSis: z.string().nullable().optional(),
    ocupacion: z.string().nullable().optional(),
    nivelEstudios: z.enum(['analfabeta', 'primaria', 'secundaria', 'superior', 'no_universitario']).nullable().optional(),
    estadoCivil: z.enum(['casada', 'conviviente', 'soltera', 'otro']).nullable().optional(),
    padreRnNombre: z.string().nullable().optional(),
    padreRnDni: z.string().nullable().optional(),
    acompanantePhone: z.string().nullable().optional(),
    gestaciones: z.number().nullable().optional(),
    partosVaginales: z.number().nullable().optional(),
    cesareas: z.number().nullable().optional(),
    abortos: z.number().nullable().optional(),
    nacidosVivos: z.number().nullable().optional(),
    nacidosMuertos: z.number().nullable().optional(),
    hijosVivos: z.number().nullable().optional(),
    rnMayorPeso: z.number().nullable().optional(),
    gestacionAnterior: z.enum(['eutocico', 'distocico', 'aborto', 'ninguno']).nullable().optional(),
    pesoHabitual: z.number().nullable().optional(),
    pesoActual: z.number().nullable().optional(),
    talla: z.number().nullable().optional(),
    imc: z.number().nullable().optional(),
    clasificacionImc: z.string().nullable().optional(),
    grupoSanguineo: z.string().nullable().optional(),
    factorRh: z.string().nullable().optional(),
    rhSensitizado: z.boolean().nullable().optional(),
    fum: z.string().nullable().optional(),
    fumDudosa: z.boolean().nullable().optional(),
    fppFum: z.string().nullable().optional(),
    fppEco: z.string().nullable().optional(),
    estadoGeneral: z.string().nullable().optional(),
    estadoHidratacion: z.string().nullable().optional(),
    estadoNutricion: z.string().nullable().optional(),
    examenMamas: z.enum(['sin_examen', 'normal', 'patologico']).nullable().optional(),
    cuelloUterino: z.string().nullable().optional(),
    pelvis: z.string().nullable().optional(),
    odontologia: z.string().nullable().optional(),
    nivelRiesgo: z.enum(['verde', 'amarillo', 'rojo']).nullable().optional(),
    estado: z.enum(['activa', 'parto', 'puerperio', 'inactiva']).nullable().optional(),
  }),
};

