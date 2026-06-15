import { Request, Response, NextFunction } from 'express';
import * as chatService from './chat.service.js';

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params;
    const { page, limit } = req.query;

    // Defaults seguros: en Express 5 req.query es de solo lectura y los
    // valores por defecto del esquema no siempre persisten, por lo que se
    // aplican aquí para evitar page/limit NaN.
    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;

    // Using explicit typing based on our auth middleware which sets req.user
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const result = await chatService.getConversationHistory(
      userId,
      userRole,
      conversationId as string,
      pageNum,
      limitNum
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

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { base64, mimeType } = req.body;
    const mediaUrl = await chatService.saveChatImage(base64, mimeType);
    res.status(201).json({ success: true, data: { mediaUrl } });
  } catch (error) {
    next(error);
  }
};

export const recommendContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { gestanteId, contentId, nota } = req.body;
    const data = await chatService.recommendContent(userId, gestanteId, contentId, nota);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const sendBroadcast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { contenido, trimestre, nivelRiesgo } = req.body;

    const data = await chatService.sendBroadcast(userId, contenido, { trimestre, nivelRiesgo });
    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
