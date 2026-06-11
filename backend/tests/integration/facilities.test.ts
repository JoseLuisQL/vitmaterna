import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Pruebas de integración de la gestión de establecimientos (RF-10.02).
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

describe('Establecimientos de salud (admin)', () => {
  let app: Express;
  let adminToken: string;
  let obstetraToken: string;
  let createdId: string;

  beforeAll(async () => {
    app = createApp();
    adminToken = await login(app, '99999999', 'Admin@2026');
    obstetraToken = await login(app, '11111111', 'Test@1234');
  });

  it('el admin crea un establecimiento', async () => {
    const res = await request(app)
      .post(`${PREFIX}/admin/facilities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'C.S. Jest', codigo: 'JEST01', telefono: '083421800', altitudMsnm: 2926, servicios: ['control'] });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTruthy();
    createdId = res.body.data.id;
  });

  it('lista los establecimientos', async () => {
    const res = await request(app)
      .get(`${PREFIX}/admin/facilities`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((f: any) => f.id === createdId)).toBe(true);
  });

  it('actualiza un establecimiento', async () => {
    const res = await request(app)
      .put(`${PREFIX}/admin/facilities/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ telefono: '083999999', activo: false });
    expect(res.status).toBe(200);
    expect(res.body.data.telefono).toBe('083999999');
    expect(res.body.data.activo).toBe(false);
  });

  it('valida el nombre obligatorio (400)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/admin/facilities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: 'X' });
    expect(res.status).toBe(400);
  });

  it('RBAC: un obstetra NO puede gestionar establecimientos (403)', async () => {
    const res = await request(app)
      .get(`${PREFIX}/admin/facilities`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(403);
  });

  it('elimina un establecimiento', async () => {
    const res = await request(app)
      .delete(`${PREFIX}/admin/facilities/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  afterAll(async () => {
    await prisma.healthFacility.deleteMany({ where: { codigo: 'JEST01' } });
  });
});
