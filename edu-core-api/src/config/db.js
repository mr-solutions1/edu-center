import mongoose from 'mongoose';

import { env } from './env.js';
import logger from '../shared/services/logger.js';

/**
 * Connect to MongoDB with retry logic and timeout.
 * Automatically verifies and builds indexes for all registered schemas.
 *
 * @param {number} retries Number of retry attempts
 * @param {number} delay Delay between retries in milliseconds
 */
export const connectDB = async (retries = 5, delay = 5000) => {
  const options = {
    serverSelectionTimeoutMS: 5000, // Connection timeout
    maxPoolSize: 10,
    minPoolSize: 2,
    retryWrites: true,
    socketTimeoutMS: 45000,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(env.MONGO_URI, options);
      logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

      // Run Tenant and Branch Bootstrap
      try {
        const { bootstrapTenantAndBranch } = await import('../modules/tenants/tenantBootstrap.js');
        await bootstrapTenantAndBranch();
      } catch (bootErr) {
        logger.error(`⚠️ Tenant/Branch Bootstrap failed on startup: ${bootErr.message}`);
      }

      // Run Versioned Database Migrations
      try {
        const { runDatabaseMigrations } = await import('../shared/mongoose/migrationRunner.js');
        await runDatabaseMigrations();
      } catch (migrationErr) {
        logger.error(`⚠️ Database migrations runner failed on startup: ${migrationErr.message}`);
      }

      // Simplified connection monitoring
      mongoose.connection.on('error', (err) => {
        logger.error(`❌ MongoDB connection error: ${err}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
      });

      // Automatic Index Verification & Creation
      try {
        const models = mongoose.modelNames();
        logger.info(`🔄 Verifying and creating MongoDB indexes for ${models.length} models...`);

        await Promise.all(
          models.map(async (modelName) => {
            const model = mongoose.model(modelName);
            await model.ensureIndexes();
          })
        );

        logger.info('✅ MongoDB index verification and creation complete.');
      } catch (indexError) {
        logger.error(`❌ Index verification/creation warning: ${indexError.message}`);
      }

      return conn;
    } catch (error) {
      logger.error(
        `❌ MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`
      );

      if (attempt === retries) {
        logger.error('❌ Max MongoDB connection retries reached. Exiting...');
        throw error;
      }

      logger.info(`🔄 Retrying database connection in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
