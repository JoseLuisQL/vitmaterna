import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';

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
});
