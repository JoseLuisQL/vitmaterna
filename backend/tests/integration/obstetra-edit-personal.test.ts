import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Issue #36 — El obstetra debe poder editar/agregar los DATOS PERSONALES de una
 * gestante registrada (nombres, DNI de historia, teléfono, dirección, etc.).
 * Verifica que PATCH /patients/:id actualiza tanto el User (firstName/lastName/
 * phone) como el perfil Gestante (historiaClinica, direccion, ocupacion, etc.).
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

describe('Obstetra edita datos personales de la gestante (#36)', () => {
  let app: Express;
  let obstetraToken: string;
  let gestanteId: string;
  let original: any;

  beforeAll(async () => {
    app = createApp();
    obstetraToken = await login(app, '11111111', 'Test@1234');
    const patients = await request(app)
      .get(`${PREFIX}/patients`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .query({ limit: 1000 });
    gestanteId = patients.body.data[0].id;
    // Guardar valores originales para restaurarlos al final.
    const g = await prisma.gestante.findUnique({ where: { id: gestanteId }, include: { user: true } });
    original = {
      firstName: g!.user.firstName,
      lastName: g!.user.lastName,
      phone: g!.user.phone,
      historiaClinica: g!.historiaClinica,
      direccion: g!.direccion,
      localidad: g!.localidad,
      ocupacion: g!.ocupacion,
      codigoSis: g!.codigoSis,
      acompanantePhone: g!.acompanantePhone,
    };
  });

  afterAll(async () => {
    // Restaurar los valores originales para no ensuciar el seed.
    const g = await prisma.gestante.findUnique({ where: { id: gestanteId } });
    if (g) {
      await prisma.user.update({
        where: { id: g.userId },
        data: { firstName: original.firstName, lastName: original.lastName, phone: original.phone },
      });
      await prisma.gestante.update({
        where: { id: gestanteId },
        data: {
          historiaClinica: original.historiaClinica,
          direccion: original.direccion,
          localidad: original.localidad,
          ocupacion: original.ocupacion,
          codigoSis: original.codigoSis,
          acompanantePhone: original.acompanantePhone,
        },
      });
    }
    await prisma.$disconnect();
  });

  it('el obstetra edita datos personales (User + Gestante) vía PATCH /patients/:id', async () => {
    const res = await request(app)
      .patch(`${PREFIX}/patients/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({
        firstName: 'NombreEditado36',
        lastName: 'ApellidoEditado36',
        phone: '987111222',
        historiaClinica: 'HC-EDIT-36',
        direccion: 'Jr. Prueba 456',
        localidad: 'Talavera',
        ocupacion: 'Docente',
        codigoSis: '99887766',
        acompanantePhone: '987333444',
      });
    expect(res.status).toBe(200);

    // Verificar en base de datos que se persistió en User y en Gestante.
    const g = await prisma.gestante.findUnique({ where: { id: gestanteId }, include: { user: true } });
    expect(g!.user.firstName).toBe('NombreEditado36');
    expect(g!.user.lastName).toBe('ApellidoEditado36');
    expect(g!.historiaClinica).toBe('HC-EDIT-36');
    expect(g!.direccion).toBe('Jr. Prueba 456');
    expect(g!.ocupacion).toBe('Docente');
    expect(g!.codigoSis).toBe('99887766');
    expect(g!.acompanantePhone).toBe('987333444');
  });

  it('rechaza un id de gestante con formato inválido (400)', async () => {
    const res = await request(app)
      .patch(`${PREFIX}/patients/no-es-uuid`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ firstName: 'X' });
    expect(res.status).toBe(400);
  });
});
