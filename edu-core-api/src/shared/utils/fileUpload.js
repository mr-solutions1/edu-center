import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import multer from 'multer';

import { wrapMulterMiddleware } from './secureUploadHelper.js';
import { AppError } from '../errors/AppError.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = 'uploads/';
    if (file.fieldname === 'cv') {
      dest += 'teachers/cv';
    } else if (file.fieldname === 'certificates') {
      dest += 'teachers/certificates';
    }

    try {
      // 1. Path Absolute Standardization: Enforce absolute path resolution to avoid path discrepancies
      const absoluteDest = path.resolve(dest);

      // 2. Automated Directory Provisioning: Check and recursively create directories on startup or lazy-load
      if (!fs.existsSync(absoluteDest)) {
        fs.mkdirSync(absoluteDest, { recursive: true });
      }

      cb(null, absoluteDest);
    } catch (err) {
      cb(new AppError('فشل تهيئة مجلد رفع الملفات على الخادم.', 500));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const rawUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const upload = {
  single: (fieldName) => wrapMulterMiddleware(rawUpload.single(fieldName)),
  array: (fieldName, maxCount) =>
    wrapMulterMiddleware(rawUpload.array(fieldName, maxCount)),
  fields: (fields) => wrapMulterMiddleware(rawUpload.fields(fields)),
  any: () => wrapMulterMiddleware(rawUpload.any()),
};
