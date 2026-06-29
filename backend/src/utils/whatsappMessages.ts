/**
 * VITMATERNA — Formateador de mensajes de WhatsApp
 *
 * Centraliza TODOS los textos que se envían por WhatsApp con formato nativo
 * de la plataforma: *negrita*, _cursiva_, ~tachado~, saltos de línea (\n) y
 * emojis. Cada función produce un mensaje ordenado, profesional y bonito,
 * adaptado al contexto clínico.
 *
 * WhatsApp interpreta estos marcadores en el cuerpo del mensaje (no requiere
 * API especial): el cliente del destinatario los renderiza.
 *
 * Convención de la marca:
 *  - Encabezado con emoji + *VitMaterna* en negrita + subtítulo del evento.
 *  - Cuerpo estructurado con líneas separadas (no párrafos pegados).
 *  - Datos clave en *negrita*; instrucciones en _cursiva_.
 *  - Cierre cálido y corto (¡gracias!, ¡sigue así!).
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const BRAND = '🏥 *VitMaterna*';

/** Construye un encabezado de marca consistente: emoji + marca + subtítulo. */
function header(emoji: string, subtitle: string): string {
  return `${emoji} *VitMaterna* — ${subtitle}`;
}

// ─── Recordatorios de cita prenatal ──────────────────────────────────────────

/**
 * Recordatorio de cita prenatal a 1 día (GESTANTE).
 * Incluye la instrucción de responder 1/2 para confirmar/reprogramar por WhatsApp.
 */
export function waAppointmentReminderGestante(
  firstName: string,
  dateStr: string,
  timeStr = '9:00 AM',
): string {
  return [
    header('🏥', 'Control Prenatal'),
    '',
    `Hola _${firstName}_ 🤰`,
    '',
    'Tienes tu control prenatal *mañana*:',
    `📅 ${dateStr}`,
    `🕐 ${timeStr}`,
    '',
    'Responde:',
    '   ✅ *1* — Confirmar cita',
    '   📅 *2* — Reprogramar',
    '',
    '_¡Tu asistencia es muy importante para tu salud y la de tu bebé!_ 👶',
  ].join('\n');
}

/**
 * Recordatorio de cita prenatal a 1 día (ACOMPAÑANTE).
 * Tono más breve: informa y motiva a acompañar.
 */
export function waAppointmentReminderAcompanante(
  firstName: string,
  dateStr: string,
  timeStr = '9:00 AM',
): string {
  return [
    header('🏥', 'Control Prenatal'),
    '',
    `_${firstName}_ tiene su control prenatal *mañana*:`,
    `📅 ${dateStr} · 🕐 ${timeStr}`,
    '',
    '_Acompáñala, tu apoyo es muy importante_ 💙',
  ].join('\n');
}

// ─── Recordatorio de suplemento ─────────────────────────────────────────────

/**
 * Recordatorio diario de toma de suplemento (hierro/ácido fólico).
 */
export function waSupplementReminder(
  firstName: string,
  nombre: string,
  dosis: string,
  horaTxt: string,
): string {
  return [
    header('💊', 'Recordatorio de suplemento'),
    '',
    `Hola _${firstName}_ 👋`,
    '',
    'No olvides tomar tu:',
    `💊 *${nombre}* — ${dosis}`,
    `🕐 ${horaTxt}`,
    '',
    '_Registra tu consumo en la app de VitMaterna_ 📱',
  ].join('\n');
}

// ─── Emergencia / Botón de auxilio ───────────────────────────────────────────

/**
 * Alerta de EMERGENCIA (botón de pánico) al obstetra.
 * Incluye datos de la gestante, riesgo, teléfono y enlace de ubicación.
 */
export function waEmergencyAlert(
  nombre: string,
  egTexto: string,
  riesgo: string,
  telefono: string,
  mapsUrl: string,
): string {
  return [
    '🚨 *EMERGENCIA — Botón de Auxilio* 🚨',
    '',
    `👤 Paciente: *${nombre}*${egTexto}`,
    `⚠️ Riesgo: *${riesgo}*`,
    `📞 Teléfono: ${telefono}`,
    `📍 Ubicación: ${mapsUrl}`,
    '',
    '_Contáctala de inmediato_ ⚡',
  ].join('\n');
}

// ─── Signo de alarma grave ───────────────────────────────────────────────────

/**
 * Alerta de signo de alarma GRAVE al obstetra.
 */
export function waDangerSignAlert(nombre: string, tipoSigno: string): string {
  return [
    '⚠️ *SIGNO DE ALARMA GRAVE*',
    '',
    `👤 Paciente: *${nombre}*`,
    `🩺 Síntoma: *${tipoSigno}*`,
    '',
    '_Requiere atención inmediata_ 🚨',
  ].join('\n');
}

// ─── Cita no asistida ────────────────────────────────────────────────────────

/**
 * Aviso al obstetra de que una gestante no asistió a su control.
 */
