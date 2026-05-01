import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Touch Mode: Cross-Entity Drag Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('BUG TOUCH: moving shape should not move previously selected element', async ({ page }) => {
        // Enable touch mode and create entities
        await page.evaluate(() => {
            // Enable touch mode
            document.body.classList.add('touch-mode');
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


        // Step 1: In touch mode, select element by clicking on its touch overlay
        const elementOverlay = page.locator('.touch-overlay[data-element]').first();
        await elementOverlay.click();
        await page.waitForTimeout(200);

        const afterElementSelect = await page.evaluate(() => {
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedShape: AppState.selectedShape,
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null
            };
        });
        expect(afterElementSelect.selectedElement).not.toBeNull();

        // Step 2: In touch mode, click on shape's touch overlay to select it
        // This should deselect the element
        const shapeOverlay = page.locator('.touch-overlay[data-shape]').first();
        await shapeOverlay.click();
        await page.waitForTimeout(200);

        const afterShapeSelect = await page.evaluate(() => {
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedShape: AppState.selectedShape,
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null
            };
        });
        expect(afterShapeSelect.selectedShape).not.toBeNull();
        expect(afterShapeSelect.selectedElement).toBeNull();

        // Verify draggedElement is NOT set
        expect(afterShapeSelect.draggedElement).toBeNull();

        // Step 3: In touch mode, drag the shape
        // In touch mode, first click selects AND starts drag immediately
        // So we need to mousedown on the overlay, then move
        const overlayBox = await shapeOverlay.boundingBox();
        await page.mouse.move(overlayBox.x + overlayBox.width / 2, overlayBox.y + overlayBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(50);

        const duringDragDown = await page.evaluate(() => {
            return {
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null,
                elementPos: { x: AppState.elements[0].x, y: AppState.elements[0].y },
                shapePos: { x: AppState.shapes[0].x, y: AppState.shapes[0].y }
            };
        });

        // BUG CHECK: draggedElement should be NULL
        if (duringDragDown.draggedElement !== null) {
        }

        // Move the mouse to drag
        await page.mouse.move(overlayBox.x + overlayBox.width / 2 + 100, overlayBox.y + overlayBox.height / 2 + 80);
        await page.waitForTimeout(100);

        const duringMove = await page.evaluate(() => {
            return {
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null,
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


        // BUG: Element should NOT have moved
        if (elementDelta.x > 1 || elementDelta.y > 1) {
        }

        // Shape should have moved
        expect(shapeDelta.x).toBeGreaterThan(50);
        expect(shapeDelta.y).toBeGreaterThan(50);

        // Element should NOT have moved
        expect(elementDelta.x).toBeLessThan(1);
        expect(elementDelta.y).toBeLessThan(1);
    });

    test('BUG TOUCH: moving element should not move previously selected shape', async ({ page }) => {
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
                color: '#0000FF',
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

        // Select shape first
        const shapeOverlay = page.locator('.touch-overlay[data-shape]').first();
        await shapeOverlay.click();
        await page.waitForTimeout(200);

        // Then select element
        const elementOverlay = page.locator('.touch-overlay[data-element]').first();
        await elementOverlay.click();
        await page.waitForTimeout(200);

        const selectionState = await page.evaluate(() => {
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedShape: AppState.selectedShape,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null
            };
        });

        // Drag the element
        const overlayBox = await elementOverlay.boundingBox();
        await page.mouse.move(overlayBox.x + overlayBox.width / 2, overlayBox.y + overlayBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(50);

        const duringDrag = await page.evaluate(() => {
            return {
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null
            };
        });

        if (duringDrag.draggedShape !== null) {
        }

        await page.mouse.move(overlayBox.x + overlayBox.width / 2 + 100, overlayBox.y + overlayBox.height / 2 + 80);
        await page.waitForTimeout(100);
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


        if (shapeDelta.x > 1 || shapeDelta.y > 1) {
        }

        // Element should have moved
        expect(elementDelta.x).toBeGreaterThan(50);

        // Shape should NOT have moved
        expect(shapeDelta.x).toBeLessThan(1);
        expect(shapeDelta.y).toBeLessThan(1);
    });

});
