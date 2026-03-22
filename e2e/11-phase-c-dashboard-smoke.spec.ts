import { test, expect } from '@playwright/test';

test.describe('Phase C: Dashboard Smoke Tests', () => {

  const adminObj = {
    id: 1,
    name: 'مدير النظام',
    role: 'admin',
    saj_id: 'SAJ-1'
  };

  async function loginAs(page, userObj) {
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(userObj));
  }

  test('Admin can access the users dashboard and search filters trigger API calls correctly', async ({ page }) => {
    
    // Initial mock without search
    await page.route('**/api/admin/users/?exclude_roles=player,coach', async route => {
      await route.fulfill({ 
        status: 200, 
        json: { results: [ { id: 2, name: 'موظف 1', email: '1@test.com', role: 'customer_service', saj_id: '1' } ] }
      });
    });

    // Mock with search
    await page.route('**/api/admin/users/?exclude_roles=player,coach&search=%D8%A3%D8%AD%D9%85%D8%AF', async route => { // %D8%A3%D8%AD%D9%85%D8%AF is "أحمد"
      await route.fulfill({ 
        status: 200, 
        json: { results: [ { id: 3, name: 'أحمد الدوسري', email: 'ahmed@test.com', role: 'customer_service', saj_id: '9' } ] }
      });
    });

    await page.route('**/api/tickets/my/', async route => { await route.fulfill({ status: 200, json: [] }); });
    await page.route('**/api/settings/', async route => { await route.fulfill({ status: 200, json: {} }); });

    await page.goto('/');
    await loginAs(page, adminObj);
    
    // Navigate to Admin Users page
    await page.goto('/dashboard/admin/users');

    // Assert page loaded displaying initial data
    await expect(page.locator('h2', { hasText: 'إدارة المستخدمين والصلاحيات' })).toBeVisible();
    await expect(page.locator('text=موظف 1')).toBeVisible();
    await expect(page.locator('text=أحمد الدوسري')).toBeHidden();

    // Type in the search box
    await page.locator('input[placeholder*="ابحث بالاسم"]').fill('أحمد');

    // Wait for the UI to update based on the search API mock
    await expect(page.locator('text=أحمد الدوسري')).toBeVisible();
    await expect(page.locator('text=ahmed@test.com')).toBeVisible();

  });

});