export function waMissedAppointment(nombre: string, dateStr: string): string {
  return [
    '⚠️ *Cita no asistida*',
    '',
    `👤 ${nombre}`,
    `📅 ${dateStr}`,
    '',
    '_Considera una visita domiciliaria o llamada_ 📞',
  ].join('\n');
}

// ─── Baja adherencia al tratamiento ──────────────────────────────────────────

/**
 * Alerta al obstetra de adherencia < 50%.
 */
export function waLowAdherence(nombre: string, tratamiento: string, adherencia: number): string {
  return [
    '⚠️ *Baja adherencia al tratamiento*',
    '',
    `👤 ${nombre}`,
    `💊 ${tratamiento}`,
    `📊 Adherencia: *${adherencia}%*`,
    '',
    '_Recomienda intervención o seguimiento_ 🩺',
  ].join('\n');
}

// ─── FPP próxima (fecha probable de parto) ───────────────────────────────────

/**
 * Aviso a la gestante de que su fecha probable de parto se acerca.
 */
export function waFppReminder(firstName: string, diasRestantes: number): string {
  return [
    header('👶', 'Tu parto se acerca'),
    '',
    `Hola _${firstName}_ 🤰`,
    '',
    'Tu fecha probable de parto se acerca:',
    `📅 Faltan ~*${diasRestantes} días*`,
    '',
    '_Prepara tu plan de parto y tus cosas para el bebé_ 🍼🧸',
  ].join('\n');
}

// ─── Exámenes pendientes ─────────────────────────────────────────────────────

/**
 * Alerta al obstetra de exámenes de laboratorio pendientes.
 */
export function waPendingExams(nombreGestante: string, egWeeks: number, faltantes: string): string {
  return [
    '🧪 *Exámenes pendientes*',
    '',
    `👤 ${nombreGestante} (sem. ${egWeeks})`,
    `📋 Faltantes: ${faltantes}`,
    '',
    '_Registra los resultados cuando estén listos_ 🩺',
  ].join('\n');
}

// ─── Visita domiciliaria ─────────────────────────────────────────────────────

/**
 * Aviso a la gestante de una visita domiciliaria programada.
 */
export function waHomeVisit(firstName: string, dateStr: string): string {
  return [
    header('🏥', 'Visita Domiciliaria'),
    '',
    `Hola _${firstName}_ 👋`,
    '',
    'Tu obstetra realizará una visita domiciliaria:',
    `📅 ${dateStr}`,
    '',
    '_Por favor, mantente disponible_ 🏠',
    '',
    '¡Gracias! 💙',
  ].join('\n');
}

// ─── Chat → WhatsApp (reenvío de mensajes) ───────────────────────────────────

/**
 * Prefijo para reenviar un mensaje de chat por WhatsApp.
 * No incluye el texto del mensaje (se concatena luego).
 */
export function waChatForward(senderName: string): string {
  return `💬 *${senderName}* (VitMaterna):`;
}

/**
 * Mensaje cuando se reenvía una imagen del chat por WhatsApp.
 */
export function waChatImageForward(senderName: string, text?: string): string {
  const prefix = `💬 *${senderName}* (VitMaterna):`;
  if (text?.trim()) {
    return `${prefix}\n📷 ${text.trim()}`;
  }
  return `${prefix}\n📷 Te envió una foto. Ábrela en la app de VitMaterna.`;
}

// ─── Respuestas de comandos (OpenWA inbound) ────────────────────────────────

/**
 * Respuesta automática cuando la gestante confirma su cita por WhatsApp.
 */
export function waReplyCitaConfirmada(): string {
  return [
    '✅ *¡Listo!*',
    '',
    'Tu cita quedó *CONFIRMADA*.',
    'Te esperamos en tu centro de salud.',
    '',
    'Si necesitas cambiarla, responde *2*.',
  ].join('\n');
}

/**
 * Respuesta automática cuando la gestante pide reprogramar por WhatsApp.
 */
export function waReplyCitaReprogramar(): string {
  return [
    '📅 *Reprogramación solicitada*',
    '',
    'Tu obstetra te contactará para coordinar una nueva fecha.',
    '_Gracias por avisarnos_ 💙',
  ].join('\n');
}

/**
 * Respuesta automática cuando la gestante confirma la toma de suplemento.
 */
export function waReplySuplementoTomado(): string {
  return [
    '¡Excelente! 💊',
    '',
    'Registramos que ya tomaste tu suplemento de hoy.',
    '',
    '_¡Sigue así por tu salud y la de tu bebé!_ 👶💙',
  ].join('\n');
}

/**
 * Aviso al obstetra de que una gestante pidió reprogramar por WhatsApp.
 */
export function waReplyReprogramarAviso(nombre: string, dateStr: string): string {
  return [
    '📅 *Reprogramación solicitada*',
    '',
    `👤 *${nombre}* pidió reprogramar su cita del:`,
    `📅 ${dateStr}`,
    '',
    '_Respondió por WhatsApp. Contáctala para coordinar._ 📞',
  ].join('\n');
}
