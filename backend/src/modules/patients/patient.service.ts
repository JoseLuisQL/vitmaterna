import bcrypt from 'bcrypt';
import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';

export class PatientService {
  async findAll(filters: {
    search?: string;
    obstetraId?: string;
    estado?: string;
    nivelRiesgo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.estado) where.estado = filters.estado;
    if (filters.nivelRiesgo) where.nivelRiesgo = filters.nivelRiesgo;

    if (filters.obstetraId) {
      // Find patients that have at least one appointment or control with this obstetra
      where.OR = [
        { appointments: { some: { obstetraId: filters.obstetraId } } },
        { prenatalControls: { some: { obstetraId: filters.obstetraId } } },
      ];
    }

    if (filters.search) {
      where.user = {
        OR: [
          { dni: { contains: filters.search, mode: 'insensitive' } },
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, gestantes] = await Promise.all([
      prisma.gestante.count({ where }),
      prisma.gestante.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              dni: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return { total, gestantes, page, limit };
  }

  async createPatient(obstetraUserId: string, data: any) {
    const { dni, firstName, lastName, phone, fechaNacimiento } = data;
    
    // Check if DNI already exists
    const existing = await prisma.user.findUnique({ where: { dni } });
    if (existing) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Ya existe una usuaria con este DNI');
    }

    // Hash the DNI as the default password
    const passwordHash = await bcrypt.hash(dni, 12);
    
    // Find the obstetra profile of the logged-in user
    const obstetra = await prisma.obstetra.findUnique({ where: { userId: obstetraUserId } });
    
    return prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          dni,
          passwordHash,
          role: 'gestante',
          firstName,
          lastName,
          phone,
          isVerified: true,
          consentAccepted: true,
          consentDate: new Date(),
        }
      });

      // 2. Create Gestante profile
      const gestante = await tx.gestante.create({
        data: {
          userId: user.id,
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : new Date('1990-01-01'),
          nivelRiesgo: 'verde',
        }
      });
      
      // 3. Link to Obstetra via a first completed appointment
      if (obstetra) {
        await tx.appointment.create({
          data: {
            gestanteId: gestante.id,
            obstetraId: obstetra.id,
            fecha: new Date(),
            hora: new Date(),
            motivo: 'Registro Inicial en Sistema',
            estado: 'asistida',
          }
        });
      }
      
      return gestante;
    });
  }

  async findById(id: string) {
    const gestante = await prisma.gestante.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            dni: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        antecedentes: true,
        prenatalControls: {
          orderBy: { fecha: 'desc' },
          include: { obstetra: { include: { user: { select: { firstName: true, lastName: true } } } } },
        },
        appointments: {
          orderBy: { fecha: 'desc' },
        },
        treatments: {
          orderBy: { fechaInicio: 'desc' },
          include: { supplementLogs: { orderBy: { fecha: 'desc' } } },
        },
        labResults: {
          orderBy: { fechaExamen: 'desc' },
        },
        ultrasounds: {
          orderBy: { fecha: 'desc' },
        },
        weightRecords: {
          orderBy: { fecha: 'desc' },
        },
        vaccinationRecords: {
          orderBy: { fechaAplicacion: 'desc' },
        },
        pathologies: {
          orderBy: { fechaDiagnostico: 'desc' },
        },
      },
    });

    if (!gestante) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante no encontrada');
    }

    return gestante;
  }
}

export const patientService = new PatientService();
