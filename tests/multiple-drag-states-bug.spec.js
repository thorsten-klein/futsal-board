import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Multiple Drag States Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('BUG: If both draggedElement and draggedShape are set, both entities move', async ({ page }) => {
        // Setup entities
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
            AppState.currentTool = 'select';

            const element = {
                id: 'element-cone-1',
                type: 'cone',
                x: 2000,
                y: 1500,
                rotation: 0,
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);

            const shape = {
                id: 'shape-rect-1',
                type: 'rectangle',
                x: 1500,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#FF0000',
                fill: 'transparent',
                strokeWidth: 3,
                visible: true
            };
            AppState.shapes.push(shape);

            if (typeof Elements !== 'undefined') Elements.render();
            if (typeof Shapes !== 'undefined') Shapes.render();
        });

        await page.waitForTimeout(300);

        const initialPositions = await page.evaluate(() => {
            return {
                element: { x: AppState.elements[0].x, y: AppState.elements[0].y },
                shape: { x: AppState.shapes[0].x, y: AppState.shapes[0].y }
            };
        });


        // SIMULATE THE BUG: Manually set both drag states
        // This could happen if mouseup doesn't fire properly or there's a race condition
        await page.evaluate(() => {
            AppState.draggedElement = AppState.elements[0];
            AppState.draggedShape = AppState.shapes[0];
            AppState.dragOffset = { x: 0, y: 0 };
        });

        const dragStates = await page.evaluate(() => {
            return {
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null
            };
        });


        // Now move the mouse (simulating a drag)
        const canvasRect = await page.evaluate(() => {
            const rect = AppState.canvas.getBoundingClientRect();
            return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        });

        // Move mouse to trigger the drag
        await page.mouse.move(canvasRect.left + 200, canvasRect.top + 200);
        await page.waitForTimeout(50);
        await page.mouse.move(canvasRect.left + 350, canvasRect.top + 300);
        await page.waitForTimeout(100);

        const duringDrag = await page.evaluate(() => {
            return {
                element: { x: AppState.elements[0].x, y: AppState.elements[0].y },
                shape: { x: AppState.shapes[0].x, y: AppState.shapes[0].y }
            };
        });


        const elementMoved = Math.abs(duringDrag.element.x - initialPositions.element.x) > 50 ||
                            Math.abs(duringDrag.element.y - initialPositions.element.y) > 50;
        const shapeMoved = Math.abs(duringDrag.shape.x - initialPositions.shape.x) > 50 ||
                          Math.abs(duringDrag.shape.y - initialPositions.shape.y) > 50;

        if (elementMoved && shapeMoved) {
        }

        // With the bug, BOTH should have moved
        expect(elementMoved).toBe(true);
        expect(shapeMoved).toBe(true);

    });

    test('FIX: When starting element drag, should clear other drag states', async ({ page }) => {
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
            AppState.currentTool = 'select';

            const element = {
                id: 'element-cone-1',
                type: 'cone',
                x: 2000,
                y: 1500,
                rotation: 0,
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);

            const shape = {
                id: 'shape-rect-1',
                type: 'rectangle',
                x: 1500,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#FF0000',
                fill: 'transparent',
                strokeWidth: 3,
                visible: true
            };
            AppState.shapes.push(shape);

            // Simulate a leftover drag state from shape
            AppState.draggedShape = AppState.shapes[0];

            if (typeof Elements !== 'undefined') Elements.render();
            if (typeof Shapes !== 'undefined') Shapes.render();
        });

        await page.waitForTimeout(300);

        // Now click on element - this should clear draggedShape
        const elementOverlay = page.locator('.touch-overlay[data-element]').first();
        const elementBox = await elementOverlay.boundingBox();
        await page.mouse.move(elementBox.x + elementBox.width / 2, elementBox.y + elementBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(50);

        const dragStates = await page.evaluate(() => {
            return {
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null
            };
        });


        // After the fix, draggedShape should be cleared
        expect(dragStates.draggedElement).not.toBeNull();
        expect(dragStates.draggedShape).toBeNull(); // Should be cleared!
    });
});
