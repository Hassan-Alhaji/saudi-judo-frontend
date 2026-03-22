import { test, expect } from '@playwright/test';

test.describe('Phase B: Certificates (Issue, Download, Verify)', () => {

  const dummyCertificates = [
    {
      id: '999',
      certificate_number: 'SAJ-CERT-2026-999',
      issue_date: '2026-03-20',
      belt_name: 'الحزام الأصفر',
      belt_color: 'yellow',
      player_name_ar: 'عبدالله محمد',
      player_name_en: 'Abdullah Mohammed',
      pdf_file: 'https://example.com/dummy-cert.pdf',
      video_link: null
    }
  ];

  const dummyVerificationData = {
    certificate: {
      id: '999',
      certificate_number: 'SAJ-CERT-2026-999',
      issue_date: '2026-03-20',
      player_name: 'عبدالله محمد',
      player_saj_id: 'SAJ-12345',
      belt_name: 'الحزام الأصفر',
      is_active: true,
      coach_name: 'كابتن محمود'
    }
  };

  test('1. Player views achievements, sees belt progress and can download certificate', async ({ page }) => {
    // 1. Mock Login
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('django_access_token', 'fake-token');
      localStorage.setItem('django_user', JSON.stringify({
        id: 99,
        name: 'عبدالله محمد',
        role: 'player'
      }));
    });

    // 2. Mock Certificates API
    await page.route('**/api/certificates/my/', route => route.fulfill({
      status: 200,
      json: dummyCertificates
    }));

    // 3. Go to Achievements page
    await page.goto('/dashboard/achievements');

    // 4. Verify the page title
    await expect(page.locator('h2', { hasText: 'إنجازاتي وشهاداتي' })).toBeVisible();

    // 5. Verify the belt progress timeline shows the yellow belt is achieved
    const yellowBeltTimelineItem = page.locator('div.w-16.group', { hasText: 'أصفر' });
    // If achieved, the label will be dark gray (text-gray-800) instead of gray-400
    await expect(yellowBeltTimelineItem.locator('span')).toHaveClass(/text-gray-800/);

    // 6. Verify the Certificate Card details
    const certCard = page.locator('div.bg-white.rounded-3xl.shadow-sm').filter({ hasText: 'SAJ-CERT-2026-999' }).first();
    // Since the page has a layout with overlapping text, let's just search the body or visible texts
    await expect(page.locator('h3', { hasText: 'الحزام الأصفر' })).toBeVisible();
    await expect(page.locator('p', { hasText: 'عبدالله محمد' })).toBeVisible();

    // 7. Verify the PDF download link is present and correct
    const downloadLink = page.locator('a', { hasText: 'تحميل الشهادة (PDF)' });
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute('href', 'https://example.com/dummy-cert.pdf');

    // 8. Verify the verification page link is present and correct
    const verifyLink = page.locator('a', { hasText: 'صفحة التحقق' });
    await expect(verifyLink).toBeVisible();
    await expect(verifyLink).toHaveAttribute('href', '/verify/cert/999');
  });

  test('2. Public user can verify certificate authenticity via direct link', async ({ page }) => {
    // 1. Mock Verification API
    await page.route('**/api/certificates/999/verify/', route => route.fulfill({
      status: 200,
      json: dummyVerificationData
    }));

    // 2. Go to the public verification URL
    // This tests that the page loads even without login
    await page.goto('/verify/cert/999');

    // 3. Verify Page Header
    await expect(page.locator('h1', { hasText: 'بوابة توثيق الشهادات' })).toBeVisible();

    // 4. Verify authenticity badge
    await expect(page.locator('div', { hasText: 'شهادة موثقة' }).first()).toBeVisible();

    // 5. Verify Certificate Data
    await expect(page.locator('p', { hasText: 'SAJ-CERT-2026-999' })).toBeVisible();
    
    // Check player name is shown in the dedicated card row
    const playerNameRow = page.locator('span.block.text-gray-900.text-lg.font-black');
    await expect(playerNameRow).toHaveText('عبدالله محمد');

    // Check Belt Name
    await expect(page.locator('span', { hasText: 'الحزام المجتاز' }).locator('..').locator('span:nth-child(2)')).toHaveText('الحزام الأصفر');

    // Check Coach
    await expect(page.locator('span', { hasText: 'المدرب المشرف' }).locator('..').locator('span:nth-child(2)')).toHaveText('كابتن محمود');

    // Check Issue Date
    await expect(page.locator('span', { hasText: 'تاريخ الإصدار' }).locator('..').locator('span:nth-child(2)')).toHaveText('2026-03-20');
  });

});
