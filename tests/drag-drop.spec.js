/**
 * Drag-and-drop tests — verify entities can be dragged to new positions
 * on the board.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement } from './helpers.js';

/** Get centre of a locator's bounding box */
async function centre(locator) {
    const bb = await locator.boundingBox();
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
}

test.describe('Drag and drop', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('ball can be dragged to a new position', async ({ page }) => {
        const ball = await addBall(page);
        // Click to select first
        await ball.click();
        await page.waitForTimeout(100);

        const from = await centre(ball);
        const to = { x: from.x + 120, y: from.y + 80 };

        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);

        const after = await centre(ball);
        // Position should have moved by at least 50px in x
        expect(Math.abs(after.x - from.x)).toBeGreaterThan(50);
    });

    test('plate can be dragged to a new position', async ({ page }) => {
        const plate = await addPlate(page);
        await plate.click();
        await page.waitForTimeout(100);

        const from = await centre(plate);
        const to = { x: from.x - 100, y: from.y + 60 };

        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);

        const after = await centre(plate);
        expect(Math.abs(after.x - from.x)).toBeGreaterThan(50);
    });

    test('element (cone) can be dragged to a new position', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click();
        await page.waitForTimeout(100);

        const from = await centre(el);
        const to = { x: from.x + 100, y: from.y - 60 };

        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);

        const after = await centre(el);
        expect(Math.abs(after.x - from.x)).toBeGreaterThan(50);
    });

    test('dragging a ball does not move other balls', async ({ page }) => {
        const ball1 = await addBall(page, 0);
        const ball2 = await addBall(page, 1);

        await ball1.click();
        await page.waitForTimeout(100);

        const b2before = await centre(ball2);
        const from = await centre(ball1);

        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(from.x + 150, from.y + 100, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);

        const b2after = await centre(ball2);
        // Ball2 should not have moved significantly
        expect(Math.abs(b2after.x - b2before.x)).toBeLessThan(5);
        expect(Math.abs(b2after.y - b2before.y)).toBeLessThan(5);
    });

    test('ball stays within board bounds when dragged past edge', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click();
        await page.waitForTimeout(100);

        const boardBox = await page.locator('#board-canvas').boundingBox();
        const from = await centre(ball);

        // Drag far outside the right edge
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(boardBox.x + boardBox.width + 500, from.y, { steps: 20 });
        await page.mouse.up();
        await page.waitForTimeout(200);

        const after = await centre(ball);
        // Ball should be clamped to within the board (with some tolerance)
        expect(after.x).toBeLessThan(boardBox.x + boardBox.width + 60);
    });
});
