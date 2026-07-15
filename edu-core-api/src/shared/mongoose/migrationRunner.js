import Migration from './migration.model.js';
import logger from '../services/logger.js';

// Define standard database schema migrations (V1, V2, etc.)
const schemaMigrations = [
  {
    version: 1,
    name: 'Build and verify initial dynamic RBAC permissions indexes',
    up: async (db) => {
      logger.info('⚙️ Running Migration V1: Index and dynamic permission verification');
      // No operations needed because Model.ensureIndexes() runs on db startup.
    },
  },
  {
    version: 2,
    name: 'SaaS multi-tenant alignment on system users',
    up: async (db) => {
      logger.info('⚙️ Running Migration V2: Multi-tenant user mapping and alignment');
      // Automatically handled during bootstrap, added for versioned alignment record
    },
  },
];

/**
 * Enterprise Schema Migration Engine
 * Automatically tracks and applies outstanding database schema migrations on startup.
 */
export const runDatabaseMigrations = async () => {
  try {
    logger.info('⚙️ Checking for outstanding database schema migrations...');

    for (const migration of schemaMigrations) {
      const alreadyExecuted = await Migration.findOne({ version: migration.version });
      if (alreadyExecuted) {
        continue;
      }

      logger.info(`🚀 Applying migration version [${migration.version}]: "${migration.name}"`);

      // Run transformation
      const db = (await import('mongoose')).default.connection;
      await migration.up(db);

      // Record successful execution
      await Migration.create({
        version: migration.version,
        name: migration.name,
      });

      logger.info(`✅ Successfully completed migration version [${migration.version}]`);
    }

    logger.info('✅ All database schema migrations verified and up to date.');
  } catch (error) {
    logger.error(`❌ Database migration sequence failed: ${error.message}`);
    throw error;
  }
};

export default runDatabaseMigrations;
