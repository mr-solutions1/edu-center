process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';

import { login, mfaVerify } from '../../src/modules/auth/auth.controller.js';
import User from '../../src/modules/users/user.model.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import { TOTPHelper } from '../../src/shared/utils/totp.js';
import { connectDB, closeDB, clearDB } from '../integration/setup.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

// Async middleware tester helper
const runMiddleware = (middleware, req) => {
  return new Promise((resolve, reject) => {
    const mockRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.responseData = data;
        resolve(this);
        return this;
      },
      cookie() {},
    };

    middleware(req, mockRes, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(mockRes);
      }
    });
  });
};

describe('Enterprise Multi-Factor Authentication (MFA) Suite', () => {
  it('should generate secure base32 secrets and QR links correctly', () => {
    const secret = TOTPHelper.generateSecret();
    expect(secret).toHaveLength(32); // 160-bit base32 key is 32 characters

    const url = TOTPHelper.generateOtpauthUrl(
      'test@institute.com',
      'Acme',
      secret
    );
    expect(url).toContain('secret=' + secret);
    expect(url).toContain('Acme');
  });

  it('should verify standard 6-digit TOTP tokens accurately', () => {
    const secret = TOTPHelper.generateSecret();
    const invalidToken = '999999';
    expect(TOTPHelper.verifyToken(secret, invalidToken)).toBe(false);
  });

  it('should support dynamic MFA-gated login workflow end-to-end', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      // 1. Create a user with MFA enabled
      const secret = TOTPHelper.generateSecret();
      await User.create({
        email: 'mfa-user@domain.com',
        firstName: 'Secure',
        lastName: 'Account',
        phone: '96511111111',
        passwordHash: 'securePassword123',
        mfaEnabled: true,
        mfaSecret: secret,
      });

      // 2. Perform standard credentials login (should block with mfaRequired)
      const loginReq = {
        body: {
          email: 'mfa-user@domain.com',
          password: 'securePassword123',
        },
        ip: '127.0.0.1',
        get: () => 'TestAgent',
      };

      const loginRes = await runMiddleware(login, loginReq);
      expect(loginRes.responseData.success).toBe(true);
      expect(loginRes.responseData.data.mfaRequired).toBe(true);
      expect(loginRes.responseData.data.mfaToken).toBeDefined();

      const mfaToken = loginRes.responseData.data.mfaToken;

      // 3. Perform verify check (should reject if code is invalid)
      const verifyReq = {
        body: {
          mfaToken,
          code: '123456', // Invalid code
        },
        ip: '127.0.0.1',
        get: () => 'TestAgent',
      };

      await expect(runMiddleware(mfaVerify, verifyReq)).rejects.toThrow(
        'رمز التحقق غير صحيح أو انتهت صلاحيته'
      );
    });
  });
});
