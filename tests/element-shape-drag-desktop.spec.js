import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Element-Shape Drag in Desktop Mode', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('Desktop: moving shape should not move previously selected element', async ({ page }) => {
        // Create an element and a shape
        await page.evaluate(() => {
            // Make sure we're in desktop mode (NOT touch-mode) and select mode
            document.body.classList.remove('touch-mode');
            AppState.currentTool = 'select';

            // Add a goal element
            const element = {
                id: 'element-goal-1',
                type: 'goal',
                x: 2000,
                y: 1500,
                rotation: 0,
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);

            // Add a rectangle shape
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

            // Render everything
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


        // Step 1: Select the element (single click in desktop)
        const elementSvg = page.locator('.element-svg').first();
        await elementSvg.click();
        await page.waitForTimeout(200);

        const afterElementSelect = await page.evaluate(() => {
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedShape: AppState.selectedShape,
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null
            };
        });

        // Step 2: Select the shape (single click in desktop)
        const shapeSvg = page.locator('.shape-svg').first();
        await shapeSvg.click();
        await page.waitForTimeout(200);

        const afterShapeSelect = await page.evaluate(() => {
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedShape: AppState.selectedShape,
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null
            };
        });

        // In desktop mode, need to click again to start drag
        // First click selects, second click starts drag
        await shapeSvg.click();
        await page.waitForTimeout(50);

        const afterSecondClick = await page.evaluate(() => {
            return {
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null,
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null
            };
        });

        // Step 3: Drag the shape
        const shapeBox = await shapeSvg.boundingBox();
        await page.mouse.move(shapeBox.x + shapeBox.width / 2, shapeBox.y + shapeBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(50);

        const duringDrag = await page.evaluate(() => {
            return {
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null,
                elementPos: { x: AppState.elements[0].x, y: AppState.elements[0].y },
                shapePos: { x: AppState.shapes[0].x, y: AppState.shapes[0].y }
            };
        });

        await page.mouse.move(shapeBox.x + shapeBox.width / 2 + 100, shapeBox.y + shapeBox.height / 2 + 80);
        await page.waitForTimeout(100);

        const duringMove = await page.evaluate(() => {
            return {
                elementPos: { x: AppState.elements[0].x, y: AppState.elements[0].y },
                shapePos: { x: AppState.shapes[0].x, y: AppState.shapes[0].y }
            };
        });

        await page.mouse.up();
        await page.waitForTimeout(200);

        const afterDrag = await page.evaluate(() => {
            return {
                element: { x: AppState.elements[0].x, y: AppState.elements[0].y },
                shape: { x: AppState.shapes[0].x, y: AppState.shapes[0].y }
            };
        });


        const elementDelta = {
            x: Math.abs(afterDrag.element.x - initialPositions.element.x),
            y: Math.abs(afterDrag.element.y - initialPositions.element.y)
        };
        const shapeDelta = {
            x: Math.abs(afterDrag.shape.x - initialPositions.shape.x),
            y: Math.abs(afterDrag.shape.y - initialPositions.shape.y)
        };


        // BUG CHECK: Element should NOT have moved
        if (elementDelta.x > 1 || elementDelta.y > 1) {
        }

        // Shape should have moved
        expect(shapeDelta.x).toBeGreaterThan(50);

        // Element should NOT have moved
        expect(elementDelta.x).toBeLessThan(1);
        expect(elementDelta.y).toBeLessThan(1);
    });
});
