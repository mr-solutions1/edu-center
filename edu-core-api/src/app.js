import mongoose from 'mongoose';

import { multiTenantPlugin } from './shared/mongoose/multiTenantPlugin.js';
mongoose.plugin(multiTenantPlugin);

// Register Global Domain Event Listeners on startup
import { registerDomainEventListeners } from './shared/services/eventListeners.js';
registerDomainEventListeners();

import fs from 'node:fs';
import path from 'node:path';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';

import { env } from './config/env.js';
import activityLogRoutes from './modules/activity-log/activityLog.routes.js';
import settingsRoutes from './modules/tenants/settings.routes.js';
import aiRoutes from './modules/auth/ai.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import courseRoutes from './modules/courses/course.routes.js';
import crmRoutes from './modules/crm/lead.routes.js';
import groupRoutes from './modules/groups/group.routes.js';
import inboxRoutes from './modules/inbox/inbox.routes.js';
import lessonRoutes from './modules/lessons/lesson.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import payrollRoutes from './modules/payroll/payroll.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import salaryRoutes from './modules/salaries/salary.routes.js';
import studentRoutes from './modules/students/student.routes.js';
import teacherRoutes from './modules/teachers/teacher.routes.js';
import userRoutes from './modules/users/user.routes.js';
import { UserRole } from './shared/constants/enums.js';
import { AppError } from './shared/errors/AppError.js';
import { authenticate } from './shared/middlewares/authenticate.js';
import { authorize } from './shared/middlewares/authorize.js';
import { correlationIdMiddleware } from './shared/middlewares/correlation.js';
import logger from './shared/services/logger.js';

const pkg = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, '../package.json'), 'utf8')
);

const app = express();

// 1. Trust Proxy (appropriate for Hostinger Web Apps)
app.set('trust proxy', 1);

// 2. Correlation ID
app.use(correlationIdMiddleware);

// 3. Security Middlewares & Dynamic CORS
// Secure dynamic origin validation function that automatically allows any approved subdomains and tenants (*.flowship.site)
const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  } // Allow non-browser requests (like Postman or server-to-server)

  // Regex to securely allow any subdomain of flowship.site (HTTPS only in production)
  const flowshipRegex = /^https:\/\/(?:[a-zA-Z0-9-]+\.)*flowship\.site$/;
  if (flowshipRegex.test(origin)) {
    return true;
  }

  // Fallback to explicit whitelist from environment variables (e.g. localhost during development/testing)
  if (Array.isArray(env.CORS_ORIGIN) && env.CORS_ORIGIN.includes(origin)) {
    return true;
  }

  return false;
};

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isOriginAllowed(origin));
    },
    credentials: true,
  })
);

// 4. HTTP Request Logging (Morgan -> Winston)
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

// NoSQL Injection & HTTP Parameter Pollution Defense-in-Depth
app.use(mongoSanitize());
app.use(hpp());

// 5. Compression
app.use(compression());

// Ensure Uploads Directory Exists
const uploadDir = path.resolve(env.UPLOAD_PATH);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Static Files for Uploads with Advanced Enterprise Security Headers
app.use(
  '/uploads',
  express.static(uploadDir, {
    setHeaders: (res, filepath) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Security-Policy', "default-src 'none'; sandbox");

      // Whitelist inline execution for safe mime-types only, force attachment for others
      const ext = path.extname(filepath).toLowerCase();
      const safeInlines = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
      if (safeInlines.includes(ext)) {
        res.set('Content-Disposition', 'inline');
      } else {
        res.set('Content-Disposition', 'attachment');
      }
    },
  })
);

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
  keyGenerator: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        // Cryptographically verify access token synchronously to prevent key forge attacks
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        if (decoded && decoded.id) {
          const tenantId = decoded.tenantId || 'global';
          return `tenant:${tenantId}:user:${decoded.id}`;
        }
      } catch (err) {
        // Fall back to IP rate limiting if token verification fails
      }
    }
    return req.ip;
  },
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

// Advanced Performance and SaaS Health Monitoring Dashboard Endpoint
app.get(
  '/health/advanced',
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  async (req, res) => {
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const healthKey = req.headers['x-health-key'];
    if (!healthKey || healthKey !== env.HEALTH_KEY) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول: مفتاح التحقق مفقود أو غير صالح.',
      });
    }

    try {
      const Tenant = mongoose.model('Tenant');
      const User = mongoose.model('User');
      const AuditTrail = mongoose.model('AuditTrail');

      const [totalTenants, totalUsers, totalAuditLogs] = await Promise.all([
        Tenant.countDocuments({}),
        User.countDocuments({ isActive: true }),
        AuditTrail.countDocuments({}),
      ]);

      const memory = process.memoryUsage();

      res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pid: process.pid,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          cpuUsage: process.cpuUsage(),
          memoryUsage: {
            heapTotalMB: (memory.heapTotal / 1024 / 1024).toFixed(2),
            heapUsedMB: (memory.heapUsed / 1024 / 1024).toFixed(2),
            rssMB: (memory.rss / 1024 / 1024).toFixed(2),
          },
        },
        database: {
          status: dbStates[mongoose.connection.readyState] || 'unknown',
          poolSize: mongoose.connection.getClient()?.options?.maxPoolSize || 10,
        },
        saasMetrics: {
          activeTenants: totalTenants,
          activeAccounts: totalUsers,
          auditTrailLogsCount: totalAuditLogs,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'فشل تجميع المقاييس المتقدمة للنظام',
        error: err.message,
      });
    }
  }
);

// 9. API Routes Integration
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/inbox', inboxRoutes);
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
app.use('/api/v1/settings', settingsRoutes);

// 10. 404 Handler
app.all('*', (req, res, next) => {
  next(new AppError(`المسار ${req.originalUrl} غير موجود`, 404));
});

// 11. Global Error Handler

app.use((err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let responseErrors = {
    code: err.code || 'INTERNAL_ERROR',
    details: err.details || null,
  };

  if (err.code === 'VALIDATION_ERROR' && Array.isArray(err.details)) {
    const fieldErrors = {};
    err.details.forEach((detail) => {
      if (detail.field) {
        fieldErrors[detail.field] = detail.message;
      }
    });
    responseErrors = fieldErrors;
  }

  const statusCode = err.statusCode || 500;
  let responseMessage = err.message || 'حدث خطأ داخلي في الخادم';
  if (env.NODE_ENV === 'production' && statusCode === 500) {
    responseMessage = 'حدث خطأ داخلي في الخادم، يرجى المحاولة لاحقاً';
    responseErrors = {
      code: 'INTERNAL_ERROR',
      details: null,
    };
  }

  const response = {
    success: false,
    message: responseMessage,
    data: null,
    meta: {
      correlationId: req.correlationId,
    },
    errors: responseErrors,
  };

  // Log error
  if (err.statusCode >= 500) {
    logger.error(`${err.message}`, {
      correlationId: req.correlationId,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn(`${err.statusCode} - ${err.message}`, {
      correlationId: req.correlationId,
      url: req.originalUrl,
    });
  }

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
});

export default app;
