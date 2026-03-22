import { test, expect } from '@playwright/test';

test.describe('Phase B: Full Ticket Workflow & Remaining Uploads', () => {

  const dummyImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );

  test('1. Player submits Promotion Ticket with all attachments', async ({ page }) => {
    // 1. Mock Player Login
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('django_access_token', 'fake-token-player');
      localStorage.setItem('django_user', JSON.stringify({
        id: 99,
        name: 'عبدالله محمد',
        saj_id: 'SAJ-12345',
        role: 'player',
        current_belt_id: 1,
      }));
    });

    // Mock initial API calls for tickets page
    await page.route('**/api/tickets/my/', route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/belts/', route => route.fulfill({ status: 200, json: [{id: 2, name: 'yellow', display_name: 'أصفر', price: 100}] }));
    await page.route('**/api/verify-coach/?saj_id=7777', route => route.fulfill({ status: 200, json: { coach: {id: 7, name: 'كابتن محمود'} } }));

    // Go to tickets
    await page.goto('/dashboard/tickets');
    
    // Select Promotion Ticket Type
    const promBtn = page.locator('button', { hasText: 'طلب ترقية حزام' });
    await expect(promBtn).toBeVisible({ timeout: 10000 });
    await promBtn.click();

    // Select Belt
    await page.selectOption('select', '2'); // Belt ID 2

    // Verify Coach
    await page.fill('input[placeholder="12345"]', '7777');
    await page.locator('button', { hasText: 'تحقق' }).click();
    await expect(page.locator('text=المدرب المعتمد:')).toBeVisible();

    // Fill Description
    await page.fill('textarea', 'أرغب في الترقية للحزام الأصفر');

    // Upload 3 Files: Personal Photo, ID, Prev Belt
    const fileInputs = await page.locator('input[type="file"]').all();
    expect(fileInputs.length).toBeGreaterThanOrEqual(3);
    
    // Fill all file inputs
    for (const input of fileInputs) {
      await input.setInputFiles({ name: 'dummy.png', mimeType: 'image/png', buffer: dummyImageBuffer });
    }

    // Agree to terms
    await page.check('input[type="checkbox"]');

    // Solve Math Captcha
    const captchaText = await page.locator('.whitespace-nowrap[dir="ltr"]').innerText();
    const parts = captchaText.replace('=', '').trim().split('+');
    const answer = parseInt(parts[0].trim()) + parseInt(parts[1].trim());
    await page.fill('input[placeholder="؟"]', answer.toString());

    // Mock Ticket Creation
    await page.route('**/api/tickets/create/', async route => {
      route.fulfill({ status: 201, json: { message: 'تم إرسال التذكرة', id: 100 } });
    });

    // Submit
    await page.locator('button[type="submit"]', { hasText: 'رفع التذكرة واعتماد الطلب' }).click();

    // Expect Success Msg
    await expect(page.locator('text=تم رفع التذكرة بنجاح!')).toBeVisible({ timeout: 5000 });
  });

  test('2. Coach reviews ticket and uploads Evaluation Forms', async ({ page }) => {
    // Mock Coach Login
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('django_access_token', 'fake-token-coach');
      localStorage.setItem('django_user', JSON.stringify({
        id: 7,
        name_ar: 'كابتن محمود',
        role: 'coach',
        saj_id: 'SAJ-7777',
      }));
    });

    // Mock Ticket Detail API
    await page.route('**/api/tickets/100/', route => route.fulfill({ status: 200, json: {
      id: 100,
      status: 'pending_coach',
      ticket_type: 'promotion',
      player_name: 'لاعب اختبار',
      requested_belt_name: 'الحزام الأصفر',
      coach_name: 'كابتن محمود',
      coach_id: 'SAJ-7777',
      created_at: new Date().toISOString(),
      history: [],
      messages: []
    } }));

    await page.goto('/dashboard/tickets/100');
    
    // Verify Coach Action panel is visible
    await expect(page.locator('h3', { hasText: 'إجراءات المدرب' })).toBeVisible({ timeout: 10000 });

    // Upload Evaluation Form and Receipt
    const fileInputs = await page.locator('input[type="file"]').all();
    expect(fileInputs.length).toBeGreaterThanOrEqual(2);

    for (const input of fileInputs) {
      await input.setInputFiles({ name: 'coach-doc.pdf', mimeType: 'application/pdf', buffer: dummyImageBuffer });
    }

    // Check Declaration
    await page.check('input[type="checkbox"]');

    // Mock Submission Action
    await page.route('**/api/tickets/100/coach-submit/', async route => {
      route.fulfill({ status: 200, json: { message: 'تم تنفيذ الإجراء بنجاح.' } });
    });

    // Wait for the button to be enabled before clicking
    const submitBtn = page.locator('button', { hasText: 'إرسال وتقييم التذكرة' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify Success Message
    await expect(page.locator('text=تم تنفيذ الإجراء بنجاح.')).toBeVisible({ timeout: 5000 });
  });

});
