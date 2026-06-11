import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';
import bcrypt from 'bcrypt';

/**
 * Pruebas de integración de la recuperación de contraseña (RF-1.05).
 * Usa una gestante de prueba con teléfono (DNI 55555555).
 */
const PREFIX = '/v1';
const DNI = '55555555';
const ORIGINAL_PASSWORD = 'Test@1234';

describe('Recuperación de contraseña', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  it('forgot-password responde 200 sin revelar si el DNI existe', async () => {
    const real = await request(app).post(`${PREFIX}/auth/forgot-password`).send({ dni: DNI });
    expect(real.status).toBe(200);
    const fake = await request(app).post(`${PREFIX}/auth/forgot-password`).send({ dni: '00000000' });
    expect(fake.status).toBe(200);
  });

  it('rechaza un código inválido (400)', async () => {
    await request(app).post(`${PREFIX}/auth/forgot-password`).send({ dni: DNI });
    const res = await request(app).post(`${PREFIX}/auth/reset-password`).send({
      dni: DNI,
      code: '000000',
      newPassword: 'Nuevo@2026',
      confirmPassword: 'Nuevo@2026',
    });
    expect(res.status).toBe(400);
  });

  it('restablece la contraseña con un código válido y permite iniciar sesión', async () => {
    // Generar y conocer el código: inyectamos un hash conocido directamente.
    const code = '654321';
    const user = await prisma.user.findUnique({ where: { dni: DNI } });
    if (!user) return;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: await bcrypt.hash(code, 12),
        resetTokenExpires: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const reset = await request(app).post(`${PREFIX}/auth/reset-password`).send({
      dni: DNI,
      code,
      newPassword: 'Nuevo@2026',
      confirmPassword: 'Nuevo@2026',
    });
    expect(reset.status).toBe(200);

    const login = await request(app).post(`${PREFIX}/auth/login`).send({ dni: DNI, password: 'Nuevo@2026' });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTruthy();
  });

  it('valida que las contraseñas coincidan (400)', async () => {
    const res = await request(app).post(`${PREFIX}/auth/reset-password`).send({
      dni: DNI,
      code: '123456',
      newPassword: 'Nuevo@2026',
      confirmPassword: 'Distinta@2026',
    });
    expect(res.status).toBe(400);
  });

  afterAll(async () => {
    // Restaurar la contraseña original del usuario de prueba.
    const user = await prisma.user.findUnique({ where: { dni: DNI } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(ORIGINAL_PASSWORD, 12),
          resetTokenHash: null,
          resetTokenExpires: null,
        },
      });
    }
  });
});
