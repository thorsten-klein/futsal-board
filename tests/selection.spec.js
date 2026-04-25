/**
 * Selection tests — clicking entities selects them (selected CSS class),
 * clicking elsewhere deselects them.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement } from './helpers.js';

test.describe('Selection', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('clicking a ball selects it (adds ball-selected class)', async ({ page }) => {
        const ball = await addBall(page);
        await expect(ball).not.toHaveClass(/ball-selected/);
        await ball.click();
        await expect(ball).toHaveClass(/ball-selected/, { timeout: 2000 });
    });

    test('clicking a plate selects it', async ({ page }) => {
        const plate = await addPlate(page);
        await expect(plate).not.toHaveClass(/plate-selected/);
        await plate.click();
        await expect(plate).toHaveClass(/plate-selected/, { timeout: 2000 });
    });

    test('clicking an element selects it', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await expect(el).not.toHaveClass(/element-selected/);
        await el.click();
        await expect(el).toHaveClass(/element-selected/, { timeout: 2000 });
    });

    test('clicking elsewhere deselects a ball', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click();
        await expect(ball).toHaveClass(/ball-selected/);

        // Click on the board canvas at a spot far from the ball
        const canvas = page.locator('#board-canvas');
        const bb = await canvas.boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10);
        await expect(ball).not.toHaveClass(/ball-selected/, { timeout: 2000 });
    });

    test('only one ball is selected at a time', async ({ page }) => {
        const ball1 = await addBall(page, 0);
        const ball2 = await addBall(page, 1);

        await ball1.click();
        await expect(ball1).toHaveClass(/ball-selected/);

        await ball2.click();
        await expect(ball2).toHaveClass(/ball-selected/);
        await expect(ball1).not.toHaveClass(/ball-selected/);
    });

    test('Delete key removes selected ball', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click();
        await expect(ball).toHaveClass(/ball-selected/);

        await page.keyboard.press('Delete');
        await expect(page.locator('[data-ball]')).toHaveCount(0);
    });

    test('Delete key removes selected element', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        const el = await addElement(page, 'cone');
        await el.click();
        await expect(el).toHaveClass(/element-selected/);

        await page.keyboard.press('Delete');
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before);
    });
});
