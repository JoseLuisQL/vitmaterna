import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware.js';
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.schema.js';
import * as authController from './auth.controller.js';

const router = Router();

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni, firstName, lastName, password, confirmPassword, role, consentAccepted]
 *             properties:
 *               dni: { type: string, example: "12345678" }
 *               firstName: { type: string, example: "Maria" }
 *               lastName: { type: string, example: "Huaman" }
 *               phone: { type: string, example: "+51987654321" }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               confirmPassword: { type: string }
 *               role: { type: string, enum: [gestante, obstetra] }
 *               cop: { type: string, description: "Required for obstetra role" }
 *               consentAccepted: { type: boolean }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: DNI already registered
 */
router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Login with DNI and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni, password]
 *             properties:
 *               dni: { type: string, example: "99999999" }
 *               password: { type: string, example: "Admin@2026" }
 *               deviceInfo: { type: object }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

/**
 * @swagger
 * /v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access and refresh tokens
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  '/refresh',
  validate({ body: refreshSchema }),
  authController.refresh,
);

/**
 * @swagger
 * /v1/auth/logout:
 *   post:
 *     summary: Logout (revoke session)
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User profile with role-specific data
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @swagger
 * /v1/auth/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               notificationPreferences: { type: object }
 *               biometricEnabled: { type: boolean }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch(
  '/me',
  authenticate,
  validate({ body: updateProfileSchema }),
  authController.updateMe,
);

/**
 * @swagger
 * /v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni]
 *             properties:
 *               dni: { type: string, example: "12345678" }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Reset instructions sent (if DNI exists)
 */
router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);

/**
 * @swagger
 * /v1/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword, confirmPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired reset token
 */
router.post(
  '/reset-password',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

export const authRoutes = router;
