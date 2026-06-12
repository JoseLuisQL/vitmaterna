import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Pruebas de integración del módulo de gestantes:
 * cálculo automático de FPP (RF-2.07/2.11).
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

describe('Gestantes API — FPP automática', () => {
  let app: Express;
  let obstetraToken: string;
  let gestanteId: string;

  beforeAll(async () => {
    app = createApp();
    obstetraToken = await login(app, '11111111', 'Test@1234');
    const patients = await request(app)
      .get(`${PREFIX}/patients`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .query({ limit: 1000 });
    gestanteId = patients.body.data[0].id;
  });

  it('expone el DNI normalizado (dni == user.dni) en el listado y el detalle', async () => {
    const list = await request(app)
      .get(`${PREFIX}/patients`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .query({ limit: 1000 });
    expect(list.status).toBe(200);
    expect(list.body.data.every((p: any) => p.dni === p.user?.dni)).toBe(true);

    const detail = await request(app)
      .get(`${PREFIX}/patients/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(detail.body.data.dni).toBe(detail.body.data.user?.dni);
    expect(typeof detail.body.data.dni).toBe('string');
  });

  it('calcula la FPP por la regla de Naegele al establecer la FUM', async () => {
    await request(app)
      .patch(`${PREFIX}/patients/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ fum: '2026-01-01' });

    const res = await request(app)
      .get(`${PREFIX}/patients/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(200);
    // 2026-01-01 + 7 días - 3 meses + 1 año = 2026-10-08
    expect(String(res.body.data.fppFum)).toContain('2026-10-08');
  });

  it('respeta una FPP explícita enviada por el cliente', async () => {
    await request(app)
      .patch(`${PREFIX}/patients/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ fum: '2026-02-01', fppFum: '2026-11-15' });

    const res = await request(app)
      .get(`${PREFIX}/patients/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(String(res.body.data.fppFum)).toContain('2026-11-15');
  });

  describe('Generación automática de citas según configuración (RF-3.02)', () => {
    let adminToken: string;

    beforeAll(async () => {
      adminToken = await login(app, '99999999', 'Admin@2026');
    });

    const countAuto = () =>
      prisma.appointment.count({
        where: { gestanteId, esAutoGenerada: true, estado: 'programada' },
      });

    it('NO genera citas cuando autoGenerarCitas está desactivado', async () => {
      await request(app)
        .put(`${PREFIX}/admin/config`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ autoGenerarCitas: false });
      await prisma.appointment.deleteMany({ where: { gestanteId, esAutoGenerada: true } });

      await request(app)
        .patch(`${PREFIX}/patients/${gestanteId}`)
        .set('Authorization', `Bearer ${obstetraToken}`)
        .send({ fum: '2026-03-01' });

      expect(await countAuto()).toBe(0);
    });

    it('SÍ genera el cronograma cuando autoGenerarCitas está activado', async () => {
      await request(app)
        .put(`${PREFIX}/admin/config`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ autoGenerarCitas: true });

      await request(app)
        .patch(`${PREFIX}/patients/${gestanteId}`)
        .set('Authorization', `Bearer ${obstetraToken}`)
        .send({ fum: '2026-03-15' });

      expect(await countAuto()).toBeGreaterThan(0);
    });

    afterAll(async () => {
      // Dejar el sistema en su estado por defecto (activado) y limpiar.
      await prisma.appointment.deleteMany({ where: { gestanteId, esAutoGenerada: true } });
    });
  });
});
