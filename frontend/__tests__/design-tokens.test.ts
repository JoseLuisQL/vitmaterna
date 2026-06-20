/**
 * Tokens nuevos de la Fase 0 del refactor de diseño:
 * escala de z-index, ritmo vertical (stack) y tokens de movimiento.
 * Garantiza que existen, están ordenados y se exportan por el barrel.
 */
import { zIndex, motion, stack, prefersReducedMotionSync } from '../src/theme';
import { zIndex as zIndexDirect } from '../src/theme/zIndex';
import { stack as stackDirect } from '../src/theme/spacing';
import { commonColors, accentColors, chatColors } from '../src/theme/colors';

describe('Fase 0 — Tokens de diseño', () => {
  describe('Escala de z-index', () => {
    it('se exporta por el barrel y por el módulo', () => {
      expect(zIndex).toBe(zIndexDirect);
    });

    it('respeta el orden de apilamiento semántico', () => {
      expect(zIndex.base).toBeLessThan(zIndex.raised);
      expect(zIndex.raised).toBeLessThan(zIndex.sticky);
      expect(zIndex.sticky).toBeLessThan(zIndex.nav);
      expect(zIndex.nav).toBeLessThan(zIndex.fab);
      expect(zIndex.fab).toBeLessThan(zIndex.overlay);
      expect(zIndex.overlay).toBeLessThan(zIndex.modal);
      expect(zIndex.modal).toBeLessThan(zIndex.popover);
      expect(zIndex.popover).toBeLessThan(zIndex.toast);
      expect(zIndex.toast).toBeLessThan(zIndex.banner);
    });

    it('el toast queda por encima de los modales (regla clave)', () => {
      expect(zIndex.toast).toBeGreaterThan(zIndex.modal);
    });
  });

  describe('Ritmo vertical (stack)', () => {
    it('se exporta por el barrel y por spacing', () => {
      expect(stack).toBe(stackDirect);
    });

    it('sigue una escala creciente sobre el grid de 8pt', () => {
      expect(stack.tight).toBeLessThan(stack.element);
      expect(stack.element).toBeLessThan(stack.group);
      expect(stack.group).toBeLessThan(stack.section);
      expect(stack.section).toBeLessThan(stack.block);
    });
  });

  describe('Movimiento', () => {
    it('define los tokens semánticos principales', () => {
      expect(motion.surface.duration).toBeGreaterThan(0);
      expect(motion.toast.duration).toBeGreaterThan(0);
      expect(motion.press).toBeDefined();
      expect(motion.indicator).toBeDefined();
    });

    it('expone una consulta síncrona de reduce-motion', () => {
      expect(typeof prefersReducedMotionSync()).toBe('boolean');
    });
  });

  describe('Tokens "sobre color" y de marca', () => {
    it('define los blancos translúcidos centralizados', () => {
      expect(commonColors.onColorText).toBeTruthy();
      expect(commonColors.onColorTextSoft).toBeTruthy();
      expect(commonColors.onColorSurface).toBeTruthy();
      expect(commonColors.onColorSurfaceStrong).toBeTruthy();
      expect(commonColors.onColorTrack).toBeTruthy();
      expect(commonColors.bannerBackground).toBeTruthy();
    });
    it('define los colores funcionales de WhatsApp y del chat', () => {
      expect(accentColors.whatsapp).toBe('#25D366');
      expect(accentColors.whatsappLight).toBeTruthy();
      expect(chatColors.readReceipt).toBeTruthy();
      expect(chatColors.tickOnBubble).toBeTruthy();
    });
  });
});
