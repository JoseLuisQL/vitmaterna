import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/config/app.js';
import { prisma } from '../../src/config/database.js';

/**
 * Pruebas de integración del módulo clínico y de roles (RBAC).
 * Requieren BD sembrada y Redis activo.
 */
const PREFIX = '/v1';

async function login(app: Express, dni: string, password: string): Promise<string> {
  const res = await request(app).post(`${PREFIX}/auth/login`).send({ dni, password });
  return res.body.data.accessToken;
}

describe('Clinical API', () => {
  let app: Express;
  let obstetraToken: string;
  let gestanteToken: string;
  let gestanteId: string;

  beforeAll(async () => {
    app = createApp();
    obstetraToken = await login(app, '11111111', 'Test@1234');
    gestanteToken = await login(app, '33333333', 'Test@1234');

    const patients = await request(app)
      .get(`${PREFIX}/patients`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .query({ limit: 1000 });
    gestanteId = patients.body.data[0].id;
  });

  it('GET /clinical/treatments (gestante) devuelve 200', async () => {
    const res = await request(app)
      .get(`${PREFIX}/clinical/treatments`)
      .set('Authorization', `Bearer ${gestanteToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('la gestante reporta un signo de alarma y el obstetra lo ve', async () => {
    const create = await request(app)
      .post(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ tipo_signo: 'Prueba integración', descripcion: 'jest', severidad: 'moderado' });
    expect(create.status).toBe(201);
    const id = create.body.data.id;

    const list = await request(app)
      .get(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((d: any) => d.id === id)).toBe(true);

    // El obstetra lo atiende (registra responsable y tiempo de respuesta)
    const attend = await request(app)
      .patch(`${PREFIX}/clinical/danger-signs/${id}`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ estado: 'atendido', accionTomada: 'Atendido en prueba' });
    expect(attend.status).toBe(200);
    expect(attend.body.data.estado).toBe('atendido');
    expect(attend.body.data.respondidoPor).toBeTruthy();
  });

  it('RBAC: la gestante NO puede atender alarmas (403)', async () => {
    const create = await request(app)
      .post(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ tipo_signo: 'Prueba RBAC', severidad: 'leve' });
    const id = create.body.data.id;

    const res = await request(app)
      .patch(`${PREFIX}/clinical/danger-signs/${id}`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ estado: 'atendido' });
    expect(res.status).toBe(403);
  });

  it('crea y lee un registro de peso de la gestante', async () => {
    const create = await request(app)
      .post(`${PREFIX}/clinical/weight-records`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, egSemanas: 22, peso: 63.2, fecha: '2026-06-11' });
    expect(create.status).toBe(201);

    const list = await request(app)
      .get(`${PREFIX}/clinical/weight-records/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
  });

  it('valida el cuerpo: danger-sign sin tipo_signo → 400', async () => {
    const res = await request(app)
      .post(`${PREFIX}/clinical/danger-signs`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ descripcion: 'sin tipo' });
    expect(res.status).toBe(400);
  });

  it('modifica y suspende un tratamiento (RF-4.10)', async () => {
    const create = await request(app)
      .post(`${PREFIX}/clinical/treatments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, nombre: 'Tratamiento jest', dosis: '1 tab', frecuencia: 'Diario', fechaInicio: '2026-06-01' });
    expect(create.status).toBe(201);
    const treatmentId = create.body.data.id;

    // Modificar dosis
    const mod = await request(app)
      .patch(`${PREFIX}/clinical/treatments/${treatmentId}`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ dosis: '2 tabletas' });
    expect(mod.status).toBe(200);
    expect(mod.body.data.dosis).toBe('2 tabletas');

    // Suspender sin motivo → 400
    const noMotivo = await request(app)
      .patch(`${PREFIX}/clinical/treatments/${treatmentId}`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ estado: 'suspendido' });
    expect(noMotivo.status).toBe(400);

    // Suspender con motivo → 200
    const susp = await request(app)
      .patch(`${PREFIX}/clinical/treatments/${treatmentId}`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ estado: 'suspendido', motivoSuspension: 'Reacción adversa' });
    expect(susp.status).toBe(200);
    expect(susp.body.data.estado).toBe('suspendido');

    // Limpieza
    await prisma.supplementLog.deleteMany({ where: { treatmentId } });
    await prisma.treatment.delete({ where: { id: treatmentId } });
  });

  it('registra, lista y elimina antecedentes (RF-2.03)', async () => {
    const create = await request(app)
      .post(`${PREFIX}/clinical/antecedentes`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, tipo: 'personal', condicion: 'Diabetes jest', detalle: 'DM2' });
    expect(create.status).toBe(201);
    const id = create.body.data.id;

    const list = await request(app)
      .get(`${PREFIX}/clinical/antecedentes/${gestanteId}`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((a: any) => a.id === id)).toBe(true);

    const del = await request(app)
      .delete(`${PREFIX}/clinical/antecedentes/${id}`)
      .set('Authorization', `Bearer ${obstetraToken}`);
    expect(del.status).toBe(200);
  });

  it('corrige la hemoglobina según la altitud configurada (RF-10.03)', async () => {
    const adminRes = await request(app).post(`${PREFIX}/auth/login`).send({ dni: '99999999', password: 'Admin@2026' });
    const adminToken = adminRes.body.data.accessToken;

    // Altitud a nivel del mar -> factor 0 -> corregido == observado
    await request(app)
      .put(`${PREFIX}/admin/config`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ altitudMsnm: 0 });

    const sea = await request(app)
      .post(`${PREFIX}/clinical/labs`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, tipoExamen: 'Hemoglobina', valorNumerico: 12.0, fechaExamen: '2026-06-11' });
    expect(sea.status).toBe(201);
    expect(Number(sea.body.data.valorCorregido)).toBeCloseTo(12.0, 1);

    // Altitud Talavera 2926 -> factor -1.3 -> 10.7
    await request(app)
      .put(`${PREFIX}/admin/config`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ altitudMsnm: 2926 });

    const alt = await request(app)
      .post(`${PREFIX}/clinical/labs`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, tipoExamen: 'Hemoglobina', valorNumerico: 12.0, fechaExamen: '2026-06-11' });
    expect(Number(alt.body.data.valorCorregido)).toBeCloseTo(10.7, 1);

    // Limpieza
    await prisma.labResult.deleteMany({
      where: { gestanteId, tipoExamen: 'Hemoglobina', valorNumerico: 12.0, fechaExamen: new Date('2026-06-11T00:00:00.000Z') },
    });
  });

  it('RBAC: la gestante NO puede registrar antecedentes (403)', async () => {
    const res = await request(app)
      .post(`${PREFIX}/clinical/antecedentes`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ gestanteId, tipo: 'personal', condicion: 'no permitido' });
    expect(res.status).toBe(403);
  });

  it('RBAC: la gestante NO puede modificar tratamientos (403)', async () => {
    const create = await request(app)
      .post(`${PREFIX}/clinical/treatments`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, nombre: 'Tratamiento jest2', dosis: '1 tab', frecuencia: 'Diario', fechaInicio: '2026-06-01' });
    const treatmentId = create.body.data.id;

    const res = await request(app)
      .patch(`${PREFIX}/clinical/treatments/${treatmentId}`)
      .set('Authorization', `Bearer ${gestanteToken}`)
      .send({ dosis: 'x' });
    expect(res.status).toBe(403);

    await prisma.treatment.delete({ where: { id: treatmentId } });
  });

  it('tamizaje de violencia: el servidor aplica el umbral ≥15 (RF-5.11)', async () => {
    // Puntaje 5 → negativo, aunque el cliente envíe tamizajePositivo:true
    const neg = await request(app)
      .post(`${PREFIX}/clinical/screenings/violence`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, puntajeTotal: 5, tamizajePositivo: true, respuestas: { a: 5 }, fecha: '2026-06-11' });
    expect(neg.status).toBe(201);
    expect(neg.body.data.tamizajePositivo).toBe(false);
    expect(neg.body.data.derivacion).toBe(false);

    // Puntaje 15 → positivo + derivación
    const pos = await request(app)
      .post(`${PREFIX}/clinical/screenings/violence`)
      .set('Authorization', `Bearer ${obstetraToken}`)
      .send({ gestanteId, puntajeTotal: 15, respuestas: { a: 15 }, fecha: '2026-06-11' });
    expect(pos.status).toBe(201);
    expect(pos.body.data.tamizajePositivo).toBe(true);
    expect(pos.body.data.derivacion).toBe(true);

    // Limpieza
    await prisma.violenceScreening.deleteMany({
      where: { gestanteId, fecha: new Date('2026-06-11T00:00:00.000Z'), puntajeTotal: { in: [5, 15] } },
    });
  });
});
