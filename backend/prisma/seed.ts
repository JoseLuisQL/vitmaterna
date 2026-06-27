/**
 * VITMATERNA — Seeder completo y realista (para QA y manual de usuario).
 *
 * Genera datos abundantes y aleatorios en CADA módulo del sistema, manteniendo
 * las cuentas demo con credenciales fijas para que los logins y los tours
 * guiados sigan funcionando:
 *
 *   Admin:     DNI 99999999 / Admin@2026
 *   Obstetras: DNI 11111111, 22222222 / Test@1234
 *   Gestantes demo: DNI 33333333, 44444444, 55555555, 77777777 / Test@1234
 *
 * Además crea ~36 gestantes aleatorias repartidas entre obstetras, trimestres,
 * niveles de riesgo y estados, cada una con su historia clínica completa
 * (controles, tratamientos con adherencia, laboratorios, ecografías, peso,
 * vacunas, tamizajes, patologías, signos de alarma, antecedentes, citas, chat
 * y visitas domiciliarias). También: obstetras pendientes de aprobación,
 * contenido educativo, sedes, notificaciones y logs de auditoría.
 *
 * Idempotente: limpia los datos generados al inicio y los regenera.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────────────────
// Utilidades de aleatoriedad (seed fija para reproducibilidad parcial)
// ──────────────────────────────────────────────────────────────────────────
const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number, decimals = 1): number => {
  const v = Math.random() * (max - min) + min;
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number): boolean => Math.random() < p;
const sample = <T>(arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  return out;
};
const daysAgo = (d: number): Date => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const time = (h: number, m = 0): Date => new Date(Date.UTC(1970, 0, 1, h, m, 0));

// ──────────────────────────────────────────────────────────────────────────
// Pools de datos realistas (Apurímac / Andahuaylas)
// ──────────────────────────────────────────────────────────────────────────
const NOMBRES_F = [
  'María', 'Rosa', 'Ana', 'Lucía', 'Sofía', 'Carmen', 'Juana', 'Elena', 'Yesenia',
  'Mariela', 'Flor', 'Nayeli', 'Milagros', 'Katherine', 'Dina', 'Yovana', 'Erika',
  'Roxana', 'Vanessa', 'Liz', 'Maribel', 'Noemí', 'Brígida', 'Edith', 'Gloria',
  'Pamela', 'Yanet', 'Rocío', 'Delia', 'Marleny', 'Soledad', 'Nilda', 'Felicitas',
];
const APELLIDOS = [
  'Quispe', 'Mamani', 'Huamán', 'Ccahuana', 'Sánchez', 'Flores', 'Gutiérrez',
  'Ramos', 'Pérez', 'Huillca', 'Choquehuanca', 'Vargas', 'Palomino', 'Taipe',
  'Ccory', 'Auccapuclla', 'Carbajal', 'Soto', 'Ñahui', 'Achahui', 'Cárdenas',
  'Pumacahua', 'Sulca', 'Aimituma', 'Bautista', 'Quintana', 'Rojas', 'Medina',
];
const DISTRITOS = [
  'Talavera', 'Andahuaylas', 'San Jerónimo', 'Pacucha', 'Kishuará', 'Santa María de Chicmo',
  'Turpo', 'Huancarama', 'Pacobamba',
];
const LOCALIDADES = [
  'Centro', 'Champaccocha', 'Huancabamba', 'Pumamarca', 'San Juan', 'Yanamayo',
  'Bellavista', 'La Esperanza', 'Ccoyahuacho', 'Huayllabamba',
];
const OCUPACIONES = [
  'Ama de casa', 'Comerciante', 'Agricultora', 'Estudiante', 'Profesora',
  'Empleada del hogar', 'Costurera', 'Enfermera técnica', 'Independiente',
];
const NIVELES_ESTUDIOS = ['analfabeta', 'primaria', 'secundaria', 'superior', 'no_universitario'] as const;
const ESTADOS_CIVILES = ['casada', 'conviviente', 'soltera', 'otro'] as const;
const GRUPOS = ['O', 'A', 'B', 'AB'] as const;
const RH = ['+', '-'] as const;

const ANTECEDENTES_FAMILIARES = ['Diabetes', 'Hipertensión arterial', 'Preeclampsia', 'Embarazo gemelar', 'Tuberculosis', 'Cáncer'];
const ANTECEDENTES_PERSONALES = ['Asma', 'Anemia previa', 'Cesárea anterior', 'Infección urinaria recurrente', 'Aborto previo', 'Ninguno relevante'];

const LAB_TIPOS = [
  { tipo: 'Hemoglobina', unidad: 'g/dL', min: 8.5, max: 13.5, normal: (v: number) => v >= 11 ? 'Normal' : v >= 10 ? 'Anemia Leve' : v >= 7 ? 'Anemia Moderada' : 'Anemia Severa' },
  { tipo: 'Glucosa', unidad: 'mg/dL', min: 70, max: 140, normal: (v: number) => v <= 92 ? 'Normal' : 'Elevada' },
  { tipo: 'VIH', unidad: '', min: 0, max: 0, normal: () => 'No Reactivo' },
  { tipo: 'VDRL/RPR', unidad: '', min: 0, max: 0, normal: () => 'No Reactivo' },
  { tipo: 'Hepatitis B', unidad: '', min: 0, max: 0, normal: () => 'No Reactivo' },
  { tipo: 'Examen de Orina', unidad: '', min: 0, max: 0, normal: () => chance(0.2) ? 'Infección Urinaria' : 'Normal' },
  { tipo: 'Grupo y Factor', unidad: '', min: 0, max: 0, normal: () => 'Determinado' },
];

const VACUNAS = ['Antitetánica (dT)', 'Influenza', 'COVID-19', 'Hepatitis B'];

const SIGNOS_ALARMA = [
  { tipo: 'Sangrado vaginal', desc: 'Presento sangrado leve desde anoche.', sev: 'grave' as const },
  { tipo: 'Dolor de cabeza intenso', desc: 'Me duele mucho la cabeza y veo lucecitas.', sev: 'grave' as const },
  { tipo: 'Hinchazón de pies y manos', desc: 'Mis pies están muy hinchados desde hace dos días.', sev: 'moderado' as const },
  { tipo: 'Fiebre', desc: 'Tengo fiebre de 38.5 y escalofríos.', sev: 'moderado' as const },
  { tipo: 'Disminución de movimientos fetales', desc: 'Siento que mi bebé se mueve menos hoy.', sev: 'grave' as const },
  { tipo: 'Ardor al orinar', desc: 'Me arde al orinar y voy muy seguido.', sev: 'leve' as const },
  { tipo: 'Contracciones', desc: 'Tengo contracciones cada 10 minutos.', sev: 'moderado' as const },
];

const PATOLOGIAS = [
  { cie: 'O14.9', desc: 'Preeclampsia no especificada' },
  { cie: 'O24.4', desc: 'Diabetes gestacional' },
  { cie: 'O99.0', desc: 'Anemia que complica el embarazo' },
  { cie: 'O23.4', desc: 'Infección urinaria en el embarazo' },
  { cie: 'O44.1', desc: 'Placenta previa con hemorragia' },
];

const MENSAJES_GESTANTE = [
  'Hola Licenciada, ¿está bien si tomo el hierro con leche?',
  'Buenos días, quería saber si mi próxima cita sigue para esta semana.',
  'Me siento un poco mareada por las mañanas, ¿es normal?',
  '¿Puedo seguir trabajando hasta el octavo mes?',
  'Gracias por la atención de ayer, ya me siento mejor.',
  'Licenciada, ¿qué alimentos debo evitar en el embarazo?',
  '¿A partir de qué semana siento los movimientos del bebé?',
];
const MENSAJES_OBSTETRA = [
  'Hola, toma el hierro con jugo de naranja, no con leche. Te ayuda a absorberlo mejor.',
  'Sí, tu cita sigue programada. Te espero puntual, no olvides traer tus análisis.',
  'El mareo en el primer trimestre es común. Come poco y seguido. Si empeora, avísame.',
  'Puedes trabajar mientras te sientas bien y evites cargar peso. Descansa cada cierto tiempo.',
  'Me alegra mucho. Cualquier cosa, escríbeme por aquí.',
  'Evita embutidos, pescado crudo y exceso de cafeína. Prioriza menestras, verduras y frutas.',
  'Por lo general entre la semana 18 y 22. Si no los sientes, lo revisamos en el control.',
];

const CONTENIDO_EDUCATIVO: Array<{
  titulo: string; categoria: any; tipo: any; trim?: number; ini?: number; fin?: number; dur?: number; contenido: string;
}> = [
  { titulo: 'Nutrición en el Primer Trimestre', categoria: 'nutricion', tipo: 'articulo', trim: 1, ini: 1, fin: 13, contenido: 'Durante el primer trimestre es crucial el consumo de ácido fólico para el desarrollo del tubo neural del bebé. Incluye verduras de hoja verde, menestras y cítricos.' },
  { titulo: 'Importancia del Sulfato Ferroso', categoria: 'suplementos', tipo: 'articulo', trim: 2, contenido: 'El hierro previene la anemia y asegura el oxígeno para tu bebé. Tómalo en ayunas con vitamina C y evita el té o café cerca de la toma.' },
  { titulo: 'Signos de Alarma del Embarazo', categoria: 'signos_alarma', tipo: 'infografia', contenido: 'Acude de inmediato si presentas: sangrado, pérdida de líquido, dolor de cabeza intenso, visión borrosa, fiebre o ausencia de movimientos fetales.' },
  { titulo: 'Preparación para el Parto', categoria: 'parto', tipo: 'video', trim: 3, ini: 34, fin: 40, dur: 8, contenido: 'Aprende a identificar las contracciones de parto, cómo respirar y cuándo acudir al establecimiento de salud.' },
  { titulo: 'Lactancia Materna Exclusiva', categoria: 'lactancia', tipo: 'video', dur: 12, contenido: 'La leche materna es el mejor alimento durante los primeros 6 meses. Te enseñamos las posiciones correctas para amamantar.' },
  { titulo: 'Cuidados del Recién Nacido', categoria: 'cuidado_bebe', tipo: 'articulo', contenido: 'Cómo bañar, abrigar y reconocer señales de alarma en tu bebé durante las primeras semanas.' },
  { titulo: 'Salud Mental en el Embarazo', categoria: 'salud_mental', tipo: 'articulo', contenido: 'Es normal sentir cambios de ánimo. Si la tristeza o ansiedad persisten, conversa con tu obstetra. No estás sola.' },
  { titulo: 'Plan de Parto: ¿Qué llevar?', categoria: 'parto', tipo: 'faq', trim: 3, contenido: 'DNI, carné prenatal, ropa para ti y el bebé, artículos de aseo. Ten listo el transporte y los contactos de emergencia.' },
  { titulo: 'Alimentación Saludable en la Sierra', categoria: 'nutricion', tipo: 'infografia', contenido: 'Aprovecha alimentos locales ricos en hierro y proteínas: quinua, kiwicha, sangrecita, hígado, habas y tarwi.' },
  { titulo: 'Calcio y Prevención de Preeclampsia', categoria: 'suplementos', tipo: 'articulo', trim: 2, contenido: 'El calcio ayuda a prevenir la presión alta en el embarazo. Consúmelo según la indicación de tu obstetra.' },
  { titulo: 'Ejercicios Seguros durante el Embarazo', categoria: 'general', tipo: 'video', dur: 10, contenido: 'Caminatas suaves y estiramientos mejoran tu circulación y ánimo. Evita esfuerzos y consulta antes de empezar.' },
  { titulo: 'Cómo reconocer las contracciones', categoria: 'parto', tipo: 'audio', trim: 3, ini: 36, fin: 41, dur: 5, contenido: 'Las contracciones de parto son regulares, dolorosas y aumentan en intensidad. Cronométralas y acude si son cada 5 minutos.' },
];

const SEDES = [
  { nombre: 'Centro de Salud Talavera', codigo: 'CS-TALAVERA', direccion: 'Jr. Lima s/n, Talavera, Andahuaylas, Apurímac', telefono: '+51083421001', altitud: 2926, servicios: ['Control Prenatal', 'Ecografía', 'Laboratorio', 'Inmunizaciones'] },
  { nombre: 'Hospital Sub Regional de Andahuaylas', codigo: 'HSR-AND', direccion: 'Av. Perú 200, Andahuaylas', telefono: '+51083421100', altitud: 2926, servicios: ['Emergencia Obstétrica', 'Cirugía', 'Hospitalización', 'Banco de Sangre'] },
  { nombre: 'Puesto de Salud San Jerónimo', codigo: 'PS-SANJER', direccion: 'Plaza Principal s/n, San Jerónimo', telefono: '+51083421200', altitud: 2999, servicios: ['Control Prenatal', 'Planificación Familiar'] },
  { nombre: 'Puesto de Salud Pacucha', codigo: 'PS-PACUCHA', direccion: 'Comunidad de Pacucha', telefono: '+51083421300', altitud: 3092, servicios: ['Control Prenatal', 'Inmunizaciones'] },
];

interface ObstetraRef { id: string; userId: string }

// ──────────────────────────────────────────────────────────────────────────
async function cleanup(): Promise<void> {
  console.log('🧹 Limpiando datos generados (orden hijos → padres)...');
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.recommendedContent.deleteMany();
  await prisma.supplementLog.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.prenatalControl.deleteMany();
  await prisma.homeVisit.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.ultrasound.deleteMany();
  await prisma.weightRecord.deleteMany();
  await prisma.vaccinationRecord.deleteMany();
  await prisma.dangerSign.deleteMany();
  await prisma.violenceScreening.deleteMany();
  await prisma.mentalHealthScreening.deleteMany();
  await prisma.pathology.deleteMany();
  await prisma.nutritionalCounseling.deleteMany();
  await prisma.dentalRecord.deleteMany();
  await prisma.antecedente.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.educationalContent.deleteMany();
  await prisma.gestante.deleteMany();
  await prisma.user.deleteMany({ where: { role: 'gestante' } });
  console.log('🧹 Limpieza completa.\n');
}

/**
 * Crea la historia clínica completa de una gestante ya creada.
 * `weeks` = semanas de gestación actuales (0 si puerperio/postparto).
 */
