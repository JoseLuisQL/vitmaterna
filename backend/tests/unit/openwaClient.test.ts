import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';

/**
 * Pruebas del cliente del panel OpenWA (`openwa.client.ts`): mapea las respuestas
 * del gateway a JSON propio (sin secretos), arma las URLs con el sessionId y el
 * header X-API-Key, y reporta correctamente cuando NO hace falta QR (sesión ya
 * autenticada → /qr responde 400). Se mockean `resolveWhatsAppCredentials` y `fetch`.
 */
jest.unstable_mockModule('../../src/modules/notifications/channels.js', () => ({
  resolveWhatsAppCredentials: jest.fn(async () => ({
    provider: 'openwa',
    baseUrl: 'https://openwa.qware.me',
    apiKey: 'owa_k1_test',
    sessionId: 'sid-123',
  })),
}));

// El import es DINÁMICO y dentro de beforeAll (no top-level) para que ts-jest en
// modo ESM no emita TS1378 (top-level await). El mock de módulo con
// `jest.unstable_mockModule` de arriba ya está registrado cuando esto corre.
let getSessionStatus: typeof import('../../src/modules/notifications/openwa.client.js')['getSessionStatus'];
let connectSession: typeof import('../../src/modules/notifications/openwa.client.js')['connectSession'];
let disconnectSession: typeof import('../../src/modules/notifications/openwa.client.js')['disconnectSession'];
let listMessages: typeof import('../../src/modules/notifications/openwa.client.js')['listMessages'];

describe('openwa.client (panel de gestión)', () => {
  const originalFetch = global.fetch;
  beforeAll(async () => {
    ({ getSessionStatus, connectSession, disconnectSession, listMessages } = await import(
      '../../src/modules/notifications/openwa.client.js'
    ));
  });
  beforeEach(() => {
    jest.restoreAllMocks();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('getSessionStatus mapea el estado de la sesión y usa X-API-Key', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ id: 'sid-123', name: 'vitmaterna', status: 'ready', phone: '51950328511', pushName: 'DKB', lastError: null }),
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const status = await getSessionStatus();
    const [url, init] = (fetchMock as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openwa.qware.me/api/sessions/sid-123');
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('owa_k1_test');
    expect(status.status).toBe('ready');
    expect(status.phone).toBe('51950328511');
    // No debe filtrar la apiKey en el objeto devuelto.
    expect(JSON.stringify(status)).not.toContain('owa_k1_test');
  });

  it('connectSession devuelve needsQr=false cuando la sesión ya está autenticada (qr → 400)', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.endsWith('/start')) return { ok: true, status: 201, text: async () => '{}' };
      // /qr responde 400 con mensaje cuando ya está autenticada.
      return { ok: false, status: 400, text: async () => JSON.stringify({ message: 'Session is already authenticated, no QR code needed' }) };
    }) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const result = await connectSession();
    expect(result.needsQr).toBe(false);
    expect(result.qr).toBeNull();
    expect(result.message).toMatch(/already authenticated/i);
  });

  it('connectSession devuelve el QR cuando la sesión necesita vincularse', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.endsWith('/start')) return { ok: true, status: 201, text: async () => '{}' };
      return { ok: true, status: 200, text: async () => JSON.stringify({ qr: 'data:image/png;base64,AAAA', pairingCode: '12345678' }) };
    }) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const result = await connectSession();
    expect(result.needsQr).toBe(true);
    expect(result.qr).toBe('data:image/png;base64,AAAA');
    expect(result.pairingCode).toBe('12345678');
  });

  it('listMessages normaliza el arreglo de mensajes (acepta {messages:[...]})', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          messages: [
            { id: 'm1', body: 'hola', from: '51950328511', to: '51999@c.us', type: 'text', direction: 'outgoing', status: 'read', timestamp: 1782666923, createdAt: '2026-06-28T17:15:19.000Z' },
          ],
        }),
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const messages = await listMessages(5);
    const [url] = (fetchMock as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain('/sessions/sid-123/messages?limit=5');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ id: 'm1', body: 'hola', direction: 'outgoing', status: 'read' });
  });

  it('disconnectSession lanza Error legible si el gateway responde no-2xx', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 502, text: async () => 'bad gateway' })) as unknown as typeof fetch;
    await expect(disconnectSession()).rejects.toThrow(/OpenWA stop 502/);
  });
});
