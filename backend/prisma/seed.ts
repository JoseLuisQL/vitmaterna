import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...\n');

  console.log('🧹 Clearing existing clinical and appointment tables to prevent duplicates...');
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.dangerSign.deleteMany();
  await prisma.pathology.deleteMany();
  await prisma.educationalContent.deleteMany();
  await prisma.mentalHealthScreening.deleteMany();
  await prisma.violenceScreening.deleteMany();
  await prisma.vaccinationRecord.deleteMany();
  await prisma.weightRecord.deleteMany();
  await prisma.ultrasound.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.supplementLog.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.prenatalControl.deleteMany();
  await prisma.appointment.deleteMany();
  console.log('🧹 Cleanup complete.\n');

  // ============================================
  // 1. Common Data setup
  // ============================================
  const adminPasswordHash = await bcrypt.hash('Admin@2026', 12);
  const testPasswordHash = await bcrypt.hash('Test@1234', 12);

  const adminUser = await prisma.user.upsert({
    where: { dni: '99999999' },
    update: {},
    create: {
      dni: '99999999',
      passwordHash: adminPasswordHash,
      role: 'admin',
      firstName: 'Administrador',
      lastName: 'Sistema',
      phone: '+51999999999',
      email: 'admin@vitmaterna.pe',
      isActive: true,
      isVerified: true,
      consentAccepted: true,
      consentDate: new Date(),
    },
  });

  const facility = await prisma.healthFacility.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'Centro de Salud Talavera',
      codigo: 'CS-TALAVERA',
      direccion: 'Jr. Lima s/n, Talavera, Andahuaylas, Apurímac',
      telefono: '+51083421001',
      horarios: { lunes: { apertura: '07:00', cierre: '19:00' } },
      servicios: ['Control Prenatal', 'Ecografía'],
      altitudMsnm: 2926,
      activo: true,
    },
  });

  // ============================================
  // 2. Obstetras (Test Data)
  // ============================================
  const obstetra1User = await prisma.user.upsert({
    where: { dni: '11111111' },
    update: {},
    create: {
      dni: '11111111',
      passwordHash: testPasswordHash,
      role: 'obstetra',
      firstName: 'María',
      lastName: 'Fernández',
      phone: '987654321',
      isActive: true,
      isVerified: true,
      consentAccepted: true,
    },
  });

  const obstetra1 = await prisma.obstetra.upsert({
    where: { userId: obstetra1User.id },
    update: {},
    create: {
      userId: obstetra1User.id,
      cop: '12345',
      especialidad: 'Control Prenatal',
      establecimiento: facility.nombre,
    },
  });

  const obstetra2User = await prisma.user.upsert({
    where: { dni: '22222222' },
    update: {},
    create: {
      dni: '22222222',
      passwordHash: testPasswordHash,
      role: 'obstetra',
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '987654322',
      isActive: true,
      isVerified: true,
      consentAccepted: true,
    },
  });

  const obstetra2 = await prisma.obstetra.upsert({
    where: { userId: obstetra2User.id },
    update: {},
    create: {
      userId: obstetra2User.id,
      cop: '54321',
      especialidad: 'Ecografía Obstétrica',
      establecimiento: facility.nombre,
    },
  });
  console.log(`✅ Obstetras creados (DNI: 11111111 y 22222222)`);

  // ============================================
  // 3. Gestantes (Test Data)
  // ============================================
  
  // Gestante 1: Primer trimestre (Bajo Riesgo)
  const gestante1User = await prisma.user.upsert({
    where: { dni: '33333333' },
    update: {},
    create: {
      dni: '33333333',
      passwordHash: testPasswordHash,
      role: 'gestante',
      firstName: 'Ana',
      lastName: 'Gómez',
      phone: '999888777',
      isActive: true,
      isVerified: true,
      consentAccepted: true,
    },
  });

  const fpp1 = new Date();
  fpp1.setMonth(fpp1.getMonth() + 7); // ~10 weeks pregnant

  const gestante1 = await prisma.gestante.upsert({
    where: { userId: gestante1User.id },
    update: {},
    create: {
      userId: gestante1User.id,
      fechaNacimiento: new Date('2000-05-15'),
      ageAtRegistration: 26,
      departamento: 'Apurímac',
      provincia: 'Andahuaylas',
      distrito: 'Talavera',
      direccion: 'Av. Las Rosas 123',
      gestaciones: 1,
      partosVaginales: 0,
      abortos: 0,
      pesoHabitual: 60.5,
      talla: 1.60,
      imc: 23.6,
      grupoSanguineo: 'O',
      factorRh: '+',
      fppFum: fpp1,
      nivelRiesgo: 'verde',
      estado: 'activa',
    },
  });

  // Gestante 2: Tercer trimestre (Alto Riesgo - Preeclampsia)
  const gestante2User = await prisma.user.upsert({
    where: { dni: '44444444' },
    update: {},
    create: {
      dni: '44444444',
      passwordHash: testPasswordHash,
      role: 'gestante',
      firstName: 'Lucía',
      lastName: 'Sánchez',
      phone: '999888666',
      isActive: true,
      isVerified: true,
      consentAccepted: true,
    },
  });

  const fpp2 = new Date();
  fpp2.setMonth(fpp2.getMonth() + 1); // ~35 weeks pregnant

  const gestante2 = await prisma.gestante.upsert({
    where: { userId: gestante2User.id },
    update: {},
    create: {
      userId: gestante2User.id,
      fechaNacimiento: new Date('1995-10-20'),
      ageAtRegistration: 30,
      departamento: 'Apurímac',
      provincia: 'Andahuaylas',
      distrito: 'Talavera',
      direccion: 'Jr. Los Pinos 456',
      gestaciones: 3,
      partosVaginales: 1,
      abortos: 1,
      pesoHabitual: 75.0,
      talla: 1.55,
      imc: 31.2,
      grupoSanguineo: 'A',
      factorRh: '+',
      fppFum: fpp2,
      nivelRiesgo: 'rojo',
      estado: 'activa',
    },
  });

  // Gestante 3: Puerperio
  const gestante3User = await prisma.user.upsert({
    where: { dni: '55555555' },
    update: {},
    create: {
      dni: '55555555',
      passwordHash: testPasswordHash,
      role: 'gestante',
      firstName: 'Sofía',
      lastName: 'Ramírez',
      phone: '999888555',
      isActive: true,
      isVerified: true,
      consentAccepted: true,
    },
  });

  const fpp3 = new Date();
  fpp3.setMonth(fpp3.getMonth() - 1); // Born 1 month ago

  const gestante3 = await prisma.gestante.upsert({
    where: { userId: gestante3User.id },
    update: {},
    create: {
      userId: gestante3User.id,
      fechaNacimiento: new Date('1998-02-10'),
      ageAtRegistration: 28,
      departamento: 'Apurímac',
      provincia: 'Andahuaylas',
      distrito: 'Talavera',
      gestaciones: 2,
      partosVaginales: 2,
      abortos: 0,
      pesoHabitual: 65.0,
      talla: 1.62,
      imc: 24.8,
      grupoSanguineo: 'B',
      factorRh: '+',
      fppFum: fpp3,
      nivelRiesgo: 'amarillo',
      estado: 'puerperio',
    },
  });

  // Gestante 4: María Elena Quispe Ramos (DNI 77777777)
  const gestante4User = await prisma.user.upsert({
    where: { dni: '77777777' },
    update: {},
    create: {
      dni: '77777777',
      passwordHash: testPasswordHash,
      role: 'gestante',
      firstName: 'María Elena',
      lastName: 'Quispe Ramos',
      phone: '951753456',
      isActive: true,
      isVerified: true,
      consentAccepted: true,
    },
  });

  const gestante4 = await prisma.gestante.upsert({
    where: { userId: gestante4User.id },
    update: {},
    create: {
      userId: gestante4User.id,
      fechaNacimiento: new Date('1995-03-17'),
      ageAtRegistration: 31,
      departamento: 'Apurímac',
      provincia: 'Andahuaylas',
      distrito: 'Talavera',
      direccion: 'Jr. Libertad 789',
      gestaciones: 1,
      partosVaginales: 0,
      abortos: 0,
      pesoHabitual: 62.0,
      talla: 1.58,
      imc: 24.8,
      grupoSanguineo: 'O',
      factorRh: '+',
      nivelRiesgo: 'verde',
      estado: 'activa',
    },
  });

  console.log(`✅ Gestantes creadas (DNIs: 33333333, 44444444, 55555555, 77777777)`);

  // ============================================
  // 4. Citas y Controles (Test Data)
  // ============================================

  // Cita Gestante 1
  const app1Date = new Date();
  app1Date.setDate(app1Date.getDate() + 2); // In 2 days
  
  await prisma.appointment.create({
    data: {
      gestanteId: gestante1.id,
      obstetraId: obstetra1.id,
      motivo: 'Control Prenatal',
      fecha: app1Date,
      hora: new Date('1970-01-01T10:00:00Z'),
      estado: 'programada',
      numeroControl: 2,
      egSemanas: 10,
    }
  });

  // Tratamiento Gestante 1 (para cálculo de adherencia)
  const treatmentG1 = await prisma.treatment.create({
    data: {
      gestanteId: gestante1.id,
      obstetraId: obstetra1.id,
      nombre: 'Hierro + Ácido Fólico',
      tipo: 'sulfato_ferroso',
      dosis: '1 tableta',
      frecuencia: 'Diario',
      viaAdministracion: 'oral',
      indicaciones: 'Tomar con jugo de naranja en ayunas',
      fechaInicio: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      duracionDias: 90,
      estado: 'activo',
    }
  });

  // Logs Gestante 1: 20 días (18 tomados, 2 omitidos = 90% adherencia)
  for (let d = 1; d <= 20; d++) {
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - d);
    logDate.setHours(0, 0, 0, 0);
    await prisma.supplementLog.create({
      data: {
        treatmentId: treatmentG1.id,
        gestanteId: gestante1.id,
        fecha: logDate,
        tomado: d % 10 !== 0, // 2 logs (d=10, d=20) will be false
        notas: d % 10 === 0 ? 'Olvidó tomar por viaje' : 'Tomado a tiempo',
      }
    });
  }

  // Historial Gestante 2 (Tercer trimestre)
  const pastApp2Date = new Date();
  pastApp2Date.setDate(pastApp2Date.getDate() - 15); // 15 days ago (Control 6)

  // Calcular FUM de gestante2 basándose en que su Control 6 fue en la semana 33
  const fum2 = new Date(pastApp2Date);
  fum2.setDate(fum2.getDate() - (33 * 7));

  // Generar Controles Prenatales Anteriores (1 al 5) para que Lucía sume 6 controles
  const controlWeeks = [12, 18, 23, 27, 31];
  for (let i = 0; i < controlWeeks.length; i++) {
    const week = controlWeeks[i];
    const controlNum = i + 1;
    const ctrlDate = new Date(fum2.getTime());
    ctrlDate.setDate(ctrlDate.getDate() + (week * 7));

    const ctrlApp = await prisma.appointment.create({
      data: {
        gestanteId: gestante2.id,
        obstetraId: obstetra1.id,
        motivo: `Control Prenatal (Control ${controlNum})`,
        fecha: ctrlDate,
        hora: new Date('1970-01-01T09:00:00Z'),
        estado: 'asistida',
        numeroControl: controlNum,
        egSemanas: week,
      }
    });

    await prisma.prenatalControl.create({
      data: {
        gestanteId: gestante2.id,
        obstetraId: obstetra1.id,
        appointmentId: ctrlApp.id,
        numeroControl: controlNum,
        fecha: ctrlDate,
        egSemanas: week,
        trimestre: week <= 13 ? 1 : (week <= 26 ? 2 : 3),
        peso: 75 + (i * 1.5),
        presionSistolica: 110 + (i * 5),
        presionDiastolica: 70 + (i * 4),
        pulsoMaterno: 78 + i,
        temperatura: 36.5,
        alturaUterina: 10 + (i * 4),
        fcf: 142 - i,
        movimientoFetal: 'normal',
        presentacion: 'C',
        observaciones: `Control ${controlNum} completado sin novedades graves.`,
      }
    });
  }

  // Control 6 (que ya estaba preexistente pero ahora se enlaza en el flujo)
  const pastApp = await prisma.appointment.create({
    data: {
      gestanteId: gestante2.id,
      obstetraId: obstetra1.id,
      motivo: 'Control Prenatal (Control 6)',
      fecha: pastApp2Date,
      hora: new Date('1970-01-01T11:30:00Z'),
      estado: 'asistida',
      numeroControl: 6,
      egSemanas: 33,
    }
  });

  await prisma.prenatalControl.create({
    data: {
      gestanteId: gestante2.id,
      obstetraId: obstetra1.id,
      appointmentId: pastApp.id,
      numeroControl: 6,
      fecha: pastApp2Date,
      egSemanas: 33,
      trimestre: 3,
      peso: 82.5,
      presionSistolica: 145,
      presionDiastolica: 95,
      pulsoMaterno: 88,
      temperatura: 36.8,
      alturaUterina: 32,
      fcf: 140,
      movimientoFetal: 'normal',
      presentacion: 'C',
      edema: 'cruz_1',
      observaciones: 'Reposo absoluto, control de presión diario',
      proximaCita: new Date(),
    }
  });

  // Tratamiento Gestante 2 (para hipertensión / preeclampsia)
  const treatmentG2 = await prisma.treatment.create({
    data: {
      gestanteId: gestante2.id,
      obstetraId: obstetra1.id,
      nombre: 'Metildopa 250mg',
      tipo: 'otro',
      dosis: '1 tableta',
      frecuencia: 'Cada 8 horas',
      viaAdministracion: 'oral',
      indicaciones: 'Para controlar la presión alta',
      fechaInicio: pastApp2Date,
      duracionDias: 30,
      estado: 'activo',
    }
  });

  // Logs Gestante 2: 15 días (9 tomados, 6 omitidos = 60% adherencia -> prioridad de atención)
  for (let d = 1; d <= 15; d++) {
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - d);
    logDate.setHours(0, 0, 0, 0);
    await prisma.supplementLog.create({
      data: {
        treatmentId: treatmentG2.id,
        gestanteId: gestante2.id,
        fecha: logDate,
        tomado: d % 3 !== 0 && d !== 1, // 6 logs will be false (d=1, 3, 6, 9, 12, 15) -> 9/15 = 60%
        notas: (d % 3 === 0 || d === 1) ? 'Olvidó tomar por malestar' : 'Tomado',
      }
    });
  }

  console.log(`✅ Citas, Controles y Tratamientos generados con adherencias de 90% (Ana) y 60% (Lucía)`);

  // ============================================
  // 5. Módulo Clínico (Laboratorios, Ecografías, Vacunas, Peso)
  // ============================================
  console.log(`⏳ Generando Módulo Clínico (Laboratorios, Ecografías, etc)...`);
  
  // Exámenes de Laboratorio (Gestante 2)
  await prisma.labResult.createMany({
    data: [
      {
        gestanteId: gestante2.id,
        obstetraId: obstetra1.id,
        tipoExamen: 'Hemoglobina',
        numeroToma: 1,
        valorNumerico: 10.5,
        unidad: 'g/dL',
        resultado: 'Anemia Leve',
        fechaExamen: pastApp2Date,
        egSemanas: 33,
        observaciones: 'Iniciar sulfato ferroso',
      },
      {
        gestanteId: gestante2.id,
        obstetraId: obstetra1.id,
        tipoExamen: 'Glucosa',
        numeroToma: 1,
        valorNumerico: 95.0,
        unidad: 'mg/dL',
        resultado: 'Normal',
        fechaExamen: pastApp2Date,
        egSemanas: 33,
      }
    ]
  });

  // Ecografías (Gestante 2)
  await prisma.ultrasound.create({
    data: {
      gestanteId: gestante2.id,
      tipo: 'morfologica',
      numero: 2,
      egSemanas: 22,
      egPorEco: 22,
      fecha: new Date(new Date().setMonth(new Date().getMonth() - 3)),
      resultado: 'Normal',
      hallazgos: 'Feto único vivo, anatomía fetal conservada. Placenta anterior.',
    }
  });

  // Peso (Gestante 2)
  await prisma.weightRecord.createMany({
    data: [
      {
        gestanteId: gestante2.id,
        fecha: new Date(new Date().setMonth(new Date().getMonth() - 2)),
        egSemanas: 28,
        peso: 79.5,
        gananciaTotal: 4.5,
        clasificacion: 'alto'
      },
      {
        gestanteId: gestante2.id,
        fecha: pastApp2Date,
        egSemanas: 33,
        peso: 82.5,
        gananciaTotal: 7.5,
        clasificacion: 'alto'
      }
    ]
  });

  // Vacunas (Gestante 1)
  await prisma.vaccinationRecord.create({
    data: {
      gestanteId: gestante1.id,
      vacuna: 'Antitetánica',
      dosisNumero: 1,
      estado: 'pendiente'
    }
  });

  // ============================================
  // 6. Módulos de Tamizaje
  // ============================================
  console.log(`⏳ Generando Tamizajes de Violencia y Salud Mental...`);
  
  await prisma.violenceScreening.create({
    data: {
      gestanteId: gestante1.id,
      obstetraId: obstetra1.id,
      respuestas: { "p1": false, "p2": false, "p3": false, "p4": false },
      puntajeTotal: 0,
      tamizajePositivo: false,
      derivacion: false,
      fecha: new Date()
    }
  });

  await prisma.mentalHealthScreening.create({
    data: {
      gestanteId: gestante1.id,
      obstetraId: obstetra1.id,
      respuestas: { "tristeza": false, "ansiedad": false },
      puntajeP1_18: 3,
      puntajeP19_22: 1,
      pregunta23: false,
      puntajeP24_28: 2,
      resultado: 'Riesgo Bajo',
      derivacion: false,
      fecha: new Date()
    }
  });

  // ============================================
  // 7. Módulo Educativo
  // ============================================
  console.log(`⏳ Generando Contenido Educativo...`);

  await prisma.educationalContent.createMany({
    data: [
      {
        titulo: 'Nutrición en el Primer Trimestre',
        contenido: 'Durante el primer trimestre es crucial el consumo de ácido fólico...',
        tipo: 'articulo',
        categoria: 'nutricion',
        trimestre: 1,
        semanaInicio: 1,
        semanaFin: 13,
      },
      {
        titulo: 'Signos de Alarma del Embarazo',
        contenido: 'Debes acudir por emergencia si presentas: sangrado, pérdida de líquido, fiebre o ausencia de movimientos fetales.',
        tipo: 'articulo',
        categoria: 'signos_alarma',
        trimestre: 2,
      },
      {
        titulo: 'Preparación para el Parto',
        contenido: 'Aprende a identificar las contracciones de parto y cómo respirar durante ellas.',
        tipo: 'articulo',
        categoria: 'parto',
        trimestre: 3,
        semanaInicio: 34,
        semanaFin: 40,
      }
    ]
  });

  // ============================================
  // 8. Signos de Alarma y Patologías
  // ============================================
  console.log(`⏳ Generando Patologías y Signos de Alarma...`);

  await prisma.pathology.create({
    data: {
      gestanteId: gestante2.id,
      codigoCie10: 'O14.9',
      descripcion: 'Preeclampsia no especificada',
      fechaDiagnostico: pastApp2Date,
      estado: 'activa'
    }
  });

  await prisma.dangerSign.create({
    data: {
      gestanteId: gestante2.id,
      tipoSigno: 'Presión Alta y Zumbido de oídos',
      descripcion: 'Siento un zumbido fuerte y me duele la cabeza desde ayer.',
      severidad: 'grave',
      estado: 'pendiente',
    }
  });

  // ============================================
  // 9. Conversaciones y Mensajería
  // ============================================
  console.log(`⏳ Generando Mensajes de Chat...`);

  const conversation = await prisma.conversation.create({
    data: {
      gestanteId: gestante1.id,
      obstetraId: obstetra1.id,
      ultimoMensaje: new Date(),
    }
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: gestante1User.id,
        contenido: 'Hola Licenciada, tengo una duda sobre el ácido fólico.',
        tipo: 'texto',
        createdAt: new Date(Date.now() - 3600000)
      },
      {
        conversationId: conversation.id,
        senderId: obstetra1User.id,
        contenido: 'Dime Ana, ¿qué duda tienes? Recuerda tomarlo todos los días.',
        tipo: 'texto',
        createdAt: new Date()
      }
    ]
  });

  // Emergency Chat Room and alert message for María Elena Quispe Ramos
  const conversationME = await prisma.conversation.create({
    data: {
      gestanteId: gestante4.id,
      obstetraId: obstetra1.id,
      ultimoMensaje: new Date(),
    }
  });

  await prisma.message.create({
    data: {
      conversationId: conversationME.id,
      senderId: gestante4User.id,
      contenido: '🚨 ALERTA DE EMERGENCIA: La gestante María Elena Quispe Ramos ha presionado el botón de pánico. Ubicación: https://maps.google.com/?q=-13.654881,-73.42595',
      tipo: 'alerta_emergencia',
      mediaUrl: 'https://maps.google.com/?q=-13.654881,-73.42595',
      createdAt: new Date()
    }
  });

  console.log('\n🎉 Database seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
