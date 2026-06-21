/**
 * VITMATERNA — Formato del chat (estilo WhatsApp).
 *
 * Centraliza el formato de horas/fechas de la bandeja y del hilo, y el resumen
 * (preview) del último mensaje por tipo. Una sola fuente de verdad para que el
 * chat de la gestante y el del obstetra se vean idénticos y profesionales.
 */
import type { LucideIcon } from 'lucide-react-native';
import { Camera, BookOpen, Siren, MessageSquare } from 'lucide-react-native';

/** Tipo de mensaje persistido por el backend. */
export type ChatMessageTipo = 'texto' | 'imagen' | 'educacion' | 'alerta_emergencia';

/** Hora corta HH:mm (24h, es-PE). */
export function formatTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Marca de tiempo de la BANDEJA (estilo WhatsApp): hoy → "HH:mm",
 * ayer → "Ayer", <7 días → día de la semana, resto → "dd/mm/aa".
 */
export function formatInboxTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000);
  if (diffDays <= 0) return formatTime(iso);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) {
    const dia = d.toLocaleDateString('es-PE', { weekday: 'short' });
    return dia.charAt(0).toUpperCase() + dia.slice(1).replace('.', '');
  }
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/**
 * Etiqueta del SEPARADOR de día dentro del hilo: "Hoy" / "Ayer" /
 * "lunes 12 de junio" para fechas más antiguas.
 */
export function formatDaySeparator(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000);
  if (diffDays <= 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) {
    return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Clave de día (YYYY-MM-DD) para agrupar mensajes por fecha en el hilo. */
export function dayKey(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Resumen corto y profesional de un mensaje para la bandeja (estilo WhatsApp).
 * Nunca expone URLs crudas ni el texto completo de una alerta.
 */
export function chatPreview(
  tipo?: string | null,
  contenido?: string | null,
  fallback = 'Toca para escribir',
): string {
  switch (tipo) {
    case 'imagen':
      return 'Foto';
    case 'educacion':
      return 'Contenido educativo recomendado';
    case 'alerta_emergencia':
      return 'Alerta de emergencia';
    case 'texto': {
      const t = (contenido || '').replace(/\s+/g, ' ').trim();
      return t.length > 80 ? `${t.slice(0, 80)}…` : t || fallback;
    }
    default: {
      const t = (contenido || '').replace(/\s+/g, ' ').trim();
      return t || fallback;
    }
  }
}

/** Icono que acompaña al preview de un mensaje no textual en la bandeja. */
export function previewIcon(tipo?: string | null): LucideIcon | null {
  switch (tipo) {
    case 'imagen':
      return Camera;
    case 'educacion':
      return BookOpen;
    case 'alerta_emergencia':
      return Siren;
    default:
      return null;
  }
}

export { MessageSquare };
