import fs from 'node:fs';
import path from 'node:path';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';

import { env } from './config/env.js';
import activityLogRoutes from './modules/activity-log/activityLog.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import courseRoutes from './modules/courses/course.routes.js';
import groupRoutes from './modules/groups/group.routes.js';
import lessonRoutes from './modules/lessons/lesson.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import payrollRoutes from './modules/payroll/payroll.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import salaryRoutes from './modules/salaries/salary.routes.js';
import studentRoutes from './modules/students/student.routes.js';
import teacherRoutes from './modules/teachers/teacher.routes.js';
import userRoutes from './modules/users/user.routes.js';
import { AppError } from './shared/errors/AppError.js';
import logger from './shared/services/logger.js';

const pkg = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, '../package.json'), 'utf8')
);

const app = express();

// 1. Trust Proxy (appropriate for Hostinger Web Apps)
app.set('trust proxy', 1);

// 2. Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// 3. HTTP Request Logging (Morgan -> Winston)
const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

// 4. Body Parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 5. Compression
app.use(compression());

// Ensure Uploads Directory Exists
const uploadDir = path.resolve(env.UPLOAD_PATH);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Static Files for Uploads
app.use('/uploads', express.static(uploadDir));

// 6. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'لقد تجاوزت الحد المسموح به من الطلبات، يرجى المحاولة لاحقاً',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message:
        'لقد تجاوزت الحد المسموح به من محاولات تسجيل الدخول، يرجى المحاولة بعد دقيقة',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);
app.use('/api/v1/auth/login', loginLimiter);

// 7. Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
});

// 8. Root Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Edu-Core API',
    status: 'running',
    version: pkg.version,
    environment: env.NODE_ENV,
    node: process.version,
  });
});

// 9. Health Check
app.get('/health', (req, res) => {
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    nodeVersion: process.version,
    mongodb: dbStates[mongoose.connection.readyState] || 'unknown',
    memoryUsage: process.memoryUsage(),
    pid: process.pid,
  });
});

// 9. API Routes Integration
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/salaries', salaryRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/activity-log', activityLogRoutes);

// 10. 404 Handler
app.all('*', (req, res, next) => {
  next(new AppError(`المسار ${req.originalUrl} غير موجود`, 404));
});

// 11. Global Error Handler

app.use((err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const response = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'حدث خطأ داخلي في الخادم',
    },
  };

  if (err.details) {
    response.error.details = err.details;
  }

  // Log error
  if (err.statusCode >= 500) {
    logger.error(`${err.message}`, err);
  } else {
    logger.warn(`${err.statusCode} - ${err.message}`);
  }

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
});

export default app;
