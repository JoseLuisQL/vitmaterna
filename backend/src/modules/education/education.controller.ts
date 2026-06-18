import type { Request, Response } from 'express';
import { successResponse } from '../../utils/responseHelper.js';
import * as educationService from './education.service.js';

export async function getEducation(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  
  const data = await educationService.getEducationalContentForGestante(userId);

  res.json(
    successResponse(data)
  );
}

/** Catálogo de contenido activo (para que el obstetra elija qué recomendar). */
export async function getCatalog(_req: Request, res: Response): Promise<void> {
  const data = await educationService.getActiveContentCatalog();
  res.json(successResponse(data));
}

/**
 * Devuelve un contenido educativo por id (sin filtrar por trimestre). Necesario
 * para abrir un contenido recomendado vía chat aunque sea de otro trimestre.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data = await educationService.getContentById(id as string);
  res.json(successResponse(data));
}

/** Registra una vista del contenido (cuando la gestante abre el artículo). */
export async function registerView(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data = await educationService.registerContentView(id as string);
  // Si era una recomendación de su obstetra, la marca como leída.
  if (req.user?.role === 'gestante') {
    await educationService.markRecommendationRead(req.user.userId, id as string);
  }
  res.json(successResponse(data));
}
