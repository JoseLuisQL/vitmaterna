import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  paginationSchema,
  updateConfigSchema,
  createEducationSchema,
  updateEducationSchema,
  approveUserSchema,
} from './admin.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { rbac } from '../../middleware/rbac.middleware.js';

export const adminRoutes = Router();

// All admin routes are protected
adminRoutes.use(authenticate, rbac('admin'));

// Users
adminRoutes.get(
  '/users',
  validate(paginationSchema),
  adminController.listUsers
);

adminRoutes.put(
  '/users/:id/approve',
  validate(approveUserSchema),
  adminController.approveUser
);

// System Config
adminRoutes.get(
  '/config',
  adminController.listConfigs
);

adminRoutes.put(
  '/config',
  adminController.updateAllConfigs
);

adminRoutes.put(
  '/config/:clave',
  validate(updateConfigSchema),
  adminController.updateConfig
);

// Educational Content
adminRoutes.post(
  '/education',
  validate(createEducationSchema),
  adminController.createEducation
);

adminRoutes.put(
  '/education/:id',
  validate(updateEducationSchema),
  adminController.updateEducation
);

adminRoutes.delete(
  '/education/:id',
  adminController.deleteEducation
);

// Audit Logs
adminRoutes.get(
  '/audit-logs',
  validate(paginationSchema),
  adminController.listAuditLogs
);

// Backup
adminRoutes.get(
  '/backup',
  adminController.getBackup
);
