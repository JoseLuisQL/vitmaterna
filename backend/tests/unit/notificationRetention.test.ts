import { describe, it, expect } from '@jest/globals';
import {
  RETENTION_DAYS,
  fechaCorteRetencion,
  debeEliminarsePorRetencion,
} from '../../src/utils/notificationRetention.js';

describe('Retención de notificaciones', () => {
  const REF = new Date('2026-06-18T12:00:00.000Z');
  const diasAtras = (n: number) => new Date(REF.getTime() - n * 24 * 60 * 60 * 1000);

  it('la fecha de corte es 30 días antes por defecto', () => {
    const corte = fechaCorteRetencion(REF);
    expect(corte.getTime()).toBe(REF.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  });

  it('NO elimina notificaciones no leídas, por antiguas que sean', () => {
    expect(debeEliminarsePorRetencion({ leidaAt: null }, REF)).toBe(false);
  });

  it('elimina leídas más antiguas que el umbral', () => {
    expect(debeEliminarsePorRetencion({ leidaAt: diasAtras(31) }, REF)).toBe(true);
    expect(debeEliminarsePorRetencion({ leidaAt: diasAtras(45) }, REF)).toBe(true);
  });

  it('conserva leídas dentro del umbral', () => {
    expect(debeEliminarsePorRetencion({ leidaAt: diasAtras(10) }, REF)).toBe(false);
    expect(debeEliminarsePorRetencion({ leidaAt: diasAtras(29) }, REF)).toBe(false);
  });

  it('acepta umbral personalizado', () => {
    expect(debeEliminarsePorRetencion({ leidaAt: diasAtras(8) }, REF, 7)).toBe(true);
    expect(debeEliminarsePorRetencion({ leidaAt: diasAtras(5) }, REF, 7)).toBe(false);
  });

  it('acepta leidaAt como string ISO', () => {
    expect(debeEliminarsePorRetencion({ leidaAt: diasAtras(40).toISOString() }, REF)).toBe(true);
  });

  it('fecha inválida no rompe', () => {
    expect(debeEliminarsePorRetencion({ leidaAt: 'no-es-fecha' }, REF)).toBe(false);
  });
});
