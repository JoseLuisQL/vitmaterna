/**
 * VITMATERNA — Pruebas de la cola de escrituras offline (outbox).
 *
 * Cubre la lógica más delicada del módulo offline, que hasta ahora no tenía
 * cobertura: deduplicación, orden FIFO, gating por conexión, y el manejo
 * diferenciado de errores en flush() (descartar 4xx, reintentar 5xx/red con
 * backoff y tope de intentos), además de la invalidación de queries al éxito.
 *
 * Estrategia de mocks: forzamos la ruta de persistencia localStorage
 * (getDb()→null) con un localStorage en memoria, y controlamos la conexión a
 * través de onlineManager.isOnline. `api.request` se mockea por test.
 */

// ─── localStorage en memoria (persistencia de la outbox en estas pruebas) ────
class MemoryStorage {
  private store: Record<string, string> = {};
  getItem(k: string): string | null {
    return k in this.store ? this.store[k] : null;
  }
  setItem(k: string, v: string): void {
    this.store[k] = v;
  }
  removeItem(k: string): void {
    delete this.store[k];
  }
  clear(): void {
    this.store = {};
  }
}

// ─── Mocks de dependencias del módulo ────────────────────────────────────────
jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

// getDb()→null fuerza el fallback a localStorage (ruta probada aquí).
jest.mock('../src/database/index', () => ({
  __esModule: true,
  getDb: () => null,
}));

let mockOnlineFlag = true;
jest.mock('@tanstack/react-query', () => ({
  __esModule: true,
  onlineManager: { isOnline: () => mockOnlineFlag },
}));

// subscribeOnline: capturamos el listener para simular reconexión.
let mockOnlineListener: ((online: boolean) => void) | null = null;
jest.mock('../src/services/network', () => ({
  __esModule: true,
  subscribeOnline: (fn: (online: boolean) => void) => {
    mockOnlineListener = fn;
    return () => {
      mockOnlineListener = null;
    };
  },
}));

import api from '../src/services/api';
import {
  enqueue,
  flush,
  getPending,
  pendingCount,
  initOutbox,
} from '../src/services/outbox';

const mockedRequest = api.request as jest.Mock;

const baseOp = (overrides: Partial<Parameters<typeof enqueue>[0]> = {}) => ({
  type: 'supplement_log' as const,
  endpoint: '/clinical/treatments/t1/log',
  method: 'POST' as const,
  payload: { tomado: true },
  dedupeKey: 'supplement:t1:2026-06-23',
  ...overrides,
});

beforeEach(() => {
  (global as any).localStorage = new MemoryStorage();
  mockOnlineFlag = true;
  mockOnlineListener = null;
  mockedRequest.mockReset();
});

describe('outbox — encolado e idempotencia', () => {
  it('encola una operación y la cuenta como pendiente', () => {
    const queued = enqueue(baseOp());
    expect(queued).toBe(true);
    expect(pendingCount()).toBe(1);
  });

  it('no encola dos veces la misma dedupeKey (idempotente en cliente)', () => {
    expect(enqueue(baseOp())).toBe(true);
    expect(enqueue(baseOp())).toBe(false); // mismo dedupeKey → descartado
    expect(pendingCount()).toBe(1);
  });

  it('encola operaciones con dedupeKey distinta', () => {
    enqueue(baseOp({ dedupeKey: 'a' }));
    enqueue(baseOp({ dedupeKey: 'b' }));
    expect(pendingCount()).toBe(2);
  });

  it('devuelve las pendientes en orden FIFO por createdAt', () => {
    enqueue(baseOp({ dedupeKey: 'first', endpoint: '/first' }));
    enqueue(baseOp({ dedupeKey: 'second', endpoint: '/second' }));
    const pending = getPending();
    expect(pending.map((o) => o.endpoint)).toEqual(['/first', '/second']);
  });
});

