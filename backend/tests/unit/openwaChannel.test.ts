import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { sendOpenWA, type WhatsAppCredentials } from '../../src/modules/notifications/channels.js';

/**
 * Pruebas de `sendOpenWA`: arma correctamente la petición al gateway OpenWA
 * (URL por sessionId, header X-API-Key, chatId `<dígitos>@c.us`) y propaga los
 * errores no-2xx como Error legible (para la prueba de conexión del admin).
 *
 * Se mockea el `fetch` global; no se hace ninguna petición real.
 */
const creds: WhatsAppCredentials = {
  provider: 'openwa',
  baseUrl: 'https://openwa.qware.me',
  apiKey: 'owa_k1_test',
  sessionId: 'e934e1c3-82c6-4b48-9226-c8ffaf9fc293',
};

describe('sendOpenWA (gateway WhatsApp self-hosted)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.restoreAllMocks();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('hace POST a /api/sessions/{sessionId}/messages/send-text con los headers y el body correctos', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 201,
      text: async () => '{"messageId":"true_x_out","timestamp":1782663141}',
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await sendOpenWA(creds, '51950328511', 'Hola gestante');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://openwa.qware.me/api/sessions/e934e1c3-82c6-4b48-9226-c8ffaf9fc293/messages/send-text',
    );
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe('owa_k1_test');
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body as string);
    expect(body.chatId).toBe('51950328511@c.us');
    expect(body.text).toBe('Hola gestante');
  });

  it('lanza un Error legible cuando la respuesta no es 2xx (ej. sesión no iniciada)', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => '{"statusCode":400,"message":"Session is not started"}',
    })) as unknown as typeof fetch;

    await expect(sendOpenWA(creds, '51950328511', 'Hola')).rejects.toThrow(/OpenWA 400/);
  });

  it('trunca el texto al tope de 4096 caracteres', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 201,
      text: async () => '{}',
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const largo = 'a'.repeat(5000);
    await sendOpenWA(creds, '51950328511', largo);

    const [, init] = (fetchMock as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.text.length).toBe(4096);
  });
});
