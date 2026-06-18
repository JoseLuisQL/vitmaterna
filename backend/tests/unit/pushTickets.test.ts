import { describe, it, expect } from '@jest/globals';
import { getInvalidTokens, type PushTicketLike } from '../../src/utils/pushTickets.js';

describe('Análisis de tickets de push', () => {
  it('detecta tokens DeviceNotRegistered como inválidos', () => {
    const tokens = ['ExpoPushToken[AAA]', 'ExpoPushToken[BBB]', 'ExpoPushToken[CCC]'];
    const tickets: PushTicketLike[] = [
      { status: 'ok' },
      { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok' },
    ];
    expect(getInvalidTokens(tokens, tickets)).toEqual(['ExpoPushToken[BBB]']);
  });

  it('no marca como inválidos los errores que no sean DeviceNotRegistered', () => {
    const tokens = ['ExpoPushToken[AAA]'];
    const tickets: PushTicketLike[] = [
      { status: 'error', message: 'rate limit', details: { error: 'MessageRateExceeded' } },
    ];
    expect(getInvalidTokens(tokens, tickets)).toEqual([]);
  });

  it('todos OK → ningún token inválido', () => {
    const tokens = ['ExpoPushToken[AAA]', 'ExpoPushToken[BBB]'];
    const tickets: PushTicketLike[] = [{ status: 'ok' }, { status: 'ok' }];
    expect(getInvalidTokens(tokens, tickets)).toEqual([]);
  });

  it('error sin details no rompe', () => {
    const tokens = ['ExpoPushToken[AAA]'];
    const tickets: PushTicketLike[] = [{ status: 'error', message: 'x', details: null }];
    expect(getInvalidTokens(tokens, tickets)).toEqual([]);
  });

  it('tolera desajuste de longitudes (menos tickets que tokens)', () => {
    const tokens = ['ExpoPushToken[AAA]', 'ExpoPushToken[BBB]'];
    const tickets: PushTicketLike[] = [
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
    ];
    expect(getInvalidTokens(tokens, tickets)).toEqual(['ExpoPushToken[AAA]']);
  });

  it('arreglos vacíos → vacío', () => {
    expect(getInvalidTokens([], [])).toEqual([]);
  });

  it('detecta múltiples tokens inválidos preservando el mapeo por índice', () => {
    const tokens = ['T0', 'T1', 'T2', 'T3'];
    const tickets: PushTicketLike[] = [
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok' },
    ];
    expect(getInvalidTokens(tokens, tickets)).toEqual(['T0', 'T2']);
  });
});
