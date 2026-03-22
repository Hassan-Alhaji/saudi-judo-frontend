import { test, expect } from '@playwright/test';

test.describe('Phase C: Full Belt Promotion Chain Pipeline', () => {

  const ticketId = '101';

  // Helper to change user session
  async function loginAs(page, userObj) {
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(userObj));
    // Clear previous generic routes before re-applying to prevent conflicts if needed
    // but usually overriding localStorage is enough to change the UI role.
  }

  // Generic mocks for layout
  async function setupLayoutMocks(page) {
    await page.route('**/api/tickets/my/', async route => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/api/settings/', async route => {
      await route.fulfill({ status: 200, json: {} });
    });
    await page.route('**/api/employees/', async route => {
      await route.fulfill({ status: 200, json: [{id: 200, name: 'مشرف منطقة الرياض', role: 'regional_supervisor'}] });
    });
    await page.route('**/api/dropdowns/', async route => {
      await route.fulfill({ status: 200, json: { city: [], nationality: [], club: [] } });
    });
  }

  test('E2E: Ticket travels through Player -> Coach -> CS -> Supervisor -> Committee -> CEO', async ({ page }) => {
    
    // Base ticket detail that we will update as it progresses through the workflow
    let currentTicketState = {
      id: parseInt(ticketId),
      status: 'pending_coach',
      ticket_type: 'promotion',
      player_name: 'نواف الدوسري',
      player_id: 'SAJ-1001',
      requested_belt_name: 'الحزام الأزرق',
      current_belt_name: 'الحزام الأخضر',
      coach_name: 'الكابتن محمد',
      coach_id: 'SAJ-1002',
      history: [],
      messages: []
    };

    // Route for ticket detail
    await page.route(`**/api/tickets/${ticketId}/`, async route => {
      await route.fulfill({ status: 200, json: currentTicketState });
    });

    await setupLayoutMocks(page);
    await page.goto('/');

    // ==========================================
    // 1. COACH STAGE
    // ==========================================
    await loginAs(page, { id: 2, name: 'الكابتن محمد', role: 'coach' });
    await page.goto(`/dashboard/tickets/${ticketId}`);
    
    await expect(page.locator('h1', { hasText: 'تذكرة #101' })).toBeVisible();
    await expect(page.locator('text=بانتظار المدرب')).toBeVisible();

    // Mock coach submit API
    await page.route(`**/api/tickets/${ticketId}/coach-submit/`, async route => {
      // Coach submits, so next status is pending_cs
      currentTicketState.status = 'pending_cs';
      currentTicketState.test_evaluation_form = 'https://example.com/eval.pdf';
      currentTicketState.payment_receipt = 'https://example.com/receipt.pdf';
      await route.fulfill({ status: 200, json: { message: "Coach approval successful" } });
    });

    // Upload files
    // Playwright needs real file paths for setInputFiles, or we can bypass if we use a buffer
    // Let's create dummy buffers
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'eval.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('dummy eval pdf')
    });
    await page.locator('input[type="file"]').nth(1).setInputFiles({
      name: 'receipt.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('dummy receipt pdf')
    });

    // Accept declaration
    await page.locator('input[type="checkbox"]').first().check();
    
    // Submit
    await page.locator('button', { hasText: 'إرسال وتقييم التذكرة' }).click();
    await expect(page.locator('text=Coach approval successful')).toBeVisible();


    // ==========================================
    // 2. CS STAGE
    // ==========================================
    await loginAs(page, { id: 3, name: 'خدمة العملاء', role: 'customer_service' });
    await page.reload(); // Reload to apply CS role and updated ticket status

    await expect(page.locator('text=بانتظار خدمة العملاء')).toBeVisible();

    // Mock CS forward API
    await page.route(`**/api/tickets/${ticketId}/cs-forward/`, async route => {
      currentTicketState.status = 'pending_supervisor';
      await route.fulfill({ status: 200, json: { message: "Forwarded successfully" } });
    });

    // Click Forward mode
    await page.locator('button', { hasText: 'توجيه داخلي' }).click();
    
    // Select Supervisor
    await page.locator('select').selectOption({ value: '200' });
    
    // Write notes
    await page.locator('textarea[placeholder*="ملاحظات توجيه التذكرة"]').fill('تم التدقيق وتحويلها للمشرف.');

    // Submit
    await page.locator('button', { hasText: 'توجيه التذكرة' }).click();
    await expect(page.locator('text=Forwarded successfully')).toBeVisible();

    // ==========================================
    // 3. SUPERVISOR STAGE
    // ==========================================
    await loginAs(page, { id: 200, name: 'مشرف منطقة الرياض', role: 'regional_supervisor' });
    await page.reload();

    await expect(page.locator('text=بانتظار المشرف')).toBeVisible();

    // Mock Supervisor Action API
    await page.route(`**/api/tickets/${ticketId}/supervisor-action/`, async route => {
      currentTicketState.status = 'pending_committee';
      await route.fulfill({ status: 200, json: { message: "Supervisor approved" } });
    });

    // Click "رفع للجنة الفنية"
    await page.locator('button', { hasText: 'رفع للجنة الفنية' }).click();
    await expect(page.locator('text=Supervisor approved')).toBeVisible();

    // ==========================================
    // 4. COMMITTEE STAGE
    // ==========================================
    await loginAs(page, { id: 5, name: 'اللجنة الفنية', role: 'tech_committee' });
    await page.reload();

    await expect(page.locator('text=بانتظار اللجنة الفنية')).toBeVisible();

    // Mock Committee Action API
    await page.route(`**/api/tickets/${ticketId}/committee-action/`, async route => {
      currentTicketState.status = 'pending_ceo';
      await route.fulfill({ status: 200, json: { message: "Committee approved" } });
    });

    // Click "اعتماد ورفع للرئيس"
    await page.locator('button', { hasText: 'اعتماد ورفع للرئيس' }).click();
    await expect(page.locator('text=Committee approved')).toBeVisible();

    // ==========================================
    // 5. CEO STAGE
    // ==========================================
    await loginAs(page, { id: 6, name: 'الرئيس التنفيذي', role: 'executive_director' });
    await page.reload();

    await expect(page.locator('text=بانتظار الرئيس التنفيذي')).toBeVisible();

    // Mock CEO Action API
    await page.route(`**/api/tickets/${ticketId}/ceo-action/`, async route => {
      currentTicketState.status = 'approved';
      await route.fulfill({ status: 200, json: { message: "CEO approved and certificate generated" } });
    });

    // Click "اعتماد وإصدار الشهادة"
    await page.locator('button', { hasText: 'اعتماد وإصدار الشهادة' }).click();
    await expect(page.locator('text=CEO approved and certificate generated')).toBeVisible();

    // Verify final state
    await page.reload();
    await expect(page.locator('span', { hasText: 'مغلقة' })).toBeVisible();

  });
});
