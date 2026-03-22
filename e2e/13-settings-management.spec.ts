import { test, expect } from '@playwright/test';

test.describe('Settings Management Tests', () => {

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

  test.beforeEach(async ({ page }) => {
    // Mock the backend APIs
    await page.route('**/api/dropdowns/', async route => {
      if (route.request().method() === 'POST') {
        const data = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({ status: 201, json: { message: "تمت الإضافة بنجاح", item: { id: 99, category: data.category, name_ar: data.name_ar, name_en: data.name_en } } });
      } else {
        await route.fulfill({ 
          status: 200, 
          json: { city: [], nationality: [], club: [], region: [] }
        });
      }
    });

    await page.route('**/api/belts/', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 99, name: 'Belt', price: 150 }});
      } else {
        await route.fulfill({ status: 200, json: [] });
      }
    });

    await page.route('**/api/settings/', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 200, json: { message: "Success" }});
      } else {
        await route.fulfill({ status: 200, json: { is_maintenance_mode: false, maintenance_message_ar: '', maintenance_message_en: '', terms_and_conditions_ar: 'شروط قديمة' } });
      }
    });

    await page.route('**/api/tickets/my/', async route => { await route.fulfill({ status: 200, json: [] }); });

    await page.goto('/');
    await loginAs(page, adminObj);
    await page.goto('/dashboard/settings');
  });

  test('Admin can add a new City', async ({ page }) => {
    await page.click('button:has-text("المدن")');
    await page.click('button:has-text("+ إضافة جديد")');
    await page.fill('input[placeholder="مثال: الرياض"]', 'الدمام');
    await page.fill('input[placeholder="Example: Riyadh"]', 'Dammam');
    const requestPromise = page.waitForRequest(req => req.url().includes('/api/dropdowns/') && req.method() === 'POST');
    await page.click('button[type="submit"]:has-text("حفظ")');
    
    const request = await requestPromise;
    const postData = JSON.parse(request.postData() || '{}');
    expect(postData.category).toBe('city');
    expect(postData.name_ar).toBe('الدمام');
  });

  test('Admin can add a new Nationality', async ({ page }) => {
    await page.click('button:has-text("الجنسيات")');
    await page.click('button:has-text("+ إضافة جديد")');
    await page.fill('input[placeholder="مثال: الرياض"]', 'سعودي');
    await page.fill('input[placeholder="Example: Riyadh"]', 'Saudi');
    const requestPromise = page.waitForRequest(req => req.url().includes('/api/dropdowns/') && req.method() === 'POST');
    await page.click('button[type="submit"]:has-text("حفظ")');

    const request = await requestPromise;
    const postData = JSON.parse(request.postData() || '{}');
    expect(postData.category).toBe('nationality');
  });

  test('Admin can add a new Club', async ({ page }) => {
    await page.click('button:has-text("الأندية")');
    await page.click('button:has-text("+ إضافة جديد")');
    await page.fill('input[placeholder="مثال: الرياض"]', 'نادي الهلال');
    await page.fill('input[placeholder="Example: Riyadh"]', 'Al Hilal Club');
    const requestPromise = page.waitForRequest(req => req.url().includes('/api/dropdowns/') && req.method() === 'POST');
    await page.click('button[type="submit"]:has-text("حفظ")');

    const request = await requestPromise;
    const postData = JSON.parse(request.postData() || '{}');
    expect(postData.category).toBe('club');
  });

  test('Admin can add a new Region', async ({ page }) => {
    await page.click('button:has-text("المناطق")');
    await page.click('button:has-text("+ إضافة جديد")');
    await page.fill('input[placeholder="مثال: الرياض"]', 'المنطقة الشرقية');
    await page.fill('input[placeholder="Example: Riyadh"]', 'Eastern Region');
    const requestPromise = page.waitForRequest(req => req.url().includes('/api/dropdowns/') && req.method() === 'POST');
    await page.click('button[type="submit"]:has-text("حفظ")');

    const request = await requestPromise;
    const postData = JSON.parse(request.postData() || '{}');
    expect(postData.category).toBe('region');
  });

  test('Admin can add a Belt price', async ({ page }) => {
    await page.click('button:has-text("أسعار الأحزمة")');
    await page.click('button:has-text("+ إضافة جديد")');
    await page.fill('input[placeholder="مثال: أسود (Dan 1)"]', 'أصفر');
    await page.fill('input[placeholder="مثال: 150"]', '100');
    const requestPromise = page.waitForRequest(req => req.url().includes('/api/belts/') && req.method() === 'POST');
    await page.click('button[type="submit"]:has-text("حفظ")');

    const request = await requestPromise;
    const postData = JSON.parse(request.postData() || '{}');
    expect(postData.name).toBe('أصفر');
    expect(postData.price).toBe(100);
  });

  test('Admin can save Registration Terms', async ({ page }) => {
    await page.click('button:has-text("شروط التسجيل")');
    
    // Fill the textarea with new terms
    const termsField = page.locator('textarea[placeholder="أدخل نص الشروط والأحكام هنا..."]');
    await termsField.fill('شروط تسجيل تجريبية جديدة!');

    // The backend mock is already set up to return 200 OK. We just click and wait for the success alert.
    const requestPromise = page.waitForRequest(req => req.url().includes('/api/settings/') && req.method() === 'PUT');
    const dialogPromise = page.waitForEvent('dialog');
    await page.click('button[type="submit"]:has-text("حفظ سياسة التسجيل")');
    
    const request = await requestPromise;
    const dialog = await dialogPromise;
    await dialog.accept();

    const postData = JSON.parse(request.postData() || '{}');
    expect(postData.terms_and_conditions_ar).toBe('شروط تسجيل تجريبية جديدة!');
  });

  test('Admin can enable Maintenance Mode', async ({ page }) => {
    await page.click('button:has-text("وضع الصيانة")');
    
    // Check the box
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();

    // Fill the messages
    await page.fill('textarea[placeholder="مثال: نعتذر لكم الموقع تحت الصيانة يرجى مراجعتنا وقت لاحق"]', 'مغلق للصيانة');
    await page.fill('textarea[placeholder="Example: The site is under maintenance. Please try again later."]', 'Closed for maintenance');

    const requestPromise = page.waitForRequest(req => req.url().includes('/api/settings/') && req.method() === 'PUT');
    const dialogPromise = page.waitForEvent('dialog');
    await page.click('button[type="submit"]:has-text("حفظ الإعدادات")');

    const request = await requestPromise;
    const dialog = await dialogPromise;
    await dialog.accept();

    const postData = JSON.parse(request.postData() || '{}');
    expect(postData.is_maintenance_mode).toBe(true);
    expect(postData.maintenance_message_ar).toBe('مغلق للصيانة');
    expect(postData.maintenance_message_en).toBe('Closed for maintenance');
  });

});
