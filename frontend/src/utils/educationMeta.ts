/**
 * Metadatos compartidos del módulo de educación: etiquetas, iconos y colores
 * por categoría y tipo de contenido. Centralizado para que el feed de la
 * gestante y la gestión del admin se mantengan consistentes.
 */
import {
  BookOpen, Apple, Pill, Baby, HeartPulse, Brain, Sparkles, ShieldAlert,
  FileText, Image as ImageIcon, Video, Headphones, HelpCircle, type LucideIcon,
} from 'lucide-react-native';
import { semanticColors, gestanteColors, obstetraColors, accentColors } from '../theme/colors';

export interface CategoryMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  nutricion: { key: 'nutricion', label: 'Nutrición', icon: Apple, color: semanticColors.success, bg: semanticColors.successLight },
  suplementos: { key: 'suplementos', label: 'Suplementos', icon: Pill, color: gestanteColors.primary, bg: gestanteColors.primaryLight },
  signos_alarma: { key: 'signos_alarma', label: 'Signos de alarma', icon: ShieldAlert, color: semanticColors.danger, bg: semanticColors.dangerLight },
  parto: { key: 'parto', label: 'Parto', icon: HeartPulse, color: semanticColors.danger, bg: semanticColors.dangerLight },
  lactancia: { key: 'lactancia', label: 'Lactancia', icon: Baby, color: semanticColors.warning, bg: semanticColors.warningLight },
  cuidado_bebe: { key: 'cuidado_bebe', label: 'Cuidado del bebé', icon: Sparkles, color: obstetraColors.primary, bg: obstetraColors.primaryLight },
  salud_mental: { key: 'salud_mental', label: 'Salud mental', icon: Brain, color: accentColors.teal, bg: accentColors.tealLight },
  general: { key: 'general', label: 'General', icon: BookOpen, color: gestanteColors.primary, bg: gestanteColors.primaryLight },
};

export function categoryMeta(categoria?: string | null): CategoryMeta {
  return CATEGORY_META[(categoria || 'general') as string] || CATEGORY_META.general;
}

export interface TypeMeta {
  label: string;
  icon: LucideIcon;
}

export const TYPE_META: Record<string, TypeMeta> = {
  articulo: { label: 'Artículo', icon: FileText },
  infografia: { label: 'Infografía', icon: ImageIcon },
  video: { label: 'Video', icon: Video },
  audio: { label: 'Audio', icon: Headphones },
  faq: { label: 'Preguntas frecuentes', icon: HelpCircle },
};

export function typeMeta(tipo?: string | null): TypeMeta {
  return TYPE_META[(tipo || 'articulo') as string] || TYPE_META.articulo;
}

/** Tiempo estimado de lectura: usa duracionMin si existe, si no lo estima por nº de palabras. */
export function readingTime(contenido: string, duracionMin?: number | null): string {
  if (duracionMin && duracionMin > 0) return `${duracionMin} min`;
  const words = (contenido || '').trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min de lectura`;
}

export { semanticColors };
