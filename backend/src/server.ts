import { env } from './config/env.js';
import { createApp } from './config/app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { logger } from './middleware/requestLogger.middleware.js';
import { startReminderCron } from './modules/notifications/notification.service.js';

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setupChatSockets } from './sockets/chat.socket.js';

async function bootstrap(): Promise<void> {
  // Connect to database
  await connectDatabase();

  // Start background reminder cron
  startReminderCron();

  // Connect to Redis (non-blocking – continues even if Redis is unavailable)
  await connectRedis();

  // Create Express app
  const app = createApp();

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Adjust according to frontend origin
    },
  });

  setupChatSockets(io);

  // Start server
  const server = httpServer.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        docs: `http://localhost:${env.PORT}/docs`,
        health: `http://localhost:${env.PORT}/health`,
      },
      `🚀 VITMATERNA API server running on port ${env.PORT}`,
    );
  });

  // ---- Graceful Shutdown ----
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await disconnectDatabase();
        await disconnectRedis();
      } catch (err) {
        logger.error(err, 'Error during shutdown');
      }

      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled errors
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Promise Rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught Exception');
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
