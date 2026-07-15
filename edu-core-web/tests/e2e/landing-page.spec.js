import { test, expect } from '@playwright/test';

test.describe('Landing Page Accessibility', () => {
  test('should render landing page successfully for anonymous visitors', async ({ page }) => {
    // Navigate to root route
    await page.goto('/');

    // Check if we are on the landing page/root route
    await expect(page).toHaveURL('/');

    // Check if the logo/title are visible
    await expect(page.locator('h1')).toContainText('Edu Center ERP');

    // Check if the contact phone is visible
    await expect(page.locator('text=+965 5086 6476').first()).toBeVisible();

    // Check if portal buttons/cards exist
    await expect(page.locator('text=بوابة الطالب')).toBeVisible();
    await expect(page.locator('text=بوابة ولي الأمر')).toBeVisible();
    await expect(page.locator('text=بوابة المعلم')).toBeVisible();

    // Check if the application form is present
    await expect(page.locator('text=تقديم طلب مباشر')).toBeVisible();
  });
});
