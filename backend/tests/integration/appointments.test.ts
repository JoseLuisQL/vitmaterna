import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Pruebas de integración del módulo de citas (Fase 1):
 * RBAC, validación de propiedad, disponibilidad de horarios,
 * doble booking y transiciones de estado.
 * Requieren BD sembrada y Redis activo.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string): Promise<string> {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken;
}

describe('Appointments API (Fase 1)', () => {
  let app: Express;
  let obstetraToken: string;
  let gestante1Token: string;
  let gestante2Token: string;
  let gestante1Id: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    app = createApp();
    obstetraToken = await login(app, '11111111', 'Test@1234');
    gestante1Token = await login(app, '33333333', 'Test@1234');
    gestante2Token = await login(app, '44444444', 'Test@1234');

    // gestante1Id desde sus propias citas (o desde el listado del obstetra)
    const own = await request(app)
      .get(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${gestante1Token}`);
    gestante1Id = own.body.data?.[0]?.gestanteId;
    if (!gestante1Id) {
      const patients = await request(app)
        .get(`${PREFIX}/patients`)
        .set('Authorization', `Bearer ${obstetraToken}`)
        .query({ limit: 1000 });
      gestante1Id = patients.body.data[0].id;
    }
  });

  afterAll(async () => {
    if (createdIds.length) {
      await prisma.appointment.deleteMany({ where: { id: { in: createdIds } } });
    }
  });

  it('RBAC: la gestante NO puede crear citas (403)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${gestante1Token}`)
      .send({ gestanteId: gestante1Id, fecha: '2026-12-20', hora: '10:00' });
    expect(res.status).toBe(403);
  });

  it('GET /availability devuelve slots con marca de disponibilidad', async () => {
    const res = await request(app)
      .get(`${PREFIX}/appointments/availability`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .query({ fecha: '2026-12-21' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.slots)).toBe(true);
    expect(res.body.data.slots.length).toBeGreaterThan(0);
    expect(res.body.data.slots[0]).toHaveProperty('hora');
    expect(res.body.data.slots[0]).toHaveProperty('disponible');
  });

  it('el obstetra crea una cita en horario libre (201)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId: gestante1Id, fecha: '2026-12-22', hora: '09:00', motivo: 'Control prenatal' });
    expect(res.status).toBe(201);
    expect(res.body.data.estado).toBe('programada');
    createdIds.push(res.body.data.id);
  });

  it('rechaza doble booking del mismo obstetra (409)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId: gestante1Id, fecha: '2026-12-22', hora: '09:00' });
    expect(res.status).toBe(409);
  });

  it('rechaza horario fuera de atención (400)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId: gestante1Id, fecha: '2026-12-23', hora: '07:00' });
    expect(res.status).toBe(400);
  });

  it('flujo de estado: gestante confirma; no puede marcar asistida; obstetra sí', async () => {
    // Crear una cita programada
    const create = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId: gestante1Id, fecha: '2026-12-24', hora: '10:00' });
    const id = create.body.data.id;
    createdIds.push(id);

    // gestante confirma (programada -> confirmada)
    const confirm = await request(app)
      .patch(`${PREFIX}/appointments/${id}/status`)
      .set('Authorization', `Bearer ${gestante1Token}`)
      .send({ estado: 'confirmada' });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.estado).toBe('confirmada');

    // gestante NO puede marcar asistida (403)
    const asistGest = await request(app)
      .patch(`${PREFIX}/appointments/${id}/status`)
      .set('Authorization', `Bearer ${gestante1Token}`)
      .send({ estado: 'asistida' });
    expect(asistGest.status).toBe(403);

    // obstetra marca asistida (confirmada -> asistida)
    const asistObs = await request(app)
      .patch(`${PREFIX}/appointments/${id}/status`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ estado: 'asistida' });
    expect(asistObs.status).toBe(200);

    // transición ilegal (asistida -> confirmada) -> 409
    const ilegal = await request(app)
      .patch(`${PREFIX}/appointments/${id}/status`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ estado: 'confirmada' });
    expect(ilegal.status).toBe(409);
  });

  it('propiedad: una gestante NO puede modificar la cita de otra (403)', async () => {
    const create = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId: gestante1Id, fecha: '2026-12-26', hora: '11:00' });
    const id = create.body.data.id;
    createdIds.push(id);

    const res = await request(app)
      .patch(`${PREFIX}/appointments/${id}/status`)
      .set('Authorization', `Bearer ${gestante2Token}`)
      .send({ estado: 'confirmada' });
    expect(res.status).toBe(403);
  });
});
