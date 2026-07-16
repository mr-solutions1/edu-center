import { test, expect } from '@playwright/test';

test.beforeEach(({ page }) => {
  page.on('console', msg => {
    console.log(`[BROWSER_CONSOLE_${msg.type()}] ${msg.text()}`);
  });
});

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept auth login
    await page.route('**/v1/auth/login', async (route) => {
      console.log('[MOCK_ROUTE] Intercepted login request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'admin-id',
              firstName: 'مسؤول',
              lastName: 'النظام',
              role: 'ADMIN',
              email: 'admin@rakanacademy.com'
            },
            accessToken: 'mocked-jwt-access-token'
          }
        })
      });
    });

    // Intercept auth refresh
    await page.route('**/v1/auth/refresh', async (route) => {
      console.log('[MOCK_ROUTE] Intercepted refresh request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'admin-id',
              firstName: 'مسؤول',
              lastName: 'النظام',
              role: 'ADMIN',
              email: 'admin@rakanacademy.com'
            },
            accessToken: 'mocked-jwt-access-token'
          }
        })
      });
    });

    // Intercept auth me
    await page.route('**/v1/auth/me', async (route) => {
      console.log('[MOCK_ROUTE] Intercepted getMe request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: 'admin-id',
            firstName: 'مسؤول',
            lastName: 'النظام',
            role: 'ADMIN',
            email: 'admin@rakanacademy.com',
            permissions: [
              "dashboard.view",
              "student.view",
              "student.create",
              "student.update",
              "student.delete",
              "rbac.manage",
              "reports.view"
            ]
          }
        })
      });
    });

    // Intercept auth permissions
    await page.route('**/v1/auth/permissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: []
        })
      });
    });

    // Intercept auth roles
    await page.route('**/v1/auth/roles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: []
        })
      });
    });

    // Intercept overview
    await page.route('**/v1/reports/overview', async (route) => {
      console.log('[MOCK_ROUTE] Intercepted reports/overview request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalStudents: 120,
            totalTeachers: 15,
            activeLessons: 8,
            monthlyRevenue: 2450,
            revenueTrend: 'up',
            revenueTrendValue: '12%'
          }
        })
      });
    });

    // Intercept activity logs
    await page.route('**/v1/activity-log*', async (route) => {
      console.log('[MOCK_ROUTE] Intercepted activity-log request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              _id: 'log-1',
              userId: { firstName: 'مسؤول', lastName: 'النظام' },
              action: 'تسجيل دخول',
              entityType: 'AUTH',
              createdAt: new Date().toISOString()
            }
          ]
        })
      });
    });
  });

  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    // Check if we are on the login page
    await expect(page).toHaveURL(/.*login/);

    // Fill login form
    await page.fill('input[type="email"]', 'admin@rakanacademy.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should be redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1').last()).toContainText('لوحة التحكم');
  });
});

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept auth login
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'admin-id',
              firstName: 'مسؤول',
              lastName: 'النظام',
              role: 'ADMIN',
              email: 'admin@rakanacademy.com'
            },
            accessToken: 'mocked-jwt-access-token'
          }
        })
      });
    });

    // Intercept auth refresh
    await page.route('**/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'admin-id',
              firstName: 'مسؤول',
              lastName: 'النظام',
              role: 'ADMIN',
              email: 'admin@rakanacademy.com'
            },
            accessToken: 'mocked-jwt-access-token'
          }
        })
      });
    });

    // Intercept auth me
    await page.route('**/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: 'admin-id',
            firstName: 'مسؤول',
            lastName: 'النظام',
            role: 'ADMIN',
            email: 'admin@rakanacademy.com',
            permissions: [
              "dashboard.view",
              "student.view",
              "student.create",
              "student.update",
              "student.delete",
              "rbac.manage",
              "reports.view"
            ]
          }
        })
      });
    });

    // Intercept auth permissions
    await page.route('**/v1/auth/permissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: []
        })
      });
    });

    // Intercept auth roles
    await page.route('**/v1/auth/roles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: []
        })
      });
    });

    // Intercept overview
    await page.route('**/v1/reports/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalStudents: 120,
            totalTeachers: 15,
            activeLessons: 8,
            monthlyRevenue: 2450,
            revenueTrend: 'up',
            revenueTrendValue: '12%'
          }
        })
      });
    });

    // Intercept activity logs
    await page.route('**/v1/activity-log*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              _id: 'log-1',
              userId: { firstName: 'مسؤول', lastName: 'النظام' },
              action: 'تسجيل دخول',
              entityType: 'AUTH',
              createdAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Intercept students
    await page.route('**/v1/students*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              _id: 'student-1',
              firstName: 'عبدالرحمن',
              lastName: 'العتيبي',
              parentPhone: '96590001122',
              grade: 'GRADE_10',
              status: 'ACTIVE',
              createdAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@rakanacademy.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should list students', async ({ page }) => {
    await page.goto('/students');
    await expect(page.locator('h1').last()).toContainText('الطلاب');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should open create student dialog', async ({ page }) => {
    await page.goto('/students');
    await page.click('button:has-text("إضافة طالب")');
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('role=dialog')).toContainText('إضافة طالب جديد');
  });
});
