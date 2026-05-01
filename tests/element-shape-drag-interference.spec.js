import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Element-Shape Drag Interference Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('BUG: moving shape should not move previously selected element', async ({ page }) => {
        // Create an element and a shape
        await page.evaluate(() => {
            // Make sure we're in select mode
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
            AppState.nextElementId = 2;

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
            AppState.nextShapeId = 2;

            // Render everything
            if (typeof Elements !== 'undefined') Elements.render();
            if (typeof Shapes !== 'undefined') Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get initial positions
        const initialPositions = await page.evaluate(() => {
            return {
                element: {
                    x: AppState.elements[0].x,
                    y: AppState.elements[0].y
                },
                shape: {
                    x: AppState.shapes[0].x,
                    y: AppState.shapes[0].y
                }
            };
        });


        // Step 1: Select the element
        const elementSvg = page.locator('.element-svg').first();
        await elementSvg.click();
        await page.waitForTimeout(200);

        // Verify element is selected
        const elementSelected = await page.evaluate(() => {
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedShape: AppState.selectedShape ? AppState.selectedShape.id : null,
                actualElementId: AppState.elements[0].id
            };
        });
        expect(elementSelected.selectedElement).toBe(elementSelected.actualElementId);

        // Step 2: Select a shape (should deselect element)
        const shapeSvgCount = await page.locator('.shape-svg').count();

        const shapeSvg = page.locator('.shape-svg').first();
        const isShapeVisible = await shapeSvg.isVisible().catch(() => false);

        if (isShapeVisible) {
            await shapeSvg.click();
            await page.waitForTimeout(200);
        } else {
        }

        // Verify shape is selected and element is deselected
        const shapeSelected = await page.evaluate(() => {
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedShape: AppState.selectedShape,  // Don't try to get .id, it's already an ID
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null,
                actualShapeId: AppState.shapes[0].id
            };
        });
        expect(shapeSelected.selectedShape).toBe(shapeSelected.actualShapeId);
        expect(shapeSelected.selectedElement).toBeNull();
        expect(shapeSelected.draggedElement).toBeNull();

        // Get positions before drag
        const beforeDrag = await page.evaluate(() => {
            return {
                element: {
                    x: AppState.elements[0].x,
                    y: AppState.elements[0].y
                },
                shape: {
                    x: AppState.shapes[0].x,
                    y: AppState.shapes[0].y
                }
            };
        });

        // Step 3: Drag the shape
        const shapeBox = await shapeSvg.boundingBox();
        const shapeCenterX = shapeBox.x + shapeBox.width / 2;
        const shapeCenterY = shapeBox.y + shapeBox.height / 2;

        await page.mouse.move(shapeCenterX, shapeCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Check drag state after mousedown
        const duringDragState = await page.evaluate(() => {
            return {
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                draggedShape: AppState.draggedShape ? AppState.draggedShape.id : null,
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedShape: AppState.selectedShape ? AppState.selectedShape.id : null
            };
        });

        // Move the shape
        await page.mouse.move(shapeCenterX + 100, shapeCenterY + 80);
        await page.waitForTimeout(100);

        // Check positions during drag
        const duringDrag = await page.evaluate(() => {
            return {
                element: {
                    x: AppState.elements[0].x,
                    y: AppState.elements[0].y
                },
                shape: {
                    x: AppState.shapes[0].x,
                    y: AppState.shapes[0].y
                }
            };
        });

        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get final positions
        const afterDrag = await page.evaluate(() => {
            return {
                element: {
                    x: AppState.elements[0].x,
                    y: AppState.elements[0].y
                },
                shape: {
                    x: AppState.shapes[0].x,
                    y: AppState.shapes[0].y
                }
            };
        });


        // Calculate deltas
        const elementDeltaX = Math.abs(afterDrag.element.x - initialPositions.element.x);
        const elementDeltaY = Math.abs(afterDrag.element.y - initialPositions.element.y);
        const shapeDeltaX = Math.abs(afterDrag.shape.x - initialPositions.shape.x);
        const shapeDeltaY = Math.abs(afterDrag.shape.y - initialPositions.shape.y);


        // BUG: Element should NOT have moved
        if (elementDeltaX > 1 || elementDeltaY > 1) {
        }

        // Shape should have moved
        expect(shapeDeltaX).toBeGreaterThan(50);
        expect(shapeDeltaY).toBeGreaterThan(50);

        // Element should NOT have moved (tolerance for floating point)
        expect(elementDeltaX).toBeLessThan(1);
        expect(elementDeltaY).toBeLessThan(1);
    });

    test('BUG: moving element should not move previously selected shape', async ({ page }) => {
        // Test the reverse: select shape first, then element, then drag element
        await page.evaluate(() => {
            // Make sure we're in select mode
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
            AppState.nextElementId = 2;

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
            AppState.nextShapeId = 2;

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
        const shapeSvg = page.locator('.shape-svg').first();
        await shapeSvg.click();
        await page.waitForTimeout(200);

        // Then select element
        const elementSvg = page.locator('.element-svg').first();
        await elementSvg.click();
        await page.waitForTimeout(200);

        // Verify element is selected, shape is deselected
        const selectionState = await page.evaluate(() => {
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedShape: AppState.selectedShape ? AppState.selectedShape.id : null,
                actualElementId: AppState.elements[0].id
            };
        });
        expect(selectionState.selectedElement).toBe(selectionState.actualElementId);
        expect(selectionState.selectedShape).toBeNull();

        // Drag the element
        const elementBox = await elementSvg.boundingBox();
        await page.mouse.move(elementBox.x + elementBox.width / 2, elementBox.y + elementBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(elementBox.x + elementBox.width / 2 + 100, elementBox.y + elementBox.height / 2 + 80);
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


        // Element should have moved
        expect(elementDelta.x).toBeGreaterThan(50);

        // Shape should NOT have moved
        if (shapeDelta.x > 1 || shapeDelta.y > 1) {
        }
        expect(shapeDelta.x).toBeLessThan(1);
        expect(shapeDelta.y).toBeLessThan(1);
    });

    test('BUG: moving player should not move previously selected element', async ({ page }) => {
        // Test with player and element
        await page.evaluate(() => {
            // Make sure we're in select mode
            AppState.currentTool = 'select';

            // Add a cone element
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
            AppState.nextElementId = 2;

            // Add a player
            const player = {
                id: 'player-1',
                name: 'P1',
                number: 1,
                color: '#FF0000',
                x: 1500,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            AppState.nextPlayerId = 2;

            if (typeof Elements !== 'undefined') Elements.render();
            if (typeof Players !== 'undefined') Players.render();
        });

        await page.waitForTimeout(300);

        const initialPositions = await page.evaluate(() => {
            return {
                element: { x: AppState.elements[0].x, y: AppState.elements[0].y },
                player: { x: AppState.players[0].x, y: AppState.players[0].y }
            };
        });

        // Select element first
        const elementSvg = page.locator('.element-svg').first();
        await elementSvg.click();
        await page.waitForTimeout(200);

        // Then select player
        const playerDiv = page.locator('.player').first();
        await playerDiv.click();
        await page.waitForTimeout(200);

        // Verify player is selected, element is deselected
        const selectionState = await page.evaluate(() => {
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                selectedPlayer: AppState.selectedPlayer ? AppState.selectedPlayer.id : null,
                actualPlayerId: AppState.players[0].id
            };
        });
        expect(selectionState.selectedPlayer).toBe(selectionState.actualPlayerId);
        expect(selectionState.selectedElement).toBeNull();

        // Drag the player
        const playerBox = await playerDiv.boundingBox();
        await page.mouse.move(playerBox.x + playerBox.width / 2, playerBox.y + playerBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(playerBox.x + playerBox.width / 2 + 100, playerBox.y + playerBox.height / 2 + 80);
        await page.waitForTimeout(100);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const afterDrag = await page.evaluate(() => {
            return {
                element: { x: AppState.elements[0].x, y: AppState.elements[0].y },
                player: { x: AppState.players[0].x, y: AppState.players[0].y }
            };
        });

        const elementDelta = {
            x: Math.abs(afterDrag.element.x - initialPositions.element.x),
            y: Math.abs(afterDrag.element.y - initialPositions.element.y)
        };
        const playerDelta = {
            x: Math.abs(afterDrag.player.x - initialPositions.player.x),
            y: Math.abs(afterDrag.player.y - initialPositions.player.y)
        };


        // Player should have moved
        expect(playerDelta.x).toBeGreaterThan(50);

        // Element should NOT have moved
        if (elementDelta.x > 1 || elementDelta.y > 1) {
        }
        expect(elementDelta.x).toBeLessThan(1);
        expect(elementDelta.y).toBeLessThan(1);
    });
});
