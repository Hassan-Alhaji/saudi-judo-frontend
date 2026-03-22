import { test, expect } from '@playwright/test';

test('has title and login elements', async ({ page }) => {
  // Navigate to the root homepage, which is the login page
  await page.goto('/');

  // Expect the page to have the correct title
  await expect(page).toHaveTitle(/الاتحاد السعودي للجودو/i);
  
  // Look for the "Send OTP" button
  const loginButton = page.getByRole('button', { name: /إرسال رمز التحقق/i });
  await expect(loginButton).toBeVisible({ timeout: 10000 });
});
