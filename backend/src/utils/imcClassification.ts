/**
 * Clasificación del IMC pregestacional (categorías WHO/IOM 2009).
 *
 * Se usan estas 4 categorías canónicas en TODO el backend para que la
 * clasificación de la gestante y los rangos de ganancia de peso (RF-5.06)
 * sean coherentes:
 *   bajo_peso  (IMC < 18.5)
 *   normal     (18.5 – 24.9)
 *   sobrepeso  (25 – 29.9)
 *   obesidad   (>= 30)
 */
export type ImcCategory = 'bajo_peso' | 'normal' | 'sobrepeso' | 'obesidad';

export function classifyImc(imc: number): ImcCategory {
  if (imc < 18.5) return 'bajo_peso';
  if (imc < 25) return 'normal';
  if (imc < 30) return 'sobrepeso';
  return 'obesidad';
}

/** Etiqueta legible para mostrar al usuario. */
export function imcCategoryLabel(cat: ImcCategory): string {
  switch (cat) {
    case 'bajo_peso':
      return 'Bajo peso';
    case 'normal':
      return 'Normal';
    case 'sobrepeso':
      return 'Sobrepeso';
    case 'obesidad':
      return 'Obesidad';
  }
}
