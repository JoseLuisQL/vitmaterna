import { describe, it, expect } from '@jest/globals';
import {
  prioridadEstado,
  compararPorPrioridad,
  ordenarPorPrioridad,
} from '../../src/utils/appointmentPriority.js';

describe('Priorización de citas', () => {
  describe('prioridadEstado', () => {
    it('asigna pesos en el orden clínico esperado', () => {
      expect(prioridadEstado('solicitud_reprogramacion')).toBeLessThan(prioridadEstado('confirmada'));
      expect(prioridadEstado('confirmada')).toBeLessThan(prioridadEstado('programada'));
      expect(prioridadEstado('programada')).toBeLessThan(prioridadEstado('reprogramada'));
      expect(prioridadEstado('reprogramada')).toBeLessThan(prioridadEstado('asistida'));
      expect(prioridadEstado('asistida')).toBeLessThan(prioridadEstado('cancelada'));
    });

    it('los estados desconocidos van al final', () => {
      expect(prioridadEstado('xxx')).toBe(99);
      expect(prioridadEstado(null)).toBe(99);
      expect(prioridadEstado(undefined)).toBe(99);
    });
  });

  describe('ordenarPorPrioridad', () => {
    it('confirmadas antes que programadas, aunque la programada sea más temprana', () => {
      const lista = [
        { estado: 'programada', fecha: '2026-06-19' },
        { estado: 'confirmada', fecha: '2026-06-20' },
      ];
      const out = ordenarPorPrioridad(lista);
      expect(out[0].estado).toBe('confirmada');
      expect(out[1].estado).toBe('programada');
    });

    it('dentro del mismo estado, la fecha más cercana va primero', () => {
      const lista = [
        { estado: 'confirmada', fecha: '2026-06-25' },
        { estado: 'confirmada', fecha: '2026-06-20' },
        { estado: 'confirmada', fecha: '2026-06-22' },
      ];
      const out = ordenarPorPrioridad(lista);
      expect(out.map((a) => a.fecha)).toEqual(['2026-06-20', '2026-06-22', '2026-06-25']);
    });

    it('desempata por hora cuando la fecha es la misma', () => {
      const lista = [
        { estado: 'confirmada', fecha: '2026-06-20', hora: '1970-01-01T11:00:00.000Z' },
        { estado: 'confirmada', fecha: '2026-06-20', hora: '1970-01-01T08:30:00.000Z' },
      ];
      const out = ordenarPorPrioridad(lista);
      expect(out[0].hora).toBe('1970-01-01T08:30:00.000Z');
    });

    it('solicitud_reprogramacion encabeza todo (acción del obstetra)', () => {
      const lista = [
        { estado: 'confirmada', fecha: '2026-06-19' },
        { estado: 'solicitud_reprogramacion', fecha: '2026-06-30' },
        { estado: 'asistida', fecha: '2026-06-01' },
      ];
      const out = ordenarPorPrioridad(lista);
      expect(out[0].estado).toBe('solicitud_reprogramacion');
      expect(out[out.length - 1].estado).toBe('asistida');
    });

    it('no muta el arreglo original', () => {
      const lista = [
        { estado: 'programada', fecha: '2026-06-19' },
        { estado: 'confirmada', fecha: '2026-06-20' },
      ];
      const copia = [...lista];
      ordenarPorPrioridad(lista);
      expect(lista).toEqual(copia);
    });
  });

  describe('compararPorPrioridad', () => {
    it('devuelve negativo cuando a tiene mayor prioridad que b', () => {
      const r = compararPorPrioridad(
        { estado: 'confirmada', fecha: '2026-06-25' },
        { estado: 'programada', fecha: '2026-06-20' },
      );
      expect(r).toBeLessThan(0);
    });
  });
});
