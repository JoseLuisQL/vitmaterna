import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';

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
});
