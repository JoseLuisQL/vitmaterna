import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';

/**
 * Pruebas de integración del módulo clínico y de roles (RBAC).
 * Requieren BD sembrada y Redis activo.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string): Promise<string> {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken;
}

describe('Clinical API', () => {
  let app: Express;
  let obstetraToken: string;
  let gestanteToken: string;
  let gestanteId: string;

  beforeAll(async () => {
    app = createApp();
    obstetraToken = await login(app, '11111111', 'Test@1234');
    gestanteToken = await login(app, '33333333', 'Test@1234');

    const patients = await request(app)
      .get(`${PREFIX}/patients`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .query({ limit: 1000 });
    gestanteId = patients.body.data[0].id;
  });

  it('GET /clinical/treatments (gestante) devuelve 200', async () => {
    const res = await request(app)
      .get(`${PREFIX}/clinical/treatments`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('la gestante reporta un signo de alarma y el obstetra lo ve', async () => {
    const create = await request(app)
      .post(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ tipo_signo: 'Prueba integración', descripcion: 'jest', severidad: 'moderado' });
    expect(create.status).toBe(201);
    const id = create.body.data.id;

    const list = await request(app)
      .get(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((d: any) => d.id === id)).toBe(true);

    // El obstetra lo atiende (registra responsable y tiempo de respuesta)
    const attend = await request(app)
      .patch(`${PREFIX}/clinical/danger-signs/${id}`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ estado: 'atendido', accionTomada: 'Atendido en prueba' });
    expect(attend.status).toBe(200);
    expect(attend.body.data.estado).toBe('atendido');
    expect(attend.body.data.respondidoPor).toBeTruthy();
  });

  it('RBAC: la gestante NO puede atender alarmas (403)', async () => {
    const create = await request(app)
      .post(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ tipo_signo: 'Prueba RBAC', severidad: 'leve' });
    const id = create.body.data.id;

    const res = await request(app)
      .patch(`${PREFIX}/clinical/danger-signs/${id}`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ estado: 'atendido' });
    expect(res.status).toBe(403);
  });

  it('crea y lee un registro de peso de la gestante', async () => {
    const create = await request(app)
      .post(`${PREFIX}/clinical/weight-records`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, egSemanas: 22, peso: 63.2, fecha: '2026-06-11' });
    expect(create.status).toBe(201);

    const list = await request(app)
      .get(`${PREFIX}/clinical/weight-records/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
  });

  it('valida el cuerpo: danger-sign sin tipo_signo → 400', async () => {
    const res = await request(app)
      .post(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ descripcion: 'sin tipo' });
    expect(res.status).toBe(400);
  });
});
