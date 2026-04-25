/**
 * State persistence tests — entities added survive a page reload
 * because they are saved to localStorage.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement } from './helpers.js';

/** Wait for the app to be ready after a page reload. */
async function waitForReady(page) {
    await page.waitForSelector('#players-layer', { state: 'attached' });
    await page.waitForTimeout(300);
}

test.describe('State persistence', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('added ball persists after page reload', async ({ page }) => {
        await addBall(page);
        await expect(page.locator('[data-ball]')).toHaveCount(1);

        await page.reload();
        await waitForReady(page);

        await expect(page.locator('[data-ball]')).toHaveCount(1);
    });

    test('added plate persists after page reload', async ({ page }) => {
        await addPlate(page);
        await page.reload();
        await waitForReady(page);
        await expect(page.locator('[data-plate]')).toHaveCount(1);
    });

    test('added element persists after page reload', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        await addElement(page, 'cone');
        await page.reload();
        await waitForReady(page);
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1);
    });

    test('ball position is preserved after reload', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click();
        await page.waitForTimeout(100);
        const from = await ball.boundingBox();
        const cx = from.x + from.width / 2;
        const cy = from.y + from.height / 2;

        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + 120, cy + 80, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        const afterDrag = await ball.boundingBox();

        await page.reload();
        await waitForReady(page);

        const afterReload = await page.locator('[data-ball]').first().boundingBox();
        expect(Math.abs(afterReload.x - afterDrag.x)).toBeLessThan(20);
        expect(Math.abs(afterReload.y - afterDrag.y)).toBeLessThan(20);
    });

    test('removing a ball is persisted after reload', async ({ page }) => {
        await addBall(page);
        const ball = page.locator('[data-ball]').first();
        await ball.click({ button: 'right' });
        await page.locator('.context-menu-item[data-action="remove"]').first().click();
        await expect(page.locator('[data-ball]')).toHaveCount(0);

        await page.reload();
        await waitForReady(page);

        await expect(page.locator('[data-ball]')).toHaveCount(0);
    });
});
