import crypto from 'crypto';
import path from 'path';

import multer from 'multer';

import { AppError } from '../errors/AppError.js';
import { wrapMulterMiddleware } from './secureUploadHelper.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = 'uploads/';
    if (file.fieldname === 'cv') {
      dest += 'teachers/cv';
    } else if (file.fieldname === 'certificates') {
      dest += 'teachers/certificates';
    }
    cb(null, dest);
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
  array: (fieldName, maxCount) => wrapMulterMiddleware(rawUpload.array(fieldName, maxCount)),
  fields: (fields) => wrapMulterMiddleware(rawUpload.fields(fields)),
  any: () => wrapMulterMiddleware(rawUpload.any()),
};
