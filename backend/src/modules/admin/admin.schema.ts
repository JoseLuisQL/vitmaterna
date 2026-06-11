import { z } from 'zod';

// schemas for pagination and common
export const paginationSchema = {
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  })
};

// Admin System Config
export const updateConfigSchema = {
  params: z.object({
    clave: z.string(),
  }),
  body: z.object({
    valor: z.any(),
    descripcion: z.string().optional(),
  }),
};

const educationBody = z.object({
  titulo: z.string().min(1),
  contenido: z.string().min(1),
  tipo: z.enum(['articulo', 'infografia', 'video', 'audio', 'faq']).optional(),
  categoria: z.enum(['nutricion', 'suplementos', 'signos_alarma', 'parto', 'lactancia', 'cuidado_bebe', 'salud_mental', 'general']).optional(),
  trimestre: z.number().int().min(1).max(3).optional().nullable(),
  semanaInicio: z.number().int().min(1).max(42).optional().nullable(),
  semanaFin: z.number().int().min(1).max(42).optional().nullable(),
  idioma: z.string().default('es'),
  mediaUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  duracionMin: z.number().int().optional().nullable(),
  orden: z.number().int().default(0),
  activo: z.boolean().default(true),
});

// Educational Content
export const createEducationSchema = {
  body: educationBody,
};

export const updateEducationSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: educationBody.partial(),
};

// approve user
export const approveUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const createUserSchema = {
  body: z.object({
    dni: z.string().length(8, 'El DNI debe tener 8 dígitos').regex(/^\d{8}$/, 'El DNI debe contener solo dígitos'),
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 letras').max(100),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 letras').max(100),
    phone: z.string().regex(/^\+?51\d{9}$/, 'Formato de teléfono inválido (+51999999999)').optional(),
    email: z.string().email('Formato de correo electrónico inválido').optional().or(z.literal('')),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.enum(['obstetra', 'admin', 'gestante']),
    cop: z.string().optional(),
  }).refine((data) => {
    if (data.role === 'obstetra' && !data.cop) {
      return false;
    }
    return true;
  }, {
    message: 'El COP es obligatorio para el rol obstetra',
    path: ['cop'],
  }),
};

// ── Establecimientos de salud (RF-10.02) ──

const facilityBody = z.object({
  nombre: z.string().min(2, 'El nombre es obligatorio').max(200),
  codigo: z.string().max(20).optional().nullable(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().max(15).optional().nullable(),
  horarios: z.any().optional(),
  servicios: z.array(z.string()).optional(),
  altitudMsnm: z.number().int().min(0).max(6000).optional(),
  activo: z.boolean().optional(),
});

export const createFacilitySchema = { body: facilityBody };

export const updateFacilitySchema = {
  params: z.object({ id: z.string().uuid() }),
  body: facilityBody.partial(),
};

export const deleteFacilitySchema = {
  params: z.object({ id: z.string().uuid() }),
};