async function generarHistoriaClinica(
  gestanteId: string,
  gestanteUserId: string,
  obstetra: ObstetraRef,
  opts: { weeks: number; riesgo: 'verde' | 'amarillo' | 'rojo'; estado: string; fum: Date | null },
): Promise<void> {
  const { weeks, riesgo, estado, fum } = opts;
  const trimestre = (w: number) => (w <= 13 ? 1 : w <= 26 ? 2 : 3);

  // ── Antecedentes (1-3)
  const nAnt = randInt(1, 3);
  for (let i = 0; i < nAnt; i++) {
    const familiar = chance(0.5);
    await prisma.antecedente.create({
      data: {
        gestanteId,
        tipo: familiar ? 'familiar' : 'personal',
        condicion: familiar ? pick(ANTECEDENTES_FAMILIARES) : pick(ANTECEDENTES_PERSONALES),
        detalle: chance(0.4) ? 'Referido por la paciente en la primera consulta.' : null,
      },
    });
  }

  // ── Controles prenatales (1 por cada ~6 semanas hasta la actual)
  const controlWeeks: number[] = [];
  for (let w = 8; w <= Math.min(weeks, 40); w += randInt(4, 6)) controlWeeks.push(w);
  let pesoBase = randFloat(52, 78, 1);
  let nControl = 0;
  let lastControlDate: Date | null = null;
  for (const w of controlWeeks) {
    nControl++;
    const ctrlDate = fum ? new Date(fum.getTime() + w * 7 * 86400000) : daysAgo(randInt(10, 200));
    if (ctrlDate > new Date()) break;
    lastControlDate = ctrlDate;
    const hipertensa = riesgo === 'rojo' && chance(0.6);
    const ctrlApp = await prisma.appointment.create({
      data: {
        gestanteId, obstetraId: obstetra.id,
        motivo: `Control Prenatal (Control ${nControl})`,
        fecha: ctrlDate, hora: time(randInt(8, 16), pick([0, 30])),
        estado: 'asistida', numeroControl: nControl, egSemanas: w,
        modalidad: 'establecimiento',
      },
    });
    pesoBase += randFloat(0.4, 1.8, 1);
    await prisma.prenatalControl.create({
      data: {
        gestanteId, obstetraId: obstetra.id, appointmentId: ctrlApp.id,
        numeroControl: nControl, fecha: ctrlDate, egSemanas: w, trimestre: trimestre(w),
        peso: new Prisma.Decimal(pesoBase),
        temperatura: new Prisma.Decimal(randFloat(36.2, 37.2, 1)),
        presionSistolica: hipertensa ? randInt(140, 160) : randInt(100, 125),
        presionDiastolica: hipertensa ? randInt(90, 105) : randInt(60, 82),
        pulsoMaterno: randInt(70, 92),
        alturaUterina: w >= 12 ? new Prisma.Decimal(Math.min(w - 2, 38)) : null,
        fcf: w >= 12 ? randInt(120, 160) : null,
        movimientoFetal: w >= 20 ? pick(['normal', 'presente', 'disminuido']) : null,
        situacion: w >= 28 ? pick(['L', 'T']) : null,
        presentacion: w >= 28 ? pick(['C', 'P']) : null,
        edema: hipertensa ? pick(['cruz_1', 'cruz_2']) : pick(['no', 'no', 'cruz_1']),
        indicacionHierro: 'Sulfato ferroso 1 tab/día',
        orientacion: sample(['nutrición', 'signos de alarma', 'lactancia', 'plan de parto'], randInt(1, 3)),
        establecimiento: 'C.S. Talavera',
        responsable: 'Obstetra de turno',
        observaciones: hipertensa ? 'Presión elevada: control estricto y reposo relativo.' : `Control ${nControl} sin novedades relevantes.`,
      },
    });
  }

  // ── Tratamientos + logs de adherencia
  const tratamientos: Array<{ nombre: string; tipo: any; dosis: string; frec: string }> = [
    { nombre: 'Ácido Fólico 500mcg', tipo: 'acido_folico', dosis: '1 tableta', frec: 'Diario' },
    { nombre: 'Sulfato Ferroso 60mg', tipo: 'sulfato_ferroso', dosis: '1 tableta', frec: 'Diario' },
  ];
  if (chance(0.5)) tratamientos.push({ nombre: 'Calcio 500mg', tipo: 'calcio', dosis: '2 tabletas', frec: 'Cada 12 horas' });
  if (riesgo === 'rojo' && chance(0.6)) tratamientos.push({ nombre: 'Metildopa 250mg', tipo: 'otro', dosis: '1 tableta', frec: 'Cada 8 horas' });

  // adherencia objetivo por riesgo: rojo más baja
  const adherenciaObjetivo = riesgo === 'rojo' ? randInt(45, 70) : riesgo === 'amarillo' ? randInt(65, 85) : randInt(80, 98);
  for (const t of tratamientos) {
    const dias = randInt(15, 45);
    const tr = await prisma.treatment.create({
      data: {
        gestanteId, obstetraId: obstetra.id,
        nombre: t.nombre, tipo: t.tipo, dosis: t.dosis, frecuencia: t.frec,
        viaAdministracion: 'oral',
        indicaciones: t.tipo === 'sulfato_ferroso' ? 'Tomar en ayunas con jugo de naranja.' : 'Según indicación médica.',
        fechaInicio: daysAgo(dias), duracionDias: 90, estado: estado === 'puerperio' ? 'completado' : 'activo',
        adherenciaPct: new Prisma.Decimal(adherenciaObjetivo),
      },
    });
    for (let d = 1; d <= dias; d++) {
      await prisma.supplementLog.create({
        data: {
          treatmentId: tr.id, gestanteId, fecha: daysAgo(d),
          tomado: randInt(1, 100) <= adherenciaObjetivo,
          notas: chance(0.15) ? pick(['Olvidó por viaje', 'Malestar estomacal', 'Tomado a tiempo']) : null,
        },
      });
    }
  }

  // ── Laboratorios (3-6 exámenes)
  for (const lab of sample(LAB_TIPOS, randInt(3, 6))) {
    const numeric = lab.unidad ? randFloat(lab.min, lab.max, 1) : null;
    await prisma.labResult.create({
      data: {
        gestanteId, obstetraId: obstetra.id,
        tipoExamen: lab.tipo, numeroToma: 1,
        valorNumerico: numeric !== null ? new Prisma.Decimal(numeric) : null,
        unidad: lab.unidad || null,
        resultado: lab.normal(numeric ?? 0),
        fechaExamen: lastControlDate ?? daysAgo(randInt(20, 120)),
        egSemanas: weeks > 0 ? Math.max(weeks - randInt(0, 8), 6) : null,
      },
    });
  }

  // ── Ecografías (según trimestre)
  const ecos: Array<{ tipo: any; w: number }> = [];
  if (weeks >= 13) ecos.push({ tipo: 'genetica', w: 12 });
  if (weeks >= 22) ecos.push({ tipo: 'morfologica', w: 22 });
  if (weeks >= 34) ecos.push({ tipo: 'bienestar_fetal', w: 34 });
  let nEco = 0;
  for (const e of ecos) {
    nEco++;
    await prisma.ultrasound.create({
      data: {
        gestanteId, tipo: e.tipo, numero: nEco, egSemanas: e.w, egPorEco: e.w + randInt(-1, 1),
        fecha: fum ? new Date(fum.getTime() + e.w * 7 * 86400000) : daysAgo(randInt(30, 150)),
        resultado: 'Normal',
        hallazgos: 'Feto único vivo, líquido amniótico normal, placenta de inserción adecuada.',
      },
    });
  }

  // ── Registros de peso
  let nWeight = 0;
  for (const w of controlWeeks.filter((x) => x <= weeks)) {
    nWeight++;
    const peso = pesoBase - (controlWeeks.length - nWeight) * randFloat(0.5, 1.2, 1);
    await prisma.weightRecord.create({
      data: {
        gestanteId, fecha: fum ? new Date(fum.getTime() + w * 7 * 86400000) : daysAgo(randInt(10, 150)),
        egSemanas: w, peso: new Prisma.Decimal(Math.max(peso, 45)),
        gananciaTotal: new Prisma.Decimal(randFloat(1, 12, 1)),
        clasificacion: pick(['bajo', 'adecuado', 'adecuado', 'alto']),
      },
    });
  }

  // ── Vacunas
  for (const v of sample(VACUNAS, randInt(1, 3))) {
    const aplicada = chance(0.6);
    await prisma.vaccinationRecord.create({
      data: {
        gestanteId, vacuna: v, dosisNumero: randInt(1, 2),
        egSemanasAplicacion: aplicada ? randInt(20, 36) : null,
        fechaAplicacion: aplicada ? daysAgo(randInt(10, 90)) : null,
        estado: aplicada ? 'aplicada' : 'pendiente',
      },
    });
  }

  // ── Tamizaje de violencia
  if (chance(0.8)) {
    const positivo = chance(0.15);
    await prisma.violenceScreening.create({
      data: {
        gestanteId, obstetraId: obstetra.id,
        respuestas: { p1: positivo, p2: positivo && chance(0.5), p3: false, p4: positivo && chance(0.3) },
        puntajeTotal: positivo ? randInt(2, 5) : 0,
        tamizajePositivo: positivo, derivacion: positivo,
        observaciones: positivo ? 'Tamizaje positivo: derivar a psicología y trabajo social.' : null,
        fecha: daysAgo(randInt(10, 120)),
      },
    });
  }

  // ── Tamizaje de salud mental (SRQ)
  if (chance(0.8)) {
    const p = randInt(0, 10);
    await prisma.mentalHealthScreening.create({
      data: {
        gestanteId, obstetraId: obstetra.id,
        respuestas: { tristeza: p > 6, ansiedad: p > 5, sueno: p > 7 },
        puntajeP1_18: p, puntajeP19_22: randInt(0, 4), pregunta23: p > 8, puntajeP24_28: randInt(0, 5),
        resultado: p >= 8 ? 'Riesgo Alto' : p >= 5 ? 'Riesgo Medio' : 'Riesgo Bajo',
        derivacion: p >= 8,
        fecha: daysAgo(randInt(10, 120)),
      },
    });
  }

  // ── Consejería nutricional
  if (chance(0.5)) {
    await prisma.nutritionalCounseling.create({
      data: {
        gestanteId, obstetraId: obstetra.id,
        historialAlimentario: 'Dieta basada en tubérculos y cereales andinos.',
        frecuenciaAlimentacion: randInt(3, 5),
        consumoAnimales: chance(0.7), consumoMenestras: chance(0.8),
        consumoFrutas: chance(0.6), salYodada: chance(0.9),
        acuerdos: 'Incrementar consumo de alimentos ricos en hierro (sangrecita, hígado).',
        sesionDemostrativa: chance(0.4), fecha: daysAgo(randInt(10, 100)),
      },
    });
  }

  // ── Odontograma / registro dental
  if (chance(0.4)) {
    await prisma.dentalRecord.create({
      data: {
        gestanteId, estadoBucal: pick(['Bueno', 'Regular', 'Deficiente']),
        caries: chance(0.5) ? 'Caries en piezas 16, 26' : 'Sin caries activas',
        tratamientos: 'Profilaxis y educación en higiene oral.',
        codigoCie10: 'K02.9', fecha: daysAgo(randInt(20, 120)),
      },
    });
  }

  // ── Patología (solo riesgo medio/alto a veces)
  if (riesgo !== 'verde' && chance(0.7)) {
    const pat = pick(PATOLOGIAS);
    await prisma.pathology.create({
      data: {
        gestanteId, codigoCie10: pat.cie, descripcion: pat.desc,
        fechaDiagnostico: daysAgo(randInt(10, 90)),
        estado: pick(['activa', 'seguimiento']),
      },
    });
  }

  // ── Signos de alarma reportados (algunos pendientes para la bandeja)
  if (chance(riesgo === 'rojo' ? 0.85 : riesgo === 'amarillo' ? 0.4 : 0.15)) {
    const s = pick(SIGNOS_ALARMA);
    const estadoSigno = pick(['pendiente', 'pendiente', 'atendido', 'derivado'] as const);
    await prisma.dangerSign.create({
      data: {
        gestanteId, tipoSigno: s.tipo, descripcion: s.desc, severidad: s.sev,
        estado: estadoSigno,
        respondidoPor: estadoSigno !== 'pendiente' ? obstetra.id : null,
        accionTomada: estadoSigno !== 'pendiente' ? 'Se indicó acudir al establecimiento para evaluación.' : null,
        tiempoRespuestaMin: estadoSigno !== 'pendiente' ? randInt(5, 120) : null,
        fechaReporte: daysAgo(randInt(0, 20)),
      },
    });
  }

  // ── Citas futuras (próximos controles programados)
  if (estado === 'activa' && weeks < 40) {
    const prox = randInt(2, 20);
    await prisma.appointment.create({
      data: {
        gestanteId, obstetraId: obstetra.id, motivo: 'Control Prenatal',
        fecha: daysAgo(-prox), hora: time(randInt(8, 16), pick([0, 30])),
        estado: chance(0.3) ? 'confirmada' : 'programada',
        numeroControl: nControl + 1, egSemanas: Math.min(weeks + Math.ceil(prox / 7), 40),
        modalidad: 'establecimiento',
      },
    });
    // Algunas con solicitud de reprogramación (para la bandeja del obstetra)
    if (chance(0.15)) {
      await prisma.appointment.create({
        data: {
          gestanteId, obstetraId: obstetra.id, motivo: 'Control Prenatal',
          fecha: daysAgo(-randInt(3, 10)), hora: time(10),
          estado: 'solicitud_reprogramacion',
          motivoReprogramacion: 'No podré asistir por motivos de trabajo.',
          fechaReprogramada: daysAgo(-randInt(12, 25)), horaReprogramada: time(11),
          numeroControl: nControl + 2, egSemanas: weeks + 2, modalidad: 'establecimiento',
        },
      });
    }
  }

  // ── Cita pasada no asistida (para reportes de inasistencia)
  if (chance(0.2)) {
    await prisma.appointment.create({
      data: {
        gestanteId, obstetraId: obstetra.id, motivo: 'Control Prenatal',
        fecha: daysAgo(randInt(5, 40)), hora: time(9),
        estado: 'no_asistida', numeroControl: nControl, egSemanas: Math.max(weeks - 2, 8),
        modalidad: 'establecimiento',
      },
    });
  }

  // ── Visita domiciliaria (para algunas)
  if (chance(0.3)) {
    await prisma.homeVisit.create({
      data: {
        gestanteId, obstetraId: obstetra.id, numeroVisita: 1,
        fecha: daysAgo(randInt(10, 80)), horaLlegada: time(randInt(9, 15)),
        duracionMin: randInt(20, 60),
        motivo: 'Seguimiento de gestante que no acudió a control / consumo de micronutrientes.',
        acciones: 'Se verificó consumo de sulfato ferroso, se reforzó consejería nutricional y plan de parto.',
        acuerdos: 'La gestante se compromete a asistir a su próximo control.',
        firmaGestante: true, firmaObstetra: true,
      },
    });
  }

  // ── Conversación + mensajes de chat
  if (chance(0.7)) {
    const conv = await prisma.conversation.create({
      data: { gestanteId, obstetraId: obstetra.id, ultimoMensaje: daysAgo(randInt(0, 5)) },
    });
    const nPares = randInt(1, 3);
    for (let i = 0; i < nPares; i++) {
      const idx = randInt(0, MENSAJES_GESTANTE.length - 1);
      const base = daysAgo(randInt(0, 6)).getTime() + i * 3600000;
      await prisma.message.create({
        data: { conversationId: conv.id, senderId: gestanteUserId, contenido: MENSAJES_GESTANTE[idx], tipo: 'texto', leido: true, createdAt: new Date(base) },
      });
      await prisma.message.create({
        data: { conversationId: conv.id, senderId: obstetra.userId, contenido: MENSAJES_OBSTETRA[idx], tipo: 'texto', leido: chance(0.7), createdAt: new Date(base + 1800000) },
      });
    }
  }

  // ── Notificaciones para la gestante
  const nNotif = randInt(1, 4);
  for (let i = 0; i < nNotif; i++) {
    const leida = chance(0.5);
    await prisma.notification.create({
      data: {
        userId: gestanteUserId,
        tipo: pick(['recordatorio_cita', 'recordatorio_suplemento', 'resultado_lab', 'mensaje']),
        canal: pick(['push', 'sms', 'whatsapp'] as const),
        titulo: pick(['Recordatorio de cita', 'Toma tu suplemento', 'Nuevo mensaje', 'Resultado disponible']),
        mensaje: pick([
          'Tienes una cita de control prenatal próximamente. No faltes.',
          'No olvides tomar tu sulfato ferroso hoy.',
          'Tu obstetra te ha enviado un mensaje.',
          'Tus resultados de laboratorio ya están disponibles.',
        ]),
        estado: leida ? 'leida' : 'enviada',
        leidaAt: leida ? daysAgo(randInt(0, 5)) : null,
        createdAt: daysAgo(randInt(0, 15)),
      },
    });
  }
}

