import { prisma } from '../../config/database.js';

export const getAdherenceStats = async (gestanteId?: string, treatmentId?: string) => {
  const whereClause: any = {};
  if (gestanteId) whereClause.gestanteId = gestanteId;
  if (treatmentId) whereClause.treatmentId = treatmentId;

  const totalLogs = await prisma.supplementLog.count({
    where: whereClause,
  });

  const takenLogs = await prisma.supplementLog.count({
    where: {
      ...whereClause,
      tomado: true,
    },
  });

  const adherencePercentage = totalLogs > 0 ? (takenLogs / totalLogs) * 100 : 0;

  return {
    totalLogs,
    takenLogs,
    adherencePercentage: Number(adherencePercentage.toFixed(2)),
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
    let totalLogs = 0;
    let takenLogs = 0;
    g.treatments.forEach(t => {
      totalLogs += t.supplementLogs.length;
      takenLogs += t.supplementLogs.filter(l => l.tomado).length;
    });
    const pct = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 100;
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
  };
};
