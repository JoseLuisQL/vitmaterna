import type { Request, Response } from 'express';
import { successResponse } from '../../utils/responseHelper.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import * as authService from './auth.service.js';
import type { LoginInput, RegisterInput, RefreshInput, UpdateProfileInput } from './auth.schema.js';
import { prisma } from '../../config/database.js';

/**
 * POST /v1/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;

  const user = await authService.createUser(input);
  const sanitized = authService.sanitizeUser(user);

  // Auto-login after registration
  const { refreshToken } = await authService.createSession(
    user.id,
    undefined,
    req.ip ?? undefined,
  );

  const accessToken = authService.generateAccessToken({
    id: user.id,
    dni: user.dni,
    role: user.role,
  });

  res.status(201).json(
    successResponse({
      user: sanitized,
      accessToken,
      refreshToken,
    }),
  );
}

/**
 * POST /v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { dni, password, deviceInfo } = req.body as LoginInput;

  // Find user
  const user = await authService.findUserByDni(dni);
  if (!user) {
    throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Account is deactivated. Contact an administrator.');
  }

  // Check if account is locked
  if (authService.isAccountLocked(user)) {
    throw new AppError(
      423,
      ErrorCodes.ACCOUNT_LOCKED,
      'Account is temporarily locked due to multiple failed login attempts. Try again later.',
    );
  }

  // Verify password
  const isValid = await authService.comparePassword(password, user.passwordHash);
  if (!isValid) {
    await authService.handleFailedLogin(user);
    throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  // Reset failed attempts on successful login
  await authService.resetFailedAttempts(user.id);

  // Create session
  const { refreshToken } = await authService.createSession(
    user.id,
    deviceInfo as Record<string, unknown> | undefined,
    req.ip ?? undefined,
  );

  // Generate access token
  const accessToken = authService.generateAccessToken({
    id: user.id,
    dni: user.dni,
    role: user.role,
  });

  const sanitized = authService.sanitizeUser(user);

  res.json(
    successResponse({
      user: sanitized,
      accessToken,
      refreshToken,
    }),
  );
}

/**
 * POST /v1/auth/refresh
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshInput;

  // Verify the refresh token signature
  const decoded = authService.verifyRefreshToken(refreshToken);

  // Find the session
  const session = await authService.findSessionByToken(refreshToken);
  if (!session) {
    throw new AppError(401, ErrorCodes.INVALID_TOKEN, 'Invalid or expired refresh token');
  }

  // Find the user
  const user = await authService.findUserById(decoded.userId);
  if (!user || !user.isActive) {
    await authService.revokeSession(session.id);
    throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'User account not found or deactivated');
  }

  // Revoke old session
  await authService.revokeSession(session.id);

  // Create new session (token rotation)
  const { refreshToken: newRefreshToken } = await authService.createSession(
    user.id,
    session.deviceInfo as Record<string, unknown> | undefined,
    req.ip ?? undefined,
  );

  // Generate new access token
  const accessToken = authService.generateAccessToken({
    id: user.id,
    dni: user.dni,
    role: user.role,
  });

  res.json(
    successResponse({
      accessToken,
      refreshToken: newRefreshToken,
    }),
  );
}

/**
 * POST /v1/auth/logout
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (refreshToken) {
    const session = await authService.findSessionByToken(refreshToken);
    if (session) {
      await authService.revokeSession(session.id);
    }
  }

  res.json(successResponse({ message: 'Logged out successfully' }));
}

/**
 * GET /v1/auth/me
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const user = await authService.findUserById(userId);
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
  }

  const sanitized = authService.sanitizeUser(user);

  // Fetch role-specific profile
  let profile: unknown = null;
  if (user.role === 'gestante') {
    profile = await prisma.gestante.findUnique({ where: { userId } });
  } else if (user.role === 'obstetra') {
    profile = await prisma.obstetra.findUnique({ where: { userId } });
  }

  res.json(
    successResponse({
      user: sanitized,
      profile,
    }),
  );
}

/**
 * PATCH /v1/auth/me
 */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const input = req.body as UpdateProfileInput;

  const updated = await authService.updateUserProfile(userId, input);
  const sanitized = authService.sanitizeUser(updated);

  res.json(successResponse({ user: sanitized }));
}

/**
 * POST /v1/auth/forgot-password
 * In a real implementation, this would send an SMS/WhatsApp with a reset code.
 * For now, it acknowledges the request without exposing whether the DNI exists.
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { dni } = req.body as { dni: string };

  // Look up the user (but always return the same response)
  const user = await authService.findUserByDni(dni);

  if (user && user.phone) {
    // In production: send reset code via SMS/WhatsApp
    // For now, log it for development
    console.log(`[DEV] Password reset requested for DNI ${dni}`);
  }

  // Always return success to prevent DNI enumeration
  res.json(
    successResponse({
      message: 'If the DNI is registered, you will receive a reset code on your registered phone number.',
    }),
  );
}

/**
 * POST /v1/auth/reset-password
 * Placeholder – in production, verify the reset token sent via SMS.
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = req.body as { token: string; newPassword: string };

  // In production: verify the reset token from SMS
  // For MVP, we use a simple token-based flow
  // This is a placeholder that will be enhanced with real SMS verification
  void token;
  void newPassword;

  throw new AppError(
    501,
    'NOT_IMPLEMENTED',
    'Password reset via SMS is not yet implemented. Contact an administrator.',
  );
}
