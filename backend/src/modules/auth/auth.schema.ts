import { z } from 'zod';

// ---- Common fields ----
const dniField = z
  .string()
  .length(8, 'DNI must be exactly 8 digits')
  .regex(/^\d{8}$/, 'DNI must contain only digits');

/**
 * Teléfono peruano flexible: acepta 9 dígitos (celular nacional) o con prefijo
 * de país opcional (+51 / 51 / 0051). El usuario puede ingresar solo 9 dígitos.
 * Permite nulo o string vacío sin lanzar error de formato.
 */
const phoneField = z
  .string()
  .nullish()
  .refine(
    (val) => !val || val.trim() === '' || /^(?:\+?51|0051)?\s?\d{9}$/.test(val.trim()),
    { message: 'El teléfono debe tener 9 dígitos (ej. 987654321)' }
  );

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    'Password must contain uppercase, lowercase, number, and special character',
  );

// ---- Login ----
export const loginSchema = z.object({
  dni: dniField,
  password: z.string().min(1, 'Password is required'),
  deviceInfo: z
    .object({
      platform: z.string().optional(),
      model: z.string().optional(),
      os: z.string().optional(),
      appVersion: z.string().optional(),
    })
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---- Register ----
export const registerSchema = z.object({
  dni: dniField,
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(100)
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(100)
    .trim(),
  phone: phoneField.optional(),
  email: z.string().email('Invalid email format').optional(),
  password: passwordField,
  confirmPassword: z.string(),
  role: z.enum(['gestante', 'obstetra'], {
    errorMap: () => ({ message: 'Role must be gestante or obstetra' }),
  }),
  cop: z
    .string()
    .min(4, 'COP must be at least 4 characters')
    .max(20)
    .optional(),
  consentAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine(
  (data) => {
    if (data.role === 'obstetra' && !data.cop) {
      return false;
    }
    return true;
  },
  {
    message: 'COP is required for obstetra role',
    path: ['cop'],
  },
);

export type RegisterInput = z.infer<typeof registerSchema>;

// ---- Refresh Token ----
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

// ---- Forgot Password ----
export const forgotPasswordSchema = z.object({
  dni: dniField,
  phone: phoneField.optional(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ---- Reset Password ----
export const resetPasswordSchema = z.object({
  dni: dniField,
  code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
  newPassword: passwordField,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---- Update Profile ----
export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(100).trim().optional(),
  lastName: z.string().min(2).max(100).trim().optional(),
  phone: phoneField,
  email: z.string().nullish().refine(
    (val) => !val || val.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
    { message: 'Invalid email format' }
  ),
  notificationPreferences: z
    .object({
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
    })
    .optional(),
  biometricEnabled: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ---- Change Password ----
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
