/**
 * Panel de gestión OpenWA (solo admin). Expone el estado de la sesión, la
 * reconexión (QR / start / stop) y el historial saliente para el panel del
 * admin, hablando con NUESTRO backend (JWT admin). La API key de OpenWA nunca
 * sale de aquí: el cliente solo recibe datos públicos.
 */
import type { Request, Response } from 'express';
import { successResponse } from '../../utils/responseHelper.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import {
  getSessionStatus,
  connectSession,
  disconnectSession,
  listMessages,
  OpenWANotConfiguredError,
} from './openwa.client.js';

/** Traduce errores del cliente OpenWA a AppError con mensajes claros. */
function toAppError(error: unknown): AppError {
  if (error instanceof OpenWANotConfiguredError) {
    return new AppError(400, ErrorCodes.VALIDATION_ERROR, error.message);
  }
  return new AppError(502, ErrorCodes.EXTERNAL_SERVICE_ERROR, (error as Error).message);
}

/** GET /v1/admin/openwa/status — estado de la sesión (sin secretos). */
export async function getOpenWAStatus(_req: Request, res: Response): Promise<void> {
  try {
    const status = await getSessionStatus();
    res.json(successResponse(status));
  } catch (error) {
    throw toAppError(error);
  }
}

/** POST /v1/admin/openwa/connect — inicia/reconecta y devuelve QR si hace falta. */
export async function connectOpenWA(_req: Request, res: Response): Promise<void> {
  try {
    const result = await connectSession();
    res.json(successResponse(result));
  } catch (error) {
    throw toAppError(error);
  }
}

/** POST /v1/admin/openwa/disconnect — detiene (desvincula) la sesión. */
export async function disconnectOpenWA(_req: Request, res: Response): Promise<void> {
  try {
    await disconnectSession();
    res.json(successResponse({ ok: true }));
  } catch (error) {
    throw toAppError(error);
  }
}

/** GET /v1/admin/openwa/messages?limit — historial saliente reciente. */
export async function getOpenWAMessages(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);
    const messages = await listMessages(limit);
    res.json(successResponse({ messages }));
  } catch (error) {
    throw toAppError(error);
  }
}
