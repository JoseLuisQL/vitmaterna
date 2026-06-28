import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';
import { verifyOpenWASignature } from '../../src/modules/notifications/openwa.webhook.js';
import { nationalDigitsFromWhatsApp } from '../../src/modules/notifications/openwa.inbound.js';

describe('verifyOpenWASignature (HMAC del webhook OpenWA)', () => {
  const secret = 'un-secreto-largo-de-prueba';
  const body = Buffer.from(JSON.stringify({ event: 'message.received', data: { body: 'hola' } }));
  const validSig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

  it('acepta una firma válida calculada sobre los bytes crudos', () => {
    expect(verifyOpenWASignature(body, validSig, secret)).toBe(true);
  });

  it('rechaza una firma con secreto incorrecto', () => {
    const wrong = 'sha256=' + crypto.createHmac('sha256', 'otro-secreto').update(body).digest('hex');
    expect(verifyOpenWASignature(body, wrong, secret)).toBe(false);
  });

  it('rechaza si el cuerpo fue alterado tras firmar', () => {
    const tampered = Buffer.from(JSON.stringify({ event: 'message.received', data: { body: 'ALTERADO' } }));
    expect(verifyOpenWASignature(tampered, validSig, secret)).toBe(false);
  });

  it('rechaza cuando falta la firma o el secreto', () => {
    expect(verifyOpenWASignature(body, undefined, secret)).toBe(false);
    expect(verifyOpenWASignature(body, validSig, '')).toBe(false);
  });
});

describe('nationalDigitsFromWhatsApp (mapeo de número entrante)', () => {
  it('extrae los 9 dígitos nacionales desde un JID con código de país', () => {
    expect(nationalDigitsFromWhatsApp('51950328511@c.us')).toBe('950328511');
  });

  it('acepta el número sin sufijo @c.us', () => {
    expect(nationalDigitsFromWhatsApp('51950328511')).toBe('950328511');
  });

  it('acepta un número nacional de 9 dígitos directo', () => {
    expect(nationalDigitsFromWhatsApp('950328511')).toBe('950328511');
  });

  it('devuelve null para un @lid opaco no resoluble', () => {
    expect(nationalDigitsFromWhatsApp('102650087514262@lid')).toBeNull();
  });
});
