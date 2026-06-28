import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * Pruebas del enrutado de respuestas por WhatsApp (`openwa.commands.ts`):
 *  - "1" confirma una cita pendiente; "2" la pasa a solicitud_reprogramacion.
 *  - "SÍ" registra la toma de suplemento de hoy si se le recordó hoy.
 *  - Un texto sin contexto pendiente NO se consume (handled:false → va al chat).
 * Se mockean prisma y notification.service; no se toca la BD real.
 */
const prismaMock: any = {
  appointment: { findFirst: jest.fn(), update: jest.fn() },
  gestante: { findUnique: jest.fn() },
  notification: { findMany: jest.fn() },
  treatment: { findFirst: jest.fn() },
  supplementLog: { upsert: jest.fn() },
};

jest.unstable_mockModule('../../src/config/database.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/modules/notifications/notification.service.js', () => ({
  findObstetraUserIdForGestante: jest.fn(async () => null),
  notifyUser: jest.fn(async () => undefined),
}));

const { routeInboundCommand } = await import('../../src/modules/notifications/openwa.commands.js');

const GID = 'gestante-1';

describe('routeInboundCommand (#4 cita / #5 suplemento)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.appointment.findFirst.mockResolvedValue(null);
    prismaMock.appointment.update.mockResolvedValue({});
    prismaMock.gestante.findUnique.mockResolvedValue({ userId: 'user-1' });
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.treatment.findFirst.mockResolvedValue(null);
    prismaMock.supplementLog.upsert.mockResolvedValue({});
  });

  it('"1" confirma la cita pendiente (programada → confirmada)', async () => {
    prismaMock.appointment.findFirst.mockResolvedValue({ id: 'appt-1', estado: 'programada' });
    const r = await routeInboundCommand(GID, '1');
    expect(r.handled).toBe(true);
    expect(r.reply).toMatch(/CONFIRMADA/);
    expect(prismaMock.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'appt-1' }, data: { estado: 'confirmada' } }),
    );
  });

  it('"2" pasa la cita a solicitud_reprogramacion y conserva estado previo', async () => {
    prismaMock.appointment.findFirst.mockResolvedValue({ id: 'appt-2', estado: 'confirmada' });
    const r = await routeInboundCommand(GID, '2');
    expect(r.handled).toBe(true);
    expect(r.reply).toMatch(/REPROGRAMACIÓN/i);
    expect(prismaMock.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: 'solicitud_reprogramacion', estadoPrevio: 'confirmada' } }),
    );
  });

  it('"1" sin cita pendiente NO se consume (va al chat)', async () => {
    prismaMock.appointment.findFirst.mockResolvedValue(null);
    const r = await routeInboundCommand(GID, '1');
    expect(r.handled).toBe(false);
  });

  it('"Sí" registra la toma de hoy si hubo recordatorio de suplemento hoy', async () => {
    prismaMock.notification.findMany.mockResolvedValue([{ datos: { treatmentId: 'tx-1' } }]);
    prismaMock.treatment.findFirst.mockResolvedValue({ id: 'tx-1' });
    const r = await routeInboundCommand(GID, 'Sí');
    expect(r.handled).toBe(true);
    expect(r.reply).toMatch(/registramos/i);
    expect(prismaMock.supplementLog.upsert).toHaveBeenCalledTimes(1);
  });

  it('"Sí" sin recordatorio de suplemento hoy NO se consume', async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    const r = await routeInboundCommand(GID, 'Sí');
    expect(r.handled).toBe(false);
    expect(prismaMock.supplementLog.upsert).not.toHaveBeenCalled();
  });

  it('un mensaje libre no se interpreta como comando', async () => {
    const r = await routeInboundCommand(GID, 'Doctora tengo una consulta');
    expect(r.handled).toBe(false);
  });
});
