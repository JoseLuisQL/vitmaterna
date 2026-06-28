/**
 * Ruta PÚBLICA del webhook entrante de OpenWA.
 *
 * Se monta con `express.raw` para conservar los bytes EXACTOS del cuerpo (la
 * verificación HMAC se hace sobre el cuerpo crudo). NO lleva autenticación JWT:
 * la autenticidad la da la firma `X-OpenWA-Signature`. Debe montarse ANTES del
 * `express.json()` global de la app.
 */
import { Router, raw } from 'express';
import type { Request, Response } from 'express';
import {
  resolveWebhookSecret,
  verifyOpenWASignature,
  claimIdempotencyKey,
  processOpenWAWebhook,
  type OpenWAWebhookPayload,
} from './openwa.webhook.js';

export const openwaWebhookRouter = Router();

openwaWebhookRouter.post(
  '/openwa',
  raw({ type: '*/*', limit: '5mb' }),
  async (req: Request, res: Response): Promise<void> => {
    const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const signature = req.header('X-OpenWA-Signature');
    const idempotencyKey = req.header('X-OpenWA-Idempotency-Key');

    // 1) Verificar la firma ANTES de confiar en el cuerpo.
    const secret = await resolveWebhookSecret();
    if (!verifyOpenWASignature(rawBody, signature, secret)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // 2) Parsear el cuerpo (ya verificado).
    let payload: OpenWAWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }

    // 3) Deduplicar por idempotencyKey (entrega at-least-once).
    const isNew = await claimIdempotencyKey(idempotencyKey ?? payload.idempotencyKey, payload.event || 'unknown');
    if (!isNew) {
      res.status(200).json({ ok: true, deduplicated: true });
      return;
    }

    // 4) Acusar recibo de inmediato y procesar en segundo plano (best-effort).
    res.status(200).json({ ok: true });
    void processOpenWAWebhook(payload);
  },
);
