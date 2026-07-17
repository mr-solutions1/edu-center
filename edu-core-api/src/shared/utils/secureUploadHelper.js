import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileTypeFromFile } from 'file-type';
import { AppError } from '../errors/AppError.js';

const whitelist = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'xlsx', 'docx', 'csv'];

const secureAndRenameFile = async (file) => {
  if (!file || !file.path) return;

  // 1. Get detected file type via magic bytes
  let detected = await fileTypeFromFile(file.path);
  let ext = detected?.ext?.toLowerCase();
  let mime = detected?.mime?.toLowerCase();

  // 2. Fallback for text files (like CSV) which do not have binary magic bytes
  if (!detected) {
    const buffer = fs.readFileSync(file.path, { encoding: 'utf8', flag: 'r' }).substring(0, 1024);
    const isHtml = /<html|<script|<body|<svg/i.test(buffer);
    const hasNullByte = buffer.includes('\0');
    const originalExt = path.extname(file.originalname).toLowerCase().replace('.', '');

    if (!isHtml && !hasNullByte && originalExt === 'csv') {
      ext = 'csv';
      mime = 'text/csv';
    }
  }

  // 3. Check against Whitelist
  if (!ext || !whitelist.includes(ext)) {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new AppError('نوع الملف غير مدعوم أو غير آمن.', 400);
  }

  // 4. Generate random secure name
  const randomName = crypto.randomBytes(16).toString('hex');
  const newFilename = `${randomName}.${ext}`;
  const newPath = path.join(path.dirname(file.path), newFilename);

  // 5. Rename file on disk
  fs.renameSync(file.path, newPath);

  // 6. Update Multer file properties
  file.path = newPath;
  file.filename = newFilename;
  file.mimetype = mime;
  file.originalname = newFilename;
};

/**
 * Wrap any Multer middleware to add post-upload verification
 * @param {Function} middleware
 * @returns {Function} Express middleware
 */
export const wrapMulterMiddleware = (middleware) => {
  return (req, res, next) => {
    middleware(req, res, async (err) => {
      if (err) {
        return next(err);
      }

      try {
        // Validate single file if present
        if (req.file) {
          await secureAndRenameFile(req.file);
        }

        // Validate multiple files (from fields or array) if present
        if (req.files) {
          if (Array.isArray(req.files)) {
            for (const file of req.files) {
              await secureAndRenameFile(file);
            }
          } else if (typeof req.files === 'object') {
            for (const fieldName of Object.keys(req.files)) {
              const filesList = req.files[fieldName];
              if (Array.isArray(filesList)) {
                for (const file of filesList) {
                  await secureAndRenameFile(file);
                }
              }
            }
          }
        }

        next();
      } catch (validationErr) {
        next(validationErr);
      }
    });
  };
};
