import bcrypt from 'bcrypt';
import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import { classifyImc } from '../../utils/imcClassification.js';
import { calculateFPP } from '../../utils/dateCalc.js';

/**
 * Normaliza la respuesta de una gestante para que el DNI esté siempre disponible
 * de forma consistente en el nivel superior (`dni`), además de en `user.dni`.
 * Evita la ambigüedad de tener que buscarlo en distintos lugares según el
 * endpoint. Se mantiene `user` intacto por compatibilidad.
 */
function normalizePatient<T extends { user?: { dni?: string | null } | null }>(
  gestante: T | null,
): (T & { dni: string | null }) | null {
  if (!gestante) return null;
  return { ...gestante, dni: gestante.user?.dni ?? null };
}

export class PatientService {
  async findAll(filters: {
    search?: string;
    obstetraId?: string;
    estado?: string;
    nivelRiesgo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ? Number(filters.page) : 1;
    const limit = filters.limit ? Number(filters.limit) : 10;
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

    return { total, gestantes: gestantes.map(normalizePatient), page, limit };
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
      
      // Respuesta normalizada: incluir el DNI a nivel superior de forma consistente.
      return { ...gestante, dni: user.dni, user: { dni: user.dni, firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email } };
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

    return normalizePatient(gestante);
  }

  async findByDni(dni: string) {
    const gestante = await prisma.gestante.findFirst({
      where: {
        user: { dni, deletedAt: null }
      },
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

    return normalizePatient(gestante);
  }

  async schedulePrenatalAppointments(tx: any, gestanteId: string, fum: Date, obstetraId?: string) {
    // 1. Delete existing autogenerated future programada appointments to avoid duplicates
    await tx.appointment.deleteMany({
      where: {
        gestanteId,
        esAutoGenerada: true,
        estado: 'programada',
      }
    });

    // 2. Schedule the 8 controls
    const controlWeeks = [12, 18, 23, 27, 31, 34, 37, 39];
    const appointmentsData = [];
    const now = new Date();

    for (let i = 0; i < controlWeeks.length; i++) {
      const week = controlWeeks[i];
      const controlNum = i + 1;
      
      const apptDate = new Date(fum.getTime());
      apptDate.setDate(apptDate.getDate() + (week * 7));

      if (apptDate < now) continue;

      const apptTime = new Date(apptDate);
      apptTime.setHours(9, 0, 0, 0);

      appointmentsData.push({
        gestanteId,
        obstetraId: obstetraId || null,
        motivo: `Control Prenatal Programado (Control ${controlNum})`,
        fecha: apptDate,
        hora: apptTime,
        estado: 'programada' as const,
        numeroControl: controlNum,
        egSemanas: week,
        esAutoGenerada: true,
      });
    }

    if (appointmentsData.length > 0) {
      await tx.appointment.createMany({
        data: appointmentsData,
      });
    }
  }

  async updatePatient(id: string, data: any) {
    // 1. Check if gestante exists
    const currentGestante = await prisma.gestante.findUnique({
      where: { id },
      include: {
        antecedentes: true,
        prenatalControls: { orderBy: { fecha: 'desc' }, take: 1 },
        labResults: {
          where: { tipoExamen: 'Hemoglobina' },
          orderBy: { fechaExamen: 'desc' },
          take: 1,
        },
      },
    });

    if (!currentGestante) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante no encontrada');
    }

    // 2. Separate user fields
    const { firstName, lastName, phone, email, ...gestanteFields } = data;

    // 3. Process date fields
    const dateFields: any = {};
    if (gestanteFields.fechaNacimiento !== undefined) {
      if (gestanteFields.fechaNacimiento !== null) {
        dateFields.fechaNacimiento = new Date(gestanteFields.fechaNacimiento);
      }
      delete gestanteFields.fechaNacimiento;
    }
    if (gestanteFields.fum !== undefined) {
      dateFields.fum = gestanteFields.fum ? new Date(gestanteFields.fum) : null;
      delete gestanteFields.fum;
    }
    if (gestanteFields.fppFum !== undefined) {
      dateFields.fppFum = gestanteFields.fppFum ? new Date(gestanteFields.fppFum) : null;
      delete gestanteFields.fppFum;
    }
    // RF-2.07/2.11: calcular automáticamente la FPP con la regla de Naegele
    // cuando se establece la FUM y el cliente no envió una FPP explícita.
    if (dateFields.fum && dateFields.fppFum === undefined) {
      dateFields.fppFum = calculateFPP(dateFields.fum);
    }
    if (gestanteFields.fppEco !== undefined) {
      dateFields.fppEco = gestanteFields.fppEco ? new Date(gestanteFields.fppEco) : null;
      delete gestanteFields.fppEco;
    }

    // 4. Calculate Age At Registration
    let ageAtRegistration = gestanteFields.ageAtRegistration;
    if (dateFields.fechaNacimiento) {
      const birthDate = dateFields.fechaNacimiento;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      ageAtRegistration = age;
    }

    // 5. Calculate IMC and weight classification
    let calculatedImc = gestanteFields.imc;
    let classification = gestanteFields.clasificacionImc;
    const peso = gestanteFields.pesoActual || gestanteFields.pesoHabitual || currentGestante.pesoActual || currentGestante.pesoHabitual;
    const talla = gestanteFields.talla || currentGestante.talla;
    if (peso && talla) {
      const p = Number(peso);
      const t = Number(talla);
      if (t > 0) {
        calculatedImc = p / (t * t);
        classification = classifyImc(calculatedImc);
      }
    }

    // 6. Recalculate Risk Level
    const finalAge = ageAtRegistration !== undefined ? ageAtRegistration : (currentGestante.ageAtRegistration || undefined);
    const finalImc = calculatedImc !== undefined ? Number(calculatedImc) : (currentGestante.imc ? Number(currentGestante.imc) : undefined);
    const latestControl = currentGestante.prenatalControls[0];
    const latestLab = currentGestante.labResults[0];

    const { calculateRiskLevel } = await import('../../utils/riskCalculator.js');
    const riskAssessment = calculateRiskLevel({
      age: finalAge,
      imc: finalImc,
      correctedHemoglobin: latestLab?.valorCorregido ? Number(latestLab.valorCorregido) : undefined,
      presionSistolica: latestControl?.presionSistolica || undefined,
      presionDiastolica: latestControl?.presionDiastolica || undefined,
      cesareasPrevias: gestanteFields.cesareas !== undefined ? gestanteFields.cesareas : currentGestante.cesareas,
      abortosPrevios: gestanteFields.abortos !== undefined ? gestanteFields.abortos : currentGestante.abortos,
      nacidosMuertos: gestanteFields.nacidosMuertos !== undefined ? gestanteFields.nacidosMuertos : currentGestante.nacidosMuertos,
      gestaciones: gestanteFields.gestaciones !== undefined ? gestanteFields.gestaciones : currentGestante.gestaciones,
      rhSensitizado: gestanteFields.rhSensitizado !== undefined ? gestanteFields.rhSensitizado : (currentGestante.rhSensitizado || undefined),
      antecedentesPersonales: currentGestante.antecedentes
        .filter((a) => a.tipo === 'personal')
        .map((a) => a.condicion),
    });

    // 7. Perform updates in transaction
    return prisma.$transaction(async (tx) => {
      // Update User
      if (firstName || lastName || phone || email) {
        await tx.user.update({
          where: { id: currentGestante.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(phone !== undefined && { phone }),
            ...(email !== undefined && { email }),
          },
        });
      }

      // Update Gestante
      const updatedGestante = await tx.gestante.update({
        where: { id },
        data: {
          ...gestanteFields,
          ...dateFields,
          ...(ageAtRegistration !== undefined && { ageAtRegistration }),
          ...(calculatedImc !== undefined && { imc: calculatedImc }),
          ...(classification !== undefined && { clasificacionImc: classification }),
          nivelRiesgo: riskAssessment.level,
        },
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
      });

      // Si se establece/actualiza la FUM, generar el cronograma de controles
      // SOLO si la opción "autoGenerarCitas" está activada por el administrador.
      // Si está desactivada, la obstetra crea las citas manualmente (RF-3.02).
      if (dateFields.fum) {
        const cfg = await tx.systemConfig.findUnique({ where: { clave: 'autoGenerarCitas' } });
        // Por defecto activado (true) si no existe la configuración.
        const autoGenerar = cfg ? cfg.valor === true || cfg.valor === 'true' : true;

        if (autoGenerar) {
          const lastControl = await tx.prenatalControl.findFirst({
            where: { gestanteId: id },
            orderBy: { fecha: 'desc' },
          });
          const lastAppointment = await tx.appointment.findFirst({
            where: { gestanteId: id, obstetraId: { not: null } },
            orderBy: { fecha: 'desc' },
          });
          const resolvedObstetraId = lastControl?.obstetraId || lastAppointment?.obstetraId || undefined;

          await this.schedulePrenatalAppointments(tx, id, dateFields.fum, resolvedObstetraId);
        }
      }

      return normalizePatient(updatedGestante);
    });
  }
}

export const patientService = new PatientService();
