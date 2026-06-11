import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';

/**
 * Pruebas de integración de la bandeja de notificaciones in-app (Fase 7).
 * Genera notificaciones reales mediante el flujo de citas (confirmar) y
 * verifica el listado, el conteo de no leídas y el marcado como leídas.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string): Promise<string> {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken;
}

describe('Notifications API (Fase 7)', () => {
  let app: Express;
  let obstetraToken: string;
  let gestanteToken: string;
  let gestanteId: string;

  beforeAll(async () => {
    app = createApp();
    obstetraToken = await login(app, '11111111', 'Test@1234');
    gestanteToken = await login(app, '33333333', 'Test@1234');

    const own = await request(app)
      .get(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    gestanteId = own.body.data?.[0]?.gestanteId;

    // Genera una notificación para el obstetra: la gestante confirma una cita.
    // Usa una fecha aleatoria a futuro para evitar choques con datos persistidos.
    const year = 2030 + Math.floor(Math.random() * 20);
    const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
    const create = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, fecha: `${year}-${month}-${day}`, hora: '08:00' });
    const apptId = create.body.data?.id;
    if (apptId) {
      await request(app)
        .patch(`${PREFIX}/appointments/${apptId}/confirm`)
        .set('Authorization', `Bearer ${gestanteToken}`);
    }
  });

  it('GET /notifications devuelve la lista del usuario', async () => {
    const res = await request(app)
      .get(`${PREFIX}/notifications`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('titulo');
    expect(res.body.data[0]).toHaveProperty('mensaje');
  });

  it('GET /notifications/unread-count devuelve un número', async () => {
    const res = await request(app)
      .get(`${PREFIX}/notifications/unread-count`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.count).toBe('number');
    expect(res.body.data.count).toBeGreaterThan(0);
  });

  it('PATCH /notifications/:id/read marca una como leída', async () => {
    const list = await request(app)
      .get(`${PREFIX}/notifications?soloNoLeidas=true`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    const id = list.body.data[0].id;

    const res = await request(app)
      .patch(`${PREFIX}/notifications/${id}/read`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.leidaAt).toBeTruthy();
  });

  it('no permite marcar una notificación de otro usuario (404)', async () => {
    const list = await request(app)
      .get(`${PREFIX}/notifications`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    const ajena = list.body.data[0]?.id;

    const res = await request(app)
      .patch(`${PREFIX}/notifications/${ajena}/read`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    expect(res.status).toBe(404);
  });

  it('PATCH /notifications/read-all deja el conteo en 0', async () => {
    await request(app)
      .patch(`${PREFIX}/notifications/read-all`)
      .set('Authorization', `Bearer ${obstetraToken}`);

    const count = await request(app)
      .get(`${PREFIX}/notifications/unread-count`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(count.body.data.count).toBe(0);
  });

  it('requiere autenticación (401 sin token)', async () => {
    const res = await request(app).get(`${PREFIX}/notifications`);
    expect(res.status).toBe(401);
  });
});
