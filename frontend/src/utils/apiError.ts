/**
 * VITMATERNA — Extracción de mensajes de error de la API (amigables, en español).
 *
 * Axios pone en `error.message` algo como "Request failed with status code 401",
 * que no sirve para el usuario. El backend devuelve el mensaje real en
 * `error.response.data.error.message`. Esta utilidad lo extrae y traduce los
 * mensajes más comunes.
 */

/** Traducciones de mensajes del backend (en inglés) a español. */
const TRANSLATIONS: Record<string, string> = {
  'Invalid credentials': 'DNI o contraseña incorrectos.',
  'Authentication required': 'Debes iniciar sesión.',
  'Access token is required': 'Debes iniciar sesión.',
  'User not found': 'Usuario no encontrado.',
  'Account is locked': 'Cuenta bloqueada temporalmente por intentos fallidos. Espera unos minutos.',
  'Account is inactive': 'Tu cuenta está inactiva. Contacta al administrador.',
  'Too many authentication attempts. Please try again in 15 minutes.':
    'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.',
  'Too many requests. Please try again later.':
    'Demasiadas solicitudes. Inténtalo de nuevo en un momento.',
  'Invalid or expired reset code': 'El código es inválido o ya expiró. Solicita uno nuevo.',
  'Invalid or expired token': 'El código es inválido o ya expiró. Solicita uno nuevo.',
  'Password must be at least 8 characters': 'La contraseña debe tener al menos 8 caracteres.',
  'Password must contain uppercase, lowercase, number, and special character':
    'La contraseña debe incluir mayúscula, minúscula, número y un símbolo (@$!%*?&#).',
  'Passwords do not match': 'Las contraseñas no coinciden.',
  'El código debe tener 6 dígitos': 'El código debe tener 6 dígitos.',
};

/** Mensajes por defecto según el código de estado HTTP. */
const STATUS_FALLBACK: Record<number, string> = {
  400: 'Los datos enviados no son válidos.',
  401: 'DNI o contraseña incorrectos.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No se encontró el recurso solicitado.',
  409: 'Conflicto con el estado actual. Revisa los datos.',
  429: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
  500: 'Ocurrió un error en el servidor. Inténtalo más tarde.',
};

/**
 * Devuelve un mensaje legible a partir de un error de axios (o cualquier error).
 * @param error  El error capturado.
 * @param fallback Mensaje por defecto si no se puede determinar otro.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error. Inténtalo de nuevo.'): string {
  const anyErr = error as any;

  // Sin respuesta del servidor → problema de red/conexión.
  if (anyErr?.isAxiosError && !anyErr.response) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  }

  const backendMsg: string | undefined = anyErr?.response?.data?.error?.message
    ?? anyErr?.response?.data?.message;

  // Si es un error de validación con detalles, mostrar el primer detalle (más útil).
  const details = anyErr?.response?.data?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    const first = details[0];
    const detailMsg = typeof first === 'string' ? first : first?.message;
    if (detailMsg) return TRANSLATIONS[detailMsg] || detailMsg;
  }

  if (backendMsg) {
    return TRANSLATIONS[backendMsg] || backendMsg;
  }

  const status: number | undefined = anyErr?.response?.status;
  if (status && STATUS_FALLBACK[status]) {
    return STATUS_FALLBACK[status];
  }

  return fallback;
}
