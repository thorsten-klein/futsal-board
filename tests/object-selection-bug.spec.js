/**
 * Regression test for bug: non-player objects (ball, plate, element, shape)
 * cannot be selected or moved after placing them on the board.
 * Only players work correctly.
 *
 * Root cause: paths-layer was moved inside board-area (inside players-layer).
 * The CSS rule `#board-area > * { pointer-events: auto }` overrides
 * `#paths-layer { pointer-events: none }` because both selectors have equal
 * specificity (100 pts each) and the board-area rule is declared later.
 * With pointer-events: auto, paths-layer (z-index 45) sits above balls (40),
 * elements (30), plates (20) and shapes (11–25), intercepting their clicks.
 * Players at z-index 50 sit above paths-layer and are unaffected.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement } from './helpers.js';

async function addShape(page) {
    const before = await page.locator('[data-shape]').count();
    await page.locator('.draw-btn[data-draw="rectangle"]').click();
    await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-shape]').nth(before);
}

/**
 * Click at the visual centre of a locator using raw mouse coordinates.
 * This exercises the real browser hit-testing (unlike locator.click() which
 * can bypass intervening overlays).
 */
async function mouseClickCenter(page, locator) {
    const bb = await locator.boundingBox();
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
}

test.describe('Non-player object selection (regression)', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('clicking a ball at its visual position selects it', async ({ page }) => {
        const ball = await addBall(page);
        await expect(ball).not.toHaveClass(/ball-selected/);

        await mouseClickCenter(page, ball);
        await page.waitForTimeout(100);

        const selected = await page.evaluate(() => AppState.selectedBall?.id ?? null);
        expect(selected, 'AppState.selectedBall should be set after clicking ball').not.toBeNull();
        await expect(ball).toHaveClass(/ball-selected/, { timeout: 2000 });
    });

    test('clicking a plate at its visual position selects it', async ({ page }) => {
        const plate = await addPlate(page);
        await expect(plate).not.toHaveClass(/plate-selected/);

        await mouseClickCenter(page, plate);
        await page.waitForTimeout(100);

        const selected = await page.evaluate(() => AppState.selectedPlate?.id ?? null);
        expect(selected, 'AppState.selectedPlate should be set after clicking plate').not.toBeNull();
        await expect(plate).toHaveClass(/plate-selected/, { timeout: 2000 });
    });

    test('clicking an element at its visual position selects it', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await expect(el).not.toHaveClass(/element-selected/);

        await mouseClickCenter(page, el);
        await page.waitForTimeout(100);

        const selected = await page.evaluate(() => AppState.selectedElement?.id ?? null);
        expect(selected, 'AppState.selectedElement should be set after clicking element').not.toBeNull();
        await expect(el).toHaveClass(/element-selected/, { timeout: 2000 });
    });

    test('clicking a shape at its visual position selects it', async ({ page }) => {
        const shape = await addShape(page);
        await expect(shape).not.toHaveClass(/shape-selected/);

        await mouseClickCenter(page, shape);
        await page.waitForTimeout(100);

        const selected = await page.evaluate(() => AppState.selectedShape ?? null);
        expect(selected, 'AppState.selectedShape should be set after clicking shape').not.toBeNull();
        await expect(shape).toHaveClass(/shape-selected/, { timeout: 2000 });
    });

    test('ball can be moved after double-click (select then drag)', async ({ page }) => {
        const ball = await addBall(page);

        const initialPos = await page.evaluate(() => {
            const b = AppState.balls[AppState.balls.length - 1];
            return { x: b.x, y: b.y };
        });

        // First click: select
        await mouseClickCenter(page, ball);
        await page.waitForTimeout(150);

        // Second click + drag: move
        const bb = await ball.boundingBox();
        const cx = bb.x + bb.width / 2;
        const cy = bb.y + bb.height / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + 80, cy + 50);
        await page.mouse.up();
        await page.waitForTimeout(150);

        const finalPos = await page.evaluate(() => {
            const b = AppState.balls[AppState.balls.length - 1];
            return { x: b.x, y: b.y };
        });

        expect(finalPos.x).not.toBe(initialPos.x);
        expect(finalPos.y).not.toBe(initialPos.y);
    });

    test('paths-layer does not intercept pointer events (z-index check)', async ({ page }) => {
        const ball = await addBall(page);
        const bb = await ball.boundingBox();
        const cx = bb.x + bb.width / 2;
        const cy = bb.y + bb.height / 2;

        // The element at the ball's center must be the ball itself (or a child of it),
        // not the paths-layer which is at z-index 45 (above balls at z-index 40).
        const topEl = await page.evaluate(([x, y]) => {
            const el = document.elementFromPoint(x, y);
            return {
                id: el?.id,
                tagName: el?.tagName,
                dataBall: el?.dataset?.ball ?? null,
                closest: el?.closest('[data-ball]')?.dataset?.ball ?? null,
            };
        }, [cx, cy]);

        expect(topEl.closest, 'element at ball center should be inside ball SVG').not.toBeNull();
    });
});
