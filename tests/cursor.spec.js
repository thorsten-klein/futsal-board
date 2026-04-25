/**
 * Cursor consistency tests.
 *
 * Rule:
 *   - Board objects (ball-svg, plate-svg, player, element-svg, shape-svg,
 *     rotation-handle) must show cursor: default (arrow) — never grab/grabbing
 *     or pointer (finger).
 *   - Sidebar drag sources (ball-template, plate-template, team-player-template,
 *     element-btn, draw-btn) MUST show cursor: grab.
 *
 * Tests check BOTH the element itself AND every descendant so that a rogue
 * cursor on a child (shine overlay, SVG path, arm div…) is caught.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement } from './helpers.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Add a player by clicking the first team template. */
async function addPlayer(page) {
    const before = await page.locator('.player').count();
    await page.locator('.team-player-template').first().click();
    await expect(page.locator('.player')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('.player').nth(before);
}

/** Add a shape via draw-toolbar button. */
async function addShape(page, type = 'rectangle') {
    const before = await page.locator('[data-shape]').count();
    await page.locator(`.draw-btn[data-draw="${type}"]`).click();
    await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-shape]').nth(before);
}

/**
 * Walk element + descendants (skipping pointer-events:none nodes).
 * Returns a description of the first element with cursor != 'default', or null.
 */
async function expectDefaultCursor(locator) {
    const violation = await locator.evaluate(root => {
        function check(el) {
            const style = window.getComputedStyle(el);
            if (style.pointerEvents === 'none') return null;
            const c = style.cursor;
            if (c !== 'default') {
                const tag = el.tagName.toLowerCase();
                const cls = [...el.classList].join('.');
                return `${tag}${cls ? '.' + cls : ''}: cursor="${c}"`;
            }
            for (const child of el.children) {
                const r = check(child);
                if (r) return r;
            }
            return null;
        }
        return check(root);
    });
    expect(violation, `Non-default cursor found on board object — ${violation}`).toBeNull();
}

/**
 * Asserts that the element itself AND all pointer-events-enabled descendants
 * AND pseudo-elements (::before / ::after) show cursor: grab or grabbing.
 */
async function expectGrabCursor(locator) {
    const violation = await locator.evaluate(root => {
        function check(el) {
            const style = window.getComputedStyle(el);
            if (style.pointerEvents === 'none') return null;
            const c = style.cursor;
            if (c !== 'grab' && c !== 'grabbing') {
                const tag = el.tagName.toLowerCase();
                const cls = [...el.classList].join('.');
                return `${tag}${cls ? '.' + cls : ''}: cursor="${c}" (expected grab)`;
            }
            // Check pseudo-elements — they can receive pointer events when they
            // cover the element (e.g. ::before overlays used as visual rings).
            for (const pseudo of ['::before', '::after']) {
                const ps = window.getComputedStyle(el, pseudo);
                if (ps.content && ps.content !== 'none' && ps.content !== '') {
                    const pc = ps.cursor;
                    if (pc !== 'grab' && pc !== 'grabbing') {
                        const tag = el.tagName.toLowerCase();
                        const cls = [...el.classList].join('.');
                        return `${tag}${cls ? '.' + cls : ''}${pseudo}: cursor="${pc}" (expected grab)`;
                    }
                }
            }
            for (const child of el.children) {
                const r = check(child);
                if (r) return r;
            }
            return null;
        }
        return check(root);
    });
    expect(violation, `Missing grab cursor — ${violation}`).toBeNull();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Board objects — cursor must be default arrow', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    // ── Ball ──────────────────────────────────────────────────────────────────
    test('ball: cursor is default arrow when unselected', async ({ page }) => {
        await addBall(page);
        await expectDefaultCursor(page.locator('.ball-svg').first());
    });
    test('ball: cursor is default arrow when selected', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click();
        await expectDefaultCursor(page.locator('.ball-svg').first());
    });

    // ── Plate ─────────────────────────────────────────────────────────────────
    test('plate: cursor is default arrow when unselected', async ({ page }) => {
        await addPlate(page);
        await expectDefaultCursor(page.locator('.plate-svg').first());
    });
    test('plate: cursor is default arrow when selected', async ({ page }) => {
        const plate = await addPlate(page);
        await plate.click();
        await expectDefaultCursor(page.locator('.plate-svg').first());
    });

    // ── Player (on board) ─────────────────────────────────────────────────────
    test('player: cursor is default arrow when unselected', async ({ page }) => {
        const player = await addPlayer(page);
        await expectDefaultCursor(player);
    });
    test('player: cursor is default arrow when selected', async ({ page }) => {
        const player = await addPlayer(page);
        await player.click();
        await expectDefaultCursor(player);
    });

    // ── Element ───────────────────────────────────────────────────────────────
    test('cone element: cursor is default arrow when unselected', async ({ page }) => {
        await addElement(page, 'cone');
        await expectDefaultCursor(page.locator('#players-layer [data-element]').first());
    });
    test('cone element: cursor is default arrow when selected', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click();
        await expectDefaultCursor(el);
    });
    test('goal element (default): cursor is default arrow when unselected', async ({ page }) => {
        await expectDefaultCursor(page.locator('#players-layer [data-element]').first());
    });
    test('goal element: cursor is default arrow when selected', async ({ page }) => {
        const goal = page.locator('#players-layer [data-element]').first();
        await goal.click();
        await expectDefaultCursor(goal);
    });

    // ── Shape ─────────────────────────────────────────────────────────────────
    test('rectangle shape: cursor is default arrow when unselected', async ({ page }) => {
        await addShape(page, 'rectangle');
        await expectDefaultCursor(page.locator('.shape-svg').first());
    });
    test('rectangle shape: cursor is default arrow when selected', async ({ page }) => {
        const shape = await addShape(page, 'rectangle');
        await shape.click();
        await expectDefaultCursor(shape);
    });
    test('ellipse shape: cursor is default arrow when unselected', async ({ page }) => {
        await addShape(page, 'ellipse');
        await expectDefaultCursor(page.locator('.shape-svg').first());
    });
    test('line shape: cursor is default arrow when unselected', async ({ page }) => {
        await addShape(page, 'line');
        await expectDefaultCursor(page.locator('.shape-svg').first());
    });
    test('arrow shape: cursor is default arrow when unselected', async ({ page }) => {
        await addShape(page, 'arrow');
        await expectDefaultCursor(page.locator('.shape-svg').first());
    });

    // ── Rotation handle ───────────────────────────────────────────────────────
    test('rotation handle (player): cursor is default arrow', async ({ page }) => {
        const player = await addPlayer(page);
        await player.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await expectDefaultCursor(page.locator('.rotation-handle').first());
    });
    test('rotation handle (shape): cursor is default arrow', async ({ page }) => {
        const shape = await addShape(page, 'rectangle');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await expectDefaultCursor(page.locator('.rotation-handle').first());
    });
});

