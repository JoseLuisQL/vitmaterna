import {
  commonColors,
  gestanteColors,
  obstetraColors,
  semanticColors,
  riskColors,
} from '../src/theme/colors';
import { typography, fontFamilies } from '../src/theme/typography';
import { spacing } from '../src/theme/spacing';

/** Calcula el ratio de contraste WCAG entre dos colores hex. */
function contrastRatio(hex1: string, hex2: string): number {
  const lum = (hex: string) => {
    const c = hex.replace('#', '');
    const rgb = [0, 2, 4].map((i) => parseInt(c.substring(i, i + 2), 16) / 255);
    const lin = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const l1 = lum(hex1);
  const l2 = lum(hex2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe('Sistema de diseño — tokens', () => {
  describe('Accesibilidad de color (WCAG AA)', () => {
    it('texto principal sobre fondo cumple 4.5:1', () => {
      expect(contrastRatio(commonColors.text, commonColors.background)).toBeGreaterThanOrEqual(4.5);
    });
    it('texto secundario sobre fondo cumple 4.5:1', () => {
      expect(contrastRatio(commonColors.textSecondary, commonColors.background)).toBeGreaterThanOrEqual(4.5);
    });
    it('texto principal sobre superficie cumple 4.5:1', () => {
      expect(contrastRatio(commonColors.text, commonColors.surface)).toBeGreaterThanOrEqual(4.5);
    });
    it('acento gestante sobre blanco cumple 3:1 (texto grande/UI)', () => {
      expect(contrastRatio(gestanteColors.primary, commonColors.surface)).toBeGreaterThanOrEqual(3);
    });
    it('acento obstetra sobre blanco cumple 3:1', () => {
      expect(contrastRatio(obstetraColors.primary, commonColors.surface)).toBeGreaterThanOrEqual(3);
    });
    it('texto blanco sobre acento gestante cumple 4.5:1 (botón)', () => {
      expect(contrastRatio(gestanteColors.onPrimary, gestanteColors.primary)).toBeGreaterThanOrEqual(4.5);
    });
    it('texto blanco sobre acento obstetra cumple 4.5:1 (botón)', () => {
      expect(contrastRatio(obstetraColors.onPrimary, obstetraColors.primary)).toBeGreaterThanOrEqual(4.5);
    });
    it('peligro sobre su fondo claro cumple 4.5:1', () => {
      expect(contrastRatio(semanticColors.danger, semanticColors.dangerLight)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Consistencia de la escala', () => {
    it('el espaciado sigue una escala creciente', () => {
      expect(spacing.xs).toBeLessThan(spacing.sm);
      expect(spacing.sm).toBeLessThan(spacing.md);
      expect(spacing.md).toBeLessThan(spacing.lg);
    });
    it('ningún tamaño tipográfico baja del piso de 12px (accesibilidad)', () => {
      Object.values(typography).forEach((style) => {
        expect(style.fontSize).toBeGreaterThanOrEqual(12);
      });
    });
    it('el cuerpo de texto es de al menos 16px', () => {
      expect(typography.body.fontSize).toBeGreaterThanOrEqual(16);
    });
    it('todas las familias tipográficas son Inter cargadas', () => {
      Object.values(fontFamilies).forEach((f) => {
        expect(f.startsWith('Inter_')).toBe(true);
      });
    });
  });

  describe('Semáforo de riesgo', () => {
    it('define los tres niveles con su variante clara', () => {
      expect(riskColors.riskGreen).toBeTruthy();
      expect(riskColors.riskYellow).toBeTruthy();
      expect(riskColors.riskRed).toBeTruthy();
      expect(riskColors.riskGreenLight).toBeTruthy();
      expect(riskColors.riskYellowLight).toBeTruthy();
      expect(riskColors.riskRedLight).toBeTruthy();
    });
  });
});
