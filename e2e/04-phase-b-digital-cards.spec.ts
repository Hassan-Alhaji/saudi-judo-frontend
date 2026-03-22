import { test, expect } from '@playwright/test';

test.describe('Phase B: Digital Cards & QR Logic', () => {

  const activePlayerUser = {
    id: 99,
    name: 'عبدالله محمد',
    saj_id: 'SAJ-12345',
    role: 'player',
    is_active_member: true,
    first_name_ar: 'عبدالله',
    last_name_ar: 'محمد',
    first_name_en: 'Abdullah',
    last_name_en: 'Mohammed',
    gender: 'M',
    club: 'نادي الشباب',
    nationality: 'سعودي',
    blood_type: 'O+',
    current_belt_color: 'orange',
    current_belt_name_ar: 'برتقالي',
  };

  const pendingPlayerUser = {
    ...activePlayerUser,
    is_active_member: false,
  };

  test('1. Active player sees Digital Card with QR Code and can expand it', async ({ page }) => {
    await page.goto('/');

    // Mock Active Player Login
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(activePlayerUser));

    // Mocks for dropdowns and tickets that profile fetches
    await page.route('**/api/tickets/my/', route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/dropdowns/', route => route.fulfill({ status: 200, json: {} }));

    await page.goto('/dashboard/profile');

    // Wait for the specific heading indicating an active digital card
    await expect(page.locator('text=البطاقة الرقمية الرسمية')).toBeVisible({ timeout: 10000 });
    
    // Verify Card Details
    const cardLoc = page.locator('.aspect-\\[1\\.586\\/1\\]').first();
    await expect(cardLoc).toBeVisible();
    await expect(cardLoc.locator('text=SAUDI JUDO')).toBeVisible();
    await expect(cardLoc.locator('text=SAJ-12345')).toBeVisible();
    await expect(cardLoc.locator('text=O+')).toBeVisible();
    await expect(cardLoc.locator('text=نادي الشباب')).toBeVisible();
    
    // Verify QR Code is present
    // qrcode.react renders an SVG. Since there are no other SVGs in the card body, it's the first one.
    await expect(cardLoc.locator('svg').first()).toBeVisible();

    // Click to expand card
    await cardLoc.click();
    
    // Check Full Screen Modal
    const modalCloseBtn = page.locator('text=×');
    await expect(modalCloseBtn).toBeVisible({ timeout: 5000 });

    // The modal should also contain SAJ-12345
    const expandedCard = page.locator('.fixed.inset-0').locator('text=SAJ-12345');
    await expect(expandedCard).toBeVisible();

    // Close Modal by clicking the backdrop (top-left corner to avoid the card itself)
    const modalBackdrop = page.locator('.fixed.inset-0').first();
    await modalBackdrop.click({ position: { x: 10, y: 10 } });
    await expect(modalBackdrop).toBeHidden();
  });

  test('2. Pending player sees Review message instead of Digital Card', async ({ page }) => {
    await page.goto('/');

    // Mock Pending Player Login
    await page.evaluate((userStr) => {
      localStorage.setItem('django_access_token', 'fake-token-pending');
      localStorage.setItem('django_user', userStr);
    }, JSON.stringify(pendingPlayerUser));

    await page.route('**/api/tickets/my/', route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/dropdowns/', route => route.fulfill({ status: 200, json: {} }));

    await page.goto('/dashboard/profile');

    // The Digital Card should NOT be visible
    await expect(page.locator('text=البطاقة الرقمية الرسمية')).toBeHidden({ timeout: 5000 });

    // The Pending Review box should be visible
    await expect(page.locator('text=حسابك قيد المراجعة')).toBeVisible();
    await expect(page.locator('text=جاري التحقق من البيانات والمطابقة')).toBeVisible();
  });
});
