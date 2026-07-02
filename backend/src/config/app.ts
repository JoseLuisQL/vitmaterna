import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import { corsOptions } from './cors.js';
import { swaggerSpec } from './swagger.js';
import { requestLoggerMiddleware } from '../middleware/requestLogger.middleware.js';
import { errorHandler } from '../middleware/errorHandler.middleware.js';
import { globalRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { auditLogger } from '../middleware/auditLogger.middleware.js';
import { apiRouter } from '../routes/index.js';
import { openwaWebhookRouter } from '../modules/notifications/openwa.webhook.routes.js';

export function createApp(): express.Express {
  const app = express();

  // ---- Request ID ----
  app.use((req, _res, next) => {
    req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
    next();
  });

  // ---- Security ----
  // crossOriginResourcePolicy desactivado para permitir servir imágenes del
  // chat a la app móvil/web desde otro origen.
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors(corsOptions));

  // ---- Archivos subidos (imágenes del chat, RF-9.01) ----
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  const manualesPath = path.resolve(process.cwd(), 'manuales');
  const staticOptions = {
    setHeaders: (res: express.Response) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  };

  app.use('/uploads', express.static(uploadsPath, staticOptions));
  app.use('/api/uploads', express.static(uploadsPath, staticOptions));

  // ---- Manuales de usuario (PDF) servidos públicamente por rol ----
  app.use('/manuales', express.static(manualesPath, staticOptions));
  app.use('/api/manuales', express.static(manualesPath, staticOptions));

  // ---- Webhooks entrantes (OpenWA) ----
  // Se monta ANTES del express.json() global: el handler usa express.raw para
  // verificar la firma HMAC sobre los bytes EXACTOS del cuerpo. Ruta pública
  // (la autenticidad la da la firma, no el JWT).
  app.use('/v1/webhooks', openwaWebhookRouter);
  app.use('/api/v1/webhooks', openwaWebhookRouter);

  // ---- Body Parsing ----
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ---- Request Logging ----
  app.use(requestLoggerMiddleware);

  // ---- Global Rate Limiter ----
  app.use(globalRateLimiter);

  // ---- Swagger Docs ----
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'VITMATERNA API Docs',
  }));

  // ---- API Spec JSON ----
  app.get('/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // ---- Health Check ----
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  // ---- Auditoría automática de mutaciones (RF-10.04) ----
  app.use('/v1', auditLogger);
  app.use('/api/v1', auditLogger);

  // ---- API Routes ----
  app.use('/v1', apiRouter);
  app.use('/api/v1', apiRouter);

  // ---- 404 Handler ----
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  // ---- Error Handler ----
  app.use(errorHandler);

  return app;
}
