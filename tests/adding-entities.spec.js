/**
 * Tests for adding entities (balls, plates, elements) via sidebar clicks
 * and verifying they appear on the board.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement } from './helpers.js';

test.describe('Adding entities', () => {
    // The app creates 2 default goal elements on every fresh board.
    // Tests that count elements must account for this baseline.
    const DEFAULT_ELEMENTS = 2;

    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('clicking ball template adds a ball to the board', async ({ page }) => {
        await expect(page.locator('[data-ball]')).toHaveCount(0);
        await addBall(page, 0);
        await expect(page.locator('[data-ball]')).toHaveCount(1);
        // Ball SVG should be visible inside the players-layer
        const ball = page.locator('[data-ball]').first();
        await expect(ball).toBeVisible();
    });

    test('clicking multiple ball templates adds multiple balls', async ({ page }) => {
        await addBall(page, 0);
        await addBall(page, 1);
        await addBall(page, 2);
        await expect(page.locator('[data-ball]')).toHaveCount(3);
    });

    test('clicking plate template adds a plate to the board', async ({ page }) => {
        await expect(page.locator('[data-plate]')).toHaveCount(0);
        await addPlate(page, 0);
        await expect(page.locator('[data-plate]')).toHaveCount(1);
        const plate = page.locator('[data-plate]').first();
        await expect(plate).toBeVisible();
    });

    test('clicking cone button adds an element', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        await addElement(page, 'cone');
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1);
        // The newly added element has data-element set to its ID (not type)
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(DEFAULT_ELEMENTS + 1);
    });

    test('clicking goal button adds a goal element', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        await addElement(page, 'goal');
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1);
    });

    test('clicking pole button adds a pole element', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        await addElement(page, 'pole');
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1);
    });

    test('adding a ball positions it within the board', async ({ page }) => {
        const ball = await addBall(page);
        const ballBox = await ball.boundingBox();
        const boardBox = await page.locator('#board-canvas').boundingBox();

        // Ball centre should be within board bounds (with margin)
        const ballCX = ballBox.x + ballBox.width / 2;
        const ballCY = ballBox.y + ballBox.height / 2;
        expect(ballCX).toBeGreaterThan(boardBox.x - 50);
        expect(ballCX).toBeLessThan(boardBox.x + boardBox.width + 50);
        expect(ballCY).toBeGreaterThan(boardBox.y - 50);
        expect(ballCY).toBeLessThan(boardBox.y + boardBox.height + 50);
    });
});
