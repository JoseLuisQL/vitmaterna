export type Rol = "gestante" | "obstetra" | "admin";
export type RiesgoNivel = "verde" | "amarillo" | "rojo";
export type CitaEstado = "programada" | "confirmada" | "asistida" | "no_asistida" | "reprogramada";
export type SupEstado = "pendiente" | "tomado" | "omitido";

export interface Usuario {
  id: string;
  nombre: string;
  dni: string;
  rol: Rol;
  telefono: string;
  activo: boolean;
}

export interface ControlPrenatal {
  id: string;
  fecha: string;
  semanaGestacional: number;
  peso: number;
  temperatura: number;
  presionSistolica: number;
  presionDiastolica: number;
  pulso: number;
  alturaUterina: number;
  situacion: string;
  presentacion: string;
  posicion?: string;
  fcf: number;
  movimientoFetal: string;
  proteinuria: string;
  edema: string;
  responsable: string;
  proximaCita: string;
  observaciones: string;
}

export interface Suplemento {
  id: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  horaRecordatorio: string;
  diasTomados: string[];
  diasOmitidos: string[];
  totalDias: number;
  color: string;
}

export interface Cita {
  id: string;
  gestanteId: string;
  gestanteNombre: string;
  motivo: string;
  fecha: string;
  hora: string;
  estado: CitaEstado;
  observaciones: string;
}

export interface Laboratorio {
  hemoglobina1: number;
  hemoglobina2: number | null;
  hemoglobina3: number | null;
  vdrl: string;
  vih: string;
  hepatitisB: string;
  glucemia: string;
  examenOrina: string;
  pap: string;
  grupoSanguineo: string;
  factorRh: string;
}

export interface Gestante {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  nroHistoriaClinica: string;
  fechaNacimiento: string;
  edad: number;
  direccion: string;
  localidad: string;
  departamento: string;
  provincia: string;
  distrito: string;
  telefono: string;
  codigoSIS: string;
  ocupacion: string;
  estudios: string;
  estadoCivil: string;
  fum: string;
  fpp: string;
  semanaGestacional: number;
  trimestre: number;
  pesoHabitual: number;
  talla: number;
  imc: number;
  clasificacionIMC: string;
  grupoSanguineo: string;
  factorRh: string;
  riesgo: RiesgoNivel;
  gestaciones: number;
  partos: number;
  cesareas: number;
  abortos: number;
  obstetrasAsignada: string;
  suplementos: Suplemento[];
  controles: ControlPrenatal[];
  citas: Cita[];
  laboratorio: Laboratorio;
  vacunas: { nombre: string; aplicada: boolean; semana: number }[];
}

const hoy = new Date();
const formatDate = (d: Date) => d.toISOString().split("T")[0];

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function subDays(d: Date, n: number) {
  return addDays(d, -n);
}

function generarDiasTomados(dias: number, tasaAdherencia: number): { tomados: string[]; omitidos: string[] } {
  const tomados: string[] = [];
  const omitidos: string[] = [];
  for (let i = dias; i >= 1; i--) {
    const fecha = formatDate(subDays(hoy, i));
    if (Math.random() < tasaAdherencia) {
      tomados.push(fecha);
    } else {
      omitidos.push(fecha);
    }
  }
  return { tomados, omitidos };
}

const { tomados: hTomados1, omitidos: hOmitidos1 } = generarDiasTomados(60, 0.88);
const { tomados: hTomados2, omitidos: hOmitidos2 } = generarDiasTomados(40, 0.72);
const { tomados: hTomados3, omitidos: hOmitidos3 } = generarDiasTomados(20, 0.45);
const { tomados: hTomados4, omitidos: hOmitidos4 } = generarDiasTomados(30, 0.93);

