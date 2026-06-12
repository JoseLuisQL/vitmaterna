import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Fase 1 del módulo de Visita Domiciliaria:
 * citas con modalidad domiciliaria, conversión y ubicación GPS del domicilio.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

describe('Citas domiciliarias y ubicación GPS (Fase 1)', () => {
  let app: Express;
  let obstetraToken: string;
  let gestanteToken: string;
  let gestanteId: string;
  const created: string[] = [];

  beforeAll(async () => {
    app = createApp();
    obstetraToken = await login(app, '11111111', 'Test@1234');
    gestanteToken = await login(app, '33333333', 'Test@1234');
    const own = await request(app).get(`${PREFIX}/appointments`).set('Authorization', `Bearer ${gestanteToken}`);
    gestanteId = own.body.data?.[0]?.gestanteId;
  });

  afterAll(async () => {
    if (created.length) await prisma.appointment.deleteMany({ where: { id: { in: created } } });
  });

  it('crea una cita con modalidad domiciliaria', async () => {
    const res = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, fecha: '2037-10-01', hora: '09:00', modalidad: 'domiciliaria', motivo: 'Visita domiciliaria' });
    expect(res.status).toBe(201);
    expect(res.body.data.modalidad).toBe('domiciliaria');
    created.push(res.body.data.id);
  });

  it('permite solapar horario en citas domiciliarias (sin doble-booking)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, fecha: '2037-10-01', hora: '09:00', modalidad: 'domiciliaria' });
    expect(res.status).toBe(201);
    created.push(res.body.data.id);
  });

  it('filtra citas por modalidad', async () => {
    const res = await request(app)
      .get(`${PREFIX}/appointments?modalidad=domiciliaria`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('convierte una cita de establecimiento a domiciliaria (obstetra)', async () => {
    const create = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, fecha: '2037-11-05', hora: '10:00', motivo: 'Control prenatal' });
    const id = create.body.data.id;
    created.push(id);
    expect(create.body.data.modalidad).toBe('establecimiento');

    const conv = await request(app)
      .patch(`${PREFIX}/appointments/${id}/convertir-domiciliaria`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ observaciones: 'No puede asistir' });
    expect(conv.status).toBe(200);
    expect(conv.body.data.modalidad).toBe('domiciliaria');
  });

  it('RBAC: la gestante NO puede convertir a domiciliaria (403)', async () => {
    const create = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, fecha: '2037-12-06', hora: '11:00' });
    const id = create.body.data.id;
    created.push(id);

    const res = await request(app)
      .patch(`${PREFIX}/appointments/${id}/convertir-domiciliaria`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('la gestante registra la ubicación GPS de su domicilio', async () => {
    const res = await request(app)
      .patch(`${PREFIX}/patients/${gestanteId}/ubicacion`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ domicilioLat: -13.6548, domicilioLng: -73.4259, referenciaDom: 'Casa azul' });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.domicilioLat)).toBeCloseTo(-13.6548, 3);
    expect(res.body.data.referenciaDom).toBe('Casa azul');
  });

  it('valida coordenadas fuera de rango (400)', async () => {
    const res = await request(app)
      .patch(`${PREFIX}/patients/${gestanteId}/ubicacion`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ domicilioLat: 200, domicilioLng: 0 });
    expect(res.status).toBe(400);
  });
});
