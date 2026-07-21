# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing-page.spec.js >> Landing Page Accessibility >> should render landing page successfully for anonymous visitors
- Location: tests/e2e/landing-page.spec.js:4:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.describe('Landing Page Accessibility', () => {
  4  |   test('should render landing page successfully for anonymous visitors', async ({ page }) => {
  5  |     // Navigate to root route
> 6  |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  7  |
  8  |     // Check if we are on the landing page/root route
  9  |     await expect(page).toHaveURL('/');
  10 |
  11 |     // Check if the logo/title are visible
  12 |     await expect(page.locator('h1')).toContainText('Edu Center ERP');
  13 |
  14 |     // Check if the contact phone is visible
  15 |     await expect(page.locator('text=+965 5086 6476').first()).toBeVisible();
  16 |
  17 |     // Check if portal buttons/cards exist
  18 |     await expect(page.locator('text=بوابة الطالب')).toBeVisible();
  19 |     await expect(page.locator('text=بوابة ولي الأمر')).toBeVisible();
  20 |     await expect(page.locator('text=بوابة المعلم')).toBeVisible();
  21 |
  22 |     // Check if the application form is present
  23 |     await expect(page.locator('text=تقديم طلب مباشر')).toBeVisible();
  24 |   });
  25 | });
  26 |
```