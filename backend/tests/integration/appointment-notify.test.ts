import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Issue #34 — Al asignar una NUEVA cita a la gestante, debe generarse una
 * notificación push/in-app (con sonido) para avisarle. Verifica que al crear
 * una cita se crea una Notification tipo 'cita_asignada' dirigida a la gestante.
 *
 * (El sonido/heads-up lo aporta el payload del push, que ya incluye
 * sound:'default', priority:'high' y channelId:'default'; aquí validamos que la
 * notificación se dispara al asignar la cita.)
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

describe('Notificación al asignar cita (#34)', () => {
  let app: Express;
  let obstetraToken: string;
  let gestanteId: string;
  let gestanteUserId: string;
  const createdApptIds: string[] = [];

  beforeAll(async () => {
    app = createApp();
    obstetraToken = await login(app, '11111111', 'Test@1234');
    const patients = await request(app)
      .get(`${PREFIX}/patients`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .query({ limit: 1000 });
    gestanteId = patients.body.data[0].id;
    const g = await prisma.gestante.findUnique({ where: { id: gestanteId } });
    gestanteUserId = g!.userId;
  });

  afterAll(async () => {
    for (const id of createdApptIds) {
      await prisma.appointment.delete({ where: { id } }).catch(() => {});
    }
    await prisma.notification.deleteMany({
      where: { userId: gestanteUserId, tipo: 'cita_asignada' },
    });
    await prisma.$disconnect();
  });

  it('crear una cita genera una notificación "cita_asignada" para la gestante', async () => {
    const before = await prisma.notification.count({
      where: { userId: gestanteUserId, tipo: 'cita_asignada' },
    });

    const res = await request(app)
      .post(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({
        gestanteId,
        fecha: '2027-01-15',
        hora: '09:00',
        motivo: 'Control prenatal',
      });
    expect(res.status).toBe(201);
    createdApptIds.push(res.body.data.id);

    const after = await prisma.notification.findMany({
      where: { userId: gestanteUserId, tipo: 'cita_asignada' },
      orderBy: { createdAt: 'desc' },
    });
    expect(after.length).toBe(before + 1);
    // El canal es push (el payload del cliente añade sonido/heads-up).
    expect(after[0].canal).toBe('push');
    expect(after[0].titulo).toMatch(/cita/i);
    expect((after[0].datos as any)?.appointmentId).toBe(res.body.data.id);
  });
});
