import { test, expect } from '@playwright/test';

test.describe('Phase C: Return Back Workflow Workflow', () => {

  const ticketId = '202';

  async function loginAs(page, userObj) {
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(userObj));
  }

  async function setupLayoutMocks(page) {
    await page.route('**/api/tickets/my/', async route => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/api/settings/', async route => {
      await route.fulfill({ status: 200, json: {} });
    });
    await page.route('**/api/employees/', async route => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/api/dropdowns/', async route => {
      await route.fulfill({ status: 200, json: { city: [], nationality: [], club: [] } });
    });
  }

  test('E2E: Tech Committee returns to Supervisor, Supervisor verifies reason and returns to CS', async ({ page }) => {
    
    // Initial State: Pending Tech Committee
    let currentTicketState = {
      id: parseInt(ticketId),
      status: 'pending_committee',
      ticket_type: 'promotion',
      player_name: 'سالم الدوسري',
      player_id: 'SAJ-2002',
      requested_belt_name: 'الحزام الأسود دان 1',
      current_belt_name: 'الحزام البني',
      committee_notes: null,
      supervisor_notes: null,
      history: [],
      messages: []
    };

    await page.route(`**/api/tickets/${ticketId}/`, async route => {
      await route.fulfill({ status: 200, json: currentTicketState });
    });

    await setupLayoutMocks(page);
    await page.goto('/');

    // ==========================================
    // 1. COMMITTEE STAGE (Return to Supervisor)
    // ==========================================
    await loginAs(page, { id: 5, name: 'اللجنة الفنية', role: 'tech_committee' });
    await page.goto(`/dashboard/tickets/${ticketId}`);
    
    await expect(page.locator('text=بانتظار اللجنة الفنية')).toBeVisible();

    // Verify "Return" button is disabled initially because Notes are required
    const returnBtn = page.locator('button', { hasText: 'إرجاع للمشرف' });
    await expect(returnBtn).toBeDisabled();

    // Fill notes
    await page.locator('textarea').first().fill('الرجاء التأكد من صحة شهادة الإنجاز السابقة، تبدو غير واضحة.');
    await expect(returnBtn).toBeEnabled();

    // Mock return action
    await page.route(`**/api/tickets/${ticketId}/committee-action/`, async route => {
      currentTicketState.status = 'pending_supervisor';
      currentTicketState.committee_notes = 'الرجاء التأكد من صحة شهادة الإنجاز السابقة، تبدو غير واضحة.';
      await route.fulfill({ status: 200, json: { message: "Returned back to supervisor" } });
    });

    await returnBtn.click();
    await expect(page.locator('text=Returned back to supervisor')).toBeVisible();


    // ==========================================
    // 2. SUPERVISOR STAGE (Verifies reasons & Returns to CS)
    // ==========================================
    await loginAs(page, { id: 200, name: 'مشرف المنطقة', role: 'regional_supervisor' });
    await page.reload();

    await expect(page.locator('text=بانتظار المشرف')).toBeVisible();

    // Verify committee notes are visible to the supervisor
    await expect(page.locator('h3', { hasText: 'ملاحظات اللجنة الفنية:' })).toBeVisible();
    await expect(page.locator('text=الرجاء التأكد من صحة شهادة الإنجاز السابقة')).toBeVisible();

    const supReturnBtn = page.locator('button', { hasText: 'إرجاع لخدمة العملاء' });
    await expect(supReturnBtn).toBeDisabled(); // Requires notes

    // Fill supervisor notes
    // We target the specific text area for supervisor notes. In the UI, the first generic textarea is for actions.
    await page.locator('textarea').first().fill('خدمة العملاء، الرجاء التواصل مع اللاعب لتوفير نسخة أوضح من الشهادة.');
    await expect(supReturnBtn).toBeEnabled();

    // Mock Supervisor Return to CS
    await page.route(`**/api/tickets/${ticketId}/supervisor-action/`, async route => {
      currentTicketState.status = 'pending_cs';
      currentTicketState.supervisor_notes = 'خدمة العملاء، الرجاء التواصل مع اللاعب لتوفير نسخة أوضح من الشهادة.';
      await route.fulfill({ status: 200, json: { message: "Returned back to customer service" } });
    });

    await supReturnBtn.click();
    await expect(page.locator('text=Returned back to customer service')).toBeVisible();

    // ==========================================
    // 3. CS STAGE (Verifies reasons)
    // ==========================================
    await loginAs(page, { id: 3, name: 'خدمة العملاء', role: 'customer_service' });
    await page.reload();

    await expect(page.locator('text=بانتظار خدمة العملاء')).toBeVisible();

    // Verify supervisor notes are visible to CS
    await expect(page.locator('h3', { hasText: 'ملاحظات مشرف المنطقة:' })).toBeVisible();
    await expect(page.locator('text=خدمة العملاء، الرجاء التواصل مع اللاعب لتوفير نسخة أوضح')).toBeVisible();

  });
});
