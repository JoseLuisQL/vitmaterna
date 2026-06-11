import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Pruebas de integración del módulo de Chat (REST).
 * Requieren BD sembrada y Redis activo.
 *
 * El flujo en tiempo real por Socket.IO se valida en una prueba e2e aparte
 * (scripts), ya que requiere un servidor con websockets levantado.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return { token: res.body.data.accessToken as string, user: res.body.data.user };
}

describe('Chat API', () => {
  let app: Express;
  let gestanteToken: string;
  let gestanteUserId: string;
  let obstetraToken: string;
  let adminToken: string;
  let conversationId: string;

  beforeAll(async () => {
    app = createApp();
    const ges = await login(app, '33333333', 'Test@1234');
    const obs = await login(app, '11111111', 'Test@1234');
    const adm = await login(app, '99999999', 'Admin@2026');
    gestanteToken = ges.token;
    gestanteUserId = ges.user.id;
    obstetraToken = obs.token;
    adminToken = adm.token;
  });

  it('la gestante resuelve (o crea) su conversación con la obstetra', async () => {
    const res = await request(app)
      .get(`${PREFIX}/chat/conversation`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data?.id).toBeTruthy();
    conversationId = res.body.data.id;
  });

  it('la obstetra lista sus conversaciones', async () => {
    const res = await request(app)
      .get(`${PREFIX}/chat/conversations`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('devuelve el historial paginado de una conversación', async () => {
    const res = await request(app)
      .get(`${PREFIX}/chat/history/${conversationId}`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it('sin token, el historial devuelve 401', async () => {
    const res = await request(app).get(`${PREFIX}/chat/history/${conversationId}`);
    expect(res.status).toBe(401);
  });

  it('un usuario ajeno NO puede leer una conversación que no le pertenece (403)', async () => {
    // Creamos una conversación de otra gestante con la obstetra y la pedimos
    // con el token de la primera gestante.
    const otraGestante = await prisma.gestante.findFirst({
      where: { user: { dni: '44444444' } },
    });
    const obstetra = await prisma.obstetra.findFirst();
    if (!otraGestante || !obstetra) return; // datos no sembrados

    let conv = await prisma.conversation.findFirst({
      where: { gestanteId: otraGestante.id, obstetraId: obstetra.id },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { gestanteId: otraGestante.id, obstetraId: obstetra.id },
      });
    }

    const res = await request(app)
      .get(`${PREFIX}/chat/history/${conv.id}`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    expect(res.status).toBe(403);
  });

  it('la emergencia GPS crea un mensaje de alerta en la conversación', async () => {
    const res = await request(app)
      .post(`${PREFIX}/chat/emergencia`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ latitude: -13.65, longitude: -73.38 });
    expect(res.status).toBe(201);
    expect(res.body.data?.tipo).toBe('alerta_emergencia');
    expect(res.body.data?.senderId).toBe(gestanteUserId);
  });

  it('emergencia con coordenadas inválidas devuelve 400', async () => {
    const res = await request(app)
      .post(`${PREFIX}/chat/emergencia`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ latitude: 'x' });
    expect(res.status).toBe(400);
  });

  it('la obstetra envía un mensaje masivo a todas las gestantes activas', async () => {
    const res = await request(app)
      .post(`${PREFIX}/chat/broadcast`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ contenido: 'Jornada de vacunación el sábado (prueba chat)' });
    expect(res.status).toBe(201);
    expect(typeof res.body.data?.enviados).toBe('number');
    expect(res.body.data.enviados).toBeGreaterThanOrEqual(1);
  });

  it('el broadcast filtra por nivel de riesgo', async () => {
    const res = await request(app)
      .post(`${PREFIX}/chat/broadcast`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ contenido: 'Mensaje riesgo (prueba chat)', nivelRiesgo: 'rojo' });
    expect(res.status).toBe(201);
    expect(res.body.data.enviados).toBeLessThanOrEqual(res.body.data.total);
  });

  it('RBAC: una gestante NO puede enviar mensajes masivos (403)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/chat/broadcast`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ contenido: 'no permitido' });
    expect(res.status).toBe(403);
  });

  it('el broadcast valida el contenido vacío (400)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/chat/broadcast`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ contenido: '' });
    expect(res.status).toBe(400);
  });

  it('sube una imagen al chat y devuelve una mediaUrl (RF-9.01)', async () => {
    // PNG 1x1 en base64
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
    const res = await request(app)
      .post(`${PREFIX}/chat/upload`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ base64: png, mimeType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data.mediaUrl).toMatch(/^\/uploads\/chat\/.+\.png$/);
  });

  it('rechaza una subida sin imagen (400)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/chat/upload`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('requiere autenticación para subir (401)', async () => {
    const res = await request(app).post(`${PREFIX}/chat/upload`).send({ base64: 'x' });
    expect(res.status).toBe(401);
  });

  afterAll(async () => {
    // Limpiar los mensajes de prueba creados por el broadcast
    await prisma.message.deleteMany({ where: { contenido: { contains: '(prueba chat)' } } });
  });
});