export const gestantes: Gestante[] = [
  {
    id: "g1",
    nombre: "María",
    apellidos: "Quispe Huanca",
    dni: "47283910",
    nroHistoriaClinica: "HC-2025-001",
    fechaNacimiento: "1998-03-12",
    edad: 27,
    direccion: "Jr. Ayacucho 245",
    localidad: "Talavera",
    departamento: "Apurímac",
    provincia: "Andahuaylas",
    distrito: "Talavera",
    telefono: "921345678",
    codigoSIS: "SIS-47283910",
    ocupacion: "Ama de casa",
    estudios: "Secundaria",
    estadoCivil: "Conviviente",
    fum: "2025-09-15",
    fpp: "2026-06-22",
    semanaGestacional: 37,
    trimestre: 3,
    pesoHabitual: 54,
    talla: 152,
    imc: 23.4,
    clasificacionIMC: "Normal",
    grupoSanguineo: "O",
    factorRh: "+",
    riesgo: "verde",
    gestaciones: 2,
    partos: 1,
    cesareas: 0,
    abortos: 0,
    obstetrasAsignada: "Lic. Ana Flores",
    laboratorio: {
      hemoglobina1: 11.5,
      hemoglobina2: 11.0,
      hemoglobina3: 11.2,
      vdrl: "No reactivo",
      vih: "Negativo",
      hepatitisB: "Negativo",
      glucemia: "Normal",
      examenOrina: "Normal",
      pap: "Negativo",
      grupoSanguineo: "O",
      factorRh: "+",
    },
    vacunas: [
      { nombre: "DT", aplicada: true, semana: 20 },
      { nombre: "DPT", aplicada: true, semana: 20 },
      { nombre: "COVID-19 (1ra)", aplicada: true, semana: 10 },
      { nombre: "COVID-19 (2da)", aplicada: true, semana: 14 },
      { nombre: "COVID-19 (3ra)", aplicada: false, semana: 30 },
    ],
    suplementos: [
      {
        id: "s1",
        nombre: "Sulfato Ferroso + Ácido Fólico",
        dosis: "60mg + 400μg",
        frecuencia: "1 tableta/día",
        horaRecordatorio: "08:00",
        diasTomados: hTomados1,
        diasOmitidos: hOmitidos1,
        totalDias: 60,
        color: "#7C3AED",
      },
      {
        id: "s2",
        nombre: "Carbonato de Calcio",
        dosis: "500mg",
        frecuencia: "2 tabletas/día",
        horaRecordatorio: "08:00",
        diasTomados: hTomados2,
        diasOmitidos: hOmitidos2,
        totalDias: 40,
        color: "#DB2777",
      },
    ],
    controles: [
      {
        id: "c1",
        fecha: "2026-03-10",
        semanaGestacional: 24,
        peso: 60.5,
        temperatura: 36.8,
        presionSistolica: 110,
        presionDiastolica: 70,
        pulso: 82,
        alturaUterina: 24,
        situacion: "L",
        presentacion: "C",
        posicion: "D",
        fcf: 148,
        movimientoFetal: "++",
        proteinuria: "NSH",
        edema: "S/E",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-04-10",
        observaciones: "Control sin complicaciones",
      },
      {
        id: "c2",
        fecha: "2026-04-10",
        semanaGestacional: 28,
        peso: 62.3,
        temperatura: 36.6,
        presionSistolica: 112,
        presionDiastolica: 72,
        pulso: 80,
        alturaUterina: 28,
        situacion: "L",
        presentacion: "C",
        posicion: "D",
        fcf: 152,
        movimientoFetal: "+++",
        proteinuria: "NSH",
        edema: "S/E",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-05-10",
        observaciones: "Gana peso adecuado",
      },
      {
        id: "c3",
        fecha: "2026-05-10",
        semanaGestacional: 32,
        peso: 64.0,
        temperatura: 36.7,
        presionSistolica: 115,
        presionDiastolica: 75,
        pulso: 84,
        alturaUterina: 32,
        situacion: "L",
        presentacion: "C",
        posicion: "I",
        fcf: 144,
        movimientoFetal: "++",
        proteinuria: "NSH",
        edema: "+",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-05-25",
        observaciones: "Edema leve en pies, vigilar",
      },
      {
        id: "c4",
        fecha: "2026-05-25",
        semanaGestacional: 34,
        peso: 65.2,
        temperatura: 36.5,
        presionSistolica: 118,
        presionDiastolica: 74,
        pulso: 86,
        alturaUterina: 34,
        situacion: "L",
        presentacion: "C",
        posicion: "D",
        fcf: 150,
        movimientoFetal: "+++",
        proteinuria: "NSH",
        edema: "S/E",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-06-07",
        observaciones: "Edema resuelto, todo normal",
      },
    ],
    citas: [
      {
        id: "ci1",
        gestanteId: "g1",
        gestanteNombre: "María Quispe Huanca",
        motivo: "Control prenatal",
        fecha: formatDate(hoy),
        hora: "10:00",
        estado: "programada",
        observaciones: "",
      },
      {
        id: "ci2",
        gestanteId: "g1",
        gestanteNombre: "María Quispe Huanca",
        motivo: "Control prenatal",
        fecha: formatDate(addDays(hoy, 7)),
        hora: "10:30",
        estado: "programada",
        observaciones: "",
      },
      {
        id: "ci3",
        gestanteId: "g1",
        gestanteNombre: "María Quispe Huanca",
        motivo: "Control prenatal",
        fecha: "2026-05-25",
        hora: "09:00",
        estado: "asistida",
        observaciones: "Asistió puntual",
      },
      {
        id: "ci4",
        gestanteId: "g1",
        gestanteNombre: "María Quispe Huanca",
        motivo: "Ecografía bienestar fetal",
        fecha: formatDate(addDays(hoy, 3)),
        hora: "11:00",
        estado: "programada",
        observaciones: "",
      },
    ],
  },
  {
    id: "g2",
    nombre: "Rosa",
    apellidos: "Condori Mamani",
    dni: "48102938",
    nroHistoriaClinica: "HC-2025-002",
    fechaNacimiento: "2003-07-22",
    edad: 22,
    direccion: "Av. Progreso 89",
    localidad: "Andahuaylas",
    departamento: "Apurímac",
    provincia: "Andahuaylas",
    distrito: "Andahuaylas",
    telefono: "934512076",
    codigoSIS: "SIS-48102938",
    ocupacion: "Estudiante",
    estudios: "Superior incompleta",
    estadoCivil: "Soltera",
    fum: "2025-12-01",
    fpp: "2026-09-08",
    semanaGestacional: 26,
    trimestre: 2,
    pesoHabitual: 50,
    talla: 155,
    imc: 20.8,
    clasificacionIMC: "Normal",
    grupoSanguineo: "A",
    factorRh: "+",
    riesgo: "amarillo",
    gestaciones: 1,
    partos: 0,
    cesareas: 0,
    abortos: 0,
    obstetrasAsignada: "Lic. Ana Flores",
    laboratorio: {
      hemoglobina1: 10.2,
      hemoglobina2: 10.0,
      hemoglobina3: null,
      vdrl: "No reactivo",
      vih: "Negativo",
      hepatitisB: "Negativo",
      glucemia: "Normal",
      examenOrina: "Normal",
      pap: "Pendiente",
      grupoSanguineo: "A",
      factorRh: "+",
    },
    vacunas: [
      { nombre: "DT", aplicada: true, semana: 20 },
      { nombre: "DPT", aplicada: false, semana: 20 },
      { nombre: "COVID-19 (1ra)", aplicada: true, semana: 8 },
      { nombre: "COVID-19 (2da)", aplicada: false, semana: 12 },
      { nombre: "COVID-19 (3ra)", aplicada: false, semana: 30 },
    ],
    suplementos: [
      {
        id: "s3",
        nombre: "Sulfato Ferroso + Ácido Fólico",
        dosis: "60mg + 400μg",
        frecuencia: "1 tableta/día",
        horaRecordatorio: "08:00",
        diasTomados: hTomados3,
        diasOmitidos: hOmitidos3,
        totalDias: 20,
        color: "#7C3AED",
      },
    ],
    controles: [
      {
        id: "c5",
        fecha: "2026-03-15",
        semanaGestacional: 15,
        peso: 53.0,
        temperatura: 36.9,
        presionSistolica: 108,
        presionDiastolica: 68,
        pulso: 88,
        alturaUterina: 15,
        situacion: "L",
        presentacion: "C",
        posicion: "D",
        fcf: 155,
        movimientoFetal: "+",
        proteinuria: "NSH",
        edema: "S/E",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-04-15",
        observaciones: "Hb baja, reforzar hierro",
      },
      {
        id: "c6",
        fecha: "2026-04-20",
        semanaGestacional: 19,
        peso: 54.5,
        temperatura: 36.7,
        presionSistolica: 110,
        presionDiastolica: 70,
        pulso: 85,
        alturaUterina: 19,
        situacion: "L",
        presentacion: "C",
        posicion: "I",
        fcf: 150,
        movimientoFetal: "++",
        proteinuria: "NSH",
        edema: "S/E",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-05-20",
        observaciones: "Mejoró adherencia a suplementos",
      },
    ],
    citas: [
      {
        id: "ci5",
        gestanteId: "g2",
        gestanteNombre: "Rosa Condori Mamani",
        motivo: "Control prenatal",
        fecha: formatDate(addDays(hoy, 2)),
        hora: "09:00",
        estado: "programada",
        observaciones: "",
      },
      {
        id: "ci6",
        gestanteId: "g2",
        gestanteNombre: "Rosa Condori Mamani",
        motivo: "Control prenatal",
        fecha: "2026-04-20",
        hora: "09:30",
        estado: "asistida",
        observaciones: "Asistió, se reforzó consejería nutricional",
      },
    ],
  },
  {
    id: "g3",
    nombre: "Carmen",
    apellidos: "Palomino Rivas",
    dni: "47651234",
    nroHistoriaClinica: "HC-2025-003",
    fechaNacimiento: "1990-11-05",
    edad: 35,
    direccion: "Jr. Lima 560",
    localidad: "Talavera",
    departamento: "Apurímac",
    provincia: "Andahuaylas",
    distrito: "Talavera",
    telefono: "958234017",
    codigoSIS: "SIS-47651234",
    ocupacion: "Comerciante",
    estudios: "Primaria",
    estadoCivil: "Casada",
    fum: "2025-08-20",
    fpp: "2026-05-27",
    semanaGestacional: 41,
    trimestre: 3,
    pesoHabitual: 72,
    talla: 158,
    imc: 28.8,
    clasificacionIMC: "Sobrepeso",
    grupoSanguineo: "B",
    factorRh: "+",
    riesgo: "rojo",
    gestaciones: 4,
    partos: 3,
    cesareas: 0,
    abortos: 0,
    obstetrasAsignada: "Lic. Ana Flores",
    laboratorio: {
      hemoglobina1: 9.8,
      hemoglobina2: 9.5,
      hemoglobina3: 9.3,
      vdrl: "No reactivo",
      vih: "Negativo",
      hepatitisB: "Negativo",
      glucemia: "Anormal",
      examenOrina: "Normal",
      pap: "Negativo",
      grupoSanguineo: "B",
      factorRh: "+",
    },
    vacunas: [
      { nombre: "DT", aplicada: true, semana: 20 },
      { nombre: "DPT", aplicada: true, semana: 20 },
      { nombre: "COVID-19 (1ra)", aplicada: true, semana: 8 },
      { nombre: "COVID-19 (2da)", aplicada: true, semana: 12 },
      { nombre: "COVID-19 (3ra)", aplicada: true, semana: 28 },
    ],
    suplementos: [
      {
        id: "s5",
        nombre: "Sulfato Ferroso + Ácido Fólico",
        dosis: "60mg + 400μg × 2",
        frecuencia: "2 tabletas/día",
        horaRecordatorio: "07:30",
        diasTomados: hTomados4,
        diasOmitidos: hOmitidos4,
        totalDias: 30,
        color: "#7C3AED",
      },
      {
        id: "s6",
        nombre: "Carbonato de Calcio",
        dosis: "500mg",
        frecuencia: "2 tabletas/día",
        horaRecordatorio: "08:00",
        diasTomados: hTomados1.slice(0, 30),
        diasOmitidos: hOmitidos1.slice(0, 5),
        totalDias: 35,
        color: "#DB2777",
      },
    ],
    controles: [
      {
        id: "c7",
        fecha: "2026-01-10",
        semanaGestacional: 20,
        peso: 78.5,
        temperatura: 36.8,
        presionSistolica: 135,
        presionDiastolica: 88,
        pulso: 90,
        alturaUterina: 20,
        situacion: "L",
        presentacion: "C",
        posicion: "D",
        fcf: 140,
        movimientoFetal: "+",
        proteinuria: "+",
        edema: "++",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-02-10",
        observaciones: "PA elevada, proteinuria. Vigilancia estricta.",
      },
    ],
    citas: [
      {
        id: "ci7",
        gestanteId: "g3",
        gestanteNombre: "Carmen Palomino Rivas",
        motivo: "Control urgente — post fecha",
        fecha: formatDate(hoy),
        hora: "08:00",
        estado: "programada",
        observaciones: "Embarazo de 41 semanas, alto riesgo",
      },
    ],
  },
  {
    id: "g4",
    nombre: "Yolanda",
    apellidos: "Ccahuana Flores",
    dni: "49102345",
    nroHistoriaClinica: "HC-2025-004",
    fechaNacimiento: "2000-05-18",
    edad: 25,
    direccion: "Calle Grau 120",
    localidad: "Andahuaylas",
    departamento: "Apurímac",
    provincia: "Andahuaylas",
    distrito: "Andahuaylas",
    telefono: "912034876",
    codigoSIS: "SIS-49102345",
    ocupacion: "Docente",
    estudios: "Superior",
    estadoCivil: "Conviviente",
    fum: "2026-01-10",
    fpp: "2026-10-17",
    semanaGestacional: 20,
    trimestre: 2,
    pesoHabitual: 58,
    talla: 160,
    imc: 22.7,
    clasificacionIMC: "Normal",
    grupoSanguineo: "O",
    factorRh: "-",
    riesgo: "amarillo",
    gestaciones: 1,
    partos: 0,
    cesareas: 0,
    abortos: 0,
    obstetrasAsignada: "Lic. Ana Flores",
    laboratorio: {
      hemoglobina1: 11.8,
      hemoglobina2: null,
      hemoglobina3: null,
      vdrl: "No reactivo",
      vih: "Negativo",
      hepatitisB: "Negativo",
      glucemia: "Normal",
      examenOrina: "Normal",
      pap: "Negativo",
      grupoSanguineo: "O",
      factorRh: "-",
    },
    vacunas: [
      { nombre: "DT", aplicada: false, semana: 20 },
      { nombre: "DPT", aplicada: false, semana: 20 },
      { nombre: "COVID-19 (1ra)", aplicada: true, semana: 10 },
      { nombre: "COVID-19 (2da)", aplicada: false, semana: 14 },
      { nombre: "COVID-19 (3ra)", aplicada: false, semana: 30 },
    ],
    suplementos: [
      {
        id: "s7",
        nombre: "Ácido Fólico",
        dosis: "500mg",
        frecuencia: "1 tableta/día",
        horaRecordatorio: "09:00",
        diasTomados: hTomados2,
        diasOmitidos: hOmitidos2,
        totalDias: 40,
        color: "#059669",
      },
      {
        id: "s8",
        nombre: "Sulfato Ferroso + Ácido Fólico",
        dosis: "60mg + 400μg",
        frecuencia: "1 tableta/día",
        horaRecordatorio: "08:00",
        diasTomados: hTomados4.slice(0, 15),
        diasOmitidos: hOmitidos4.slice(0, 3),
        totalDias: 18,
        color: "#7C3AED",
      },
    ],
    controles: [
      {
        id: "c8",
        fecha: "2026-03-01",
        semanaGestacional: 7,
        peso: 58.5,
        temperatura: 36.6,
        presionSistolica: 105,
        presionDiastolica: 65,
        pulso: 78,
        alturaUterina: 7,
        situacion: "L",
        presentacion: "NA",
        posicion: "NA",
        fcf: 160,
        movimientoFetal: "SM",
        proteinuria: "NSH",
        edema: "S/E",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-04-01",
        observaciones: "1er control. Rh negativo — vigilar isoinmunización",
      },
    ],
    citas: [
      {
        id: "ci8",
        gestanteId: "g4",
        gestanteNombre: "Yolanda Ccahuana Flores",
        motivo: "Control prenatal",
        fecha: formatDate(addDays(hoy, 5)),
        hora: "10:00",
        estado: "programada",
        observaciones: "",
      },
    ],
  },
  {
    id: "g5",
    nombre: "Lucía",
    apellidos: "Huamán Quispe",
    dni: "47902341",
    nroHistoriaClinica: "HC-2025-005",
    fechaNacimiento: "1995-09-30",
    edad: 30,
    direccion: "Jr. Junín 340",
    localidad: "Talavera",
    departamento: "Apurímac",
    provincia: "Andahuaylas",
    distrito: "Talavera",
    telefono: "965123089",
    codigoSIS: "SIS-47902341",
    ocupacion: "Enfermera técnica",
    estudios: "Superior",
    estadoCivil: "Casada",
    fum: "2025-11-05",
    fpp: "2026-08-12",
    semanaGestacional: 30,
    trimestre: 3,
    pesoHabitual: 62,
    talla: 163,
    imc: 23.3,
    clasificacionIMC: "Normal",
    grupoSanguineo: "AB",
    factorRh: "+",
    riesgo: "verde",
    gestaciones: 2,
    partos: 1,
    cesareas: 0,
    abortos: 0,
    obstetrasAsignada: "Lic. Ana Flores",
    laboratorio: {
      hemoglobina1: 12.0,
      hemoglobina2: 11.5,
      hemoglobina3: null,
      vdrl: "No reactivo",
      vih: "Negativo",
      hepatitisB: "Negativo",
      glucemia: "Normal",
      examenOrina: "Normal",
      pap: "Negativo",
      grupoSanguineo: "AB",
      factorRh: "+",
    },
    vacunas: [
      { nombre: "DT", aplicada: true, semana: 20 },
      { nombre: "DPT", aplicada: true, semana: 20 },
      { nombre: "COVID-19 (1ra)", aplicada: true, semana: 8 },
      { nombre: "COVID-19 (2da)", aplicada: true, semana: 12 },
      { nombre: "COVID-19 (3ra)", aplicada: true, semana: 28 },
    ],
    suplementos: [
      {
        id: "s9",
        nombre: "Sulfato Ferroso + Ácido Fólico",
        dosis: "60mg + 400μg",
        frecuencia: "1 tableta/día",
        horaRecordatorio: "08:00",
        diasTomados: hTomados1,
        diasOmitidos: hOmitidos1,
        totalDias: 60,
        color: "#7C3AED",
      },
      {
        id: "s10",
        nombre: "Carbonato de Calcio",
        dosis: "500mg",
        frecuencia: "2 tabletas/día",
        horaRecordatorio: "08:00",
        diasTomados: hTomados4,
        diasOmitidos: hOmitidos4,
        totalDias: 30,
        color: "#DB2777",
      },
    ],
    controles: [
      {
        id: "c9",
        fecha: "2026-02-10",
        semanaGestacional: 14,
        peso: 65.0,
        temperatura: 36.7,
        presionSistolica: 112,
        presionDiastolica: 72,
        pulso: 80,
        alturaUterina: 14,
        situacion: "L",
        presentacion: "C",
        posicion: "D",
        fcf: 152,
        movimientoFetal: "+",
        proteinuria: "NSH",
        edema: "S/E",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-03-10",
        observaciones: "Todo normal",
      },
      {
        id: "c10",
        fecha: "2026-04-10",
        semanaGestacional: 22,
        peso: 67.2,
        temperatura: 36.5,
        presionSistolica: 110,
        presionDiastolica: 70,
        pulso: 82,
        alturaUterina: 22,
        situacion: "L",
        presentacion: "C",
        posicion: "D",
        fcf: 148,
        movimientoFetal: "++",
        proteinuria: "NSH",
        edema: "S/E",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-05-10",
        observaciones: "Ecografía morfológica normal",
      },
      {
        id: "c11",
        fecha: "2026-05-15",
        semanaGestacional: 26,
        peso: 69.0,
        temperatura: 36.6,
        presionSistolica: 115,
        presionDiastolica: 73,
        pulso: 84,
        alturaUterina: 26,
        situacion: "L",
        presentacion: "C",
        posicion: "I",
        fcf: 144,
        movimientoFetal: "+++",
        proteinuria: "NSH",
        edema: "S/E",
        responsable: "Lic. Ana Flores",
        proximaCita: "2026-06-15",
        observaciones: "Ganancia de peso adecuada",
      },
    ],
    citas: [
      {
        id: "ci9",
        gestanteId: "g5",
        gestanteNombre: "Lucía Huamán Quispe",
        motivo: "Control prenatal",
        fecha: formatDate(addDays(hoy, 8)),
        hora: "11:00",
        estado: "programada",
        observaciones: "",
      },
      {
        id: "ci10",
        gestanteId: "g5",
        gestanteNombre: "Lucía Huamán Quispe",
        motivo: "Control prenatal",
        fecha: "2026-05-15",
        hora: "11:30",
        estado: "asistida",
        observaciones: "",
      },
    ],
  },
];

