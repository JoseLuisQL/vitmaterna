/**
 * VITMATERNA — Feature flags (alcance del sistema).
 *
 * Permite ACTIVAR/OCULTAR módulos sin borrar código ni datos. Cada módulo del
 * sistema tiene una bandera booleana; la fuente de verdad es SystemConfig (clave
 * `featureFlags`, editable por el administrador) combinada con los valores por
 * defecto de este archivo.
 *
 * Diseño de seguridad (no romper nada):
 *  - Si una bandera NO está definida en SystemConfig, se usa el default de aquí.
 *  - Los módulos CORE (citas, tratamientos, chat, etc.) NO son flaggeables: están
 *    siempre activos.
 *  - Solo los módulos "fuera de alcance" para los objetivos de la tesis son
 *    apagables. Cambiar un flag es reversible y no toca la base de datos.
 *
 * Objetivos de la tesis (referencia):
 *  1) Eficacia del seguimiento prenatal  → citas, recordatorios, controles
 *  2) Adherencia a los tratamientos      → tratamientos, vacunas, educación
 */
import { getConfigValue } from './systemSettings.js';

/** Módulos cuyo acceso puede activarse/desactivarse por configuración. */
export type FeatureModule =
  | 'ecografias'
  | 'pesoRegistros'
  | 'tamizajeViolencia'
  | 'tamizajeSaludMental'
  | 'patologias'
  | 'odontograma'
  | 'consejeriaNutricional';

/**
 * Valores por defecto de cada bandera.
 *
 * Fase 3: los 7 módulos fuera del alcance de los objetivos de la tesis quedan
 * DESACTIVADOS por defecto (ningún indicador Likert los mide). Siguen en la base
 * de datos y el código; el administrador puede reactivarlos cuando quiera desde
 * el panel (PUT /admin/feature-flags). Nada se borra.
 */
export const DEFAULT_FEATURE_FLAGS: Record<FeatureModule, boolean> = {
  ecografias: false,
  pesoRegistros: false,
  tamizajeViolencia: false,
  tamizajeSaludMental: false,
  patologias: false,
  odontograma: false,
  consejeriaNutricional: false,
};

/** Etiqueta legible de cada módulo (para el panel admin). */
export const FEATURE_LABELS: Record<FeatureModule, string> = {
  ecografias: 'Ecografías',
  pesoRegistros: 'Registros de peso',
  tamizajeViolencia: 'Tamizaje de violencia',
  tamizajeSaludMental: 'Tamizaje de salud mental (SRQ-18)',
  patologias: 'Patologías (CIE-10)',
  odontograma: 'Odontograma',
  consejeriaNutricional: 'Consejería nutricional',
};

/**
 * Devuelve el mapa completo de banderas: defaults combinados con lo guardado en
 * SystemConfig (clave `featureFlags`). Valores inválidos se ignoran.
 */
export async function getFeatureFlags(): Promise<Record<FeatureModule, boolean>> {
  const stored = (await getConfigValue('featureFlags').catch(() => undefined)) as
    | Partial<Record<FeatureModule, unknown>>
    | undefined;

  const result = { ...DEFAULT_FEATURE_FLAGS };
  if (stored && typeof stored === 'object') {
    for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureModule[]) {
      const v = stored[key];
      if (typeof v === 'boolean') result[key] = v;
      else if (v === 'true') result[key] = true;
      else if (v === 'false') result[key] = false;
    }
  }
  return result;
}

/** Indica si un módulo concreto está activo. */
export async function isFeatureEnabled(module: FeatureModule): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[module];
}
