/**
 * VITMATERNA — Pruebas del hook useChat (chat en tiempo real).
 *
 * Cubre la lógica nueva que da fluidez y precisión al chat:
 *  - Envío optimista con clientId.
 *  - Acuse con timeout: si el servidor no confirma, el mensaje queda `failed`.
 *  - Reconciliación: al llegar `receive_message` con el clientId, deja de estar
 *    pending y se marca como enviado (sin duplicar).
 *  - Reintento de un mensaje fallido (vuelve a pending y re-emite).
 *
 * Nota: se usa un único caso secuencial. El react-test-renderer entra en un
 * bucle de render al montar varias instancias del hook en el mismo módulo
 * (limitación del entorno de prueba, no del hook); un solo montaje lo evita y
 * permite verificar todo el ciclo de vida del envío de forma fiable.
 */
// El timeout de acuse se lee en tiempo de ejecución; lo bajamos a 150ms.
process.env.EXPO_PUBLIC_CHAT_ACK_TIMEOUT_MS = '150';

import { renderHook, act } from '@testing-library/react-native';

jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn().mockResolvedValue({ data: { data: [], meta: { page: 1, totalPages: 1 } } }) },
}));

import { useChat } from '../src/hooks/useChat';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Socket falso: registra listeners y permite dispararlos a mano. */
function makeFakeSocket() {
  const handlers: Record<string, ((...a: any[]) => void)[]> = {};
  return {
    on: jest.fn((event: string, cb: (...a: any[]) => void) => {
      (handlers[event] ||= []).push(cb);
    }),
    off: jest.fn((event: string, cb: (...a: any[]) => void) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== cb);
    }),
    emit: jest.fn(),
    fire: (event: string, payload: any) => {
      (handlers[event] || []).forEach((h) => h(payload));
    },
  };
}

it('useChat: envío optimista, acuse, reconciliación, fallo y reintento', async () => {
  const socket = makeFakeSocket();
  const emit = jest.fn();
  const { result } = renderHook(() =>
    useChat({
      socket: socket as any,
      isConnected: true,
      emit,
      conversationId: 'conv-1',
      currentUserId: 'user-me',
      otherUserId: 'user-other',
    }),
  );

  // Dejar resolver el efecto de carga inicial (historial vacío).
  await act(async () => {
    await Promise.resolve();
  });

  // 1) Envío optimista: aparece un mensaje pendiente y se emite por socket.
  act(() => {
    result.current.sendText('Hola obstetra');
  });
  expect(result.current.messages).toHaveLength(1);
  expect(result.current.messages[0]).toMatchObject({ text: 'Hola obstetra', pending: true, senderId: 'user-me' });
  expect(emit).toHaveBeenCalledWith(
    'send_message',
    expect.objectContaining({ conversationId: 'conv-1', content: 'Hola obstetra', type: 'texto' }),
  );
  const clientId1 = result.current.messages[0].clientId as string;

  // 2) Reconciliación: el servidor confirma con el mismo clientId → enviado.
  act(() => {
    socket.fire('receive_message', {
      id: 'srv-1',
      clientId: clientId1,
      senderId: 'user-me',
      contenido: 'Hola obstetra',
      createdAt: new Date().toISOString(),
      tipo: 'texto',
    });
  });
  expect(result.current.messages[0].id).toBe('srv-1');
  expect(result.current.messages[0].pending).toBe(false);
  expect(result.current.messages[0].failed).toBeFalsy();

  // 3) No duplica si el mismo mensaje llega otra vez.
  act(() => {
    socket.fire('receive_message', {
      id: 'srv-1',
      senderId: 'user-me',
      contenido: 'Hola obstetra',
      createdAt: new Date().toISOString(),
      tipo: 'texto',
    });
  });
  expect(result.current.messages.filter((m) => m.id === 'srv-1')).toHaveLength(1);

  // 4) Mensaje del otro participante se agrega tal cual.
  act(() => {
    socket.fire('receive_message', {
      id: 'srv-2',
      senderId: 'user-other',
      contenido: '¿Cómo estás?',
      createdAt: new Date().toISOString(),
      tipo: 'texto',
    });
  });
  expect(result.current.messages).toHaveLength(2);

  // 5) Envío sin confirmación → tras el timeout queda como fallido.
  act(() => {
    result.current.sendText('Mensaje sin red');
  });
  const failing = result.current.messages[result.current.messages.length - 1];
  const clientId2 = failing.clientId as string;
  expect(failing.pending).toBe(true);

  await act(async () => {
    await wait(250);
  });
  const failed = result.current.messages.find((m) => m.clientId === clientId2)!;
  expect(failed.pending).toBe(false);
  expect(failed.failed).toBe(true);

  // 6) Reintento: vuelve a pending y re-emite con el mismo clientId.
  emit.mockClear();
  act(() => {
    result.current.retryMessage(clientId2);
  });
  const retried = result.current.messages.find((m) => m.clientId === clientId2)!;
  expect(retried.pending).toBe(true);
  expect(retried.failed).toBe(false);
  expect(emit).toHaveBeenCalledWith(
    'send_message',
    expect.objectContaining({ content: 'Mensaje sin red', clientId: clientId2 }),
  );
});
