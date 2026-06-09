import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';

export const getConversationHistory = async (
  userId: string,
  userRole: string,
  conversationId: string,
  page: number,
  limit: number
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Conversation not found');
  }

  // Check access
  let hasAccess = false;
  if (userRole === 'admin') {
    hasAccess = true;
  } else if (userRole === 'gestante') {
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    if (gestante && gestante.id === conversation.gestanteId) hasAccess = true;
  } else if (userRole === 'obstetra') {
    const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
    if (obstetra && obstetra.id === conversation.obstetraId) hasAccess = true;
  }

  if (!hasAccess) {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Not authorized to view this conversation');
  }

  const skip = (page - 1) * limit;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  const total = await prisma.message.count({ where: { conversationId } });

  return {
    messages,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
