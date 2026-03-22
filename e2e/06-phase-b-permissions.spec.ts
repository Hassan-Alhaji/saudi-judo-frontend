import { test, expect } from '@playwright/test';

test.describe('Phase B: Permissions & Role Access', () => {

  const playerUser = {
    id: 99,
    name: 'عبدالله محمد',
    saj_id: 'SAJ-12345',
    role: 'player'
  };

  const adminUser = {
    id: 1,
    name: 'مدير النظام',
    saj_id: 'SAJ-10000',
    role: 'admin'
  };

  test('1. Player sees only player links and cannot access admin data', async ({ page }) => {
    // 1. Mock Login as Player
    await page.goto('/');
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token-player');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(playerUser));

    // Mock dashboard initial APIs
    await page.route('**/api/tickets/my/', route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/settings/', route => route.fulfill({ status: 200, json: {} }));

    // 2. Go to dashboard
    await page.goto('/dashboard');
    
    // 3. Verify sidebar has player links but NO admin links
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('text=إنجازاتي')).toBeVisible();
    await expect(sidebar.locator('text=المستخدمين والصلاحيات')).toBeHidden();

    // 4. Force navigation to admin page
    await page.route('**/api/admin/users/**', route => route.fulfill({
      status: 403,
      json: { error: "ليس لديك صلاحية" }
    }));
    await page.goto('/dashboard/admin/users');

    // 5. Verify the admin page doesn't show data or admin controls
    // The "Add User" button should be hidden for non-admins
    await expect(page.locator('button', { hasText: 'إضافة مستخدم جديد' })).toBeHidden();

    // The table should be empty because the API returned 403
    await expect(page.locator('text=لا يوجد مستخدمين.')).toBeVisible();
  });

  test('2. Admin sees admin links and can access admin data', async ({ page }) => {
    // 1. Mock Login as Admin
    await page.goto('/');
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token-admin');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(adminUser));

    // Mock dashboard initial APIs
    await page.route('**/api/tickets/my/', route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/settings/', route => route.fulfill({ status: 200, json: {} }));

    // 2. Go to dashboard
    await page.goto('/dashboard');

    // 3. Verify sidebar has admin links
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('text=المستخدمين والصلاحيات')).toBeVisible();

    // 4. Navigate to admin page
    const mockUsers = {
      results: [
        { id: 2, name: 'موظف دعم', email: 'cs@saj.sa', role: 'customer_service', saj_id: 'SAJ-10001', is_active: true }
      ]
    };
    await page.route('**/api/admin/users/**', route => route.fulfill({
      status: 200,
      json: mockUsers
    }));
    await page.goto('/dashboard/admin/users');

    // 5. Verify the admin page shows data and admin controls
    // The "Add User" button should be visible for admins
    await expect(page.locator('button', { hasText: 'إضافة مستخدم جديد' })).toBeVisible();

    // The table should show the mocked user
    await expect(page.locator('text=موظف دعم')).toBeVisible();
    await expect(page.locator('text=خدمة العملاء (CS)')).toBeVisible();
  });

});
