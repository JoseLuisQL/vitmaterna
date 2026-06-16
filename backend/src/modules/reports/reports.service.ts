import { prisma } from '../../config/database.js';
import { calcularAdherencia } from '../../utils/adherence.js';

export const getAdherenceStats = async (
  gestanteId?: string,
  treatmentId?: string,
  userContext?: { userId: string; role: string },
) => {
  // Si quien consulta es una gestante, se resuelve SU id para mostrar solo
  // su propia adherencia (no la de todas).
  let resolvedGestanteId = gestanteId;
  if (!resolvedGestanteId && userContext?.role === 'gestante') {
    const g = await prisma.gestante.findUnique({
      where: { userId: userContext.userId },
      select: { id: true },
    });
    resolvedGestanteId = g?.id;
  }

  const whereClause: any = {};
  if (resolvedGestanteId) whereClause.gestanteId = resolvedGestanteId;
  if (treatmentId) whereClause.treatmentId = treatmentId;

  const totalLogs = await prisma.supplementLog.count({ where: whereClause });
  const takenLogs = await prisma.supplementLog.count({
    where: { ...whereClause, tomado: true },
  });

  // Fórmula ÚNICA: adherencia por tratamiento (días tomados ÷ días esperados),
  // promediada si hay varios tratamientos del alcance solicitado.
  const treatments = await prisma.treatment.findMany({
    where: {
      ...(resolvedGestanteId ? { gestanteId: resolvedGestanteId } : {}),
      ...(treatmentId ? { id: treatmentId } : {}),
    },
    include: { supplementLogs: true },
  });
  const pcts = treatments.map((t) =>
    calcularAdherencia({
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
      duracionDias: t.duracionDias,
      logs: t.supplementLogs,
    }).porcentaje,
  );
  const adherencePercentage = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;

  // Historial de los últimos 7 días (para la gráfica de "Mi Progreso").
  const history: { date: string; taken: number; total: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const next = new Date(d);
    next.setUTCDate(next.getUTCDate() + 1);

    const dayWhere = { ...whereClause, fecha: { gte: d, lt: next } };
    const total = await prisma.supplementLog.count({ where: dayWhere });
    const taken = await prisma.supplementLog.count({ where: { ...dayWhere, tomado: true } });
    history.push({ date: d.toISOString().split('T')[0], taken, total });
  }

  return {
    // Campos que consume el frontend (Mi Progreso) + compatibilidad anterior.
    adherencePercentage: Number(adherencePercentage.toFixed(2)),
    totalSupplements: totalLogs,
    takenSupplements: takenLogs,
    totalLogs,
    takenLogs,
    history,
  };
};

export const getAttendanceStats = async (filters: { gestanteId?: string; obstetraId?: string; startDate?: string; endDate?: string }) => {
  const { gestanteId, obstetraId, startDate, endDate } = filters;
  const whereClause: any = {};
  
  if (gestanteId) whereClause.gestanteId = gestanteId;
  if (obstetraId) whereClause.obstetraId = obstetraId;
  
  if (startDate || endDate) {
    whereClause.fecha = {};
    if (startDate) whereClause.fecha.gte = new Date(startDate);
    if (endDate) whereClause.fecha.lte = new Date(endDate);
  }

  const grouped = await prisma.appointment.groupBy({
    by: ['estado'],
    where: whereClause,
    _count: {
      id: true,
    },
  });

  const total = grouped.reduce((acc: number, curr: any) => acc + curr._count.id, 0);

  const stats = grouped.map((item: any) => ({
    estado: item.estado,
    count: item._count.id,
    percentage: total > 0 ? Number(((item._count.id / total) * 100).toFixed(2)) : 0,
  }));

  return {
    total,
    stats,
  };
};