test.describe('Sidebar drag sources — grab cursor present', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    test('ball-template in sidebar shows grab cursor', async ({ page }) => {
        await expectGrabCursor(page.locator('.ball-template').first());
    });

    test('plate-template in sidebar shows grab cursor', async ({ page }) => {
        await expectGrabCursor(page.locator('.plate-template').first());
    });

    test('team-player-template in sidebar shows grab cursor', async ({ page }) => {
        await expectGrabCursor(page.locator('.team-player-template').first());
    });

    test('player arm in sidebar shows grab cursor (arm extends outside circle)', async ({ page }) => {
        // The overlay div covers the full arm+body area including the extended arm regions.
        const template = page.locator('.team-player-template').first();
        const overlay = template.locator('.player-drag-overlay');
        await expect(overlay).toBeAttached({ timeout: 2000 });
        // Overlay must cover the arm area: positioned left/right beyond the circle
        const left = await overlay.evaluate(el => parseFloat(el.style.left || window.getComputedStyle(el).left));
        expect(left, 'overlay must extend left of the circle (negative value)').toBeLessThan(0);
        // Overlay must have grab cursor
        await expectGrabCursor(overlay);
    });

    test('dragging from arm area of sidebar player triggers drag', async ({ page }) => {
        const template = page.locator('.team-player-template').first();
        const overlay = template.locator('.player-drag-overlay');
        await expect(overlay).toBeAttached({ timeout: 2000 });
        // The overlay must be draggable
        const draggable = await overlay.evaluate(el => el.draggable);
        expect(draggable, 'overlay must be draggable').toBe(true);
    });

    test('element-btn (cone) in sidebar shows grab cursor', async ({ page }) => {
        await expectGrabCursor(page.locator('.element-btn[data-element="cone"]'));
    });

    test('element-btn (goal) in sidebar shows grab cursor', async ({ page }) => {
        await expectGrabCursor(page.locator('.element-btn[data-element="goal"]'));
    });

    test('element-btn (pole) in sidebar shows grab cursor', async ({ page }) => {
        await expectGrabCursor(page.locator('.element-btn[data-element="pole"]'));
    });

    test('draw-btn (rectangle) in sidebar shows grab cursor', async ({ page }) => {
        await expectGrabCursor(page.locator('.draw-btn[data-draw="rectangle"]'));
    });

    test('draw-btn (line) in sidebar shows grab cursor', async ({ page }) => {
        await expectGrabCursor(page.locator('.draw-btn[data-draw="line"]'));
    });
});
