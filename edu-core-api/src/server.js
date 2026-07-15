import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import logger from './shared/services/logger.js';
import {
  triggerLessonReminders,
  triggerPaymentReminders,
} from './shared/services/notificationTriggers.service.js';

const PORT = env.PORT || 5000;

// 1. Start listening IMMEDIATELY to satisfy Hostinger's 3s timeout
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);

  // 2. Perform background initializations AFTER listen()
  const initializeApp = async () => {
    try {
      // Connect to Database
      await connectDB();

      // Coordinate background/scheduled jobs to run ONLY on PM2 instance 0 to avoid duplicates
      const isInstanceZero = typeof process.env.NODE_APP_INSTANCE === 'undefined' || process.env.NODE_APP_INSTANCE === '0';

      if (isInstanceZero) {
        logger.info('⏰ PM2 Instance 0 (or single process) detected. Initializing scheduled background tasks...');

        // Setup simple daily check for notifications
        const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
        setInterval(async () => {
          try {
            await triggerLessonReminders();
            await triggerPaymentReminders();
          } catch (error) {
            logger.error('Error in automated notification triggers:', error);
          }
        }, CHECK_INTERVAL);

        // Run once on startup (non-blocking)
        triggerLessonReminders().catch((err) =>
          logger.error('Startup Lesson Reminder failed:', err)
        );
        triggerPaymentReminders().catch((err) =>
          logger.error('Startup Payment Reminder failed:', err)
        );
      } else {
        logger.info(`PM2 Instance ${process.env.NODE_APP_INSTANCE} detected. Bypassing scheduled background tasks to prevent duplicate triggers.`);
      }

      logger.info('✅ Background initializations complete');
    } catch (error) {
      logger.error('❌ Background initialization failed:', error);
      // We don't exit here to keep the server alive even if DB is temporarily down,
      // though most routes will fail until DB is up.
    }
  };

  initializeApp();
});

// Handle Unhandled Rejections
process.on('unhandledRejection', (err) => {
  logger.error('❌ UNHANDLED REJECTION! Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  logger.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle Sigterm
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    logger.info('💥 Process terminated!');
  });
});
