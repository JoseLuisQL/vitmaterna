import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * RF-9.02: al reportar un signo de alarma (chatbot), el obstetra recibe una
 * alerta automática in-app; si es GRAVE, además se inserta un mensaje en el
 * chat clínico gestante↔obstetra.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

describe('Danger sign auto-alert (RF-9.02)', () => {
  let app: Express;
  let gestanteToken: string;
  let obstetraToken: string;
  let gestanteId: string;

  beforeAll(async () => {
    app = createApp();
    gestanteToken = await login(app, '33333333', 'Test@1234');
    obstetraToken = await login(app, '11111111', 'Test@1234');

    const own = await request(app)
      .get(`${PREFIX}/appointments`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    gestanteId = own.body.data?.[0]?.gestanteId;
  });

  it('un signo GRAVE crea notificación in-app al obstetra y mensaje en el chat', async () => {
    const obsUser = await prisma.user.findUnique({ where: { dni: '11111111' } });

    // Tipo de signo único por ejecución: evita la deduplicación de 10 min del
    // servicio cuando la suite se corre varias veces sobre la misma BD.
    const tipoSigno = `Sangrado vaginal (jest ${Date.now()})`;

    const notifBefore = await prisma.notification.count({
      where: { userId: obsUser!.id, tipo: 'signo_alarma' },
    });

    const create = await request(app)
      .post(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ tipo_signo: tipoSigno, descripcion: 'test RF-9.02', severidad: 'grave' });
    expect(create.status).toBe(201);

    // Notificación in-app persistente creada para el obstetra.
    const notifAfter = await prisma.notification.count({
      where: { userId: obsUser!.id, tipo: 'signo_alarma' },
    });
    expect(notifAfter).toBe(notifBefore + 1);

    // Mensaje automático de alerta en la conversación gestante↔obstetra.
    const obstetra = await prisma.obstetra.findUnique({ where: { userId: obsUser!.id } });
    const conv = await prisma.conversation.findFirst({
      where: { gestanteId, obstetraId: obstetra!.id },
    });
    expect(conv).toBeTruthy();
    const alertMsg = await prisma.message.findFirst({
      where: {
        conversationId: conv!.id,
        tipo: 'alerta_emergencia',
        contenido: { contains: tipoSigno },
      },
    });
    expect(alertMsg).toBeTruthy();
  });

  it('un signo MODERADO notifica al obstetra pero NO inserta mensaje de chat', async () => {
    const obsUser = await prisma.user.findUnique({ where: { dni: '11111111' } });
    const obstetra = await prisma.obstetra.findUnique({ where: { userId: obsUser!.id } });
    const conv = await prisma.conversation.findFirst({
      where: { gestanteId, obstetraId: obstetra!.id },
    });

    const msgBefore = conv
      ? await prisma.message.count({ where: { conversationId: conv.id, tipo: 'alerta_emergencia' } })
      : 0;
    const notifBefore = await prisma.notification.count({
      where: { userId: obsUser!.id, tipo: 'signo_alarma' },
    });

    const create = await request(app)
      .post(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ tipo_signo: `Fiebre alta (jest ${Date.now()})`, descripcion: 'test', severidad: 'moderado' });
    expect(create.status).toBe(201);

    const notifAfter = await prisma.notification.count({
      where: { userId: obsUser!.id, tipo: 'signo_alarma' },
    });
    expect(notifAfter).toBe(notifBefore + 1);

    if (conv) {
      const msgAfter = await prisma.message.count({
        where: { conversationId: conv.id, tipo: 'alerta_emergencia' },
      });
      expect(msgAfter).toBe(msgBefore); // sin mensaje de chat nuevo
    }
  });
});
