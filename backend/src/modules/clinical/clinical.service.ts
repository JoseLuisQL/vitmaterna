import { prisma } from '../../config/database.js';
import { calculateRiskLevel } from '../../utils/riskCalculator.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import { sendPushNotification } from '../notifications/notification.service.js';

export class ClinicalService {
  async createPrenatalControl(data: any) {
    const { proximaCita, ...controlData } = data;
    
    // Parse dates
    const parsedProximaCita = proximaCita ? new Date(`${proximaCita}T00:00:00.000Z`) : undefined;

    // Create control in transaction so we can update the risk level
    return prisma.$transaction(async (tx) => {
      const control = await tx.prenatalControl.create({
        data: {
          ...controlData,
          fecha: new Date(),
          proximaCita: parsedProximaCita,
        },
      });

      // Recalculate Risk Level
      const gestante = await tx.gestante.findUnique({
        where: { id: data.gestanteId },
        include: {
          antecedentes: true,
          prenatalControls: {
            orderBy: { fecha: 'desc' },
            take: 1,
          },
          labResults: {
            where: { tipoExamen: 'Hemoglobina' },
            orderBy: { fechaExamen: 'desc' },
            take: 1,
          },
        },
      });

      if (gestante) {
        const latestControl = gestante.prenatalControls[0];
        const latestLab = gestante.labResults[0];

        const riskAssessment = calculateRiskLevel({
          age: gestante.ageAtRegistration || undefined,
          imc: gestante.imc ? Number(gestante.imc) : undefined,
          correctedHemoglobin: latestLab?.valorCorregido ? Number(latestLab.valorCorregido) : undefined,
          presionSistolica: latestControl?.presionSistolica || undefined,
          presionDiastolica: latestControl?.presionDiastolica || undefined,
          cesareasPrevias: gestante.cesareas,
          abortosPrevios: gestante.abortos,
          nacidosMuertos: gestante.nacidosMuertos,
          gestaciones: gestante.gestaciones,
          rhSensitizado: gestante.rhSensitizado || undefined,
          antecedentesPersonales: gestante.antecedentes
            .filter((a) => a.tipo === 'personal')
            .map((a) => a.condicion),
        });

        await tx.gestante.update({
          where: { id: data.gestanteId },
          data: { nivelRiesgo: riskAssessment.level },
        });
      }

      return control;
    });
  }

  async getPrenatalControls(gestanteId: string) {
    return prisma.prenatalControl.findMany({
      where: { gestanteId },
      orderBy: { fecha: 'desc' },
    });
  }

  async createTreatment(data: any) {
    const { fechaInicio, fechaFin, horaToma, ...treatmentData } = data;
    return prisma.treatment.create({
      data: {
        ...treatmentData,
        fechaInicio: new Date(`${fechaInicio}T00:00:00.000Z`),
        fechaFin: fechaFin ? new Date(`${fechaFin}T00:00:00.000Z`) : undefined,
        horaToma: horaToma ? new Date(`1970-01-01T${horaToma}:00.000Z`) : undefined,
      },
    });
  }

  async getTreatments(gestanteId: string) {
    return prisma.treatment.findMany({
      where: { gestanteId },
      orderBy: { fechaInicio: 'desc' },
    });
  }

  async createSupplementLog(treatmentId: string, data: any) {
    const { fecha, ...logData } = data;
    
    // Ensure treatment exists
    const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!treatment) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Tratamiento no encontrado');
    }

    return prisma.supplementLog.create({
      data: {
        ...logData,
        treatmentId,
        fecha: new Date(`${fecha}T00:00:00.000Z`),
      },
    });
  }

  async createDangerSign(gestanteId: string, data: any) {
    const dangerSign = await prisma.dangerSign.create({
      data: {
        gestanteId,
        tipoSigno: data.tipo_signo,
        descripcion: data.descripcion,
        severidad: data.severidad,
      }
    });

    // Attempt to find the assigned/recent Obstetra
    let obstetraUser = null;

    const lastControl = await prisma.prenatalControl.findFirst({
      where: { gestanteId },
      orderBy: { fecha: 'desc' },
      include: { obstetra: { include: { user: true } } }
    });

    if (lastControl?.obstetra) {
      obstetraUser = lastControl.obstetra.user;
    } else {
      const lastAppointment = await prisma.appointment.findFirst({
        where: { gestanteId, obstetraId: { not: null } },
        orderBy: { fecha: 'desc' },
        include: { obstetra: { include: { user: true } } }
      });
      if (lastAppointment?.obstetra) {
        obstetraUser = lastAppointment.obstetra.user;
      }
    }

    if (obstetraUser && obstetraUser.notificationPreferences) {
      const prefs = obstetraUser.notificationPreferences as Record<string, any>;
      if (prefs.expoPushToken) {
        await sendPushNotification(
          [prefs.expoPushToken],
          'Signo de Alarma Reportado',
          `Una gestante ha reportado un signo de alarma: ${data.tipo_signo}`,
          { gestanteId, dangerSignId: dangerSign.id }
        );
      }
    }

    return dangerSign;
  }
}

export const clinicalService = new ClinicalService();
