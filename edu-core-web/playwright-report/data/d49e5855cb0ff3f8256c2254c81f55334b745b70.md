# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: happy-paths.spec.js >> Student Management >> should open create student dialog
- Location: tests/e2e/happy-paths.spec.js:38:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/login
Call log:
  - navigating to "http://localhost:5173/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.describe('Authentication Flow', () => {
  4  |   test('should login successfully', async ({ page }) => {
  5  |     // Note: This assumes a seeded database or a mock API
  6  |     await page.goto('/login');
  7  |
  8  |     // Check if we are on the login page
  9  |     await expect(page).toHaveURL(/.*login/);
  10 |
  11 |     // Fill login form
  12 |     await page.fill('input[type="email"]', 'admin@rakanacademy.com');
  13 |     await page.fill('input[type="password"]', 'password123');
  14 |     await page.click('button[type="submit"]');
  15 |
  16 |     // Should be redirected to dashboard
  17 |     await expect(page).toHaveURL(/.*dashboard/);
  18 |     await expect(page.locator('h1')).toContainText('لوحة التحكم');
  19 |   });
  20 | });
  21 |
  22 | test.describe('Student Management', () => {
  23 |   test.beforeEach(async ({ page }) => {
  24 |     // Login before each test
> 25 |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/login
  26 |     await page.fill('input[type="email"]', 'admin@rakanacademy.com');
  27 |     await page.fill('input[type="password"]', 'password123');
  28 |     await page.click('button[type="submit"]');
  29 |     await expect(page).toHaveURL(/.*dashboard/);
  30 |   });
  31 |
  32 |   test('should list students', async ({ page }) => {
  33 |     await page.goto('/students');
  34 |     await expect(page.locator('h1')).toContainText('الطلاب');
  35 |     await expect(page.locator('table')).toBeVisible();
  36 |   });
  37 |
  38 |   test('should open create student dialog', async ({ page }) => {
  39 |     await page.goto('/students');
  40 |     await page.click('button:has-text("إضافة طالب")');
  41 |     await expect(page.locator('role=dialog')).toBeVisible();
  42 |     await expect(page.locator('role=dialog')).toContainText('إضافة طالب جديد');
  43 |   });
  44 | });
  45 |
```