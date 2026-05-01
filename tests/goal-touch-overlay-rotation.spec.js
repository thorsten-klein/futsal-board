import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Goal Touch Overlay - Live Rotation Update', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('goal touch overlay should update live during rotation', async ({ page }) => {
        // Goals have a non-central anchor point (right edge at vertical center)
        // When rotating, the geometrical center moves in a circle around the anchor
        // The touch overlay must follow the geometrical center to stay clickable

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            const element = {
                id: 'goal-test-1',
                type: 'goal',
                x: 2000,
                y: 2000,
                rotation: 0,
                visible: true,
                inherited: false
            };

            AppState.elements.push(element);
            AppState.nextElementId = 2;
            AppState.selectedElement = element;

            if (typeof Elements !== 'undefined') {
                Elements.render();
            }
        });

        await page.waitForTimeout(200);

        // Verify touch overlay exists for our goal
        const overlay = page.locator('.touch-overlay[data-element="goal-test-1"]');
        await expect(overlay).toBeVisible();

        // Get initial state
        const initial = await page.evaluate(() => {
            const element = AppState.elements[0];
            const overlay = document.querySelector('.touch-overlay[data-element]');
            const center = Elements.getGeometricalCenter(element);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            return {
                rotation: element.rotation,
                centerX: center.x,
                centerY: center.y,
                overlayLeft: parseFloat(overlay.style.left),
                overlayTop: parseFloat(overlay.style.top)
            };
        });


        // Simulate rotation
        const afterRotation = await page.evaluate(() => {
            const element = AppState.elements[0];
            AppState.selectedElement = element;
            Elements.isRotating = true;

            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            // Simulate mouse movement that triggers rotation
            const anchorScreenX = canvasRect.left + element.x * scaleX;
            const anchorScreenY = canvasRect.top + element.y * scaleY;

            Elements.handleRotationMove({
                clientX: anchorScreenX,
                clientY: anchorScreenY + 100
            });

            const overlay = document.querySelector('.touch-overlay[data-element]');
            const center = Elements.getGeometricalCenter(element);

            return {
                rotation: element.rotation,
                centerX: center.x,
                centerY: center.y,
                overlayLeft: parseFloat(overlay.style.left),
                overlayTop: parseFloat(overlay.style.top),
                expectedLeft: center.x * scaleX,
                expectedTop: center.y * scaleY
            };
        });


        // Rotation should have changed
        expect(afterRotation.rotation).not.toBe(initial.rotation);

        // Geometrical center should have moved (goal anchor != center)
        const centerMoved = afterRotation.centerX !== initial.centerX ||
                           afterRotation.centerY !== initial.centerY;
        expect(centerMoved).toBe(true);

        // Touch overlay should match the new geometrical center
        const tolerance = 1; // Allow 1px tolerance for rounding
        const leftDiff = Math.abs(afterRotation.overlayLeft - afterRotation.expectedLeft);
        const topDiff = Math.abs(afterRotation.overlayTop - afterRotation.expectedTop);


        expect(leftDiff).toBeLessThan(tolerance);
        expect(topDiff).toBeLessThan(tolerance);
    });

    test('small-goal touch overlay should also update live', async ({ page }) => {
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            const element = {
                id: 'small-goal-test-1',
                type: 'small-goal',
                x: 1500,
                y: 1500,
                rotation: 0,
                visible: true,
                inherited: false
            };

            AppState.elements.push(element);
            AppState.nextElementId = 2;
            AppState.selectedElement = element;
            Elements.render();
        });

        await page.waitForTimeout(200);

        const result = await page.evaluate(() => {
            const element = AppState.elements[0];
            AppState.selectedElement = element; // Must be selected for rotation to work
            Elements.isRotating = true;

            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            const anchorScreenX = canvasRect.left + element.x * scaleX;
            const anchorScreenY = canvasRect.top + element.y * scaleY;

            // Trigger rotation (move mouse significantly to ensure rotation happens)
            Elements.handleRotationMove({
                clientX: anchorScreenX,
                clientY: anchorScreenY + 100
            });

            const overlay = document.querySelector('.touch-overlay[data-element]');
            const center = Elements.getGeometricalCenter(element);

            return {
                rotation: element.rotation,
                overlayLeft: parseFloat(overlay.style.left),
                overlayTop: parseFloat(overlay.style.top),
                expectedLeft: center.x * scaleX,
                expectedTop: center.y * scaleY
            };
        });


        // Should have rotated
        expect(result.rotation).not.toBe(0);

        // Overlay should match center
        expect(Math.abs(result.overlayLeft - result.expectedLeft)).toBeLessThan(1);
        expect(Math.abs(result.overlayTop - result.expectedTop)).toBeLessThan(1);
    });

    test('rebounce overlay should update during rotation', async ({ page }) => {
        // Test with rebounce which also supports rotation
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            const element = {
                id: 'rebounce-test-1',
                type: 'rebounce',
                x: 2200,
                y: 1800,
                rotation: 0,
                visible: true,
                inherited: false
            };

            AppState.elements.push(element);
            AppState.nextElementId = 2;
            AppState.selectedElement = element;
            Elements.render();
        });

        await page.waitForTimeout(200);

        const result = await page.evaluate(() => {
            const element = AppState.elements[0];
            AppState.selectedElement = element; // Must be selected for rotation to work
            Elements.isRotating = true;

            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            const anchorScreenX = canvasRect.left + element.x * scaleX;
            const anchorScreenY = canvasRect.top + element.y * scaleY;

            // Trigger rotation
            Elements.handleRotationMove({
                clientX: anchorScreenX + 100,
                clientY: anchorScreenY
            });

            const overlay = document.querySelector('.touch-overlay[data-element]');
            const center = Elements.getGeometricalCenter(element);

            return {
                rotation: element.rotation,
                overlayLeft: parseFloat(overlay.style.left),
                overlayTop: parseFloat(overlay.style.top),
                expectedLeft: center.x * scaleX,
                expectedTop: center.y * scaleY
            };
        });


        // Rebounce has centered anchor, but overlay should still match center
        expect(Math.abs(result.overlayLeft - result.expectedLeft)).toBeLessThan(1);
        expect(Math.abs(result.overlayTop - result.expectedTop)).toBeLessThan(1);
    });
});
