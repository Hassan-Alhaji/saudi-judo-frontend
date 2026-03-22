import { test, expect } from '@playwright/test';

test.describe('Profile Update and CS Ticket Workflow', () => {

  const ticketId = '202';

  async function loginAs(page, userObj) {
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(userObj));
  }

  async function setupLayoutMocks(page) {
    await page.route('**/api/settings/', async route => {
      await route.fulfill({ status: 200, json: {} });
    });
    // This route decides the dashboard UI ticket widget!
    await page.route('**/api/tickets/my/', async route => {
      // Mock one pending_cs ticket for the dashboard to count
      await route.fulfill({ status: 200, json: [{id: parseInt(ticketId), status: 'pending_cs', ticket_type: 'profile_update'}] });
    });
  }

  test('E2E: Dashboard accurately counts pending profile tickets for CS and Admin', async ({ page }) => {
    await setupLayoutMocks(page);
    await page.goto('/');

    // ==========================================
    // 1. CUSTOMER SERVICE ROLE DASHBOARD CHECK
    // ==========================================
    await loginAs(page, { id: 3, name: 'خدمة العملاء', role: 'customer_service' });
    
    // Go to dashboard
    await page.goto('/dashboard');

    // The dashboard widget for CS should say 'تذاكر تحتاج لمراجعتك' and show '1'
    await expect(page.locator('text=تذاكر تحتاج لمراجعتك')).toBeVisible();
    await expect(page.locator('h3', { hasText: '1' }).first()).toBeVisible();

    // ==========================================
    // 2. SUPERADMIN ROLE DASHBOARD CHECK
    // ==========================================
    await loginAs(page, { id: 99, name: 'مدير النظام', role: 'superadmin' });
    await page.reload();

    // Verify Superadmin ALSO sees 1 ticket pending review (fixing the previous bug where it showed 0)
    await expect(page.locator('text=تذاكر تحتاج لمراجعتك')).toBeVisible();
    await expect(page.locator('h3', { hasText: '1' }).first()).toBeVisible();
  });

});