async function main(): Promise<void> {
  console.log('🌱 Iniciando seed COMPLETO de VITMATERNA...\n');
  await cleanup();

  const adminHash = await bcrypt.hash('Admin@2026', 12);
  const testHash = await bcrypt.hash('Test@1234', 12);

  // ── Admin
  const adminUser = await prisma.user.upsert({
    where: { dni: '99999999' },
    update: { passwordHash: adminHash },
    create: {
      dni: '99999999', passwordHash: adminHash, role: 'admin',
      firstName: 'Administrador', lastName: 'Sistema', phone: '+51999999999',
      email: 'admin@vitmaterna.pe', isActive: true, isVerified: true,
      consentAccepted: true, consentDate: new Date(),
    },
  });

  // ── Sedes
  const facilities: Awaited<ReturnType<typeof prisma.healthFacility.upsert>>[] = [];
  for (const s of SEDES) {
    const f = await prisma.healthFacility.upsert({
      where: { id: `00000000-0000-0000-0000-0000000000${(SEDES.indexOf(s) + 10)}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-0000000000${(SEDES.indexOf(s) + 10)}`,
        nombre: s.nombre, codigo: s.codigo, direccion: s.direccion, telefono: s.telefono,
        horarios: { lunes_viernes: { apertura: '07:00', cierre: '19:00' }, sabado: { apertura: '08:00', cierre: '13:00' } },
        servicios: s.servicios, altitudMsnm: s.altitud, activo: true,
      },
    });
    facilities.push(f);
  }
  console.log(`✅ ${facilities.length} establecimientos de salud`);

  // ── Obstetras activos (demo + extras)
  const obstetraDefs = [
    { dni: '11111111', first: 'María', last: 'Fernández', cop: '12345', esp: 'Control Prenatal', turno: 'Mañana' },
    { dni: '22222222', first: 'Juan', last: 'Pérez', cop: '54321', esp: 'Ecografía Obstétrica', turno: 'Tarde' },
    { dni: '12121212', first: 'Carmen', last: 'Huamán', cop: '67890', esp: 'Control Prenatal', turno: 'Mañana' },
    { dni: '13131313', first: 'Rosa', last: 'Quispe', cop: '11223', esp: 'Psicoprofilaxis', turno: 'Tarde' },
  ];
  const obstetras: ObstetraRef[] = [];
  for (const o of obstetraDefs) {
    const u = await prisma.user.upsert({
      where: { dni: o.dni },
      update: { passwordHash: testHash },
      create: {
        dni: o.dni, passwordHash: testHash, role: 'obstetra',
        firstName: o.first, lastName: o.last, phone: `9${randInt(10000000, 99999999)}`,
        email: `${o.first.toLowerCase()}.${o.last.toLowerCase()}@vitmaterna.pe`,
        isActive: true, isVerified: true, consentAccepted: true,
      },
    });
    const ob = await prisma.obstetra.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, cop: o.cop, especialidad: o.esp, establecimiento: facilities[0].nombre, turno: o.turno },
    });
    obstetras.push({ id: ob.id, userId: u.id });
  }
  console.log(`✅ ${obstetras.length} obstetras activos`);

  // ── Obstetras PENDIENTES de aprobación (para el panel admin)
  const pendientesDefs = [
    { dni: '14141414', first: 'Lucía', last: 'Ramos', cop: '99001' },
    { dni: '15151515', first: 'Pedro', last: 'Flores', cop: '99002' },
  ];
  for (const p of pendientesDefs) {
    const u = await prisma.user.upsert({
      where: { dni: p.dni },
      update: {},
      create: {
        dni: p.dni, passwordHash: testHash, role: 'obstetra',
        firstName: p.first, lastName: p.last, phone: `9${randInt(10000000, 99999999)}`,
        isActive: false, isVerified: false, consentAccepted: true,
      },
    });
    await prisma.obstetra.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, cop: p.cop, especialidad: 'Control Prenatal', establecimiento: facilities[0].nombre },
    });
  }
  console.log(`✅ ${pendientesDefs.length} obstetras pendientes de aprobación`);

  // ── Contenido educativo
  for (let i = 0; i < CONTENIDO_EDUCATIVO.length; i++) {
    const c = CONTENIDO_EDUCATIVO[i];
    await prisma.educationalContent.create({
      data: {
        titulo: c.titulo, contenido: c.contenido, tipo: c.tipo, categoria: c.categoria,
        trimestre: c.trim ?? null, semanaInicio: c.ini ?? null, semanaFin: c.fin ?? null,
        duracionMin: c.dur ?? null, orden: i, activo: chance(0.9),
        viewsCount: randInt(0, 450),
      },
    });
  }
  console.log(`✅ ${CONTENIDO_EDUCATIVO.length} contenidos educativos`);

  // ── Gestantes DEMO (DNIs fijos para login/tours)
  const demoGestantes = [
    { dni: '33333333', first: 'Ana', last: 'Gómez', weeks: 10, riesgo: 'verde' as const, estado: 'activa' },
    { dni: '44444444', first: 'Lucía', last: 'Sánchez', weeks: 35, riesgo: 'rojo' as const, estado: 'activa' },
    { dni: '55555555', first: 'Sofía', last: 'Ramírez', weeks: 0, riesgo: 'amarillo' as const, estado: 'puerperio' },
    { dni: '77777777', first: 'María Elena', last: 'Quispe Ramos', weeks: 24, riesgo: 'verde' as const, estado: 'activa' },
  ];

  let totalGestantes = 0;
  const allGestanteIds: string[] = [];

  const crearGestante = async (def: {
    dni: string; first: string; last: string; weeks: number; riesgo: 'verde' | 'amarillo' | 'rojo'; estado: string;
  }, idx: number): Promise<void> => {
    const ob = obstetras[idx % obstetras.length];
    const edad = randInt(16, 42);
    const fum = def.weeks > 0 ? daysAgo(def.weeks * 7) : daysAgo(randInt(280, 320));
    const fpp = fum ? new Date(fum.getTime() + 280 * 86400000) : null;
    const talla = randFloat(1.45, 1.72, 2);
    const peso = randFloat(48, 92, 1);
    const imc = Math.round((peso / (talla * talla)) * 10) / 10;
    const gestaciones = randInt(1, 5);

    const u = await prisma.user.create({
      data: {
        dni: def.dni, passwordHash: testHash, role: 'gestante',
        firstName: def.first, lastName: def.last,
        phone: `9${randInt(10000000, 99999999)}`,
        isActive: true, isVerified: true, consentAccepted: true,
        lastSeenAt: chance(0.6) ? daysAgo(randInt(0, 4)) : null,
      },
    });
    const partos = randInt(0, gestaciones - 1 >= 0 ? gestaciones - 1 : 0);
    const g = await prisma.gestante.create({
      data: {
        userId: u.id,
        historiaClinica: `HC-${randInt(10000, 99999)}`,
        fechaNacimiento: new Date(new Date().getFullYear() - edad, randInt(0, 11), randInt(1, 28)),
        ageAtRegistration: edad,
        direccion: `${pick(['Jr.', 'Av.', 'Calle'])} ${pick(['Lima', 'Grau', 'Los Andes', 'Progreso', 'Libertad'])} ${randInt(100, 999)}`,
        localidad: pick(LOCALIDADES),
        departamento: 'Apurímac', provincia: 'Andahuaylas', distrito: pick(DISTRITOS),
        establecimiento: facilities[0].nombre,
        codigoSis: chance(0.7) ? `${randInt(10000000, 99999999)}` : null,
        ocupacion: pick(OCUPACIONES),
        nivelEstudios: pick(NIVELES_ESTUDIOS),
        estadoCivil: pick(ESTADOS_CIVILES),
        gestaciones, partosVaginales: partos, cesareas: randInt(0, 1), abortos: randInt(0, 1),
        nacidosVivos: partos, hijosVivos: partos,
        pesoHabitual: new Prisma.Decimal(peso), pesoActual: new Prisma.Decimal(peso + randFloat(1, 10, 1)),
        talla: new Prisma.Decimal(talla), imc: new Prisma.Decimal(imc),
        clasificacionImc: imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad',
        grupoSanguineo: pick(GRUPOS), factorRh: pick(RH),
        fum, fppFum: fpp,
        nivelRiesgo: def.riesgo, estado: def.estado as any,
        domicilioLat: new Prisma.Decimal(randFloat(-13.7, -13.6, 6)),
        domicilioLng: new Prisma.Decimal(randFloat(-73.45, -73.35, 6)),
      },
    });
    allGestanteIds.push(g.id);
    await generarHistoriaClinica(g.id, u.id, ob, { weeks: def.weeks, riesgo: def.riesgo, estado: def.estado, fum });
    totalGestantes++;
  };

  // Crear demo primero
  for (let i = 0; i < demoGestantes.length; i++) await crearGestante(demoGestantes[i], i);
  console.log(`✅ ${demoGestantes.length} gestantes demo (DNIs 33333333, 44444444, 55555555, 77777777)`);

  // ── Gestantes aleatorias (~36)
  const N_RANDOM = 36;
  const usedDni = new Set<string>([...demoGestantes.map((d) => d.dni), '99999999', '11111111', '22222222', '12121212', '13131313', '14141414', '15151515']);
  for (let i = 0; i < N_RANDOM; i++) {
    let dni: string;
    do { dni = String(randInt(60000000, 69999999)); } while (usedDni.has(dni));
    usedDni.add(dni);

    // distribución de riesgo: 60% verde, 28% amarillo, 12% rojo
    const r = Math.random();
    const riesgo = r < 0.6 ? 'verde' : r < 0.88 ? 'amarillo' : 'rojo';
    // distribución de estado
    const er = Math.random();
    const estado = er < 0.8 ? 'activa' : er < 0.92 ? 'puerperio' : er < 0.97 ? 'parto' : 'inactiva';
    const weeks = estado === 'puerperio' || estado === 'inactiva' ? 0 : randInt(5, 40);

    await crearGestante({
      dni, first: pick(NOMBRES_F), last: `${pick(APELLIDOS)} ${pick(APELLIDOS)}`,
      weeks, riesgo: riesgo as any, estado,
    }, demoGestantes.length + i);

    if ((i + 1) % 10 === 0) console.log(`   …${i + 1}/${N_RANDOM} gestantes aleatorias generadas`);
  }
  console.log(`✅ ${N_RANDOM} gestantes aleatorias con historia clínica completa`);

  // ── Emergencia activa (botón de pánico) en una gestante demo
  const emergencyG = await prisma.gestante.findFirst({ where: { user: { dni: '77777777' } }, include: { user: true } });
  if (emergencyG) {
    const ob = obstetras[0];
    const conv = await prisma.conversation.create({ data: { gestanteId: emergencyG.id, obstetraId: ob.id, ultimoMensaje: new Date() } });
    await prisma.message.create({
      data: {
        conversationId: conv.id, senderId: emergencyG.userId,
        contenido: '🚨 ALERTA DE EMERGENCIA: La gestante ha presionado el botón de pánico. Ubicación compartida.',
        tipo: 'alerta_emergencia', mediaUrl: 'https://maps.google.com/?q=-13.654881,-73.42595',
      },
    });
  }

  // ── Logs de auditoría (actividad del sistema)
  const acciones = ['login', 'crear', 'actualizar', 'eliminar', 'exportar', 'aprobar'];
  const entidades = ['Gestante', 'Cita', 'Tratamiento', 'Usuario', 'Reporte', 'Contenido', 'Control'];
  const adminAndObstetras = [adminUser.id, ...obstetras.map((o) => o.userId)];
  for (let i = 0; i < 60; i++) {
    await prisma.auditLog.create({
      data: {
        userId: pick(adminAndObstetras),
        accion: pick(acciones), entidad: pick(entidades),
        ipAddress: `192.168.${randInt(0, 1)}.${randInt(2, 254)}`,
        userAgent: pick(['Mozilla/5.0 (Windows NT 10.0)', 'VITMATERNA-App/1.0 (Android)', 'VITMATERNA-App/1.0 (iOS)']),
        createdAt: daysAgo(randInt(0, 30)),
      },
    });
  }
  console.log(`✅ 60 registros de auditoría`);

  // ── Notificaciones para el admin
  for (let i = 0; i < 5; i++) {
    await prisma.notification.create({
      data: {
        userId: adminUser.id, tipo: 'sistema', canal: 'push',
        titulo: pick(['Nueva cuenta pendiente', 'Resumen diario', 'Alerta de sistema']),
        mensaje: pick([
          'Hay obstetras pendientes de aprobación.',
          'Resumen: nuevas gestantes registradas esta semana.',
          'Recuerda revisar la configuración de canales de notificación.',
        ]),
        estado: chance(0.5) ? 'leida' : 'enviada',
        createdAt: daysAgo(randInt(0, 10)),
      },
    });
  }

  // ── SystemConfig base (por si la app los lee)
  const configs = [
    { clave: 'max_patients_per_obstetra', valor: 80, desc: 'Máximo de gestantes por obstetra' },
    { clave: 'allow_registrations', valor: true, desc: 'Permitir el registro de nuevas cuentas' },
    { clave: 'default_altitude_msnm', valor: 2926, desc: 'Altitud por defecto para corrección de hemoglobina' },
    { clave: 'auto_generate_schedule', valor: true, desc: 'Generar automáticamente el cronograma de controles' },
    { clave: 'maintenance_mode', valor: false, desc: 'Modo mantenimiento del sistema' },
    { clave: 'support_email', valor: 'soporte@vitmaterna.pe', desc: 'Correo de soporte' },
    { clave: 'paidChannelsEnabled', valor: true, desc: 'Interruptor global de canales de PAGO (SMS/WhatsApp). En false apaga todo envío que consume créditos.' },
  ];
  for (const c of configs) {
    await prisma.systemConfig.upsert({
      where: { clave: c.clave },
      update: {},
      create: { clave: c.clave, valor: c.valor as any, descripcion: c.desc, updatedBy: adminUser.id },
    });
  }
  console.log(`✅ ${configs.length} parámetros de configuración`);

  console.log(`\n🎉 Seed completo. Total gestantes: ${totalGestantes}`);
  console.log('   Credenciales: admin 99999999/Admin@2026 · obstetra 11111111/Test@1234 · gestante 33333333/Test@1234');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
