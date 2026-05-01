import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Touch mode: drag must only start from touch-overlay', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });
    });

    test('selected line should NOT drag when touch starts just outside its touch-overlay', async ({ page }) => {
        await page.evaluate(() => {
            const shape = {
                id: 'line-test-1',
                type: 'line',
                x: 2000, y: 1000,
                width: 400, height: 0,
                rotation: 0,
                color: '#000000',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.nextShapeId = 2;
            Shapes.render();
        });
        await page.waitForTimeout(300);

        const initialPos = await page.evaluate(() => {
            const s = AppState.shapes.find(s => s.id === 'line-test-1');
            return { x: s.x, y: s.y };
        });

        // Select the line by clicking its touch overlay
        const overlayLocator = page.locator('.touch-overlay[data-shape="line-test-1"]');
        await expect(overlayLocator).toBeVisible();
        const overlayBox = await overlayLocator.boundingBox();

        await page.mouse.click(
            overlayBox.x + overlayBox.width / 2,
            overlayBox.y + overlayBox.height / 2
        );
        await page.waitForTimeout(100);

        const isSelected = await page.evaluate(() => AppState.selectedShape === 'line-test-1');
        expect(isSelected).toBe(true);

        // Touch just OUTSIDE the overlay (2px above its top edge).
        // This ensures we're testing that drag only works within the overlay bounds.
        const touchX = overlayBox.x + overlayBox.width / 2;
        const touchY = overlayBox.y - 2; // 2px above overlay top edge

        await page.mouse.move(touchX, touchY);
        await page.mouse.down();
        await page.waitForTimeout(50);
        // Drag 150px to the right
        await page.mouse.move(touchX + 150, touchY);
        await page.waitForTimeout(50);
        await page.mouse.up();

        const finalPos = await page.evaluate(() => {
            const s = AppState.shapes.find(s => s.id === 'line-test-1');
            return { x: s.x, y: s.y };
        });

        expect(finalPos.x).toBe(initialPos.x);
        expect(finalPos.y).toBe(initialPos.y);
    });

    test('selected default goal should NOT move when touching empty space and dragging', async ({ page }) => {
        // Re-render so touch overlays are created for the default goals
        await page.evaluate(() => Elements.render());
        await page.waitForTimeout(100);

        // Left goal is at pitch (0, 1000) = board (250, 1250), id = element-1
        const initialPos = await page.evaluate(() => {
            const el = AppState.elements.find(e => e.id === 'element-1');
            return { x: el.x, y: el.y };
        });

        // Select the goal via a real touch tap on its overlay.
        // Using page.evaluate to dispatch TouchEvents so the app's
        // setupTouchToMouse converter runs (the bug only triggers with touch).
        const overlayLocator = page.locator('.touch-overlay[data-element="element-1"]');
        await expect(overlayLocator).toBeVisible();
        const overlayBox = await overlayLocator.boundingBox();
        const goalCX = overlayBox.x + overlayBox.width  / 2;
        const goalCY = overlayBox.y + overlayBox.height / 2;

        await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y) || document.body;
            const mkTouch = () => new Touch({ identifier: 1, target: el, clientX: x, clientY: y,
                screenX: x, screenY: y, pageX: x, pageY: y });
            el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true,
                touches: [mkTouch()], targetTouches: [mkTouch()], changedTouches: [mkTouch()] }));
            el.dispatchEvent(new TouchEvent('touchend',   { bubbles: true, cancelable: true,
                touches: [], targetTouches: [], changedTouches: [mkTouch()] }));
        }, { x: goalCX, y: goalCY });
        await page.waitForTimeout(100);

        const isSelected = await page.evaluate(() =>
            AppState.selectedElement && AppState.selectedElement.id === 'element-1'
        );
        expect(isSelected).toBe(true);

        // Convert pitch (3000, 0) → start and pitch (3000, 1000) → end in screen coords
        const screenPos = await page.evaluate(() => {
            const rect = AppState.canvas.getBoundingClientRect();
            const toScreen = (pitchX, pitchY) => ({
                x: rect.left + (pitchX + AppState.pitchOffsetX) * (rect.width  / AppState.boardWidth),
                y: rect.top  + (pitchY + AppState.pitchOffsetY) * (rect.height / AppState.boardHeight)
            });
            return { start: toScreen(3000, 0), end: toScreen(3000, 1000) };
        });

        // Touch empty space at pitch (3000, 0) and drag to (3000, 1000) — all via touch events
        // so that setupTouchToMouse runs and the bug is triggered.
        await page.evaluate(({ sx, sy, ex, ey }) => {
            const startEl = document.elementFromPoint(sx, sy) || document.body;
            const endEl   = document.elementFromPoint(ex, ey) || document.body;
            const mkTouch = (el, x, y) =>
                new Touch({ identifier: 2, target: el, clientX: x, clientY: y,
                             screenX: x, screenY: y, pageX: x, pageY: y });

            startEl.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true,
                touches: [mkTouch(startEl, sx, sy)], targetTouches: [mkTouch(startEl, sx, sy)],
                changedTouches: [mkTouch(startEl, sx, sy)] }));

            endEl.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true,
                touches: [mkTouch(endEl, ex, ey)], targetTouches: [mkTouch(endEl, ex, ey)],
                changedTouches: [mkTouch(endEl, ex, ey)] }));

            endEl.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true,
                touches: [], targetTouches: [], changedTouches: [mkTouch(endEl, ex, ey)] }));
        }, { sx: screenPos.start.x, sy: screenPos.start.y, ex: screenPos.end.x, ey: screenPos.end.y });
        await page.waitForTimeout(100);

        const finalPos = await page.evaluate(() => {
            const el = AppState.elements.find(e => e.id === 'element-1');
            return { x: el.x, y: el.y };
        });

        expect(finalPos.x).toBe(initialPos.x);
        expect(finalPos.y).toBe(initialPos.y);
    });

    test('selected arrow should NOT drag when touch starts just outside its touch-overlay', async ({ page }) => {
        await page.evaluate(() => {
            const shape = {
                id: 'arrow-test-1',
                type: 'arrow',
                x: 2000, y: 1000,
                width: 400, height: 0,
                rotation: 0,
                color: '#000000',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.nextShapeId = 2;
            Shapes.render();
        });
        await page.waitForTimeout(300);

        const initialPos = await page.evaluate(() => {
            const s = AppState.shapes.find(s => s.id === 'arrow-test-1');
            return { x: s.x, y: s.y };
        });

        const overlayLocator = page.locator('.touch-overlay[data-shape="arrow-test-1"]');
        await expect(overlayLocator).toBeVisible();
        const overlayBox = await overlayLocator.boundingBox();

        await page.mouse.click(
            overlayBox.x + overlayBox.width / 2,
            overlayBox.y + overlayBox.height / 2
        );
        await page.waitForTimeout(100);

        const isSelected = await page.evaluate(() => AppState.selectedShape === 'arrow-test-1');
        expect(isSelected).toBe(true);

        const touchX = overlayBox.x + overlayBox.width / 2;
        const touchY = overlayBox.y - 2;

        await page.mouse.move(touchX, touchY);
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(touchX + 150, touchY);
        await page.waitForTimeout(50);
        await page.mouse.up();

        const finalPos = await page.evaluate(() => {
            const s = AppState.shapes.find(s => s.id === 'arrow-test-1');
            return { x: s.x, y: s.y };
        });

        expect(finalPos.x).toBe(initialPos.x);
        expect(finalPos.y).toBe(initialPos.y);
    });
});
