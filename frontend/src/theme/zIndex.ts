/**
 * VITMATERNA — Escala única de elevación en Z (z-index)
 *
 * Reemplaza los z-index "mágicos" sueltos (9999, 10, 1…) por una escala
 * semántica y ordenada. Cada capa de la interfaz tiene un único nivel, de modo
 * que las superposiciones (FAB sobre contenido, toast sobre modal, banner
 * offline sobre todo) son predecibles y nunca entran en conflicto.
 *
 * Regla de uso: nunca escribir un número de z-index en una pantalla; importar
 * el nivel semántico desde aquí.
 *
 *   import { zIndex } from '../theme';
 *   style={{ zIndex: zIndex.toast }}
 */
export const zIndex = {
  /** Contenido normal del documento. */
  base: 0,
  /** Elementos elevados dentro del flujo (tarjeta destacada, header sticky). */
  raised: 10,
  /** Cabeceras/encabezados fijos (topbar web, header sticky de tablas). */
  sticky: 100,
  /** Barra de navegación inferior y sidebar fijo. */
  nav: 200,
  /** Botón de acción flotante (FAB). Por debajo de overlays. */
  fab: 300,
  /** Capa atenuada detrás de modales / bottom sheets. */
  overlay: 1000,
  /** Modales, bottom sheets y diálogos. */
  modal: 1100,
  /** Menús contextuales / dropdowns abiertos sobre un modal. */
  popover: 1200,
  /** Notificaciones (toast): siempre por encima de modales. */
  toast: 1300,
  /** Banner global de "sin conexión": la capa más alta. */
  banner: 1400,
} as const;

export type ZIndex = typeof zIndex;
