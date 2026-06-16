/**
 * VITMATERNA — Formato de "última conexión" estilo WhatsApp.
 *
 * Convierte una fecha ISO en un texto humano y cercano:
 *   - hoy      → "últ. vez hoy 10:30"
 *   - ayer     → "últ. vez ayer 21:05"
 *   - <7 días  → "últ. vez el lunes 09:12"
 *   - resto    → "últ. vez el 12/06/2026"
 */
export function formatLastSeen(iso?: string | null): string {
  if (!iso) return 'desconectada';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'desconectada';

  const now = new Date();
  const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000);

  if (diffDays <= 0) return `últ. vez hoy ${hora}`;
  if (diffDays === 1) return `últ. vez ayer ${hora}`;
  if (diffDays < 7) {
    const dia = d.toLocaleDateString('es-PE', { weekday: 'long' });
    return `últ. vez el ${dia} ${hora}`;
  }
  return `últ. vez el ${d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}
