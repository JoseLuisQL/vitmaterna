import { describe, it, expect } from '@jest/globals';
import { predictNoShow, haversineKm } from '../../src/utils/noShowPrediction.js';

describe('Predicción de inasistencia', () => {
  describe('predictNoShow', () => {
    it('gestante puntual y adherente → riesgo bajo', () => {
      const r = predictNoShow({
        inasistenciasPrevias: 0,
        asistenciasPrevias: 6,
        reprogramacionesPrevias: 0,
        adherenciaPct: 95,
        distanciaKm: 2,
        tieneAcompanante: true,
        nivelRiesgo: 'verde',
      });
      expect(r.level).toBe('bajo');
      expect(r.score).toBeLessThan(25);
      expect(r.motivos).toContain('Buen historial de asistencia');
    });

    it('alta tasa de inasistencia → riesgo alto', () => {
      const r = predictNoShow({
        inasistenciasPrevias: 4,
        asistenciasPrevias: 2,
        adherenciaPct: 40,
      });
      expect(r.level).toBe('alto');
      expect(r.score).toBeGreaterThanOrEqual(50);
      expect(r.motivos.some((m) => m.includes('Faltó'))).toBe(true);
    });

    it('factores moderados acumulan a riesgo medio', () => {
      const r = predictNoShow({
        inasistenciasPrevias: 1,
        asistenciasPrevias: 3,
        adherenciaPct: 70,
        distanciaKm: 8,
      });
      expect(r.level).toBe('medio');
      expect(r.score).toBeGreaterThanOrEqual(25);
      expect(r.score).toBeLessThan(50);
    });

    it('la distancia larga y falta de acompañante suman riesgo', () => {
      const cerca = predictNoShow({ asistenciasPrevias: 2, distanciaKm: 1, tieneAcompanante: true });
      const lejos = predictNoShow({ asistenciasPrevias: 2, distanciaKm: 20, tieneAcompanante: false });
      expect(lejos.score).toBeGreaterThan(cerca.score);
      expect(lejos.motivos.some((m) => m.toLowerCase().includes('lejos'))).toBe(true);
    });

    it('sin datos previos no rompe y da bajo riesgo', () => {
      const r = predictNoShow({});
      expect(r.score).toBe(0);
      expect(r.level).toBe('bajo');
    });

    it('el score nunca supera 100 ni baja de 0', () => {
      const r = predictNoShow({
        inasistenciasPrevias: 10,
        asistenciasPrevias: 0,
        reprogramacionesPrevias: 9,
        adherenciaPct: 0,
        distanciaKm: 100,
        tieneAcompanante: false,
        nivelRiesgo: 'rojo',
      });
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.level).toBe('alto');
    });
  });

  describe('haversineKm', () => {
    it('distancia 0 entre el mismo punto', () => {
      expect(haversineKm(-13.65, -73.38, -13.65, -73.38)).toBeCloseTo(0, 3);
    });

    it('calcula una distancia plausible entre dos puntos cercanos', () => {
      // ~1.5 km aprox entre dos puntos en Andahuaylas.
      const d = haversineKm(-13.655, -73.387, -13.668, -73.39);
      expect(d).toBeGreaterThan(0.5);
      expect(d).toBeLessThan(3);
    });
  });
});
