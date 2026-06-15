import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';

export async function getEducationalContentForGestante(userId: string) {
  const gestante = await prisma.gestante.findUnique({
    where: { userId }
  });

  if (!gestante) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante profile not found');
  }

  let currentTrimester = 1;
  const referenceDate = gestante.fppEco || gestante.fppFum;
  
  if (referenceDate) {
    const today = new Date();
    // fpp is the 40th week
    const diffTime = referenceDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Days elapsed = 280 - diffDays
    const daysElapsed = 280 - diffDays;
    const currentWeek = Math.floor(daysElapsed / 7);

    if (currentWeek >= 28) {
      currentTrimester = 3;
    } else if (currentWeek >= 14) {
      currentTrimester = 2;
    } else {
      currentTrimester = 1;
    }
    
    // Safety bounds
    if (currentTrimester < 1) currentTrimester = 1;
    if (currentTrimester > 3) currentTrimester = 3;
  }

  const contents = await prisma.educationalContent.findMany({
    where: {
      activo: true,
      OR: [
        { trimestre: currentTrimester },
        { trimestre: null }
      ]
    },
    orderBy: {
      orden: 'asc'
    }
  });

  return { currentTrimester, contents };
}

/** Devuelve todo el contenido activo, ordenado, para recomendación por el obstetra. */
export async function getActiveContentCatalog() {
  return prisma.educationalContent.findMany({
    where: { activo: true },
    orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
  });
}

/** Incrementa el contador de vistas de un contenido (cuando una gestante lo abre). */
export async function registerContentView(contentId: string) {
  const exists = await prisma.educationalContent.findUnique({ where: { id: contentId } });
  if (!exists) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Contenido educativo no encontrado');
  }
  const updated = await prisma.educationalContent.update({
    where: { id: contentId },
    data: { viewsCount: { increment: 1 } },
    select: { id: true, viewsCount: true },
  });
  return updated;
}
