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
