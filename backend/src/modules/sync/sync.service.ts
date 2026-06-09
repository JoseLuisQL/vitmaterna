import { prisma } from '../../config/database.js';

export const pullChanges = async (lastPulledAt: number, obstetraId?: string) => {
  const lastPulledDate = new Date(lastPulledAt);
  const isFirstPull = lastPulledAt === 0;

  // We fetch records updated after lastPulledDate
  // If no updatedAt field exists, we use createdAt
  const updatedWhere = { updatedAt: { gt: lastPulledDate } };
  const createdWhere = { createdAt: { gt: lastPulledDate } };
  
  // We don't have a reliable way to get purely deleted records without a tombstone table,
  // but for tables with deletedAt, we can return them if deletedAt > lastPulledDate.
  const softDeletedWhere = { deletedAt: { gt: lastPulledDate } };

  // 1. Gestantes
  const allGestantes = await prisma.gestante.findMany({
    where: { updatedAt: { gt: lastPulledDate } },
  });

  // 2. Antecedentes
  const allAntecedentes = await prisma.antecedente.findMany({
    where: { createdAt: { gt: lastPulledDate } },
  });

  // 3. Appointments
  const allAppointments = await prisma.appointment.findMany({
    where: { updatedAt: { gt: lastPulledDate } },
  });

  // 4. Treatments
  const allTreatments = await prisma.treatment.findMany({
    where: { updatedAt: { gt: lastPulledDate } },
  });

  // 5. SupplementLogs
  const allSupplementLogs = await prisma.supplementLog.findMany({
    where: { createdAt: { gt: lastPulledDate } },
  });

  // 6. PrenatalControls
  const allPrenatalControls = await prisma.prenatalControl.findMany({
    where: { updatedAt: { gt: lastPulledDate } },
  });

  // Helper to categorize records into created/updated/deleted
  const categorize = (records: any[], hasUpdatedAt = true) => {
    const created: any[] = [];
    const updated: any[] = [];
    const deleted: string[] = [];

    records.forEach((record) => {
      if (record.deletedAt && record.deletedAt > lastPulledDate) {
        deleted.push(record.id);
      } else if (isFirstPull) {
        created.push(record);
      } else if (record.createdAt > lastPulledDate) {
        created.push(record);
      } else if (hasUpdatedAt && record.updatedAt > lastPulledDate) {
        updated.push(record);
      }
    });

    return { created, updated, deleted };
  };

  return {
    gestantes: categorize(allGestantes),
    antecedentes: categorize(allAntecedentes, false),
    appointments: categorize(allAppointments),
    treatments: categorize(allTreatments),
    supplement_logs: categorize(allSupplementLogs, false),
    prenatal_controls: categorize(allPrenatalControls),
  };
};

export const pushChanges = async (changes: any, userId: string) => {
  await prisma.$transaction(async (tx: any) => {
    for (const [tableName, tableChanges] of Object.entries(changes)) {
      const { created, updated, deleted } = tableChanges as {
        created: any[];
        updated: any[];
        deleted: string[];
      };

      // Ensure we map table name to prisma model
      const modelName = getPrismaModelName(tableName);
      if (!modelName) continue;

      const model = (tx as any)[modelName];
      
      // Handle Creates
      for (const record of created) {
        const data = cleanData(record);
        await model.create({ data });
      }

      // Handle Updates
      for (const record of updated) {
        const data = cleanData(record);
        if (data.id) {
          await model.update({
            where: { id: data.id },
            data,
          });
        }
      }

      // Handle Deletes
      for (const id of deleted) {
        // Some models have deletedAt, others are hard deleted
        try {
          if (['gestante', 'appointment'].includes(modelName)) {
            await model.update({
              where: { id },
              data: { deletedAt: new Date() },
            });
          } else {
            await model.delete({
              where: { id },
            });
          }
        } catch (e) {
          // Ignore if already deleted
        }
      }
    }
  });
};

function getPrismaModelName(tableName: string): string | null {
  const map: Record<string, string> = {
    gestantes: 'gestante',
    antecedentes: 'antecedente',
    appointments: 'appointment',
    treatments: 'treatment',
    supplement_logs: 'supplementLog',
    prenatal_controls: 'prenatalControl',
  };
  return map[tableName] || null;
}

function cleanData(record: any) {
  // Removes watermelondb specific fields if necessary
  const data = { ...record };
  delete data._status;
  delete data._changed;
  
  // Ensure date fields are Date objects if they are strings/numbers
  for (const [key, value] of Object.entries(data)) {
    // Basic heuristic: if it looks like a date field
    if (
      value &&
      typeof value === 'number' &&
      (key.endsWith('At') || key.startsWith('fecha') || key === 'hora')
    ) {
      data[key] = new Date(value);
    }
  }

  return data;
}
