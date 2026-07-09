import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Issue #33 — El administrador debe poder REGISTRAR una gestante y ASIGNARLE
 * un obstetra. Verifica:
 *  - GET /admin/obstetras devuelve la lista para el selector.
 *  - POST /admin/users con role=gestante + obstetraId crea la gestante y
 *    materializa el vínculo con una cita "Asignación Inicial por Administrador".
 *  - La gestante aparece en la lista de pacientes del obstetra asignado.
 *  - Sin obstetraId, la gestante se crea sin cita de asignación (compat).
 *  - RBAC: un obstetra no puede usar estos endpoints de admin.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

function randomDni() {
  // DNI de prueba de 8 dígitos que empieza en 8 (no colisiona con el seed).
  return '8' + Math.floor(1000000 + Math.random() * 8999999).toString().slice(0, 7);
}

describe('Admin registra gestante y asigna obstetra (#33)', () => {
  let app: Express;
  let adminToken: string;
  let obstetraToken: string;
  let obstetraId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = createApp();
    adminToken = await login(app, '99999999', 'Admin@2026');
    obstetraToken = await login(app, '11111111', 'Test@1234');
  });

  afterAll(async () => {
    // Limpieza: borrar gestantes/citas/usuarios creados por la prueba.
    for (const uid of createdUserIds) {
      const g = await prisma.gestante.findUnique({ where: { userId: uid } });
      if (g) {
        await prisma.appointment.deleteMany({ where: { gestanteId: g.id } });
        await prisma.gestante.delete({ where: { id: g.id } }).catch(() => {});
      }
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('GET /admin/obstetras devuelve obstetras para el selector', async () => {
    const res = await request(app)
      .get(`${PREFIX}/admin/obstetras`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    const first = res.body.data[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('nombre');
    expect(first).toHaveProperty('cop');
    // Usamos el obstetra del seed (DNI 11111111) para poder verificar luego que
    // la gestante aparece en SU lista de pacientes.
    const obstetraUser = await prisma.user.findUnique({
      where: { dni: '11111111' },
      include: { obstetra: true },
    });
    obstetraId = obstetraUser!.obstetra!.id;
    expect(res.body.data.some((o: any) => o.id === obstetraId)).toBe(true);
  });

  it('POST /admin/users crea gestante y la vincula al obstetra (cita de asignación)', async () => {
    const dni = randomDni();
    const res = await request(app)
      .post(`${PREFIX}/admin/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dni,
        firstName: 'Gestante',
        lastName: 'DePrueba33',
        phone: '987654321',
        password: 'Test@1234',
        role: 'gestante',
        obstetraId,
        fechaNacimiento: '1998-05-20',
      });
    expect(res.status).toBe(201);
    const userId = res.body.data.id;
    createdUserIds.push(userId);

    // La gestante existe con la fecha de nacimiento capturada (no el placeholder).
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    expect(gestante).toBeTruthy();
    expect(gestante!.fechaNacimiento.toISOString().slice(0, 10)).toBe('1998-05-20');

    // Se creó la cita "Asignación Inicial por Administrador" con ese obstetra.
    const cita = await prisma.appointment.findFirst({
      where: { gestanteId: gestante!.id, obstetraId, estado: 'asistida' },
    });
    expect(cita).toBeTruthy();
    expect(cita!.motivo).toContain('Asignación Inicial');
  });

  it('la gestante asignada aparece en la lista de pacientes del obstetra', async () => {
    const res = await request(app)
      .get(`${PREFIX}/patients?limit=1000`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(200);
    const nombres = res.body.data.map(
      (p: any) => `${p.user?.firstName ?? p.firstName} ${p.user?.lastName ?? p.lastName}`,
    );
    expect(nombres).toContain('Gestante DePrueba33');
  });

  it('sin obstetraId, la gestante se crea sin cita de asignación', async () => {
    const dni = randomDni();
    const res = await request(app)
      .post(`${PREFIX}/admin/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dni,
        firstName: 'Gestante',
        lastName: 'SinObstetra',
        password: 'Test@1234',
        role: 'gestante',
      });
    expect(res.status).toBe(201);
    const userId = res.body.data.id;
    createdUserIds.push(userId);
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    const citas = await prisma.appointment.count({ where: { gestanteId: gestante!.id } });
    expect(citas).toBe(0);
  });

  it('rechaza un obstetraId con formato inválido (400)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/admin/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dni: randomDni(),
        firstName: 'Gestante',
        lastName: 'BadObstetra',
        password: 'Test@1234',
        role: 'gestante',
        obstetraId: 'no-es-uuid',
      });
    expect(res.status).toBe(400);
  });

  it('RBAC: un obstetra no puede listar obstetras vía admin (403)', async () => {
    const res = await request(app)
      .get(`${PREFIX}/admin/obstetras`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(res.status).toBe(403);
  });
});
