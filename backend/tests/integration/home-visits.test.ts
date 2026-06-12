import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Fase 2 del módulo de Visita Domiciliaria: CRUD del acta (HomeVisit),
 * correlativo automático, historial, RBAC y notificación.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

describe('Visitas domiciliarias — actas (Fase 2)', () => {
  let app: Express;
  let obstetraToken: string;
  let gestanteToken: string;
  let gestante2Token: string;
  let gestanteId: string;
  const created: string[] = [];

  beforeAll(async () => {
    app = createApp();
    obstetraToken = await login(app, '11111111', 'Test@1234');
    gestanteToken = await login(app, '33333333', 'Test@1234');
    gestante2Token = await login(app, '44444444', 'Test@1234');
    const own = await request(app).get(`${PREFIX}/appointments`).set('Authorization', `Bearer ${gestanteToken}`);
    gestanteId = own.body.data?.[0]?.gestanteId;
  });

  afterAll(async () => {
    if (created.length) await prisma.homeVisit.deleteMany({ where: { id: { in: created } } });
  });

  it('registra un acta de visita domiciliaria con correlativo automático', async () => {
    const before = await prisma.homeVisit.count({ where: { gestanteId } });
    const res = await request(app)
      .post(`${PREFIX}/home-visits`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({
        gestanteId, fecha: '2026-01-12', horaLlegada: '09:00', duracionMin: 30,
        motivo: 'Seguimiento jest', acciones: 'Orientación y consejería', acuerdos: 'Lavado de manos',
        lat: -13.6548, lng: -73.4259, firmaGestante: true, firmaObstetra: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.numeroVisita).toBe(before + 1);
    created.push(res.body.data.id);
  });

  it('el número de visita es correlativo por gestante', async () => {
    const res = await request(app)
      .post(`${PREFIX}/home-visits`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, fecha: '2026-02-07', motivo: 'Seguimiento jest 2', acciones: 'Consejería' });
    expect(res.status).toBe(201);
    const prev = created.length ? await prisma.homeVisit.findUnique({ where: { id: created[created.length - 1] } }) : null;
    if (prev) expect(res.body.data.numeroVisita).toBe(prev.numeroVisita + 1);
    created.push(res.body.data.id);
  });

  it('lista el historial con datos del obstetra (firma/COP)', async () => {
    const res = await request(app)
      .get(`${PREFIX}/home-visits/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0].obstetra?.cop).toBeTruthy();
  });

  it('la gestante ve solo sus visitas', async () => {
    const ok = await request(app).get(`${PREFIX}/home-visits/${gestanteId}`).set('Authorization', `Bearer ${gestanteToken}`);
    expect(ok.status).toBe(200);
    const ajeno = await request(app).get(`${PREFIX}/home-visits/${gestanteId}`).set('Authorization', `Bearer ${gestante2Token}`);
    expect(ajeno.status).toBe(403);
  });

  it('RBAC: la gestante NO puede registrar actas (403)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/home-visits`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ gestanteId, fecha: '2026-03-01', motivo: 'x', acciones: 'y' });
    expect(res.status).toBe(403);
  });

  it('edita y elimina un acta (obstetra)', async () => {
    const id = created[0];
    const upd = await request(app)
      .patch(`${PREFIX}/home-visits/visit/${id}`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ acuerdos: 'Acuerdo editado jest' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.acuerdos).toBe('Acuerdo editado jest');

    const last = created[created.length - 1];
    const del = await request(app).delete(`${PREFIX}/home-visits/visit/${last}`).set('Authorization', `Bearer ${obstetraToken}`);
    expect(del.status).toBe(200);
    created.pop();
  });

  it('genera notificación de visita domiciliaria a la gestante', async () => {
    const g = await prisma.gestante.findUnique({ where: { id: gestanteId }, select: { userId: true } });
    const n = await prisma.notification.count({ where: { userId: g!.userId, tipo: 'visita_domiciliaria' } });
    expect(n).toBeGreaterThan(0);
  });
});
