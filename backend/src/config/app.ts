import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import { corsOptions } from './cors.js';
import { swaggerSpec } from './swagger.js';
import { requestLoggerMiddleware } from '../middleware/requestLogger.middleware.js';
import { errorHandler } from '../middleware/errorHandler.middleware.js';
import { globalRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { apiRouter } from '../routes/index.js';

export function createApp(): express.Express {
  const app = express();

  // ---- Request ID ----
  app.use((req, _res, next) => {
    req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
    next();
  });

  // ---- Security ----
  app.use(helmet());
  app.use(cors(corsOptions));

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

  // ---- API Routes ----
  app.use('/v1', apiRouter);

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
