import { Request, Response, NextFunction } from 'express';
import * as chatService from './chat.service.js';

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params;
    const { page, limit } = req.query;
    
    // Using explicit typing based on our auth middleware which sets req.user
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const result = await chatService.getConversationHistory(
      userId,
      userRole,
      conversationId as string,
      Number(page),
      Number(limit)
    );

    res.json({
      success: true,
      data: result.messages,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};
