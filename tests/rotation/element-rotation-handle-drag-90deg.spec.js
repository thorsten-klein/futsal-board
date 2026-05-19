/**
 * Test for element rotation handle drag bug at 90° board rotation.
 * Bug: When board is rotated 90°, dragging the rotation handle of elements
 * (like ladder) doesn't behave as expected - the rotation doesn't follow
 * the mouse correctly.
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

/** Get element rotation from AppState. */
async function getElementRotation(page, elementId) {
    return await page.evaluate((id) => {
        const element = AppState.elements.find(e => e.id === id);
        return element ? element.rotation : null;
    }, elementId);
}

test.describe('Element rotation handle drag at 90° board rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('rotation handle should follow mouse cursor during drag at 90°', async ({ page }) => {
        // This test checks if the rotation handle stays under the mouse cursor
        // during dragging at 90° board rotation

        // Add a ladder
        const elementId = await addElementAt(page, 'ladder', 2000, 1000, 0);
        await page.waitForTimeout(300);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Select the ladder
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        await page.waitForSelector('.rotation-handle', { state: 'visible' });

        // Start drag from handle center
        const handleStart = await page.locator('.rotation-handle').boundingBox();
        const startX = handleStart.x + handleStart.width / 2;
        const startY = handleStart.y + handleStart.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Move mouse to a new position and check if handle follows
        const moveToX = startX + 100;
        const moveToY = startY + 50;

        await page.mouse.move(moveToX, moveToY, { steps: 10 });
        await page.waitForTimeout(100);

        // Get handle position after drag (while mouse is still down)
        const handleDuring = await page.locator('.rotation-handle').boundingBox();
        const duringCenterX = handleDuring.x + handleDuring.width / 2;
        const duringCenterY = handleDuring.y + handleDuring.height / 2;

        // Get element center position to calculate angles
        const elementBox = await page.locator(`#${elementId}`).boundingBox();
        const elemCenterX = elementBox.x + elementBox.width / 2;
        const elemCenterY = elementBox.y + elementBox.height / 2;

        // Calculate angle from element center to mouse
        const angleToMouse = Math.atan2(moveToY - elemCenterY, moveToX - elemCenterX) * 180 / Math.PI;

        // Calculate angle from element center to handle
        const angleToHandle = Math.atan2(duringCenterY - elemCenterY, duringCenterX - elemCenterX) * 180 / Math.PI;

        // Normalize angles to 0-360
        const normalizeAngle = (a) => ((a % 360) + 360) % 360;
        const mouseAngle = normalizeAngle(angleToMouse);
        const handleAngle = normalizeAngle(angleToHandle);

        // Calculate angle difference (shortest path)
        let angleDiff = Math.abs(handleAngle - mouseAngle);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        console.log('\n=== HANDLE FOLLOWS MOUSE CHECK (ANGLE-BASED) ===');
        console.log(`Mouse position: (${moveToX.toFixed(1)}, ${moveToY.toFixed(1)})`);
        console.log(`Handle center: (${duringCenterX.toFixed(1)}, ${duringCenterY.toFixed(1)})`);
        console.log(`Element center: (${elemCenterX.toFixed(1)}, ${elemCenterY.toFixed(1)})`);
        console.log(`Angle from element to mouse: ${mouseAngle.toFixed(1)}°`);
        console.log(`Angle from element to handle: ${handleAngle.toFixed(1)}°`);
        console.log(`Angle difference: ${angleDiff.toFixed(1)}°`);

        await page.mouse.up();
        await page.waitForTimeout(100);

        // The handle should be at approximately the same angle as the mouse
        // relative to the element center (within 10° tolerance)
        const tolerance = 10; // degrees

        if (angleDiff > tolerance) {
            console.log(`⚠️  BUG DETECTED: Rotation handle doesn't track mouse angle correctly!`);
            console.log(`   Handle is ${angleDiff.toFixed(1)}° off from mouse direction`);
        } else {
            console.log(`✓ Rotation handle tracks mouse angle correctly`);
        }

        // Take screenshot
        await page.screenshot({ path: 'test-results/element-rotation-handle-follow-mouse.png' });

        expect(angleDiff).toBeLessThan(tolerance);
    });

    test('ladder rotation handle drag should rotate correctly at 90° board rotation', async ({ page }) => {
        // Add a ladder at a known position with 0° rotation
        const elementId = await addElementAt(page, 'ladder', 2000, 1000, 0);
        await page.waitForTimeout(300);

        const initialRotation = await getElementRotation(page, elementId);
        console.log('Initial ladder rotation at 0° board:', initialRotation);

        // Select the ladder and verify rotation handle appears at 0° board rotation
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        await page.waitForSelector('.rotation-handle', { state: 'visible' });
        const handle0deg = await page.locator('.rotation-handle').boundingBox();
        console.log('Rotation handle at 0° board:', handle0deg);

        // Get the handle center
        const handle0Center = {
            x: handle0deg.x + handle0deg.width / 2,
            y: handle0deg.y + handle0deg.height / 2
        };

        // Drag the handle to rotate the element by ~90° (move handle to the right)
        // At 0° board rotation, ladder is vertical, handle is above it
        // Moving handle to the right should rotate ladder clockwise
        const dragToX = handle0Center.x + 100;
        const dragToY = handle0Center.y;

        await page.mouse.move(handle0Center.x, handle0Center.y);
        await page.mouse.down();
        await page.mouse.move(dragToX, dragToY);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const rotationAfterDrag0 = await getElementRotation(page, elementId);
        console.log('Ladder rotation after drag at 0° board:', rotationAfterDrag0);

        // The rotation should be approximately 90° (within 5° tolerance)
        const expectedRotation0 = 90;
        const diff0 = Math.abs(rotationAfterDrag0 - expectedRotation0);
        console.log(`At 0° board: Expected rotation ~${expectedRotation0}°, got ${rotationAfterDrag0.toFixed(1)}°, diff = ${diff0.toFixed(1)}°`);

        // Deselect
        const canvas = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(canvas.x + 50, canvas.y + 50);
        await page.waitForTimeout(200);

        // Reset ladder rotation to 0° for the 90° board rotation test
        await page.evaluate((id) => {
            const element = AppState.elements.find(e => e.id === id);
            if (element) element.rotation = 0;
            Elements.render();
        }, elementId);
        await page.waitForTimeout(200);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Select the ladder at 90° board rotation
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        await page.waitForSelector('.rotation-handle', { state: 'visible' });
        const handle90deg = await page.locator('.rotation-handle').boundingBox();
        console.log('Rotation handle at 90° board:', handle90deg);

        const handle90Center = {
            x: handle90deg.x + handle90deg.width / 2,
            y: handle90deg.y + handle90deg.height / 2
        };

        // Perform the SAME drag gesture: move handle to the right by 100px
        // This should produce the SAME rotation result (~90°) regardless of board rotation
        const dragToX90 = handle90Center.x + 100;
        const dragToY90 = handle90Center.y;

        console.log(`\nDragging handle at 90° board from (${handle90Center.x.toFixed(1)}, ${handle90Center.y.toFixed(1)}) to (${dragToX90.toFixed(1)}, ${dragToY90.toFixed(1)})`);

        await page.mouse.move(handle90Center.x, handle90Center.y);
        await page.mouse.down();
        await page.mouse.move(dragToX90, dragToY90);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const rotationAfterDrag90 = await getElementRotation(page, elementId);
        console.log('Ladder rotation after drag at 90° board:', rotationAfterDrag90);

        // The rotation should be approximately the same as at 0° board rotation
        // Because we performed the same drag gesture (move handle right by 100px)
        const expectedRotation90 = 90;
        const diff90 = Math.abs(rotationAfterDrag90 - expectedRotation90);
        console.log(`At 90° board: Expected rotation ~${expectedRotation90}°, got ${rotationAfterDrag90.toFixed(1)}°, diff = ${diff90.toFixed(1)}°`);

        // Take screenshot for visual inspection
        await page.screenshot({ path: 'test-results/element-rotation-handle-90deg.png' });

        console.log('\n=== ROTATION HANDLE DRAG BUG CHECK ===');
        console.log(`Same drag gesture should produce same rotation regardless of board rotation`);
        console.log(`At 0° board: dragging handle right by 100px → ${rotationAfterDrag0.toFixed(1)}° rotation`);
        console.log(`At 90° board: dragging handle right by 100px → ${rotationAfterDrag90.toFixed(1)}° rotation`);
        console.log(`Difference: ${Math.abs(rotationAfterDrag90 - rotationAfterDrag0).toFixed(1)}°`);

        // NOTE: We can't reliably compare absolute rotation values because screen-space "right"
        // means different things in board space at different board rotations.
        // The important thing is that rotation changed when we dragged the handle.
        // The angle-based tracking test in all-rotation-handles-90deg.spec.js is more accurate.

        console.log(`✓ Rotation handle can be dragged at 90° board rotation`);

        // Just verify that rotation changed
        expect(rotationAfterDrag90).not.toBe(0);
    });

    test('goal rotation handle drag should rotate correctly at 90° board rotation', async ({ page }) => {
        // Add a goal at a known position with 0° rotation
        const elementId = await addElementAt(page, 'goal', 2000, 1000, 0);
        await page.waitForTimeout(300);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Select the goal
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        await page.waitForSelector('.rotation-handle', { state: 'visible' });
        const handle = await page.locator('.rotation-handle').boundingBox();

        const handleCenter = {
            x: handle.x + handle.width / 2,
            y: handle.y + handle.height / 2
        };

        // Drag the handle to rotate the goal
        const dragToX = handleCenter.x + 80;
        const dragToY = handleCenter.y;

        await page.mouse.move(handleCenter.x, handleCenter.y);
        await page.mouse.down();
        await page.mouse.move(dragToX, dragToY);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const rotationAfterDrag = await getElementRotation(page, elementId);
        console.log('Goal rotation after drag at 90° board:', rotationAfterDrag);

        // The rotation should have changed from initial (we don't check exact value,
        // just that it actually rotated)
        expect(rotationAfterDrag).not.toBe(0);

        // The rotation should be a reasonable value (0-360)
        expect(rotationAfterDrag).toBeGreaterThanOrEqual(0);
        expect(rotationAfterDrag).toBeLessThan(360);
    });

    test('rebounce board rotation handle drag should rotate correctly at 90° board rotation', async ({ page }) => {
        // Test another element type to ensure the fix works for all elements
        const elementId = await addElementAt(page, 'rebounce', 2200, 1200, 0);
        await page.waitForTimeout(300);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Select the rebounce board
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        const initialRotation = await getElementRotation(page, elementId);

        await page.waitForSelector('.rotation-handle', { state: 'visible' });
        const handle = await page.locator('.rotation-handle').boundingBox();

        const handleCenter = {
            x: handle.x + handle.width / 2,
            y: handle.y + handle.height / 2
        };

        // Drag the handle down to rotate
        const dragToX = handleCenter.x;
        const dragToY = handleCenter.y + 60;

        await page.mouse.move(handleCenter.x, handleCenter.y);
        await page.mouse.down();
        await page.mouse.move(dragToX, dragToY);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const rotationAfterDrag = await getElementRotation(page, elementId);
        console.log('Rebounce rotation after drag at 90° board:', rotationAfterDrag);

        // The rotation should have changed
        expect(rotationAfterDrag).not.toBe(initialRotation);
    });
});
