import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Element Drag Jump Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('rebounce element jumps when dragged from edge in TOUCH MODE', async ({ page }) => {
        // Enable TOUCH MODE (this is where the bug occurs)
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Add a rebounce element (anchor at bottom-center)
        await page.locator('.element-btn[data-element="rebounce"]').click();
        await page.waitForTimeout(200);

        const rebounceEl = page.locator('.element-svg').first();
        const beforeBox = await rebounceEl.boundingBox();


        // In TOUCH MODE: Click at the TOP edge (far from anchor at bottom-center)
        // This should reproduce the jump bug
        const clickX = beforeBox.x + beforeBox.width / 2;
        const clickY = beforeBox.y + 5;  // 5px from top edge


        // Start drag
        await page.mouse.move(clickX, clickY);
        await page.mouse.down();
        await page.waitForTimeout(10);

        // Move just 1px to trigger the mousemove handler
        await page.mouse.move(clickX + 1, clickY + 1);
        await page.waitForTimeout(50);

        const afterBox = await rebounceEl.boundingBox();

        // Calculate the jump
        const jumpX = afterBox.x - beforeBox.x;
        const jumpY = afterBox.y - beforeBox.y;


        // BUG: In touch mode with dragOffset={0,0}, the anchor snaps to finger position
        // So the element jumps DOWN to put its anchor (bottom-center) under our click point
        // Should move ~1px, but actually jumps much more
        expect(Math.abs(jumpX - 1)).toBeLessThan(5);  // This should PASS
        expect(Math.abs(jumpY - 1)).toBeLessThan(5);  // This will FAIL - showing the bug

        await page.mouse.up();
    });
});
