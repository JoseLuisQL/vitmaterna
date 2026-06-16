/**
 * Metadatos compartidos del módulo de educación: etiquetas, iconos y colores
 * por categoría y tipo de contenido. Centralizado para que el feed de la
 * gestante y la gestión del admin se mantengan consistentes.
 */
import {
  BookOpen, Apple, Pill, Baby, HeartPulse, Brain, Sparkles, ShieldAlert,
  FileText, Image as ImageIcon, Video, Headphones, HelpCircle, type LucideIcon,
} from 'lucide-react-native';
import { semanticColors, gestanteColors } from '../theme/colors';

export interface CategoryMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  nutricion: { key: 'nutricion', label: 'Nutrición', icon: Apple, color: '#30A46C', bg: '#E7F6EE' },
  suplementos: { key: 'suplementos', label: 'Suplementos', icon: Pill, color: '#8B7FD4', bg: '#F3F1FB' },
  signos_alarma: { key: 'signos_alarma', label: 'Signos de alarma', icon: ShieldAlert, color: '#E5484D', bg: '#FDECEC' },
  parto: { key: 'parto', label: 'Parto', icon: HeartPulse, color: '#E5484D', bg: '#FDECEC' },
  lactancia: { key: 'lactancia', label: 'Lactancia', icon: Baby, color: '#F5A623', bg: '#FEF4E6' },
  cuidado_bebe: { key: 'cuidado_bebe', label: 'Cuidado del bebé', icon: Sparkles, color: '#4A90D9', bg: '#EDF4FB' },
  salud_mental: { key: 'salud_mental', label: 'Salud mental', icon: Brain, color: '#0EA5B7', bg: '#E4F7F9' },
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
