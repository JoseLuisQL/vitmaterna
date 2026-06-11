import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Pruebas de integración de la auditoría automática (RF-10.04 / RNF-3.05).
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

describe('Auditoría automática', () => {
  let app: Express;
  let gestanteToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = createApp();
    gestanteToken = await login(app, '33333333', 'Test@1234');
    adminToken = await login(app, '99999999', 'Admin@2026');
  });

  it('registra un log al realizar una mutación exitosa', async () => {
    const before = await prisma.auditLog.count();

    const res = await request(app)
      .post(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ tipo_signo: 'Auditoria jest', severidad: 'leve' });
    expect(res.status).toBe(201);

    // El log se escribe de forma asíncrona (fire-and-forget)
    await new Promise((r) => setTimeout(r, 400));
    const after = await prisma.auditLog.count();
    expect(after).toBe(before + 1);

    const last = await prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' } });
    expect(last?.accion).toBe('POST');
    expect(last?.entidad).toBe('clinical');
    expect(last?.userId).toBeTruthy();
  });

  it('NO registra logs en operaciones de solo lectura (GET)', async () => {
    const before = await prisma.auditLog.count();
    await request(app)
      .get(`${PREFIX}/clinical/treatments`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    await new Promise((r) => setTimeout(r, 200));
    const after = await prisma.auditLog.count();
    expect(after).toBe(before);
  });

  it('NO guarda contraseñas en datosNuevos', async () => {
    // El login está excluido, pero verificamos que ningún log contenga password
    const logs = await prisma.auditLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    for (const log of logs) {
      const datos = (log.datosNuevos ?? {}) as Record<string, unknown>;
      expect(datos.password).toBeUndefined();
      expect(datos.passwordHash).toBeUndefined();
    }
  });

  it('el admin puede listar los logs de auditoría', async () => {
    const res = await request(app)
      .get(`${PREFIX}/admin/audit-logs`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  afterAll(async () => {
    await prisma.dangerSign.deleteMany({ where: { tipoSigno: { contains: 'Auditoria jest' } } });
  });
});
