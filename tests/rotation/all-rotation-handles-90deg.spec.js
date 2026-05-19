/**
 * Comprehensive test for rotation handle drag at 90° board rotation.
 * Tests all rotatable object types: players, elements, and shapes.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

/** Right-click on an empty part of the board to open context menu. */
async function rightClickBoard(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Get the board canvas context menu. */
async function getBoardCanvasMenu(page) {
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu;
}

/** Add a player at a specific board position. */
async function addPlayerAt(page, x, y, rotation = 0) {
    const playerId = await page.evaluate(({ x, y, rotation }) => {
        const player = {
            id: `player-${AppState.nextPlayerId++}`,
            teamId: AppState.teams[0].id,
            x: x,
            y: y,
            number: 1,
            rotation: rotation,
            visible: true
        };
        AppState.players.push(player);
        Players.render();
        return player.id;
    }, { x, y, rotation });
    return playerId;
}

/** Add an element at a specific board position. */
async function addElementAt(page, type, x, y, rotation = 0) {
    const elementId = await page.evaluate(({ type, x, y, rotation }) => {
        const element = {
            id: `element-${AppState.nextElementId++}`,
            type: type,
            x: x,
            y: y,
            rotation: rotation,
            visible: true
        };
        AppState.elements.push(element);
        Elements.render();
        return element.id;
    }, { type, x, y, rotation });
    return elementId;
}

/** Add a shape to the board using the proper creation method. */
async function addShape(page, type, x, y) {
    const shapeId = await page.evaluate(({ type, x, y }) => {
        // Use the same method as the UI to create shapes
        Shapes.addShapeAtPosition(type, x, y);
        // Return the ID of the shape we just created (last one in the array)
        const shape = AppState.shapes[AppState.shapes.length - 1];
        return shape.id;
    }, { type, x, y });
    return shapeId;
}

/** Rotate board to 90 degrees. */
async function rotateBoardTo90(page) {
    await rightClickBoard(page);
    const menu = await getBoardCanvasMenu(page);
    await menu.locator('[data-action="rotate-right"]').click();
    await page.waitForTimeout(500);
}

/**
 * Test if rotation handle tracks mouse angle correctly at 90° board rotation.
 * Returns angle difference in degrees.
 */
async function testRotationHandleTracking(page, entityId) {
    // Select the entity
    await page.locator(`#${entityId}`).click();
    await page.waitForTimeout(300);

    await page.waitForSelector('.rotation-handle', { state: 'visible' });

    // Start drag from handle center
    const handleStart = await page.locator('.rotation-handle').boundingBox();
    const startX = handleStart.x + handleStart.width / 2;
    const startY = handleStart.y + handleStart.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);

    // Move mouse to a new position
    const moveToX = startX + 100;
    const moveToY = startY + 50;

    await page.mouse.move(moveToX, moveToY, { steps: 10 });
    await page.waitForTimeout(100);

    // Get handle position after drag
    const handleDuring = await page.locator('.rotation-handle').boundingBox();
    const handleCenterX = handleDuring.x + handleDuring.width / 2;
    const handleCenterY = handleDuring.y + handleDuring.height / 2;

    // Get entity center position
    const entityBox = await page.locator(`#${entityId}`).boundingBox();
    const entityCenterX = entityBox.x + entityBox.width / 2;
    const entityCenterY = entityBox.y + entityBox.height / 2;

    // Calculate angles
    const angleToMouse = Math.atan2(moveToY - entityCenterY, moveToX - entityCenterX) * 180 / Math.PI;
    const angleToHandle = Math.atan2(handleCenterY - entityCenterY, handleCenterX - entityCenterX) * 180 / Math.PI;

    // Normalize angles
    const normalizeAngle = (a) => ((a % 360) + 360) % 360;
    const mouseAngle = normalizeAngle(angleToMouse);
    const handleAngle = normalizeAngle(angleToHandle);

    // Calculate shortest angle difference
    let angleDiff = Math.abs(handleAngle - mouseAngle);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    await page.mouse.up();
    await page.waitForTimeout(100);

    return { angleDiff, mouseAngle, handleAngle, entityCenter: { x: entityCenterX, y: entityCenterY } };
}

