import { test, expect } from '@playwright/test';

// Use the production URL passed via env var, or a default fallback
const LIVE_URL = process.env.LIVE_URL || 'https://saudi-judo-frontend.vercel.app/'; // Change this to your actual live URL

test.describe('Live Production Checks', () => {
  // Option: Use a blank config just for this test, disregarding playwright.config.ts base setup
  test.use({ baseURL: LIVE_URL });

  test('Homepage loads and images return 200 OK', async ({ page }) => {
    // Navigate to live URL
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Ensure the main page loads successfully (Not a 404 or 500)
    expect(response?.status()).toBe(200);

    // Ensure the title contains "الاتحاد السعودي للجودو"
    await expect(page).toHaveTitle(/الاتحاد السعودي للجودو/i);

    // Verify all images on the homepage load correctly
    const images = await page.$$eval('img', imgs => imgs.map(img => img.src));
    for (const src of images) {
      if (src && src.startsWith('http')) {
        const imgRes = await page.request.get(src);
        expect(imgRes.ok()).toBeTruthy(); // This ensures images aren't broken on production
      }
    }
  });

  // Example of testing a core online functionality: QR scanning logic / APIs
  // test('Verify online APIs or static files', async ({ request }) => { ... })
});
