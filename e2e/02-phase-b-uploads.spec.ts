import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Phase B: File Upload Tests', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Setup localStorage to simulate an active logged-in user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', JSON.stringify({
        id: 99,
        name_ar: 'اختبار لاعب',
        name_en: 'Test Player',
        role: 'player',
        saj_id: 'SAJ-9999',
        is_active_member: true,
        current_belt_color: 'yellow'
      }));
    });

    // Mock the backend requests so the page doesn't crash from network failures
    await page.route('**/api/tickets/my/', route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/belts/', route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/dropdowns/', route => route.fulfill({ status: 200, json: { city: [], club: [], nationality: [{id: 1, name_en: 'Saudi', name_ar: 'سعودي'}] } }));
  });

  test('1. Upload Player Profile Photo successfully', async ({ page }) => {
    // Navigate to profile
    await page.goto('/dashboard/profile');

    // Click on Edit Data
    const editBtn = page.locator('button', { hasText: 'تعديل البيانات' });
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // Prepare a tiny dummy image in memory to upload
    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // We need to write it to disk temporarily because Playwright setInputFiles expects a real file or buffer array
    // We pass the buffer directly using name and mimeType format
    const photoInput = page.locator('input#photo-upload');
    await photoInput.setInputFiles({
      name: 'test-profile.png',
      mimeType: 'image/png',
      buffer: dummyImageBuffer
    });

    // We must also upload the National ID photo because it is required for name/photo changes
    const idPhotoInput = page.locator('input[name="national_id_photo_direct"]');
    await expect(idPhotoInput).toBeVisible();
    await idPhotoInput.setInputFiles({
      name: 'test-id.png',
      mimeType: 'image/png',
      buffer: dummyImageBuffer
    });

    // We also need to fill the required text inputs to allow form submission
    await page.fill('input[name="first_name_ar"]', 'لاعب');
    await page.fill('input[name="father_name_ar"]', 'مجدد');
    await page.fill('input[name="last_name_ar"]', 'تست');
    await page.fill('input[name="first_name_en"]', 'Updated');
    await page.fill('input[name="father_name_en"]', 'Player');
    await page.fill('input[name="last_name_en"]', 'Test');
    await page.selectOption('select[name="id_type"]', 'national_id');
    await page.fill('input[name="national_id"]', '1000000000');
    
    // In our beforeEach, we set the route to return valid nationality data. We need to set nationality correctly for select Option:
    await page.selectOption('select[name="nationality"]', 'Saudi');
    await page.fill('input[name="phone_number"]', '0500000000');
    
    // We add a mock for the form submission
    await page.route('**/api/profile/update/', async route => {
      const req = route.request();
      // Ensure the request is multipart form data
      expect(req.headers()['content-type']).toContain('multipart/form-data');
      
      route.fulfill({
        status: 200,
        json: {
          message: "Profile updated successfully",
          user: { name_ar: 'لاعب مجدد' },
          status: 'success'
        }
      });
    });

    // Click save
    const saveBtn = page.locator('button', { hasText: 'حفظ التغييرات' });
    await saveBtn.click();

    // Expect a success toast
    const toastMessage = page.locator('.go3958317564'); // Hot toast container or generic text matching
    await expect(page.locator('text=تم تحديث البيانات بنجاح')).toBeVisible({ timeout: 5000 });
  });

});
