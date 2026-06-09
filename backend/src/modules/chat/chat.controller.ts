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

export const getConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { targetId } = req.query;

    const conversation = await chatService.getOrCreateConversation(
      userId,
      userRole,
      targetId as string | undefined
    );

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const conversations = await chatService.listConversations(userId, userRole);
    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const sendEmergencyAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { latitude, longitude } = req.body;

    const data = await chatService.sendEmergencyAlert(userId, latitude, longitude);
    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
