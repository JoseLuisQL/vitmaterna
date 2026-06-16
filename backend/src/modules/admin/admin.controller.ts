import type { Request, Response } from 'express';
import { adminService } from './admin.service.js';
import { successResponse } from '../../utils/responseHelper.js';

export class AdminController {
  async listUsers(req: Request, res: Response) {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    const result = await adminService.listUsers(page, limit);
    return res.status(200).json(successResponse(result.users, {
      total: result.total,
      page: result.page,
      limit,
      totalPages: result.totalPages,
    }));
  }

  async approveUser(req: Request, res: Response) {
    const id = req.params.id as string;
    const user = await adminService.approveUser(id);
    return res.status(200).json(successResponse({ id: user.id, isActive: user.isActive }));
  }

  async toggleUserActive(req: Request, res: Response) {
    const id = req.params.id as string;
    const user = await adminService.toggleUserActive(id);
    return res.status(200).json(successResponse({ id: user.id, isActive: user.isActive }));
  }

  async getDashboard(_req: Request, res: Response) {
    const data = await adminService.getDashboard();
    return res.status(200).json(successResponse(data));
  }

  async getUser(req: Request, res: Response) {
    const id = req.params.id as string;
    const user = await adminService.getUserById(id);
    return res.status(200).json(successResponse(user));
  }

  async updateUser(req: Request, res: Response) {
    const id = req.params.id as string;
    const user = await adminService.updateUser(id, req.body);
    return res.status(200).json(successResponse(user));
  }

  async resetUserPassword(req: Request, res: Response) {
    const id = req.params.id as string;
    await adminService.resetUserPassword(id, req.body.newPassword);
    return res.status(200).json(successResponse({ ok: true }));
  }

  async deleteUser(req: Request, res: Response) {
    const id = req.params.id as string;
    await adminService.deleteUser(id, req.user?.userId);
    return res.status(200).json(successResponse({ ok: true }));
  }

  async listConfigs(req: Request, res: Response) {
    const configs = await adminService.listConfigs();
    return res.status(200).json(successResponse(configs));
  }

  async updateConfig(req: Request, res: Response) {
    const clave = req.params.clave as string;
    const { valor, descripcion } = req.body;
    const userId = req.user?.userId;

    const config = await adminService.updateConfig(clave, valor, descripcion, userId);
    return res.status(200).json(successResponse(config));
  }

  async listEducation(_req: Request, res: Response) {
    const items = await adminService.listEducation();
    return res.status(200).json(successResponse(items));
  }

  async createEducation(req: Request, res: Response) {
    const education = await adminService.createEducation(req.body);
    return res.status(201).json(successResponse(education));
  }

  async updateEducation(req: Request, res: Response) {
    const id = req.params.id as string;
    const education = await adminService.updateEducation(id, req.body);
    return res.status(200).json(successResponse(education));
  }

  async deleteEducation(req: Request, res: Response) {
    const id = req.params.id as string;
    await adminService.deleteEducation(id);
    return res.status(200).json(successResponse({ deleted: true }));
  }

  async listAuditLogs(req: Request, res: Response) {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await adminService.listAuditLogs(page, limit);
    return res.status(200).json(successResponse(result.logs, {
      total: result.total,
      page: result.page,
      limit,
      totalPages: result.totalPages,
    }));
  }

  async getBackup(req: Request, res: Response) {
    const backup = await adminService.generateBackup();
    return res.status(200).json(successResponse(backup));
  }

  async updateAllConfigs(req: Request, res: Response) {
    const payload = req.body;
    const userId = req.user?.userId;

    const results = [];
    for (const [clave, valor] of Object.entries(payload)) {
      const config = await adminService.updateConfig(clave, valor, undefined, userId);
      results.push(config);
    }

    return res.status(200).json(successResponse(results));
  }

  async createUser(req: Request, res: Response) {
    const user = await adminService.createUser(req.body);
    return res.status(201).json(successResponse(user));
  }

  // ── Establecimientos de salud (RF-10.02) ──

  async listFacilities(_req: Request, res: Response) {
    const facilities = await adminService.listFacilities();
    return res.status(200).json(successResponse(facilities));
  }

  async createFacility(req: Request, res: Response) {
    const facility = await adminService.createFacility(req.body);
    return res.status(201).json(successResponse(facility));
  }

  async updateFacility(req: Request, res: Response) {
    const facility = await adminService.updateFacility(req.params.id as string, req.body);
    return res.status(200).json(successResponse(facility));
  }

  async deleteFacility(req: Request, res: Response) {
    const result = await adminService.deleteFacility(req.params.id as string);
    return res.status(200).json(successResponse(result));
  }

  // ── Feature flags (alcance de módulos) ──

  /** Devuelve el mapa de banderas con sus etiquetas (lectura). */
  async getFeatureFlags(_req: Request, res: Response) {
    const { getFeatureFlags, FEATURE_LABELS } = await import('../../utils/featureFlags.js');
    const flags = await getFeatureFlags();
    return res.status(200).json(successResponse({ flags, labels: FEATURE_LABELS }));
  }

  /** Actualiza una o varias banderas (solo admin). */
  async updateFeatureFlags(req: Request, res: Response) {
    const { getFeatureFlags, DEFAULT_FEATURE_FLAGS } = await import('../../utils/featureFlags.js');
    const { setConfigValue } = await import('../../utils/systemSettings.js');
    const current = await getFeatureFlags();
    const incoming = (req.body?.flags ?? req.body ?? {}) as Record<string, unknown>;

    const next = { ...current };
    for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as (keyof typeof DEFAULT_FEATURE_FLAGS)[]) {
      const v = incoming[key];
      if (typeof v === 'boolean') next[key] = v;
      else if (v === 'true') next[key] = true;
      else if (v === 'false') next[key] = false;
    }

    await setConfigValue('featureFlags', next, req.user?.userId, 'Alcance de módulos del sistema');
    return res.status(200).json(successResponse({ flags: next }));
  }
}

export const adminController = new AdminController();
