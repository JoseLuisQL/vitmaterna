import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Pruebas de integración del módulo de autenticación.
 * Requieren la base de datos sembrada (npm run prisma:seed) y Redis activo.
 */
const PREFIX = '/v1';

describe('Auth API', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  it('POST /auth/login con credenciales válidas devuelve tokens', async () => {
    const res = await request(app)
      .post(`${PREFIX}/auth/login`)
      .send({ dni: '99999999', password: 'Admin@2026' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('admin');
  });

  it('POST /auth/login con contraseña incorrecta devuelve 401', async () => {
    const res = await request(app)
      .post(`${PREFIX}/auth/login`)
      .send({ dni: '99999999', password: 'incorrecta' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/login con DNI inválido devuelve error de validación', async () => {
    const res = await request(app)
      .post(`${PREFIX}/auth/login`)
      .send({ dni: '123', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /auth/me sin token devuelve 401', async () => {
    const res = await request(app).get(`${PREFIX}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('GET /auth/me con token válido devuelve el perfil', async () => {
    const login = await request(app)
      .post(`${PREFIX}/auth/login`)
      .send({ dni: '33333333', password: 'Test@1234' });
    const token = login.body.data.accessToken;

    const res = await request(app)
      .get(`${PREFIX}/auth/me`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('gestante');
  });

  it('PATCH /auth/me actualiza las preferencias de notificación (RF-7.13)', async () => {
    const login = await request(app)
      .post(`${PREFIX}/auth/login`)
      .send({ dni: '33333333', password: 'Test@1234' });
    const token = login.body.data.accessToken;

    const patched = await request(app)
      .patch(`${PREFIX}/auth/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notificationPreferences: { push: true, sms: false, whatsapp: true } });
    expect(patched.status).toBe(200);
    expect(patched.body.data.user.notificationPreferences.sms).toBe(false);

    // Persistencia
    const me = await request(app)
      .get(`${PREFIX}/auth/me`)
      .set('Authorization', `Bearer ${token}`);
    expect(me.body.data.user.notificationPreferences.sms).toBe(false);

    // Restaurar
    await request(app)
      .patch(`${PREFIX}/auth/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notificationPreferences: { push: true, sms: true, whatsapp: true } });
  });

  describe('Registro de obstetra requiere aprobación del admin', () => {
    const dni = String(Date.now()).slice(-8);
    const password = 'Clave123@';

    afterAll(async () => {
      const u = await prisma.user.findUnique({ where: { dni } });
      if (u) {
        await prisma.obstetra.deleteMany({ where: { userId: u.id } });
        await prisma.userSession.deleteMany({ where: { userId: u.id } });
        await prisma.user.delete({ where: { id: u.id } });
      }
    });

    it('el registro de obstetra NO devuelve token y queda pendiente de aprobación', async () => {
      const res = await request(app)
        .post(`${PREFIX}/auth/register`)
        .send({
          dni, firstName: 'Nueva', lastName: 'ObstetraTest', phone: '987654321',
          password, confirmPassword: password, role: 'obstetra', cop: 'COP777', consentAccepted: true,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.requiresApproval).toBe(true);
      expect(res.body.data.accessToken).toBeUndefined();
    });

    it('el obstetra NO aprobado NO puede iniciar sesión (403)', async () => {
      const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
      expect(res.status).toBe(403);
    });

    it('tras aprobar, el obstetra ya puede iniciar sesión (200)', async () => {
      const admin = await request(app).post(`${PREFIX}/auth/login`).send({ dni: '99999999', password: 'Admin@2026' });
      const adminToken = admin.body.data.accessToken;
      const list = await request(app).get(`${PREFIX}/admin/users`).set('Authorization', `Bearer ${adminToken}`);
      const arr = Array.isArray(list.body.data) ? list.body.data : (list.body.data.items || list.body.data.users || []);
      const created = arr.find((u: any) => u.dni === dni);
      expect(created).toBeTruthy();

      const approve = await request(app)
        .put(`${PREFIX}/admin/users/${created.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(approve.status).toBe(200);

      const login = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
      expect(login.status).toBe(200);
      expect(login.body.data.accessToken).toBeTruthy();
    });
  });
});
