import { prisma } from '../../config/database.js';
import { calculateRiskLevel } from '../../utils/riskCalculator.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import {
  sendPushNotification,
  notifyUser,
  notifyAdmins,
  findObstetraUserIdForGestante,
} from '../notifications/notification.service.js';
import {
  computeViolenceScore,
  isViolencePositive,
  isSrq18Positive,
} from '../../utils/screeningThresholds.js';
import { calcularAdherencia } from '../../utils/adherence.js';
import { calcularGamificacion } from '../../utils/gamification.js';

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

  // ── Antecedentes familiares/personales (RF-2.03) ──

  async createAntecedente(data: { gestanteId: string; tipo: string; condicion: string; detalle?: string }) {
    const gestante = await prisma.gestante.findUnique({ where: { id: data.gestanteId } });
    if (!gestante) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante no encontrada');
    }
    const antecedente = await prisma.antecedente.create({
      data: {
        gestanteId: data.gestanteId,
        tipo: data.tipo as any,
        condicion: data.condicion,
        detalle: data.detalle,
      },
    });
    // Recalcular el nivel de riesgo, que depende de los antecedentes personales.
    await this.recalcularRiesgo(data.gestanteId);
    return antecedente;
  }

  async getAntecedentes(gestanteId: string) {
    return prisma.antecedente.findMany({
      where: { gestanteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAntecedente(id: string) {
    const existing = await prisma.antecedente.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Antecedente no encontrado');
    }
    await prisma.antecedente.delete({ where: { id } });
    await this.recalcularRiesgo(existing.gestanteId);
    return { id };
  }

  /** Recalcula y persiste el nivel de riesgo de una gestante. */
  private async recalcularRiesgo(gestanteId: string) {
    const gestante = await prisma.gestante.findUnique({
      where: { id: gestanteId },
      include: {
        antecedentes: true,
        prenatalControls: { orderBy: { fecha: 'desc' }, take: 1 },
        labResults: { where: { tipoExamen: 'Hemoglobina' }, orderBy: { fechaExamen: 'desc' }, take: 1 },
      },
    });
    if (!gestante) return;
    const latestControl = gestante.prenatalControls[0];
    const latestLab = gestante.labResults[0];
    const assessment = calculateRiskLevel({
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
    await prisma.gestante.update({
      where: { id: gestanteId },
      data: { nivelRiesgo: assessment.level },
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

  /**
   * Modifica o suspende un tratamiento (RF-4.10). Permite cambiar dosis,
   * frecuencia, indicaciones, hora de toma y estado; al suspender exige
   * justificación clínica (motivoSuspension).
   */
  async updateTreatment(treatmentId: string, data: any) {
    const existing = await prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Tratamiento no encontrado');
    }

    const { horaToma, fechaFin, ...rest } = data;
    const updateData: any = { ...rest };
    if (horaToma !== undefined) {
      updateData.horaToma = horaToma ? new Date(`1970-01-01T${horaToma}:00.000Z`) : null;
    }
    if (fechaFin !== undefined) {
      updateData.fechaFin = fechaFin ? new Date(`${fechaFin}T00:00:00.000Z`) : null;
    }
    // Al suspender, registrar la fecha de fin si no se indicó otra.
    if (data.estado === 'suspendido' && fechaFin === undefined) {
      updateData.fechaFin = new Date();
    }

    return prisma.treatment.update({
      where: { id: treatmentId },
      data: updateData,
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
      // Fórmula ÚNICA de adherencia (utils/adherence.ts).
      const { porcentaje: adherencia, diasEsperados } = calcularAdherencia({
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin,
        duracionDias: t.duracionDias,
        logs: t.supplementLogs,
      });
      const takenToday = diasTomados.includes(todayStr);

      return {
        ...t,
        diasTomados,
        diasOmitidos,
        // `totalDias` ahora es "días esperados de toma" según la fórmula única.
        totalDias: diasEsperados,
        adherencia,
        taken: takenToday,
      };
    });
  }

  /**
   * Tratamientos de la gestante + gamificación de adherencia (racha, logros).
   * La racha es GLOBAL: combina los registros de todos los tratamientos activos
   * para reflejar el hábito diario de cuidado (no por medicamento aislado).
   */
  async getTreatmentsWithGamification(gestanteId: string) {
    const treatments = await this.getTreatments(gestanteId);

    // Combina todos los logs (de todos los tratamientos) para la racha global.
    const allLogs = await prisma.supplementLog.findMany({
      where: { gestanteId },
      select: { fecha: true, tomado: true },
    });
    const gamificacion = calcularGamificacion(allLogs);

    return { treatments, gamificacion };
  }

  async createSupplementLog(treatmentId: string, data: any, authenticatedUserId?: string) {
    // `dedupeKey` lo envía el frontend (offline-first) para idempotencia de la
    // cola; NO es una columna de SupplementLog (la unicidad real la garantiza
    // @@unique([treatmentId, fecha])), por eso se descarta aquí para no pasarlo
    // a Prisma. Se extraen también fecha/gestanteId que se resuelven aparte.
    const { fecha, gestanteId, dedupeKey, ...logData } = data;
    void dedupeKey;
    
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

  async getDangerSigns(estado?: string | any, gestanteId?: string) {
    const whereCondition: any = {};
    if (estado) {
      whereCondition.estado = estado;
    }
    if (gestanteId) {
      whereCondition.gestanteId = gestanteId;
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
    // Idempotencia (cola offline): si llega un reenvío del mismo signo
    // (mismo tipo + descripción) en una ventana de 10 minutos, se devuelve el
    // existente en lugar de duplicar. La app envía `dedupeKey`, pero la
    // deduplicación se basa en los datos para ser robusta ante reintentos.
    const VENTANA_MS = 10 * 60 * 1000;
    const reciente = await prisma.dangerSign.findFirst({
      where: {
        gestanteId,
        tipoSigno: data.tipo_signo,
        descripcion: data.descripcion ?? null,
        createdAt: { gte: new Date(Date.now() - VENTANA_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (reciente) {
      return reciente;
    }

    const dangerSign = await prisma.dangerSign.create({
      data: {
        gestanteId,
        tipoSigno: data.tipo_signo,
        descripcion: data.descripcion,
        severidad: data.severidad,
      }
    });

    // Datos de la gestante para personalizar la alerta.
    const gestante = await prisma.gestante.findUnique({
      where: { id: gestanteId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const nombre = gestante?.user
      ? `${gestante.user.firstName} ${gestante.user.lastName}`
      : 'Una gestante';

    const esGrave = data.severidad === 'grave';

    // RF-9.02: alerta automática al obstetra responsable. Se crea una
    // notificación in-app persistente (visible en la campana) + push.
    const obstetraUserId = await findObstetraUserIdForGestante(gestanteId);
    if (obstetraUserId) {
      await notifyUser(
        obstetraUserId,
        'signo_alarma',
        esGrave ? 'Signo de alarma GRAVE' : 'Signo de alarma reportado',
        `${nombre} reportó: ${data.tipo_signo}.${esGrave ? ' Requiere atención inmediata.' : ' Da seguimiento cuando puedas.'}`,
        { gestanteId, dangerSignId: dangerSign.id, severidad: data.severidad },
      );

      // En casos graves, además se inserta un mensaje automático del sistema
      // en la conversación gestante↔obstetra para que quede en el chat clínico.
      if (esGrave) {
        await this.postSystemChatAlert(gestanteId, obstetraUserId, nombre, data.tipo_signo);

        // RESPALDO POR WHATSAPP (best-effort): un signo de alarma GRAVE no puede
        // depender solo del push. Se avisa al obstetra responsable por WhatsApp.
        try {
          const { notifyUserViaWhatsApp } = await import('../notifications/channels.js');
          await notifyUserViaWhatsApp(
            obstetraUserId,
            [
              'SIGNO DE ALARMA GRAVE',
              `Paciente: ${nombre}`,
              `Síntoma: ${data.tipo_signo}`,
              'Requiere atención inmediata. Contáctala de inmediato.',
            ].join('\n'),
          );
        } catch {
          /* best-effort: la notificación in-app/push ya quedó registrada */
        }
      }
    }

    // Supervisión: en casos graves, también se avisa a los administradores
    // (centro de eventos de sistema) — best-effort.
    if (esGrave) {
      try {
        await notifyAdmins(
          'alarma_sin_atender',
          'Signo de alarma GRAVE',
          `${nombre} reportó "${data.tipo_signo}". Verifica que sea atendida.`,
          { gestanteId, dangerSignId: dangerSign.id },
        );
      } catch {
        /* best-effort */
      }
    }

    return dangerSign;
  }

  /**
   * Inserta un mensaje de alerta del sistema en la conversación
   * gestante↔obstetra (creándola si no existe). El emisor es la propia
   * gestante para mantener la coherencia del hilo clínico.
   */
  private async postSystemChatAlert(
    gestanteId: string,
    obstetraUserId: string,
    nombreGestante: string,
    tipoSigno: string,
  ): Promise<void> {
    try {
      const gestante = await prisma.gestante.findUnique({ where: { id: gestanteId } });
      const obstetra = await prisma.obstetra.findUnique({ where: { userId: obstetraUserId } });
      if (!gestante || !obstetra) return;

      let conversation = await prisma.conversation.findFirst({
        where: { gestanteId, obstetraId: obstetra.id },
      });
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { gestanteId, obstetraId: obstetra.id },
        });
      }

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: gestante.userId,
          contenido: [
            'SIGNO DE ALARMA GRAVE - Reporte automático',
            `Paciente: ${nombreGestante}`,
            `Síntoma: ${tipoSigno}`,
            'Acción: contáctala de inmediato.',
          ].join('\n'),
          tipo: 'alerta_emergencia',
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { ultimoMensaje: new Date() },
      });

      // Emisión en tiempo real a la sala (el obstetra ve la alerta sin recargar).
      try {
        const { getIO } = await import('../../config/socketRegistry.js');
        getIO()?.to(`conversation:${conversation.id}`).emit('receive_message', message);
      } catch {
        /* best-effort */
      }
    } catch (err) {
      // No bloquear el reporte del signo si falla el mensaje de chat.
      console.error('[DANGER SIGN CHAT ALERT ERROR]', err);
    }
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

    // Detección robusta de hemoglobina (insensible a mayúsculas/acentos y a
    // variantes como "Hemoglobina (Hb)" o "hb"), para que la corrección por
    // altitud se aplique siempre que corresponda.
    const tipoNorm = String(labData.tipoExamen || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const esHemoglobina = tipoNorm.includes('hemoglobina') || tipoNorm === 'hb';

    if (esHemoglobina && valNum !== undefined && !Number.isNaN(valNum)) {
      const { analyzeHemoglobin } = await import('../../utils/hemoglobinCorrection.js');
      const { getAltitudeMsnm } = await import('../../utils/systemSettings.js');
      const altitud = await getAltitudeMsnm();
      const analysis = analyzeHemoglobin(valNum, altitud);
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
    }).then(async (labResult) => {
      // RF-7.10: notificar a la gestante que sus resultados están disponibles.
      try {
        const gestante = await prisma.gestante.findUnique({
          where: { id: gestanteId },
          include: { user: true },
        });
        const prefs = gestante?.user?.notificationPreferences as Record<string, any> | null;
        if (prefs?.expoPushToken) {
          await sendPushNotification(
            [prefs.expoPushToken],
            'Resultados disponibles',
            `Tu resultado de ${labData.tipoExamen} ya está disponible. Consúltalo con tu obstetra.`,
            { gestanteId, labResultId: labResult.id },
          );
        }
        if (gestante?.userId) {
          await prisma.notification.create({
            data: {
              userId: gestante.userId,
              tipo: 'resultado_laboratorio',
              canal: 'push',
              titulo: 'Resultados de laboratorio',
              mensaje: `Tu resultado de ${labData.tipoExamen} ya está disponible.`,
              datos: { gestanteId, labResultId: labResult.id },
              estado: 'enviada',
              enviadaAt: new Date(),
            },
          });
        }
      } catch (err) {
        console.error('Error notificando resultado de laboratorio:', err);
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

    // RF: criterio SRQ-18 centralizado y autoritativo en el servidor.
    const positivo = isSrq18Positive({
      p1_18: puntajeP1_18,
      p19_22: puntajeP19_22,
      pregunta23,
      p24_28: puntajeP24_28,
    });
    const resultado = positivo ? 'positivo' : 'negativo';
    const derivacion = positivo || screeningData.derivacion === true;

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

    // Puntaje total: usa el explícito o lo calcula desde las respuestas.
    const puntajeTotal = computeViolenceScore(respuestas, screeningData.puntajeTotal);

    // RF-5.11: el servidor es la fuente de verdad del umbral (≥15). Se ignora
    // cualquier `tamizajePositivo` enviado por el cliente para evitar
    // inconsistencias (antes bastaba puntaje > 0).
    const tamizajePositivo = isViolencePositive(puntajeTotal);

    return prisma.violenceScreening.create({
      data: {
        gestanteId,
        obstetraId: resolvedObstetraId,
        respuestas: respuestas || {},
        puntajeTotal,
        tamizajePositivo,
        // La derivación se activa si el tamizaje es positivo (o si el obstetra la fuerza).
        derivacion: screeningData.derivacion === true || tamizajePositivo,
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
