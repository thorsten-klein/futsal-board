/**
 * Delete key tests.
 *
 * For each entity type:
 *   1. Add the entity
 *   2. Click it to select it
 *   3. Press Delete
 *   4. Assert the entity is gone from the board
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement } from './helpers.js';

async function addShape(page, type = 'rectangle') {
    const before = await page.locator('[data-shape]').count();
    await page.locator(`.draw-btn[data-draw="${type}"]`).click();
    await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-shape]').nth(before);
}

async function addPlayer(page) {
    const before = await page.locator('[data-player-id]').count();
    await page.locator('.team-player-template').first().click();
    await expect(page.locator('[data-player-id]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-player-id]').nth(before);
}

test.describe('Delete key removes selected entity', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    test('Delete removes selected ball', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click();
        await expect(ball).toBeVisible();
        const count = await page.locator('[data-ball]').count();
        await page.keyboard.press('Delete');
        await expect(page.locator('[data-ball]')).toHaveCount(count - 1, { timeout: 3000 });
    });

    test('Delete removes selected plate', async ({ page }) => {
        const plate = await addPlate(page);
        await plate.click();
        const count = await page.locator('[data-plate]').count();
        await page.keyboard.press('Delete');
        await expect(page.locator('[data-plate]')).toHaveCount(count - 1, { timeout: 3000 });
    });

    test('Delete removes selected player', async ({ page }) => {
        const player = await addPlayer(page);
        await player.click();
        const count = await page.locator('[data-player-id]').count();
        await page.keyboard.press('Delete');
        await expect(page.locator('[data-player-id]')).toHaveCount(count - 1, { timeout: 3000 });
    });

    test('Delete removes selected element (cone)', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click();
        const count = await page.locator('#players-layer [data-element]').count();
        await page.keyboard.press('Delete');
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(count - 1, { timeout: 3000 });
    });

    test('Delete removes selected shape (rectangle)', async ({ page }) => {
        const shape = await addShape(page, 'rectangle');
        await shape.click();
        const count = await page.locator('[data-shape]').count();
        await page.keyboard.press('Delete');
        await expect(page.locator('[data-shape]')).toHaveCount(count - 1, { timeout: 3000 });
    });

    test('Delete removes selected shape (line)', async ({ page }) => {
        const shape = await addShape(page, 'line');
        await shape.click();
        const count = await page.locator('[data-shape]').count();
        await page.keyboard.press('Delete');
        await expect(page.locator('[data-shape]')).toHaveCount(count - 1, { timeout: 3000 });
    });

    test('Delete removes selected shape (ellipse)', async ({ page }) => {
        const shape = await addShape(page, 'ellipse');
        await shape.click();
        const count = await page.locator('[data-shape]').count();
        await page.keyboard.press('Delete');
        await expect(page.locator('[data-shape]')).toHaveCount(count - 1, { timeout: 3000 });
    });

    test('Delete removes selected shape (arrow)', async ({ page }) => {
        const shape = await addShape(page, 'arrow');
        await shape.click();
        const count = await page.locator('[data-shape]').count();
        await page.keyboard.press('Delete');
        await expect(page.locator('[data-shape]')).toHaveCount(count - 1, { timeout: 3000 });
    });
});
