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
}

export const adminController = new AdminController();
