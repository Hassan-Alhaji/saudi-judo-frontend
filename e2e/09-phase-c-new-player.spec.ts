import { test, expect } from '@playwright/test';

test.describe('Phase C: New Player (White Belt) Flow', () => {

  const newPlayerObj = {
    id: 999,
    name: 'سالم الجديد',
    saj_id: 'SAJ-999',
    role: 'player',
    current_belt_id: null // No previous belt
  };

  async function loginAs(page, userObj) {
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(userObj));
  }

  test('New player is not required to upload a previous certificate to submit a promotion ticket', async ({ page }) => {
    
    // Mocks
    await page.route('**/api/tickets/my/', async route => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/api/settings/', async route => {
      await route.fulfill({ status: 200, json: {} });
    });
    // Mock belts list
    await page.route('**/api/belts/', async route => {
      await route.fulfill({ status: 200, json: [
        { id: 1, name: 'white_yellow', display_name: 'أبيض - أصفر', price: 100 }
      ]});
    });
    // Mock Verify Coach
    await page.route('**/api/verify-coach/?saj_id=12345', async route => {
      await route.fulfill({ status: 200, json: { coach: { id: 2, name: 'كابتن محمد' } } });
    });

    await page.goto('/');
    await loginAs(page, newPlayerObj);
    await page.goto('/dashboard/tickets');

    // Select Promotion
    await page.locator('button', { hasText: 'طلب ترقية حزام' }).click();

    // Select Belt
    await page.locator('select').selectOption({ label: 'أبيض - أصفر' });

    // Verify Coach
    await page.locator('input[placeholder="12345"]').fill('12345');
    await page.locator('button', { hasText: 'تحقق' }).click();
    await expect(page.locator('text=كابتن محمد')).toBeVisible();

    // Fill notes
    await page.locator('textarea').first().fill('طلب ترقية لأول حزام.');

    // Upload required Personal Photo and ID ONLY
    await page.locator('text=صورة شخصية حديثة').locator('..').locator('input[type="file"]').setInputFiles({
      name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('dummy')
    });
    await page.locator('text=صورة الهوية الوطنية / الإقامة / بطاقة العائلة').locator('..').locator('input[type="file"]').setInputFiles({
      name: 'id.pdf', mimeType: 'application/pdf', buffer: Buffer.from('dummy')
    });

    // Check Terms
    await page.locator('input[type="checkbox"]').check();

    // Answer Captcha
    const captchaText = await page.locator('span', { hasText: '+' }).innerText();
    const parts = captchaText.replace('=', '').trim().split('+');
    const answer = parseInt(parts[0].trim()) + parseInt(parts[1].trim());
    await page.locator('input[placeholder="؟"]').fill(answer.toString());

    // Verify UI says NO certificate needed
    await expect(page.locator('text=معلومة: بصفتك لاعب جديد، لا يُطلب منك إرفاق شهادة حزام سابق.')).toBeVisible();

    // Verify Old certificate input is MISSING
    await expect(page.locator('text=شهادة الحزام السابق')).toBeHidden();

    // Mock Submit
    await page.route('**/api/tickets/create/', async route => {
      // Assert that we don't need player_attachment in the payload
      const requestData = route.request().postData();
      expect(requestData).not.toContain('player_attachment');
      expect(requestData).toContain('personal_photo');
      await route.fulfill({ status: 200, json: { message: "تمت إضافة التذكرة" } });
    });

    // Submit
    await page.locator('button', { hasText: 'رفع التذكرة واعتماد الطلب' }).click();

    // Success
    await expect(page.locator('text=تم رفع التذكرة بنجاح')).toBeVisible();
  });
});
