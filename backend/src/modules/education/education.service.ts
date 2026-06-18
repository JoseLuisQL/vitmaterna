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

  // 1) Contenido por trimestre (feed general "Para ti" / "Biblioteca").
  const trimesterContents = await prisma.educationalContent.findMany({
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

  // 2) Contenido RECOMENDADO/asignado por la obstetra a ESTA gestante.
  //    Aparece siempre (sin importar el trimestre) para que pueda estudiarlo
  //    en cualquier momento. Se marca con `recomendado: true` + la nota.
  const recommendations = await prisma.recommendedContent.findMany({
    where: { gestanteId: gestante.id, content: { activo: true } },
    orderBy: { createdAt: 'desc' },
    include: { content: true },
  });

  const recommendedMeta = recommendations.map((r) => ({
    ...r.content,
    recomendado: true,
    recomendadoNota: r.nota,
    recomendadoEn: r.createdAt,
    recomendadoLeido: r.leido,
  }));
  const recommendedIds = new Set(recommendedMeta.map((c) => c.id));

  // Une ambas listas evitando duplicados: los recomendados primero, luego el
  // resto del feed por trimestre que no esté ya recomendado.
  const restantes = trimesterContents
    .filter((c) => !recommendedIds.has(c.id))
    .map((c) => ({ ...c, recomendado: false }));

  const contents = [...recommendedMeta, ...restantes];

  return { currentTrimester, contents, recommendedCount: recommendedMeta.length };
}

/** Marca como leída una recomendación de contenido (cuando la gestante la abre). */
export async function markRecommendationRead(userId: string, contentId: string) {
  const gestante = await prisma.gestante.findUnique({ where: { userId } });
  if (!gestante) return;
  await prisma.recommendedContent.updateMany({
    where: { gestanteId: gestante.id, contentId, leido: false },
    data: { leido: true, leidoAt: new Date() },
  });
}

/** Devuelve todo el contenido activo, ordenado, para recomendación por el obstetra. */
export async function getActiveContentCatalog() {
  return prisma.educationalContent.findMany({
    where: { activo: true },
    orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
  });
}

/** Devuelve un contenido educativo por id, sin filtrar por trimestre. */
export async function getContentById(contentId: string) {
  const content = await prisma.educationalContent.findUnique({ where: { id: contentId } });
  if (!content) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Contenido educativo no encontrado');
  }
  return content;
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