export const todasLasCitas: Cita[] = gestantes.flatMap((g) => g.citas);

export const citasDeHoy = todasLasCitas.filter(
  (c) => c.fecha === formatDate(hoy)
);

export const alertasPendientes = [
  {
    id: "a1",
    tipo: "inasistencia",
    gestanteNombre: "Rosa Condori Mamani",
    gestanteId: "g2",
    mensaje: "No asistió al control programado del 20 de mayo",
    fecha: "2026-05-20",
    nivel: "amarillo" as RiesgoNivel,
  },
  {
    id: "a2",
    tipo: "baja_adherencia",
    gestanteNombre: "Rosa Condori Mamani",
    gestanteId: "g2",
    mensaje: "Adherencia a Sulfato Ferroso por debajo del 50%",
    fecha: formatDate(hoy),
    nivel: "rojo" as RiesgoNivel,
  },
  {
    id: "a3",
    tipo: "alto_riesgo",
    gestanteNombre: "Carmen Palomino Rivas",
    gestanteId: "g3",
    mensaje: "41 semanas de gestación. Embarazo postérmino — acción inmediata requerida",
    fecha: formatDate(hoy),
    nivel: "rojo" as RiesgoNivel,
  },
  {
    id: "a4",
    tipo: "vacuna",
    gestanteNombre: "Yolanda Ccahuana Flores",
    gestanteId: "g4",
    mensaje: "Vacuna DT pendiente — ya se encuentra en semana 20",
    fecha: formatDate(hoy),
    nivel: "amarillo" as RiesgoNivel,
  },
];

