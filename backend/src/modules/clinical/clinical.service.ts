import { prisma } from '../../config/database.js';
import { calculateRiskLevel } from '../../utils/riskCalculator.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import { sendPushNotification } from '../notifications/notification.service.js';

export class ClinicalService {
  async createPrenatalControl(data: any, authenticatedUserId?: string) {
    const gestanteId = data.patientId || data.gestanteId;
    
    if (!gestanteId) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'El ID de la gestante es requerido');
    }

    // Resolve obstetraId
    let resolvedObstetraId = data.obstetraId;
    if (!resolvedObstetraId && authenticatedUserId) {
      const obstetra = await prisma.obstetra.findUnique({ where: { userId: authenticatedUserId } });
      resolvedObstetraId = obstetra?.id;
    }

    if (!resolvedObstetraId) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'El ID del obstetra es requerido');
    }

    // Parse gestational age
    const egSemanas = data.week !== undefined ? Number(data.week) : (data.egSemanas !== undefined ? Number(data.egSemanas) : 0);

    // Parse weight
    const peso = data.weight !== undefined ? Number(data.weight) : (data.peso !== undefined ? Number(data.peso) : undefined);

    // Parse blood pressure
    let presionSistolica = data.presionSistolica;
    let presionDiastolica = data.presionDiastolica;
    if (data.bloodPressure && typeof data.bloodPressure === 'string') {
      const parts = data.bloodPressure.split('/');
      if (parts.length === 2) {
        presionSistolica = parseInt(parts[0].trim(), 10);
        presionDiastolica = parseInt(parts[1].trim(), 10);
      }
    }

    // Parse fetal heart rate
    const fcf = data.fetalHeartRate !== undefined ? Number(data.fetalHeartRate) : (data.fcf !== undefined ? Number(data.fcf) : undefined);

    // Parse fundal height
    const alturaUterina = data.fundalHeight !== undefined ? Number(data.fundalHeight) : (data.alturaUterina !== undefined ? Number(data.alturaUterina) : undefined);

    // Parse observations
    const observaciones = data.indications || data.observaciones || '';

    // Parse next appointment
    const parsedProximaCita = data.proximaCita ? new Date(`${data.proximaCita}T00:00:00.000Z`) : undefined;

    return prisma.$transaction(async (tx) => {
      // Auto-calculate control number
      const controlCount = await tx.prenatalControl.count({
        where: { gestanteId }
      });
      const numeroControl = data.numeroControl || (controlCount + 1);

      const control = await tx.prenatalControl.create({
        data: {
          gestanteId,
          obstetraId: resolvedObstetraId,
          appointmentId: data.appointmentId || undefined,
          numeroControl,
          fecha: new Date(),
          egSemanas,
          peso,
          temperatura: data.temperatura ? Number(data.temperatura) : undefined,
          presionSistolica,
          presionDiastolica,
          pulsoMaterno: data.pulsoMaterno ? Number(data.pulsoMaterno) : undefined,
          alturaUterina,
          situacion: data.situacion || undefined,
          presentacion: data.presentacion || undefined,
          posicion: data.posicion || undefined,
          fcf,
          movimientoFetal: data.movimientoFetal || undefined,
          proteinuria: data.proteinuria || undefined,
          edema: data.edema || undefined,
          reflejoOsteotendinoso: data.reflejoOsteotendinoso ? Number(data.reflejoOsteotendinoso) : undefined,
          examenPezon: data.examenPezon || undefined,
          indicacionHierro: data.indicacionHierro || undefined,
          indicacionCalcio: data.indicacionCalcio || undefined,
          indicacionAcidoFolico: data.indicacionAcidoFolico || undefined,
          orientacion: data.orientacion || [],
          ecografiaControl: data.ecografiaControl || undefined,
          perfilBiofisico: data.perfilBiofisico || undefined,
          visitaDomiciliaria: data.visitaDomiciliaria || undefined,
          planParto: data.planParto || undefined,
          proximaCita: parsedProximaCita,
          establecimiento: data.establecimiento || undefined,
          responsable: data.responsable || undefined,
          nroFormatoSis: data.nroFormatoSis || undefined,
          observaciones,
        },
      });

      // Recalculate Risk Level
      const gestante = await tx.gestante.findUnique({
        where: { id: gestanteId },
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
          where: { id: gestanteId },
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
    const treatments = await prisma.treatment.findMany({
      where: { gestanteId },
      orderBy: { fechaInicio: 'desc' },
      include: {
        supplementLogs: {
          orderBy: { fecha: 'desc' },
        },
      },
    });

    const todayStr = new Date().toISOString().split('T')[0];

    return treatments.map((t) => {
      const diasTomados = t.supplementLogs
        .filter((l) => l.tomado)
        .map((l) => l.fecha.toISOString().split('T')[0]);
      const diasOmitidos = t.supplementLogs
        .filter((l) => !l.tomado)
        .map((l) => l.fecha.toISOString().split('T')[0]);
      const totalDias = t.duracionDias || 30;
      const adherencia = totalDias > 0 ? Math.round((diasTomados.length / totalDias) * 100) : 0;
      const takenToday = diasTomados.includes(todayStr);

      return {
        ...t,
        diasTomados,
        diasOmitidos,
        totalDias,
        adherencia,
        taken: takenToday,
      };
    });
  }

  async createSupplementLog(treatmentId: string, data: any, authenticatedUserId?: string) {
    const { fecha, gestanteId, ...logData } = data;
    
    // Ensure treatment exists
    const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!treatment) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Tratamiento no encontrado');
    }

    // Resolve gestanteId
    let resolvedGestanteId = gestanteId || treatment.gestanteId;
    if (!resolvedGestanteId && authenticatedUserId) {
      const gestante = await prisma.gestante.findUnique({ where: { userId: authenticatedUserId } });
      resolvedGestanteId = gestante?.id;
    }

    if (!resolvedGestanteId) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Gestante ID es requerido');
    }

    // Resolve date
    const dateStr = fecha || new Date().toISOString().split('T')[0];
    const logDate = new Date(`${dateStr}T00:00:00.000Z`);

    // Check if log already exists
    const existingLog = await prisma.supplementLog.findFirst({
      where: {
        treatmentId,
        fecha: logDate,
      }
    });

    if (existingLog) {
      return prisma.supplementLog.update({
        where: { id: existingLog.id },
        data: {
          tomado: logData.tomado !== undefined ? logData.tomado : true,
          notas: logData.notas ?? existingLog.notas,
        }
      });
    }

    return prisma.supplementLog.create({
      data: {
        ...logData,
        treatmentId,
        gestanteId: resolvedGestanteId,
        fecha: logDate,
        tomado: logData.tomado !== undefined ? logData.tomado : true,
      },
    });
  }

  async getDangerSigns(estado?: string | any) {
    const whereCondition: any = {};
    if (estado) {
      whereCondition.estado = estado;
    }

    return prisma.dangerSign.findMany({
      where: whereCondition,
      include: {
        gestante: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { fechaReporte: 'desc' },
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

  /**
   * Atiende o deriva un signo de alarma. Solo obstetra/admin.
   * Registra el estado, la acción tomada, quién respondió y el tiempo de
   * respuesta (minutos transcurridos desde el reporte).
   */
  async updateDangerSign(
    dangerSignId: string,
    data: { estado?: string; accionTomada?: string },
    authenticatedUserId: string
  ) {
    const existing = await prisma.dangerSign.findUnique({ where: { id: dangerSignId } });
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Signo de alarma no encontrado');
    }

    // Resolver el obstetra que responde (si el usuario lo es)
    const obstetra = await prisma.obstetra.findUnique({ where: { userId: authenticatedUserId } });

    const updateData: any = {};
    if (data.estado) updateData.estado = data.estado;
    if (data.accionTomada !== undefined) updateData.accionTomada = data.accionTomada;

    // Al atender/derivar por primera vez, registrar responsable y tiempo de respuesta
    const seAtiende = data.estado && data.estado !== 'pendiente';
    if (seAtiende && !existing.respondidoPor) {
      if (obstetra) updateData.respondidoPor = obstetra.id;
      const minutos = Math.max(
        0,
        Math.round((Date.now() - existing.fechaReporte.getTime()) / 60000)
      );
      updateData.tiempoRespuestaMin = minutos;
    }

    return prisma.dangerSign.update({
      where: { id: dangerSignId },
      data: updateData,
      include: {
        gestante: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
    });
  }

  async createLabResult(data: any, authenticatedUserId?: string) {
    const { gestanteId, fechaExamen, valorNumerico, ...labData } = data;
    
    let resolvedObstetraId = data.obstetraId;
    if (!resolvedObstetraId && authenticatedUserId) {
      const obstetra = await prisma.obstetra.findUnique({ where: { userId: authenticatedUserId } });
      resolvedObstetraId = obstetra?.id;
    }

    const valNum = valorNumerico !== undefined ? Number(valorNumerico) : undefined;
    let valCorregido = data.valorCorregido !== undefined ? Number(data.valorCorregido) : undefined;
    let resultado = data.resultado;

    if (labData.tipoExamen === 'Hemoglobina' && valNum !== undefined) {
      const { analyzeHemoglobin } = await import('../../utils/hemoglobinCorrection.js');
      const analysis = analyzeHemoglobin(valNum, 2926);
      valCorregido = analysis.correctedHb;
      resultado = analysis.classification;
    }

    return prisma.$transaction(async (tx) => {
      const labResult = await tx.labResult.create({
        data: {
          ...labData,
          gestanteId,
          obstetraId: resolvedObstetraId,
          valorNumerico: valNum,
          valorCorregido: valCorregido,
          resultado,
          fechaExamen: new Date(fechaExamen),
        }
      });

      // Recalculate Risk Level
      const gestante = await tx.gestante.findUnique({
        where: { id: gestanteId },
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

        const { calculateRiskLevel } = await import('../../utils/riskCalculator.js');
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
          where: { id: gestanteId },
          data: { nivelRiesgo: riskAssessment.level },
        });
      }

      return labResult;
    });
  }

  async getLabResults(gestanteId: string) {
    return prisma.labResult.findMany({
      where: { gestanteId },
      orderBy: { fechaExamen: 'desc' },
    });
  }

  async createUltrasound(data: any) {
    const { gestanteId, fecha, ...ultrasoundData } = data;
    return prisma.ultrasound.create({
      data: {
        ...ultrasoundData,
        gestanteId,
        fecha: new Date(fecha),
      }
    });
  }

  async getUltrasounds(gestanteId: string) {
    return prisma.ultrasound.findMany({
      where: { gestanteId },
      orderBy: { fecha: 'desc' },
    });
  }

  async createVaccinationRecord(data: any) {
    const { gestanteId, fechaAplicacion, ...vaccineData } = data;
    return prisma.vaccinationRecord.create({
      data: {
        ...vaccineData,
        gestanteId,
        fechaAplicacion: fechaAplicacion ? new Date(fechaAplicacion) : undefined,
      }
    });
  }

  async getVaccinationRecords(gestanteId: string) {
    return prisma.vaccinationRecord.findMany({
      where: { gestanteId },
      orderBy: { fechaAplicacion: 'desc' },
    });
  }

  async createPathology(data: any) {
    const { gestanteId, fechaDiagnostico, ...pathologyData } = data;
    return prisma.pathology.create({
      data: {
        ...pathologyData,
        gestanteId,
        fechaDiagnostico: new Date(fechaDiagnostico),
      }
    });
  }

  async getPathologies(gestanteId: string) {
    return prisma.pathology.findMany({
      where: { gestanteId },
      orderBy: { fechaDiagnostico: 'desc' },
    });
  }

  async createMentalHealthScreening(data: any, authenticatedUserId?: string) {
    const { gestanteId, fecha, respuestas, ...screeningData } = data;
    
    let resolvedObstetraId = data.obstetraId;
    if (!resolvedObstetraId && authenticatedUserId) {
      const obstetra = await prisma.obstetra.findUnique({ where: { userId: authenticatedUserId } });
      resolvedObstetraId = obstetra?.id;
    }

    let puntajeP1_18 = screeningData.puntajeP1_18;
    let puntajeP19_22 = screeningData.puntajeP19_22;
    let pregunta23 = screeningData.pregunta23;
    let puntajeP24_28 = screeningData.puntajeP24_28;

    if (respuestas && typeof respuestas === 'object') {
      if (puntajeP1_18 === undefined) {
        puntajeP1_18 = 0;
        for (let i = 1; i <= 18; i++) {
          if (respuestas[`p${i}`] === true || respuestas[`p${i}`] === 'si' || respuestas[`p${i}`] === 'yes') {
            puntajeP1_18++;
          }
        }
      }
      if (puntajeP19_22 === undefined) {
        puntajeP19_22 = 0;
        for (let i = 19; i <= 22; i++) {
          if (respuestas[`p${i}`] === true || respuestas[`p${i}`] === 'si' || respuestas[`p${i}`] === 'yes') {
            puntajeP19_22++;
          }
        }
      }
      if (pregunta23 === undefined) {
        pregunta23 = respuestas[`p23`] === true || respuestas[`p23`] === 'si' || respuestas[`p23`] === 'yes';
      }
      if (puntajeP24_28 === undefined) {
        puntajeP24_28 = 0;
        for (let i = 24; i <= 28; i++) {
          if (respuestas[`p${i}`] === true || respuestas[`p${i}`] === 'si' || respuestas[`p${i}`] === 'yes') {
            puntajeP24_28++;
          }
        }
      }
    }

    let resultado = screeningData.resultado;
    let derivacion = screeningData.derivacion || false;
    if (!resultado) {
      if (puntajeP1_18 >= 9 || puntajeP19_22 >= 1 || pregunta23 === true || puntajeP24_28 >= 1) {
        resultado = 'positivo';
        derivacion = true;
      } else {
        resultado = 'negativo';
      }
    }

    return prisma.mentalHealthScreening.create({
      data: {
        gestanteId,
        obstetraId: resolvedObstetraId,
        respuestas: respuestas || {},
        puntajeP1_18,
        puntajeP19_22,
        pregunta23,
        puntajeP24_28,
        resultado,
        derivacion,
        observaciones: screeningData.observaciones,
        fecha: new Date(fecha || new Date()),
      }
    });
  }

  async getMentalHealthScreenings(gestanteId: string) {
    return prisma.mentalHealthScreening.findMany({
      where: { gestanteId },
      orderBy: { fecha: 'desc' },
    });
  }

  async createViolenceScreening(data: any, authenticatedUserId?: string) {
    const { gestanteId, fecha, respuestas, ...screeningData } = data;
    
    let resolvedObstetraId = data.obstetraId;
    if (!resolvedObstetraId && authenticatedUserId) {
      const obstetra = await prisma.obstetra.findUnique({ where: { userId: authenticatedUserId } });
      resolvedObstetraId = obstetra?.id;
    }

    let puntajeTotal = screeningData.puntajeTotal || 0;
    if (respuestas && typeof respuestas === 'object' && screeningData.puntajeTotal === undefined) {
      for (const val of Object.values(respuestas)) {
        if (val === true || val === 'si' || val === 'yes') {
          puntajeTotal++;
        } else if (typeof val === 'number') {
          puntajeTotal += val;
        }
      }
    }

    let tamizajePositivo = screeningData.tamizajePositivo;
    if (tamizajePositivo === undefined) {
      tamizajePositivo = puntajeTotal > 0;
    }

    return prisma.violenceScreening.create({
      data: {
        gestanteId,
        obstetraId: resolvedObstetraId,
        respuestas: respuestas || {},
        puntajeTotal,
        tamizajePositivo,
        derivacion: screeningData.derivacion || tamizajePositivo,
        observaciones: screeningData.observaciones,
        fecha: new Date(fecha || new Date()),
      }
    });
  }

  async getViolenceScreenings(gestanteId: string) {
    return prisma.violenceScreening.findMany({
      where: { gestanteId },
      orderBy: { fecha: 'desc' },
    });
  }

  async createDentalRecord(data: any) {
    const { gestanteId, fecha, ...dentalData } = data;
    return prisma.dentalRecord.create({
      data: {
        ...dentalData,
        gestanteId,
        fecha: new Date(fecha || new Date()),
      }
    });
  }

  async getDentalRecords(gestanteId: string) {
    return prisma.dentalRecord.findMany({
      where: { gestanteId },
      orderBy: { fecha: 'desc' },
    });
  }

  async createNutritionalCounseling(data: any, authenticatedUserId?: string) {
    const { gestanteId, fecha, fechaSesionDemo, ...counselingData } = data;
    
    let resolvedObstetraId = data.obstetraId;
    if (!resolvedObstetraId && authenticatedUserId) {
      const obstetra = await prisma.obstetra.findUnique({ where: { userId: authenticatedUserId } });
      resolvedObstetraId = obstetra?.id;
    }

    return prisma.nutritionalCounseling.create({
      data: {
        ...counselingData,
        gestanteId,
        obstetraId: resolvedObstetraId,
        fecha: new Date(fecha || new Date()),
        fechaSesionDemo: fechaSesionDemo ? new Date(fechaSesionDemo) : null,
      }
    });
  }

  async getNutritionalCounseling(gestanteId: string) {
    return prisma.nutritionalCounseling.findMany({
      where: { gestanteId },
      orderBy: { fecha: 'desc' },
    });
  }

  async createWeightRecord(data: any) {
    const { gestanteId, fecha, egSemanas, peso } = data;

    // Fetch gestante to calculate ganancia total and classification
    const gestante = await prisma.gestante.findUnique({ where: { id: gestanteId }});
    
    let gananciaTotal = null;
    let clasificacion: any = null;

    if (gestante && gestante.pesoHabitual) {
      gananciaTotal = Number(peso) - Number(gestante.pesoHabitual);
      
      // Simple logic based on pre-gestational BMI
      // This refers to IOM 2009 guidelines (RF-5.06)
      if (gestante.clasificacionImc) {
        if (gestante.clasificacionImc === 'bajo_peso' && gananciaTotal < 12.5) clasificacion = 'bajo';
        else if (gestante.clasificacionImc === 'bajo_peso' && gananciaTotal > 18) clasificacion = 'alto';
        else if (gestante.clasificacionImc === 'bajo_peso') clasificacion = 'adecuado';
        
        else if (gestante.clasificacionImc === 'normal' && gananciaTotal < 11.5) clasificacion = 'bajo';
        else if (gestante.clasificacionImc === 'normal' && gananciaTotal > 16) clasificacion = 'alto';
        else if (gestante.clasificacionImc === 'normal') clasificacion = 'adecuado';

        else if (gestante.clasificacionImc === 'sobrepeso' && gananciaTotal < 7) clasificacion = 'bajo';
        else if (gestante.clasificacionImc === 'sobrepeso' && gananciaTotal > 11.5) clasificacion = 'alto';
        else if (gestante.clasificacionImc === 'sobrepeso') clasificacion = 'adecuado';

        else if (gestante.clasificacionImc === 'obesidad' && gananciaTotal < 5) clasificacion = 'bajo';
        else if (gestante.clasificacionImc === 'obesidad' && gananciaTotal > 9) clasificacion = 'alto';
        else if (gestante.clasificacionImc === 'obesidad') clasificacion = 'adecuado';
      }
    }

    return prisma.weightRecord.create({
      data: {
        gestanteId,
        fecha: new Date(fecha || new Date()),
        egSemanas,
        peso,
        gananciaTotal,
        clasificacion,
      }
    });
  }

  async getWeightRecords(gestanteId: string) {
    return prisma.weightRecord.findMany({
      where: { gestanteId },
      orderBy: { fecha: 'asc' },
    });
  }
}

export const clinicalService = new ClinicalService();
