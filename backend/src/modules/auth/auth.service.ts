import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import type { AccessTokenPayload, RefreshTokenPayload, UserRole } from '../../types/index.js';
import type { User, UserSession } from '@prisma/client';
import type { RegisterInput, UpdateProfileInput } from './auth.schema.js';

const MAX_FAILED_ATTEMPTS = 5;
// RF-1.08: bloqueo de 15 minutos tras 5 intentos fallidos.
const LOCK_DURATION_MINUTES = 15;

// ============================================
// Password Utilities
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================
// Token Generation
// ============================================

export function generateAccessToken(user: { id: string; dni: string; role: UserRole }): string {
  const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
    userId: user.id,
    dni: user.dni,
    role: user.role,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as StringValue,
  });
}

export function generateRefreshToken(userId: string, sessionId: string): string {
  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    userId,
    sessionId,
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as StringValue,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, ErrorCodes.TOKEN_EXPIRED, 'Refresh token has expired');
    }
    throw new AppError(401, ErrorCodes.INVALID_TOKEN, 'Invalid refresh token');
  }
}

// ============================================
// Session Management
// ============================================

function parseRefreshExpiry(): Date {
  const expiresIn = env.JWT_REFRESH_EXPIRES_IN;
  const now = new Date();

  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    // Default to 30 days
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return new Date(now.getTime() + value * 1000);
    case 'm': return new Date(now.getTime() + value * 60 * 1000);
    case 'h': return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd': return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}

export async function createSession(
  userId: string,
  deviceInfo?: Record<string, unknown>,
  ipAddress?: string,
): Promise<{ session: UserSession; refreshToken: string }> {
  const expiresAt = parseRefreshExpiry();

  const session = await prisma.userSession.create({
    data: {
      userId,
      refreshToken: '', // Will be updated after token generation
      deviceInfo: deviceInfo as Record<string, string> | undefined,
      ipAddress: ipAddress ?? null,
      expiresAt,
    },
  });

  const refreshToken = generateRefreshToken(userId, session.id);

  // Update session with actual token
  const updatedSession = await prisma.userSession.update({
    where: { id: session.id },
    data: { refreshToken },
  });

  return { session: updatedSession, refreshToken };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.userSession.delete({
    where: { id: sessionId },
  }).catch(() => {
    // Session may already be deleted
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.userSession.deleteMany({
    where: { userId },
  });
}

export async function findSessionByToken(refreshToken: string): Promise<UserSession | null> {
  return prisma.userSession.findFirst({
    where: {
      refreshToken,
      expiresAt: { gt: new Date() },
    },
  });
}

// ============================================
// User Queries
// ============================================

export async function findUserByDni(dni: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      dni,
      deletedAt: null,
    },
  });
}

export async function findUserById(userId: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
  });
}

// ============================================
// User Creation
// ============================================

export async function createUser(
  input: RegisterInput,
): Promise<User> {
  const existingUser = await findUserByDni(input.dni);
  if (existingUser) {
    if (existingUser.role === 'gestante') {
      const isUnclaimed = await comparePassword(input.dni, existingUser.passwordHash);
      if (isUnclaimed) {
        const newPasswordHash = await hashPassword(input.password);
        return prisma.$transaction(async (tx) => {
          const updatedUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash: newPasswordHash,
              firstName: input.firstName,
              lastName: input.lastName,
              phone: input.phone ?? existingUser.phone,
              email: input.email ?? existingUser.email,
              consentAccepted: input.consentAccepted,
              consentDate: new Date(),
              isActive: true,
              isVerified: true,
            },
          });

          // Check if Gestante profile exists, if not create it
          const gestanteProfile = await tx.gestante.findUnique({
            where: { userId: updatedUser.id },
          });
          if (!gestanteProfile) {
            await tx.gestante.create({
              data: {
                userId: updatedUser.id,
                fechaNacimiento: new Date('1990-01-01'),
                nivelRiesgo: 'verde',
                estado: 'activa',
              },
            });
          }
          return updatedUser;
        });
      }
    }
    throw new AppError(409, ErrorCodes.CONFLICT, 'Ya existe un usuario registrado con este DNI');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        dni: input.dni,
        passwordHash,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        email: input.email ?? null,
        consentAccepted: input.consentAccepted,
        consentDate: new Date(),
        // Todo auto-registro (gestante u obstetra) queda pendiente de aprobación
        // del administrador. Las gestantes creadas por el obstetra ya quedan
        // verificadas al ser dadas de alta en el sistema (ver patient.service).
        isVerified: false,
      },
    });

    // Create role-specific profile
    if (input.role === 'obstetra' && input.cop) {
      await tx.obstetra.create({
        data: {
          userId: newUser.id,
          cop: input.cop,
        },
      });
    } else if (input.role === 'gestante') {
      await tx.gestante.create({
        data: {
          userId: newUser.id,
          fechaNacimiento: new Date('1990-01-01'),
          nivelRiesgo: 'verde',
          estado: 'activa',
        },
      });
    }

    return newUser;
  });

  return user;
}

// ============================================
// Login Attempt Handling
// ============================================

export async function handleFailedLogin(user: User): Promise<void> {
  const attempts = user.failedLoginAttempts + 1;

  const updateData: { failedLoginAttempts: number; lockedUntil?: Date | null } = {
    failedLoginAttempts: attempts,
  };

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });
}

export async function resetFailedAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

export function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false;
  return new Date() < user.lockedUntil;
}

// ============================================
// Recuperación de contraseña (RF-1.05)
// ============================================

const RESET_TOKEN_TTL_MINUTES = 30;

/**
 * Genera un código de recuperación de 6 dígitos, guarda su hash + expiración
 * en el usuario y devuelve el código en claro (para enviarlo por SMS/WhatsApp).
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
  const hash = await bcrypt.hash(code, env.BCRYPT_SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetTokenHash: hash,
      resetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });
  return code;
}

/**
 * Verifica el código de recuperación contra el hash vigente del usuario y,
 * si es válido y no expiró, cambia la contraseña y limpia el token.
 * Devuelve true si tuvo éxito.
 */
export async function resetPasswordWithToken(dni: string, code: string, newPassword: string): Promise<boolean> {
  const user = await findUserByDni(dni);
  if (!user || !user.resetTokenHash || !user.resetTokenExpires) return false;
  if (new Date() > user.resetTokenExpires) return false;

  const valid = await bcrypt.compare(code, user.resetTokenHash);
  if (!valid) return false;

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
  // Revocar sesiones activas por seguridad.
  await revokeAllUserSessions(user.id);
  return true;
}

// ============================================
// Profile Update
// ============================================

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<User> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.firstName && { firstName: input.firstName }),
      ...(input.lastName && { lastName: input.lastName }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.notificationPreferences && { notificationPreferences: input.notificationPreferences }),
      ...(input.biometricEnabled !== undefined && { biometricEnabled: input.biometricEnabled }),
    },
  });
}

/**
 * Strips sensitive fields from a user object before returning to client.
 */
export function sanitizeUser(user: User): Omit<User, 'passwordHash' | 'failedLoginAttempts' | 'lockedUntil'> {
  const { passwordHash: _ph, failedLoginAttempts: _fa, lockedUntil: _lu, ...sanitized } = user;
  return sanitized;
}