export const contenidoEducativo = {
  trimestre1: [
    {
      titulo: "Importancia del Ácido Fólico",
      icono: "Pill",
      descripcion:
        "El ácido fólico previene defectos del tubo neural. Toma 500mg diariamente desde el inicio hasta la semana 14.",
    },
    {
      titulo: "Primeros síntomas del embarazo",
      icono: "Heart",
      descripcion:
        "Náuseas, fatiga y sensibilidad en los senos son normales. Consulta si hay sangrado o dolor intenso.",
    },
    {
      titulo: "Primera ecografía (Semana 13)",
      icono: "Scan",
      descripcion:
        "La ecografía genética del 1er trimestre detecta posibles anomalías cromosómicas y confirma la edad gestacional.",
    },
    {
      titulo: "Alimentación en el 1er trimestre",
      icono: "Apple",
      descripcion:
        "Consume frutas, verduras, proteínas y cereales integrales. Evita el alcohol, tabaco y alimentos crudos.",
    },
  ],
  trimestre2: [
    {
      titulo: "Inicio del Sulfato Ferroso (Semana 14+)",
      icono: "Pill",
      descripcion:
        "A partir de la semana 14 inicia Sulfato Ferroso + Ácido Fólico. Tómalo con jugo de naranja para mejor absorción. Evita tomarlo con leche.",
    },
    {
      titulo: "Carbonato de Calcio (Semana 20+)",
      icono: "Pill",
      descripcion:
        "Desde la semana 20 inicia el calcio: 2 tabletas de 500mg al día. Fortalece los huesos de tu bebé y previene la preeclampsia.",
    },
    {
      titulo: "Ecografía Morfológica (Semana 22)",
      icono: "Scan",
      descripcion:
        "La ecografía morfológica evalúa el desarrollo de los órganos del bebé y confirma el sexo si lo deseas.",
    },
    {
      titulo: "Movimientos fetales",
      icono: "Baby",
      descripcion:
        "A partir de la semana 20 deberías sentir movimientos fetales. Si tu bebé no se mueve en más de 12 horas, acude al centro de salud.",
    },
  ],
  trimestre3: [
    {
      titulo: "Ecografía Bienestar Fetal (Semana 35)",
      icono: "Scan",
      descripcion:
        "Evalúa el bienestar del bebé, líquido amniótico, posición y preparación para el parto.",
    },
    {
      titulo: "Plan de Parto",
      icono: "ClipboardList",
      descripcion:
        "Prepara tu plan de parto: ¿Quién te acompañará? ¿Qué llevarás? ¿Cómo llegarás al centro de salud? Comunícalo a tu obstetra.",
    },
    {
      titulo: "Psicoprofilaxis",
      icono: "Wind",
      descripcion:
        "Aprende técnicas de respiración y relajación para el trabajo de parto. Consulta con tu obstetra.",
    },
    {
      titulo: "Lactancia Materna",
      icono: "Heart",
      descripcion:
        "La leche materna es el mejor alimento para tu bebé en los primeros 6 meses. Pide orientación sobre posiciones y técnica.",
    },
  ],
};

