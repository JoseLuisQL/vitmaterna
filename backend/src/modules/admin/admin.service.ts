import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import bcrypt from 'bcrypt';

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
          phone: true,
          email: true,
          createdAt: true,
          lastLoginAt: true,
          gestante: {
            select: {
              id: true,
              fechaNacimiento: true,
              nivelRiesgo: true,
              estado: true,
              departamento: true,
              provincia: true,
              distrito: true
            }
          },
          obstetra: {
            select: {
              id: true,
              cop: true,
              establecimiento: true,
              especialidad: true
            }
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
   * Toggle user active status
   */
  async toggleUserActive(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
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

  /**
   * Create a new user (with immediate activation and verification)
   */
  async createUser(data: any) {
    const { dni, firstName, lastName, phone, email, password, role, cop } = data;

    // Check if DNI already exists
    const existing = await prisma.user.findUnique({ where: { dni } });
    if (existing) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Ya existe un usuario con este DNI');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    return prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          dni,
          passwordHash,
          role,
          firstName,
          lastName,
          phone: phone || null,
          email: email || null,
          isActive: true, // Auto-active when created by admin
          isVerified: true,
          consentAccepted: true,
          consentDate: new Date(),
        },
      });

      // 2. Create profile based on role
      if (role === 'obstetra') {
        await tx.obstetra.create({
          data: {
            userId: user.id,
            cop: cop || '00000',
            especialidad: 'General',
          },
        });
      } else if (role === 'gestante') {
        await tx.gestante.create({
          data: {
            userId: user.id,
            fechaNacimiento: new Date('1990-01-01'),
            nivelRiesgo: 'verde',
            estado: 'activa',
          },
        });
      }

      return user;
    });
  }

  // ── Establecimientos de salud (RF-10.02) ──

  async listFacilities() {
    return prisma.healthFacility.findMany({ orderBy: { nombre: 'asc' } });
  }

  async createFacility(data: any) {
    return prisma.healthFacility.create({
      data: {
        nombre: data.nombre,
        codigo: data.codigo ?? null,
        direccion: data.direccion ?? null,
        telefono: data.telefono ?? null,
        horarios: data.horarios ?? undefined,
        servicios: data.servicios ?? [],
        altitudMsnm: data.altitudMsnm ?? 2926,
        activo: data.activo ?? true,
      },
    });
  }

  async updateFacility(id: string, data: any) {
    const existing = await prisma.healthFacility.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Establecimiento no encontrado');
    }
    return prisma.healthFacility.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.codigo !== undefined && { codigo: data.codigo }),
        ...(data.direccion !== undefined && { direccion: data.direccion }),
        ...(data.telefono !== undefined && { telefono: data.telefono }),
        ...(data.horarios !== undefined && { horarios: data.horarios }),
        ...(data.servicios !== undefined && { servicios: data.servicios }),
        ...(data.altitudMsnm !== undefined && { altitudMsnm: data.altitudMsnm }),
        ...(data.activo !== undefined && { activo: data.activo }),
      },
    });
  }

  async deleteFacility(id: string) {
    const existing = await prisma.healthFacility.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Establecimiento no encontrado');
    }
    await prisma.healthFacility.delete({ where: { id } });
    return { id };
  }
}

export const adminService = new AdminService();
