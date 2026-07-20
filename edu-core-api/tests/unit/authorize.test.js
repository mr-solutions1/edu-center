process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';

import Role from '../../src/modules/auth/role.model.js';
import TenantSettings from '../../src/modules/tenants/tenantSettings.model.js';
import {
  hasPermission,
  hasPermissionWithPolicy,
} from '../../src/shared/middlewares/authorize.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import { connectDB, closeDB, clearDB } from '../integration/setup.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

// Async helper to wrap Express middleware for deterministic testing
const executeMiddleware = (middleware, req) => {
  return new Promise((resolve, reject) => {
    middleware(req, {}, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

describe('Dynamic RBAC & ABAC Policy Engine Suite', () => {
  it('should successfully authorize direct dynamic role permissions', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      // Create role definition
      await Role.create({
        tenantId,
        name: 'Receptionist Test',
        key: 'RECEPTIONIST_TEST',
        permissions: ['student.create'],
      });

      const mockReq = {
        user: {
          tenantId,
          role: 'RECEPTIONIST_TEST',
        },
      };

      await expect(
        executeMiddleware(hasPermission('student.create'), mockReq)
      ).resolves.toBeUndefined();
    });
  });

  it('should recursively evaluate and authorize inherited permissions', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      // 1. Create parent role holding permissions
      await Role.create({
        tenantId,
        name: 'Tutor Manager',
        key: 'TUTOR_MANAGER',
        permissions: ['payroll.view', 'reports.view'],
      });

      // 2. Create child role inheriting from Tutor Manager
      await Role.create({
        tenantId,
        name: 'Senior Tutor',
        key: 'SENIOR_TUTOR',
        permissions: ['student.view'],
        inherits: ['TUTOR_MANAGER'],
      });

      const mockReq = {
        user: {
          tenantId,
          role: 'SENIOR_TUTOR',
        },
      };

      await expect(
        executeMiddleware(hasPermission('payroll.view'), mockReq)
      ).resolves.toBeUndefined();
    });
  });

  it('should block actions if associated SaaS Feature Flags are disabled in TenantSettings', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      // Ensure role has permission but feature flag is turned off
      await Role.create({
        tenantId,
        name: 'CRM Admin',
        key: 'CRM_ADMIN',
        permissions: ['crm.view'],
      });

      // Set CRM Feature Flag to disabled in settings
      await TenantSettings.create({
        tenantId,
        featureFlags: {
          crmEnabled: false,
        },
      });

      const mockReq = {
        user: {
          tenantId,
          role: 'CRM_ADMIN',
        },
      };

      await expect(
        executeMiddleware(hasPermission('crm.view'), mockReq)
      ).rejects.toThrow('هذه الميزة معطّلة حالياً ضمن باقة اشتراك المعهد');
    });
  });

  it('should validate ABAC dynamic policy attributes correctly and reject if metrics do not align', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      await Role.create({
        tenantId,
        name: 'Branch Clerk',
        key: 'BRANCH_CLERK',
        permissions: ['student.create'],
      });

      const mockReq = {
        user: {
          tenantId,
          role: 'BRANCH_CLERK',
          branchId: 'Branch_A',
        },
        body: {
          branchId: 'Branch_B', // Attempting write to Branch B
        },
      };

      // Define ABAC evaluator: user's branchId must match target payload branchId
      const branchEvaluator = async (req, user) => {
        return user.branchId === req.body.branchId;
      };

      await expect(
        executeMiddleware(
          hasPermissionWithPolicy('student.create', branchEvaluator),
          mockReq
        )
      ).rejects.toThrow('تم حظر الوصول: لا تطابق قيود السياسة السياقية (ABAC)');
    });
  });
});