export const signosAlarmaEmbarazo = [
  { icono: "Frown", texto: "Vómitos frecuentes e intensos" },
  { icono: "Thermometer", texto: "Dolor de cabeza fuerte, fiebre o calentura" },
  { icono: "Activity", texto: "Pies, manos o cara hinchada" },
  { icono: "Droplets", texto: "Pérdida de sangre por sus partes" },
  { icono: "Droplet", texto: "Pérdida de líquido por sus partes" },
  { icono: "Baby", texto: "La guagua (bebé) no se mueve" },
  { icono: "Zap", texto: "Dolores antes de la fecha de parto" },
  { icono: "Eye", texto: "Visión borrosa o manchas en los ojos" },
];

export const signosAlarmaParto = [
  { icono: "Droplet", texto: "Pérdida de líquido por más de 6 horas (antes de tiempo)" },
  { icono: "Baby", texto: "El niño viene de pies o atravesado" },
  { icono: "Users", texto: "Son gemelos o mellizos" },
  { icono: "Droplets", texto: "Hemorragia vaginal abundante" },
  { icono: "AlertCircle", texto: "Salida del cordón por la vagina" },
  { icono: "Clock", texto: "La placenta no sale por más de 30 minutos" },
];

export const signosAlarmaPostparto = [
  { icono: "Droplets", texto: "Sangrado vaginal abundante" },
  { icono: "Thermometer", texto: "Fiebre, escalofríos y mal olor" },
  { icono: "Activity", texto: "Hinchazón y dolor de manos" },
  { icono: "AlertCircle", texto: "La placenta no salió completa" },
];

