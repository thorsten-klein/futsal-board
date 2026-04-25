/**
 * Shared test helpers for futsal-board Playwright tests.
 * Import with: import { goto, addBall, addPlate, addPlayer, addPlayerToBoard, boardCenter } from './helpers.js';
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FILE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

/** Navigate to the app and wait for it to be ready. */
export async function goto(page) {
    // First load to get same-origin access for localStorage.clear()
    await page.goto(FILE_URL);
    await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
    // Reload so the app starts with clean state.
    // NOTE: this second load does NOT set an initScript, so subsequent
    // page.reload() calls in persistence tests will NOT clear localStorage.
    await page.reload();
    await page.waitForSelector('#players-layer', { state: 'attached' });
    // Extra tick for all module init() calls to complete
    await page.waitForTimeout(300);
}

/** Return the bounding box of the board canvas (the court area). */
export async function boardBox(page) {
    return page.locator('#board-canvas').boundingBox();
}

/** Centre of the board canvas in page coordinates. */
export async function boardCenter(page) {
    const bb = await boardBox(page);
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
}

/**
 * Click a ball-template in the sidebar to add a ball at a free position.
 * Returns the locator for the new ball SVG on the board.
 */
export async function addBall(page, index = 0) {
    const before = await page.locator('[data-ball]').count();
    await page.locator('.ball-template').nth(index).click();
    await expect(page.locator('[data-ball]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-ball]').nth(before);
}

/**
 * Click a plate-template in the sidebar to add a plate at a free position.
 */
export async function addPlate(page, index = 0) {
    const before = await page.locator('[data-plate]').count();
    await page.locator('.plate-template').nth(index).click();
    await expect(page.locator('[data-plate]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-plate]').nth(before);
}

/**
 * Click an element button in the sidebar to add it.
 * @param {string} type - e.g. 'cone', 'goal', 'pole'
 */
export async function addElement(page, type = 'cone') {
    // Use #players-layer to scope to board entities (sidebar buttons also have data-element)
    const before = await page.locator('#players-layer [data-element]').count();
    await page.locator(`.element-btn[data-element="${type}"]`).click();
    await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('#players-layer [data-element]').nth(before);
}

/**
 * Click a player template in the sidebar to add a player at a free position.
 * Returns the locator for the new player element on the board.
 */
export async function addPlayer(page, templateIndex = 0) {
    const before = await page.locator('[data-player-id]').count();
    await page.locator('.team-player-template').nth(templateIndex).click();
    await expect(page.locator('[data-player-id]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-player-id]').nth(before);
}

/**
 * Dismiss any open context menu by pressing Escape.
 */
export async function dismissMenu(page) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
}

/**
 * Undo via Ctrl+Z.
 */
export async function undo(page) {
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
}

/**
 * Redo via Ctrl+Shift+Z.
 */
export async function redo(page) {
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(100);
}
