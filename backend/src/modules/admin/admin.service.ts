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
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          dni: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isVerified: true,
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
      prisma.user.count({ where: { deletedAt: null } }),
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

    // Aprobar = activar y verificar la cuenta (permite el ingreso).
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true, isVerified: true },
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
   * List all educational content for admin management (including inactive).
   */
  async listEducation() {
    return prisma.educationalContent.findMany({
      orderBy: [{ activo: 'desc' }, { orden: 'asc' }, { createdAt: 'desc' }],
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

  /** Detalle completo de un usuario (incluye perfil de gestante/obstetra). */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, dni: true, firstName: true, lastName: true, role: true,
        isActive: true, isVerified: true, phone: true, email: true,
        createdAt: true, lastLoginAt: true, deletedAt: true,
        gestante: {
          select: {
            id: true, fechaNacimiento: true, nivelRiesgo: true, estado: true,
            departamento: true, provincia: true, distrito: true, establecimiento: true,
          },
        },
        obstetra: { select: { id: true, cop: true, establecimiento: true, especialidad: true } },
      },
    });
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Usuario no encontrado');
    }
    return user;
  }

  /** Edita datos básicos de un usuario (y COP/especialidad si es obstetra). */
  async updateUser(userId: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { obstetra: true } });
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Usuario no encontrado');
    }

    const userData: Record<string, unknown> = {};
    if (data.firstName !== undefined) userData.firstName = data.firstName;
    if (data.lastName !== undefined) userData.lastName = data.lastName;
    if (data.phone !== undefined) userData.phone = data.phone || null;
    if (data.email !== undefined) userData.email = data.email || null;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: userData,
        select: {
          id: true, dni: true, firstName: true, lastName: true, role: true,
          isActive: true, phone: true, email: true,
        },
      });
      // Campos del perfil obstetra
      if (user.role === 'obstetra' && user.obstetra && (data.cop !== undefined || data.especialidad !== undefined)) {
        await tx.obstetra.update({
          where: { id: user.obstetra.id },
          data: {
            ...(data.cop !== undefined ? { cop: data.cop } : {}),
            ...(data.especialidad !== undefined ? { especialidad: data.especialidad } : {}),
          },
        });
      }
      return updated;
    });
  }

  /** Establece una nueva contraseña para un usuario (hash bcrypt; nunca se devuelve). */
  async resetUserPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Usuario no encontrado');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
    return { ok: true };
  }

  /**
   * Baja lógica de un usuario (soft delete): marca deletedAt + isActive=false.
   * Guardas: no permite auto-eliminarse ni eliminar al último admin activo.
   */
  async deleteUser(userId: string, requesterId?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Usuario no encontrado');
    }
    if (requesterId && requesterId === userId) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'No puedes eliminar tu propia cuenta.');
    }
    if (user.role === 'admin') {
      const activeAdmins = await prisma.user.count({
        where: { role: 'admin', isActive: true, deletedAt: null },
      });
      if (activeAdmins <= 1) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'No se puede eliminar al último administrador activo.');
      }
    }
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });
    return { ok: true };
  }

  /** Resumen global del sistema para el dashboard del administrador. */
  async getDashboard() {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalAdmins, totalObstetras, totalGestantesUsers, obstetrasPendientes,
      usuariosPendientes,
      gestantesActivas, gestantesRiesgoAlto,
      citasHoy, citasProximas, alertasPendientes,
      contenidoActivo, contenidoTotal, vistasAgg,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'admin', deletedAt: null } }),
      prisma.user.count({ where: { role: 'obstetra', deletedAt: null } }),
      prisma.user.count({ where: { role: 'gestante', deletedAt: null } }),
      // Obstetras pendientes de aprobación: inactivos o no verificados.
      prisma.user.count({ where: { role: 'obstetra', deletedAt: null, OR: [{ isActive: false }, { isVerified: false }] } }),
      // Cualquier usuario pendiente de aprobación (no verificado), todos los roles.
      prisma.user.count({ where: { deletedAt: null, isVerified: false } }),
      prisma.gestante.count({ where: { estado: 'activa' } }),
      prisma.gestante.count({ where: { estado: 'activa', nivelRiesgo: 'rojo' } }),
      prisma.appointment.count({ where: { fecha: { gte: startOfDay, lte: endOfDay }, deletedAt: null } }),
      prisma.appointment.count({ where: { fecha: { gt: endOfDay, lte: in7days }, estado: { in: ['programada', 'confirmada', 'reprogramada'] }, deletedAt: null } }),
      prisma.dangerSign.count({ where: { estado: 'pendiente' } }),
      prisma.educationalContent.count({ where: { activo: true } }),
      prisma.educationalContent.count(),
      prisma.educationalContent.aggregate({ _sum: { viewsCount: true } }),
    ]);

    const { getChannelsStatus } = await import('../notifications/channels.js');
    const channels = await getChannelsStatus();

    return {
      usuarios: {
        total: totalAdmins + totalObstetras + totalGestantesUsers,
        admins: totalAdmins,
        obstetras: totalObstetras,
        gestantes: totalGestantesUsers,
        obstetrasPendientes,
        pendientes: usuariosPendientes,
      },
      gestantes: { activas: gestantesActivas, altoRiesgo: gestantesRiesgoAlto },
      citas: { hoy: citasHoy, proximas7dias: citasProximas },
      alertas: { pendientes: alertasPendientes },
      contenido: { publicado: contenidoActivo, total: contenidoTotal, vistasTotales: vistasAgg._sum.viewsCount ?? 0 },
      notificaciones: {
        smsConfigurado: channels.sms.configured,
        whatsappConfigurado: channels.whatsapp.configured,
      },
    };
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