export const signosAlarmaRN = [
  { icono: "Baby", texto: "No quiere mamar" },
  { icono: "AlertTriangle", texto: "Bajo peso al nacer" },
  { icono: "HeartPulse", texto: "Pálido o morado" },
  { icono: "AlertCircle", texto: "Flácido y sin tono muscular" },
];

export const usuarios: Usuario[] = [
  { id: "u1", nombre: "María Quispe Huanca", dni: "47283910", rol: "gestante", telefono: "921345678", activo: true },
  { id: "u2", nombre: "Rosa Condori Mamani", dni: "48102938", rol: "gestante", telefono: "934512076", activo: true },
  { id: "u3", nombre: "Carmen Palomino Rivas", dni: "47651234", rol: "gestante", telefono: "958234017", activo: true },
  { id: "u4", nombre: "Yolanda Ccahuana Flores", dni: "49102345", rol: "gestante", telefono: "912034876", activo: true },
  { id: "u5", nombre: "Lucía Huamán Quispe", dni: "47902341", rol: "gestante", telefono: "965123089", activo: true },
  { id: "u6", nombre: "Ana Flores Vargas", dni: "45231890", rol: "obstetra", telefono: "945678012", activo: true },
  { id: "u7", nombre: "Carlos Mendoza López", dni: "44012345", rol: "admin", telefono: "922345678", activo: true },
];
