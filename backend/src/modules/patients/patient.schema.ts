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

export const updatePatientSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la gestante debe ser un UUID válido'),
  }),
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    historiaClinica: z.string().optional(),
    fechaNacimiento: z.string().optional(),
    ageAtRegistration: z.number().optional(),
    direccion: z.string().optional(),
    localidad: z.string().optional(),
    departamento: z.string().optional(),
    provincia: z.string().optional(),
    distrito: z.string().optional(),
    establecimiento: z.string().optional(),
    codigoSis: z.string().optional(),
    ocupacion: z.string().optional(),
    nivelEstudios: z.enum(['analfabeta', 'primaria', 'secundaria', 'superior', 'no_universitario']).optional(),
    estadoCivil: z.enum(['casada', 'conviviente', 'soltera', 'otro']).optional(),
    padreRnNombre: z.string().optional(),
    padreRnDni: z.string().optional(),
    acompanantePhone: z.string().optional(),
    gestaciones: z.number().optional(),
    partosVaginales: z.number().optional(),
    cesareas: z.number().optional(),
    abortos: z.number().optional(),
    nacidosVivos: z.number().optional(),
    nacidosMuertos: z.number().optional(),
    hijosVivos: z.number().optional(),
    rnMayorPeso: z.number().optional(),
    gestacionAnterior: z.enum(['eutocico', 'distocico', 'aborto', 'ninguno']).optional(),
    pesoHabitual: z.number().optional(),
    pesoActual: z.number().optional(),
    talla: z.number().optional(),
    imc: z.number().optional(),
    clasificacionImc: z.string().optional(),
    grupoSanguineo: z.string().optional(),
    factorRh: z.string().optional(),
    rhSensitizado: z.boolean().optional(),
    fum: z.string().optional(),
    fumDudosa: z.boolean().optional(),
    fppFum: z.string().optional(),
    fppEco: z.string().optional(),
    estadoGeneral: z.string().optional(),
    estadoHidratacion: z.string().optional(),
    estadoNutricion: z.string().optional(),
    examenMamas: z.enum(['sin_examen', 'normal', 'patologico']).optional(),
    cuelloUterino: z.string().optional(),
    pelvis: z.string().optional(),
    odontologia: z.string().optional(),
    nivelRiesgo: z.enum(['verde', 'amarillo', 'rojo']).optional(),
    estado: z.enum(['activa', 'parto', 'puerperio', 'inactiva']).optional(),
  }),
};

