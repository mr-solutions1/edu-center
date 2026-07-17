import fs from 'node:fs';
import path from 'node:path';
import logger from '../services/logger.js';

/**
 * Abstract Storage Provider Contract
 */
export class StorageProvider {
  async saveFile(file, directory) {
    throw new Error('Method "saveFile" must be implemented by concrete StorageProvider');
  }
  async deleteFile(filePath) {
    throw new Error('Method "deleteFile" must be implemented by concrete StorageProvider');
  }
}

/**
 * Concrete Local Disk Storage Provider (Adapter)
 */
class LocalDiskStorageProvider extends StorageProvider {
  async saveFile(file, directory = 'uploads') {
    logger.info(`💾 [StorageProvider] LocalDisk saving file: ${file.originalname}`);
    // Simulate S3 compatible/local path saving
    return `/uploads/${file.filename}`;
  }

  async deleteFile(filePath) {
    logger.info(`💾 [StorageProvider] LocalDisk deleting file: ${filePath}`);
    try {
      const uploadsRoot = path.resolve('./uploads');
      const fullPath = path.resolve(`.${filePath}`);
      if (!fullPath.startsWith(uploadsRoot)) {
        logger.warn(`🛡️ [StorageProvider] Blocked path traversal attempt in file deletion: ${filePath}`);
        return false;
      }
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
    } catch (err) {
      logger.error(`Failed to delete local disk file: ${err.message}`);
    }
    return false;
  }
}

// Export active storage adapter (can be switched to S3 or Azure Blobs dynamically)
export const storageProvider = new LocalDiskStorageProvider();
export default storageProvider;
