import { test, expect } from '@playwright/test';

test.describe('Phase C: Negative Access / Control Checks', () => {

  const regularPlayer = {
    id: 10,
    name: 'صالح السالم',
    role: 'player',
    current_belt_id: 1 // Example: yellow belt
  };

  const coachObj = {
    id: 11,
    name: 'كابتن محمد',
    role: 'coach'
  };

  async function loginAs(page, userObj) {
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(userObj));
  }

  test('Player cannot bypass backend requirements, e.g., requesting an illegal future belt', async ({ page }) => {
    await page.route('**/api/tickets/my/', async route => { await route.fulfill({ status: 200, json: [] }); });
    await page.route('**/api/settings/', async route => { await route.fulfill({ status: 200, json: {} }); });
    await page.route('**/api/belts/', async route => {
      await route.fulfill({ status: 200, json: [
        { id: 5, name: 'black_belt', display_name: 'الحزام الأسود' } 
      ]});
    });
    await page.route('**/api/verify-coach/?saj_id=12345', async route => {
      await route.fulfill({ status: 200, json: { coach: { id: 2, name: 'كابتن محمد' } } });
    });

    await page.goto('/');
    await loginAs(page, regularPlayer);
    await page.goto('/dashboard/tickets');

    // Create Ticket
    await page.locator('button', { hasText: 'طلب ترقية حزام' }).click();
    await page.locator('select').selectOption({ label: 'الحزام الأسود' });
    await page.locator('input[placeholder="12345"]').fill('12345');
    await page.locator('button', { hasText: 'تحقق' }).click();
    
    // Valid inputs
    await page.locator('textarea').first().fill('أريد القفز للحزام الأسود.');
    await page.locator('text=صورة شخصية حديثة').locator('..').locator('input[type="file"]').setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('dummy') });
    await page.locator('text=صورة الهوية الوطنية / الإقامة / بطاقة العائلة').locator('..').locator('input[type="file"]').setInputFiles({ name: 'id.pdf', mimeType: 'application/pdf', buffer: Buffer.from('dummy') });
    await page.locator('text=شهادة الحزام السابق').locator('..').locator('input[type="file"]').setInputFiles({ name: 'prev.pdf', mimeType: 'application/pdf', buffer: Buffer.from('dummy') });
    await page.locator('input[type="checkbox"]').check();
    
    // Captcha
    const captchaText = await page.locator('span', { hasText: '+' }).innerText();
    const parts = captchaText.replace('=', '').trim().split('+');
    const answer = parseInt(parts[0].trim()) + parseInt(parts[1].trim());
    await page.locator('input[placeholder="؟"]').fill(answer.toString());

    // Mock API failing validation (Not allowed to skip belts)
    await page.route('**/api/tickets/create/', async route => {
      await route.fulfill({ 
        status: 400, 
        json: { error: 'لا يمكنك تخطي الأحزمة. يجب عليك التدرج باختيار الحزام البرتقالي.' }
      });
    });

    await page.locator('button', { hasText: 'رفع التذكرة واعتماد الطلب' }).click();

    // Verify error propagates to UI
    await expect(page.locator('text=لا يمكنك تخطي الأحزمة. يجب عليك التدرج باختيار الحزام البرتقالي.')).toBeVisible();
  });

  test('Coach cannot submit ticket without uploading mandatory eval forms and receipts', async ({ page }) => {
    
    // Initial state: Ticket pending coach but coach hasn't uploaded files
    let currentTicketState = {
      id: 99,
      status: 'pending_coach',
      ticket_type: 'promotion',
      player_name: 'لاعب تجريبي',
      current_belt_name: 'الحزام الأصفر',
      coach_name: 'كابتن محمد',
      coach_id: 'SAJ-1002',
      test_evaluation_form: null,
      payment_receipt: null,
      history: [],
      messages: []
    };

    await page.route(`**/api/tickets/99/`, async route => {
      await route.fulfill({ status: 200, json: currentTicketState });
    });

    await page.route('**/api/tickets/my/', async route => { await route.fulfill({ status: 200, json: [] }); });
    await page.route('**/api/settings/', async route => { await route.fulfill({ status: 200, json: {} }); });
    await page.route('**/api/dropdowns/', async route => { await route.fulfill({ status: 200, json: { city: [], nationality: [], club: [] } }); });
    await page.route('**/api/employees/', async route => { await route.fulfill({ status: 200, json: [] }); });

    await page.goto('/');
    await loginAs(page, coachObj);
    await page.goto('/dashboard/tickets/99');

    // The Send button should be disabled because attachments aren't uploaded
    const submitBtn = page.locator('button', { hasText: 'إرسال وتقييم التذكرة' });
    await expect(submitBtn).toBeDisabled();

    // 1. Upload Eval form only -> Still disabled
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'eval.pdf', mimeType: 'application/pdf', buffer: Buffer.from('dummy') });
    await expect(submitBtn).toBeDisabled();

    // 2. Upload Receipt -> Still disabled because checkbox not checked
    await page.locator('input[type="file"]').nth(1).setInputFiles({ name: 'receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('dummy') });
    await expect(submitBtn).toBeDisabled();

    // 3. Check declaration checkbox -> Enables the button
    await page.locator('input[type="checkbox"]').first().check();
    await expect(submitBtn).toBeEnabled();

  });

});