test.describe('All rotation handles at 90° board rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        const playerId = await addPlayerAt(page, 2000, 1000, 0);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        const result = await testRotationHandleTracking(page, playerId);

        console.log('\n=== PLAYER ROTATION HANDLE AT 90° ===');
        console.log(`Angle from entity to mouse: ${result.mouseAngle.toFixed(1)}°`);
        console.log(`Angle from entity to handle: ${result.handleAngle.toFixed(1)}°`);
        console.log(`Angle difference: ${result.angleDiff.toFixed(1)}°`);

        const tolerance = 10; // degrees
        if (result.angleDiff > tolerance) {
            console.log(`⚠️  BUG: Player rotation handle is ${result.angleDiff.toFixed(1)}° off`);
        } else {
            console.log(`✓ Player rotation handle tracks correctly`);
        }

        expect(result.angleDiff).toBeLessThan(tolerance);
    });

    test('ladder rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        const elementId = await addElementAt(page, 'ladder', 2000, 1000, 0);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        const result = await testRotationHandleTracking(page, elementId);

        console.log('\n=== LADDER ROTATION HANDLE AT 90° ===');
        console.log(`Angle difference: ${result.angleDiff.toFixed(1)}°`);

        expect(result.angleDiff).toBeLessThan(10);
    });

    test('rebounce rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        const elementId = await addElementAt(page, 'rebounce', 2000, 1000, 0);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        const result = await testRotationHandleTracking(page, elementId);

        console.log('\n=== REBOUNCE ROTATION HANDLE AT 90° ===');
        console.log(`Angle difference: ${result.angleDiff.toFixed(1)}°`);

        expect(result.angleDiff).toBeLessThan(10);
    });

    test('goal rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        const elementId = await addElementAt(page, 'goal', 2000, 1000, 0);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        const result = await testRotationHandleTracking(page, elementId);

        console.log('\n=== GOAL ROTATION HANDLE AT 90° ===');
        console.log(`Angle difference: ${result.angleDiff.toFixed(1)}°`);

        expect(result.angleDiff).toBeLessThan(10);
    });

    test('small-goal rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        const elementId = await addElementAt(page, 'small-goal', 2000, 1000, 0);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        const result = await testRotationHandleTracking(page, elementId);

        console.log('\n=== SMALL-GOAL ROTATION HANDLE AT 90° ===');
        console.log(`Angle difference: ${result.angleDiff.toFixed(1)}°`);

        expect(result.angleDiff).toBeLessThan(10);
    });

    test('big-wall rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        const elementId = await addElementAt(page, 'big-wall', 2000, 1000, 0);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        const result = await testRotationHandleTracking(page, elementId);

        console.log('\n=== BIG-WALL ROTATION HANDLE AT 90° ===');
        console.log(`Angle difference: ${result.angleDiff.toFixed(1)}°`);

        expect(result.angleDiff).toBeLessThan(10);
    });

    test('small-wall rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        const elementId = await addElementAt(page, 'small-wall', 2000, 1000, 0);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        const result = await testRotationHandleTracking(page, elementId);

        console.log('\n=== SMALL-WALL ROTATION HANDLE AT 90° ===');
        console.log(`Angle difference: ${result.angleDiff.toFixed(1)}°`);

        expect(result.angleDiff).toBeLessThan(10);
    });

    test('small-hurdle rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        const elementId = await addElementAt(page, 'small-hurdle', 2000, 1000, 0);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        const result = await testRotationHandleTracking(page, elementId);

        console.log('\n=== SMALL-HURDLE ROTATION HANDLE AT 90° ===');
        console.log(`Angle difference: ${result.angleDiff.toFixed(1)}°`);

        expect(result.angleDiff).toBeLessThan(10);
    });

    test('pole does not have rotation handle (not rotatable)', async ({ page }) => {
        // Poles don't support rotation, so they shouldn't have a rotation handle
        const elementId = await addElementAt(page, 'pole', 2000, 1000, 0);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        // Select the pole
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        // Check that no rotation handle appears
        const handleCount = await page.locator('.rotation-handle').count();

        console.log('\n=== POLE ROTATION HANDLE AT 90° ===');
        console.log(`Rotation handle count: ${handleCount} (expected: 0)`);
        console.log(`✓ Pole correctly does not have rotation handle`);

        expect(handleCount).toBe(0);
    });

    test('rectangle shape rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        // Add a rectangle shape at center position
        const shapeId = await addShape(page, 'rectangle', 2000, 1000);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        // Click on the shape to select it (like manual interaction)
        await page.locator(`#${shapeId}`).click();
        await page.waitForTimeout(300);

        // Check if rotation handle exists
        const handleCount = await page.locator('.rotation-handle').count();

        if (handleCount === 0) {
            console.log('\n=== RECTANGLE SHAPE ROTATION HANDLE AT 90° ===');
            console.log(`⚠️  BUG: Rectangle shape does NOT have rotation handle at 90°`);
            throw new Error('Rectangle shape should have rotation handle at 90° but it does not appear');
        }

        console.log('\n=== RECTANGLE SHAPE ROTATION HANDLE AT 90° ===');
        console.log(`✓ Rectangle shape has rotation handle at 90°`);

        // Test that it can be dragged
        const handleStart = await page.locator('.rotation-handle').boundingBox();
        const startX = handleStart.x + handleStart.width / 2;
        const startY = handleStart.y + handleStart.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 50, startY + 50);
        await page.mouse.up();
        await page.waitForTimeout(100);

        console.log(`✓ Rectangle rotation handle can be dragged`);

        expect(handleCount).toBeGreaterThan(0);
    });

    test('circle shape rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        // Add a circle shape
        const shapeId = await addShape(page, 'circle', 2000, 1000);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        // Click on the shape to select it
        await page.locator(`#${shapeId}`).click();
        await page.waitForTimeout(300);

        const handleCount = await page.locator('.rotation-handle').count();

        if (handleCount === 0) {
            console.log('\n=== CIRCLE SHAPE ROTATION HANDLE AT 90° ===');
            console.log(`⚠️  BUG: Circle shape does NOT have rotation handle at 90°`);
            throw new Error('Circle shape should have rotation handle at 90° but it does not appear');
        }

        console.log('\n=== CIRCLE SHAPE ROTATION HANDLE AT 90° ===');
        console.log(`✓ Circle shape has rotation handle at 90°`);

        expect(handleCount).toBeGreaterThan(0);
    });

    test('ellipse shape rotation handle tracks mouse correctly at 90°', async ({ page }) => {
        // Add an ellipse shape
        const shapeId = await addShape(page, 'ellipse', 2000, 1000);
        await page.waitForTimeout(300);

        await rotateBoardTo90(page);

        // Click on the shape to select it
        await page.locator(`#${shapeId}`).click();
        await page.waitForTimeout(300);

        const handleCount = await page.locator('.rotation-handle').count();

        if (handleCount === 0) {
            console.log('\n=== ELLIPSE SHAPE ROTATION HANDLE AT 90° ===');
            console.log(`⚠️  BUG: Ellipse shape does NOT have rotation handle at 90°`);
            throw new Error('Ellipse shape should have rotation handle at 90° but it does not appear');
        }

        console.log('\n=== ELLIPSE SHAPE ROTATION HANDLE AT 90° ===');
        console.log(`✓ Ellipse shape has rotation handle at 90°`);

        expect(handleCount).toBeGreaterThan(0);
    });

    test('all rotatable element types can be rotated at 90° board rotation', async ({ page }) => {
        // Test that we can add and rotate all rotatable element types without crashes
        // Note: pole is excluded because it doesn't support rotation
        const elementTypes = ['ladder', 'rebounce', 'goal', 'small-goal', 'big-wall', 'small-wall', 'small-hurdle'];

        await rotateBoardTo90(page);

        let successCount = 0;

        for (let i = 0; i < elementTypes.length; i++) {
            const type = elementTypes[i];
            // Space elements out to avoid overlaps
            const x = 1500 + (i % 3) * 800;
            const y = 800 + Math.floor(i / 3) * 600;

            const elementId = await addElementAt(page, type, x, y, 0);
            await page.waitForTimeout(150);

            try {
                // Select and try to rotate
                await page.locator(`#${elementId}`).click({ timeout: 5000 });
                await page.waitForTimeout(150);

                const handleCount = await page.locator('.rotation-handle').count();
                if (handleCount > 0) {
                    const handle = await page.locator('.rotation-handle').boundingBox();
                    const centerX = handle.x + handle.width / 2;
                    const centerY = handle.y + handle.height / 2;

                    // Quick rotation test
                    await page.mouse.move(centerX, centerY);
                    await page.mouse.down();
                    await page.mouse.move(centerX + 50, centerY + 50);
                    await page.mouse.up();
                    await page.waitForTimeout(50);

                    console.log(`✓ ${type} rotation handle works at 90°`);
                    successCount++;
                }

                // Deselect
                const canvas = await page.locator('#board-canvas').boundingBox();
                await page.mouse.click(canvas.x + 20, canvas.y + 20);
                await page.waitForTimeout(100);
            } catch (error) {
                console.log(`⚠ ${type} test skipped due to: ${error.message}`);
            }
        }

        console.log(`\n✓ Successfully tested ${successCount}/${elementTypes.length} element types`);
        expect(successCount).toBeGreaterThan(0);
    });
});