describe('outbox — flush() y reconciliación', () => {
  it('envía la operación y la elimina de la cola al tener éxito', async () => {
    enqueue(baseOp());
    mockedRequest.mockResolvedValueOnce({ data: { ok: true } });

    await flush();

    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(mockedRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/clinical/treatments/t1/log', method: 'POST' }),
    );
    expect(pendingCount()).toBe(0);
  });

  it('procesa varias operaciones en orden y vacía la cola', async () => {
    enqueue(baseOp({ dedupeKey: 'a', endpoint: '/a' }));
    enqueue(baseOp({ dedupeKey: 'b', endpoint: '/b' }));
    mockedRequest.mockResolvedValue({ data: {} });

    await flush();

    expect(mockedRequest).toHaveBeenCalledTimes(2);
    expect(mockedRequest.mock.calls[0][0].url).toBe('/a');
    expect(mockedRequest.mock.calls[1][0].url).toBe('/b');
    expect(pendingCount()).toBe(0);
  });

  it('no envía nada si no hay conexión', async () => {
    enqueue(baseOp());
    mockOnlineFlag = false;

    await flush();

    expect(mockedRequest).not.toHaveBeenCalled();
    expect(pendingCount()).toBe(1); // sigue encolada
  });

  it('invalida las queries indicadas tras un envío exitoso', async () => {
    const invalidateQueries = jest.fn();
    initOutbox({ invalidateQueries } as any);
    mockedRequest.mockResolvedValueOnce({ data: {} });

    enqueue(baseOp({ invalidate: [['treatments'], ['gestanteDashboard']] }));
    await flush();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['treatments'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['gestanteDashboard'] });
  });
});

describe('outbox — manejo de errores en flush()', () => {
  it('descarta la operación ante un 4xx (operación inválida o ya aplicada)', async () => {
    enqueue(baseOp());
    mockedRequest.mockRejectedValueOnce({ response: { status: 400 } });

    await flush();

    expect(pendingCount()).toBe(0); // descartada, no reintenta
  });

  it('mantiene la operación ante un 5xx (reintenta luego)', async () => {
    enqueue(baseOp());
    mockedRequest.mockRejectedValueOnce({ response: { status: 503 } });

    await flush();

    expect(pendingCount()).toBe(1); // sigue en cola
    expect(getPending()[0].attempts).toBe(1); // intento incrementado
  });

  it('mantiene la operación ante un error de red (sin response)', async () => {
    enqueue(baseOp());
    mockedRequest.mockRejectedValueOnce(new Error('Network Error'));

    await flush();

    expect(pendingCount()).toBe(1);
  });

  it('trata 429 (rate limit) como reintentable, no como 4xx descartable', async () => {
    enqueue(baseOp());
    mockedRequest.mockRejectedValueOnce({ response: { status: 429 } });

    await flush();

    expect(pendingCount()).toBe(1);
  });

  it('detiene el flush en el primer error de red (no procesa las siguientes)', async () => {
    enqueue(baseOp({ dedupeKey: 'a', endpoint: '/a' }));
    enqueue(baseOp({ dedupeKey: 'b', endpoint: '/b' }));
    mockedRequest.mockRejectedValueOnce({ response: { status: 500 } });

    await flush();

    expect(mockedRequest).toHaveBeenCalledTimes(1); // se detuvo en la primera
    expect(pendingCount()).toBe(2); // ninguna se perdió
  });

  it('descarta la operación tras alcanzar el tope de reintentos (MAX_ATTEMPTS=8)', async () => {
    enqueue(baseOp());
    mockedRequest.mockRejectedValue({ response: { status: 500 } });

    // Cada flush procesa un intento (se detiene al primer 5xx).
    for (let i = 0; i < 8; i++) {
      await flush();
    }

    expect(pendingCount()).toBe(0); // descartada para no bloquear la cola
  });

  it('reenvía con éxito al reconectar tras fallos transitorios', async () => {
    enqueue(baseOp());
    // 1er intento: 5xx (se queda en cola)
    mockedRequest.mockRejectedValueOnce({ response: { status: 500 } });
    await flush();
    expect(pendingCount()).toBe(1);

    // 2º intento: éxito
    mockedRequest.mockResolvedValueOnce({ data: {} });
    await flush();
    expect(pendingCount()).toBe(0);
  });
});

describe('outbox — disparo automático al reconectar', () => {
  it('vacía la cola cuando vuelve la conexión (listener de network)', async () => {
    initOutbox({ invalidateQueries: jest.fn() } as any);
    expect(typeof mockOnlineListener).toBe('function');

    enqueue(baseOp());
    mockedRequest.mockResolvedValueOnce({ data: {} });

    // Simula reconexión.
    mockOnlineListener!(true);
    // flush es async; esperamos un tick.
    await Promise.resolve();
    await Promise.resolve();

    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });
});
