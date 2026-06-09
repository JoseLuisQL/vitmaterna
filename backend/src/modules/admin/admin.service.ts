import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';

export class AdminService {
  /**
   * List all users
   */
  async listUsers(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          dni: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          gestante: {
            select: { id: true }
          },
          obstetra: {
            select: { id: true, cop: true, establecimiento: true }
          }
        }
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Approve a user (usually obstetra)
   */
  async approveUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    return updated;
  }

  /**
   * List system configs
   */
  async listConfigs() {
    return prisma.systemConfig.findMany({
      orderBy: { clave: 'asc' },
    });
  }

  /**
   * Update a system config
   */
  async updateConfig(clave: string, valor: any, descripcion?: string, updatedBy?: string) {
    return prisma.systemConfig.upsert({
      where: { clave },
      update: {
        valor,
        ...(descripcion && { descripcion }),
        ...(updatedBy && { updatedBy }),
      },
      create: {
        clave,
        valor,
        descripcion,
        updatedBy,
      },
    });
  }

  /**
   * Create educational content
   */
  async createEducation(data: any) {
    return prisma.educationalContent.create({
      data,
    });
  }

  /**
   * Update educational content
   */
  async updateEducation(id: string, data: any) {
    const exists = await prisma.educationalContent.findUnique({ where: { id } });
    if (!exists) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Educational content not found');
    }

    return prisma.educationalContent.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete educational content
   */
  async deleteEducation(id: string) {
    const exists = await prisma.educationalContent.findUnique({ where: { id } });
    if (!exists) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Educational content not found');
    }

    return prisma.educationalContent.delete({
      where: { id },
    });
  }

  /**
   * List audit logs
   */
  async listAuditLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, role: true }
          }
        }
      }),
      prisma.auditLog.count(),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Generate backup of core tables
   */
  async generateBackup() {
    const [
      users,
      gestantes,
      obstetras,
      appointments,
      systemConfigs,
      educationalContent,
      healthFacilities
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.gestante.findMany(),
      prisma.obstetra.findMany(),
      prisma.appointment.findMany(),
      prisma.systemConfig.findMany(),
      prisma.educationalContent.findMany(),
      prisma.healthFacility.findMany(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      data: {
        users,
        gestantes,
        obstetras,
        appointments,
        systemConfigs,
        educationalContent,
        healthFacilities,
      }
    };
  }
}

export const adminService = new AdminService();
