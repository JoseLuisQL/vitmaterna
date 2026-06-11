import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * RF-10.05: gestión de contenido educativo por el administrador
 * (listar/crear/editar/eliminar) con RBAC.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string) {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken as string;
}

describe('Admin Education CRUD (RF-10.05)', () => {
  let app: Express;
  let adminToken: string;
  let gestanteToken: string;
  const created: string[] = [];

  beforeAll(async () => {
    app = createApp();
    adminToken = await login(app, '99999999', 'Admin@2026');
    gestanteToken = await login(app, '33333333', 'Test@1234');
  });

  afterAll(async () => {
    if (created.length) {
      await prisma.educationalContent.deleteMany({ where: { id: { in: created } } });
    }
  });

  it('GET /admin/education lista el contenido (admin)', async () => {
    const res = await request(app)
      .get(`${PREFIX}/admin/education`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('crea, edita y elimina contenido con campos/enum correctos', async () => {
    const create = await request(app)
      .post(`${PREFIX}/admin/education`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        titulo: 'Contenido jest',
        contenido: 'Texto de prueba',
        tipo: 'articulo',
        categoria: 'nutricion',
        trimestre: 1,
      });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    created.push(id);
    expect(create.body.data.tipo).toBe('articulo');

    const update = await request(app)
      .put(`${PREFIX}/admin/education/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ titulo: 'Contenido jest editado', activo: false });
    expect(update.status).toBe(200);
    expect(update.body.data.titulo).toBe('Contenido jest editado');
    expect(update.body.data.activo).toBe(false);

    const del = await request(app)
      .delete(`${PREFIX}/admin/education/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
    created.pop();
  });

  it('rechaza un tipo inválido (400)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/admin/education`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ titulo: 'x', contenido: 'y', tipo: 'article' }); // 'article' no es válido
    expect(res.status).toBe(400);
  });

  it('RBAC: la gestante NO puede gestionar contenido (403)', async () => {
    const list = await request(app)
      .get(`${PREFIX}/admin/education`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    expect(list.status).toBe(403);

    const create = await request(app)
      .post(`${PREFIX}/admin/education`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ titulo: 'x', contenido: 'y', tipo: 'articulo' });
    expect(create.status).toBe(403);
  });
});
