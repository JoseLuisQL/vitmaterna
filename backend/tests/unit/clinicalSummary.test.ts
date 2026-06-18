import { describe, it, expect } from '@jest/globals';
import { generarResumenClinico } from '../../src/utils/clinicalSummary.js';

describe('Resumen clínico autogenerado', () => {
  const REF = new Date('2026-06-18T12:00:00.000Z');

  it('incluye edad gestacional y trimestre cuando hay FUM', () => {
    // FUM ~20 semanas antes de la referencia.
    const fum = new Date('2026-01-29T00:00:00.000Z');
    const r = generarResumenClinico({ nombre: 'Ana', edad: 28, fum }, REF);
    expect(r.texto).toContain('Ana');
    expect(r.texto).toMatch(/semanas de gestación/);
    expect(r.destacados.trimestre).toBe(2);
    expect(r.destacados.egTexto).toBeTruthy();
  });

  it('marca alto riesgo como alerta', () => {
    const r = generarResumenClinico({ nombre: 'Lucía', nivelRiesgo: 'rojo' }, REF);
    expect(r.destacados.riesgo).toBe('ALTO RIESGO');
    expect(r.alertas.some((a) => a.toLowerCase().includes('alto riesgo'))).toBe(true);
  });

  it('clasifica anemia desde la hemoglobina corregida y la marca como alerta', () => {
    const r = generarResumenClinico({ ultimaHb: { valorCorregido: 9.5 } }, REF);
    expect(r.destacados.anemia).toBe('moderada');
    expect(r.alertas.some((a) => a.toLowerCase().includes('anemia'))).toBe(true);
    expect(r.texto).toMatch(/anemia moderada/);
  });

  it('hemoglobina normal no genera alerta de anemia', () => {
    const r = generarResumenClinico({ ultimaHb: { valorCorregido: 12 } }, REF);
    expect(r.destacados.anemia).toBe('normal');
    expect(r.alertas.some((a) => a.toLowerCase().includes('anemia'))).toBe(false);
  });

  it('alerta por presión arterial elevada en el último control', () => {
    const r = generarResumenClinico({
      ultimoControl: { fecha: REF, numeroControl: 3, presionSistolica: 150, presionDiastolica: 95 },
    }, REF);
    expect(r.alertas.some((a) => a.toLowerCase().includes('presión'))).toBe(true);
    expect(r.texto).toContain('150/95');
  });

  it('alerta por adherencia baja', () => {
    const r = generarResumenClinico({ adherenciaPct: 40 }, REF);
    expect(r.destacados.adherencia).toBe(40);
    expect(r.alertas.some((a) => a.toLowerCase().includes('adherencia'))).toBe(true);
  });

  it('lista exámenes pendientes como alerta', () => {
    const r = generarResumenClinico({ examenesPendientes: ['Hemoglobina', 'VIH'] }, REF);
    expect(r.texto).toContain('Hemoglobina');
    expect(r.alertas.some((a) => a.includes('Exámenes pendientes'))).toBe(true);
  });

  it('marca falta de próxima cita y de controles cuando no hay datos', () => {
    const r = generarResumenClinico({ nombre: 'María' }, REF);
    expect(r.alertas.some((a) => a.includes('Sin próxima cita'))).toBe(true);
    expect(r.alertas.some((a) => a.toLowerCase().includes('sin controles'))).toBe(true);
    expect(r.texto).toBeTruthy();
  });

  it('siempre devuelve un texto no vacío', () => {
    expect(generarResumenClinico({}, REF).texto.length).toBeGreaterThan(0);
  });
});
