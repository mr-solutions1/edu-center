import { test, expect } from '@playwright/test';

test.describe('API Error Handling and Reusable ErrorAlert', () => {
  test('should display beautiful ErrorAlert with custom validation details on 422 Unprocessable Entity', async ({ page }) => {
    // Intercept login post requests and return structured 422 error
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'بيانات الاعتماد المدخلة غير صالحة.',
            details: [
              'البريد الإلكتروني غير مسجل في النظام',
              'طول كلمة المرور يجب أن لا يقل عن 6 أحرف'
            ]
          }
        })
      });
    });

    // Go to login page
    await page.goto('/login');

    // Fill the fields with syntactically valid inputs so client-side validation passes
    await page.fill('input[type="email"]', 'wrong@rakanacademy.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify ErrorAlert title and message are visible
    const alertTitle = page.locator('role=alert >> h4');
    await expect(alertTitle).toContainText('خطأ في التحقق من البيانات');

    // Verify list of detailed validation messages are shown
    await expect(page.locator('role=alert >> text=البريد الإلكتروني غير مسجل في النظام')).toBeVisible();
    await expect(page.locator('role=alert >> text=طول كلمة المرور يجب أن لا يقل عن 6 أحرف')).toBeVisible();
  });

  test('should display ErrorAlert on 500 Internal Server Error', async ({ page }) => {
    // Intercept login post requests and return 500
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Internal Database Connection Lost'
        })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@rakanacademy.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify user-friendly 500 message is displayed instead of internal database message
    const alertTitle = page.locator('role=alert >> h4');
    await expect(alertTitle).toContainText('خطأ داخلي في الخادم');
    await expect(page.locator('role=alert >> text=نواجه مشكلة فنية مؤقتة في خوادمنا حالياً')).toBeVisible();
  });
});
