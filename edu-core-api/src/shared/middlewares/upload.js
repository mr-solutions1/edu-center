import fs from 'fs';
import path from 'path';

import multer from 'multer';

import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';
import { wrapMulterMiddleware } from '../utils/secureUploadHelper.js';

// Ensure upload directory exists
const uploadDir = env.UPLOAD_PATH;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = env.UPLOAD_PATH;
    if (file.fieldname === 'avatar') {
      folder = path.join(folder, 'profiles');
    } else {
      folder = path.join(folder, 'attachments');
    }

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Broad filter, fine-grained validation occurs post-upload via wrapMulterMiddleware
  cb(null, true);
};

const rawUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});

export const upload = {
  single: (fieldName) => wrapMulterMiddleware(rawUpload.single(fieldName)),
  array: (fieldName, maxCount) => wrapMulterMiddleware(rawUpload.array(fieldName, maxCount)),
  fields: (fields) => wrapMulterMiddleware(rawUpload.fields(fields)),
  any: () => wrapMulterMiddleware(rawUpload.any()),
};
