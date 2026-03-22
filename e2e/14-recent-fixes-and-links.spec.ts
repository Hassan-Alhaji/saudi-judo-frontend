import { test, expect } from '@playwright/test';

test.describe('Phase C: Regression and Link Checks', () => {

  const adminObj = {
    id: 1,
    name: 'مدير النظام',
    role: 'admin',
    saj_id: 'SAJ-1'
  };

  async function loginAsAdmin(page) {
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(adminObj));
  }

  test.beforeEach(async ({ page }) => {
    // Basic mocks to prevent network timeouts for all tests
    await page.route('**/api/tickets/my/', async route => { await route.fulfill({ status: 200, json: { results: [] } }); });
    await page.route('**/api/settings/', async route => { await route.fulfill({ status: 200, json: {} }); });
    await page.route('**/api/tickets/my/*', async route => { await route.fulfill({ status: 200, json: { results: [] } }); });
  });

  test('All main dashboard links load successfully without crashing (Status 200)', async ({ page }) => {
    
    // Mock user statistics to avoid profile crashing
    await page.route('**/api/admin/users/?role=player,coach', async route => { await route.fulfill({ status: 200, json: { results: [] } }); });
    await page.route('**/api/admin/users/?exclude_roles=player,coach', async route => { await route.fulfill({ status: 200, json: { results: [] } }); });
    await page.route('**/api/dropdowns/', async route => { await route.fulfill({ status: 200, json: { region: [] } }); });

    await page.goto('/');
    await loginAsAdmin(page);
    
    const links = [
      '/dashboard',
      '/dashboard/tickets',
      '/dashboard/players',
      '/dashboard/admin/users',
      '/dashboard/settings',
      '/dashboard/profile',
      '/dashboard/stats'
    ];

    for (const link of links) {
      const response = await page.goto(link);
      // Wait for network idle or domcontentloaded to ensure no immediate crash happens
      await page.waitForLoadState('domcontentloaded');
      
      // Ensure the page didn't throw a generic 404 or 500 Next.js error page
      const pageText = await page.locator('body').innerText();
      expect(pageText).not.toContain('404');
      expect(pageText).not.toContain('500 Internal Server Error');
      // If the dashboard layout loaded, a navigation header is present
      await expect(page.locator('nav')).toBeVisible();
    }
  });

  test('Add New User modal does NOT contain password fields (Regression Fix)', async ({ page }) => {
    await page.route('**/api/admin/users/?exclude_roles=player,coach', async route => { 
      await route.fulfill({ status: 200, json: { results: [] } }); 
    });
    await page.route('**/api/dropdowns/', async route => { 
      await route.fulfill({ status: 200, json: { region: [{ id: 1, name_ar: 'الرياض' }] } }); 
    });

    await page.goto('/');
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/users');

    await page.getByRole('button', { name: 'إضافة مستخدم جديد' }).click();

    // Verify modal is open
    await expect(page.locator('h3', { hasText: 'إضافة مستخدم جديد' })).toBeVisible();

    // Assert that NO password input exists on the page
    const passwordInputs = await page.locator('input[type="password"]').count();
    expect(passwordInputs).toBe(0);
  });

  test('Ticket Details page shows player email to prevent regression (Regression Fix)', async ({ page }) => {
    const mockTicket = {
      id: 999,
      status: 'pending_coach',
      ticket_type: 'promotion',
      description: 'Test Description',
      player_name: 'Test Player',
      player_email: 'testplayer@saudi-judo.com',
      coach_name: 'Test Coach',
      coach_email: 'testcoach@saudi-judo.com',
      history: [],
      messages: []
    };

    await page.route('**/api/tickets/999/', async route => { 
      await route.fulfill({ status: 200, json: mockTicket }); 
    });
    // Need a mock for dropdowns since ticket detail loads it for CS/Admins
    await page.route('**/api/dropdowns/', async route => { 
        await route.fulfill({ status: 200, json: {} }); 
    });
    // Need a mock for employees
    await page.route('**/api/employees/', async route => { 
        await route.fulfill({ status: 200, json: [] }); 
    });

    await page.goto('/');
    await loginAsAdmin(page);
    await page.goto('/dashboard/tickets/999');

    // Email should be visible in the player card
    // The exact text we used was "البريد الإلكتروني:"
    await expect(page.locator('span:has-text("البريد الإلكتروني:")')).toHaveCount(2); // one for player, one for coach
    await expect(page.locator('text=testplayer@saudi-judo.com')).toBeVisible();
    await expect(page.locator('text=testcoach@saudi-judo.com')).toBeVisible();
  });

});
