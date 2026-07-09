import { describe, it, expect } from '@jest/globals';
import { buildPushMessages } from '../../src/modules/notifications/notification.service.js';

/**
 * Issues #32/#34/#35 — El payload de push debe incluir sonido y prioridad para
 * sonar y mostrarse como heads-up en Android (background/killed/lockscreen).
 */
describe('Payload de push (#32/#34/#35)', () => {
  const TOKEN = 'ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

  it('incluye sound, priority high, channelId default y badge', () => {
    const { messages, sentTokens } = buildPushMessages(
      [TOKEN],
      'Nueva cita asignada',
      'Tienes una cita el 2027-01-15',
      { tipo: 'cita_asignada' },
    );
    expect(sentTokens).toEqual([TOKEN]);
    expect(messages).toHaveLength(1);
    const m = messages[0] as any;
    expect(m.sound).toBe('default');
    expect(m.priority).toBe('high');
    expect(m.channelId).toBe('default');
    expect(m.badge).toBe(1);
    expect(m.title).toBe('Nueva cita asignada');
    expect(m.data).toEqual({ tipo: 'cita_asignada' });
  });

  it('descarta tokens que no son de Expo', () => {
    const { messages, sentTokens } = buildPushMessages(
      ['no-es-token', TOKEN],
      'Recordatorio de medicamento',
      'Es hora de tomar tu suplemento',
    );
    expect(sentTokens).toEqual([TOKEN]);
    expect(messages).toHaveLength(1);
    expect((messages[0] as any).sound).toBe('default');
  });

  it('sin tokens válidos, no arma mensajes', () => {
    const { messages, sentTokens } = buildPushMessages([], 'x', 'y');
    expect(messages).toHaveLength(0);
    expect(sentTokens).toHaveLength(0);
  });
});
