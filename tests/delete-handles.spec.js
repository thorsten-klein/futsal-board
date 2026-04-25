/**
 * Tests that rotation and resize handles are removed when an object is deleted.
 *
 * Covers both Delete key and context menu "remove" paths.
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

async function contextMenuRemove(page, locator) {
    await locator.click({ button: 'right' });
    await page.locator('#element-context-menu .context-menu-item[data-action="remove"]:not(.disabled)').click();
}

test.describe('Handles removed when object is deleted (Delete key)', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    test('rotation handle disappears when selected player is deleted', async ({ page }) => {
        const player = await addPlayer(page);
        await player.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await page.keyboard.press('Delete');
        await expect(page.locator('.rotation-handle')).toHaveCount(0, { timeout: 2000 });
    });

    test('rotation handle disappears when selected element (goal) is deleted', async ({ page }) => {
        const el = page.locator('#players-layer [data-element]').first();
        await el.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await page.keyboard.press('Delete');
        await expect(page.locator('.rotation-handle')).toHaveCount(0, { timeout: 2000 });
    });

    test('rotation and resize handles disappear when selected rectangle is deleted', async ({ page }) => {
        const shape = await addShape(page, 'rectangle');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.resize-handle').first()).toBeAttached({ timeout: 2000 });
        await page.keyboard.press('Delete');
        await expect(page.locator('.rotation-handle')).toHaveCount(0, { timeout: 2000 });
        await expect(page.locator('.resize-handle')).toHaveCount(0, { timeout: 2000 });
    });

    test('rotation and resize handles disappear when selected ellipse is deleted', async ({ page }) => {
        const shape = await addShape(page, 'ellipse');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await page.keyboard.press('Delete');
        await expect(page.locator('.rotation-handle')).toHaveCount(0, { timeout: 2000 });
        await expect(page.locator('.resize-handle')).toHaveCount(0, { timeout: 2000 });
    });

    test('rotation and resize handles disappear when selected line is deleted', async ({ page }) => {
        const shape = await addShape(page, 'line');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await page.keyboard.press('Delete');
        await expect(page.locator('.rotation-handle')).toHaveCount(0, { timeout: 2000 });
        await expect(page.locator('.resize-handle')).toHaveCount(0, { timeout: 2000 });
    });

    test('rotation and resize handles disappear when selected arrow is deleted', async ({ page }) => {
        const shape = await addShape(page, 'arrow');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await page.keyboard.press('Delete');
        await expect(page.locator('.rotation-handle')).toHaveCount(0, { timeout: 2000 });
        await expect(page.locator('.resize-handle')).toHaveCount(0, { timeout: 2000 });
    });
});

test.describe('Handles removed when object is deleted (context menu)', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    test('rotation handle disappears when player removed via context menu', async ({ page }) => {
        const player = await addPlayer(page);
        await player.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await contextMenuRemove(page, player);
        await expect(page.locator('.rotation-handle')).toHaveCount(0, { timeout: 2000 });
    });

    test('rotation handle disappears when element removed via context menu', async ({ page }) => {
        const el = page.locator('#players-layer [data-element]').first();
        await el.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await contextMenuRemove(page, el);
        await expect(page.locator('.rotation-handle')).toHaveCount(0, { timeout: 2000 });
    });

    test('rotation and resize handles disappear when shape removed via context menu', async ({ page }) => {
        const shape = await addShape(page, 'rectangle');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.resize-handle').first()).toBeAttached({ timeout: 2000 });
        await contextMenuRemove(page, shape);
        await expect(page.locator('.rotation-handle')).toHaveCount(0, { timeout: 2000 });
        await expect(page.locator('.resize-handle')).toHaveCount(0, { timeout: 2000 });
    });
});