export const getClinicReport = async () => {
  const totalGestantes = await prisma.gestante.count({
    where: { estado: 'activa' },
  });

  const enAltoRiesgo = await prisma.gestante.count({
    where: { estado: 'activa', nivelRiesgo: 'rojo' },
  });

  const alertasActivas = await prisma.dangerSign.count({
    where: { estado: 'pendiente' },
  });

  // Visitas domiciliarias registradas (total y del mes en curso).
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const visitasDomiciliariasTotal = await prisma.homeVisit.count();
  const visitasDomiciliariasMes = await prisma.homeVisit.count({
    where: { fecha: { gte: inicioMes } },
  });

  const gestantesWithControls = await prisma.gestante.findMany({
    where: { estado: 'activa' },
    include: {
      _count: {
        select: { prenatalControls: true },
      },
    },
  });

  const con6Controles = gestantesWithControls.filter(g => g._count.prenatalControls >= 6).length;
  const con8Controles = gestantesWithControls.filter(g => g._count.prenatalControls >= 8).length;

  const allGestantes = await prisma.gestante.findMany({
    where: { estado: 'activa' },
    include: {
      user: { select: { firstName: true, lastName: true } },
      treatments: {
        include: {
          supplementLogs: true,
        },
      },
    },
  });

  const gestanteAdherences = allGestantes.map(g => {
    // Fórmula ÚNICA: adherencia por tratamiento y se promedia por gestante.
    const pcts = g.treatments.map(t =>
      calcularAdherencia({
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin,
        duracionDias: t.duracionDias,
        logs: t.supplementLogs,
      }).porcentaje,
    );
    const pct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 100;
    return {
      nombre: `${g.user.firstName} ${g.user.lastName}`,
      pct,
      riesgo: g.nivelRiesgo,
      firstControlDate: g.createdAt,
    };
  });

  const activeAdherences = gestanteAdherences.filter(g => g.pct !== undefined);
  const averageAdherence = activeAdherences.length > 0
    ? Math.round(activeAdherences.reduce((sum, current) => sum + current.pct, 0) / activeAdherences.length)
    : 100;

  const gestantesMenorAdherencia = [...gestanteAdherences]
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)
    .map(g => ({ nombre: g.nombre, pct: g.pct, riesgo: g.riesgo }));

  // KPIs MINSA
  // 1. Gestantes con 6+ controles (meta: 80)
  const pctCon6 = totalGestantes > 0 ? Math.round((con6Controles / totalGestantes) * 100) : 0;
  // 2. Inicio en 1° trimestre (meta: 70)
  const inFirstTrimesterCount = allGestantes.filter(g => {
    if (!g.fum) return false;
    const diffTime = Math.abs(g.createdAt.getTime() - g.fum.getTime());
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks <= 13;
  }).length;
  const pct1stTrimester = totalGestantes > 0 ? Math.round((inFirstTrimesterCount / totalGestantes) * 100) : 0;
  // 3. Adherencia 80%+ a suplementos (meta: 75)
  const adherence80Count = gestanteAdherences.filter(g => g.pct >= 80).length;
  const pctAdherence80 = totalGestantes > 0 ? Math.round((adherence80Count / totalGestantes) * 100) : 0;
  // 4. Gestantes con 8+ controles (meta: 60)
  const pctCon8 = totalGestantes > 0 ? Math.round((con8Controles / totalGestantes) * 100) : 0;

  const kpisMinsa = [
    { label: 'Gestantes con 6+ controles', pct: pctCon6, meta: 80 },
    { label: 'Inicio en 1° trimestre', pct: pct1stTrimester, meta: 70 },
    { label: 'Adherencia 80%+ a suplementos', pct: pctAdherence80, meta: 75 },
    { label: 'Gestantes con 8+ controles', pct: pctCon8, meta: 60 },
  ];

  // Risk distribution
  const greenCount = await prisma.gestante.count({ where: { estado: 'activa', nivelRiesgo: 'verde' } });
  const yellowCount = await prisma.gestante.count({ where: { estado: 'activa', nivelRiesgo: 'amarillo' } });
  const redCount = await prisma.gestante.count({ where: { estado: 'activa', nivelRiesgo: 'rojo' } });

  const riskDistribution = [
    { name: 'Sin riesgo', population: greenCount, color: '#10B981', legendFontColor: '#64748B', legendFontSize: 13 },
    { name: 'Moderado', population: yellowCount, color: '#F59E0B', legendFontColor: '#64748B', legendFontSize: 13 },
    { name: 'Alto riesgo', population: redCount, color: '#EF4444', legendFontColor: '#64748B', legendFontSize: 13 },
  ];

  // Attendance stats for the last 6 months
  const attendanceStats = [];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    const attended = await prisma.appointment.count({
      where: {
        fecha: { gte: monthStart, lte: monthEnd },
        estado: 'asistida',
      },
    });

    const missed = await prisma.appointment.count({
      where: {
        fecha: { gte: monthStart, lte: monthEnd },
        estado: 'no_asistida',
      },
    });

    attendanceStats.push({
      month: monthNames[d.getMonth()],
      attended,
      missed,
    });
  }

  return {
    totalGestantes,
    averageAdherence,
    alertasActivas,
    con6Controles,
    enAltoRiesgo,
    gestantesMenorAdherencia,
    kpisMinsa,
    attendanceStats,
    riskDistribution,
    visitasDomiciliariasTotal,
    visitasDomiciliariasMes,
  };
};
