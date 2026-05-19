/**
 * Test for rotation handle positioning bug at 90° board rotation.
 * Bug: When board is rotated 90°, the rotation handle of elements (like ladder)
 * appears at the wrong position.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

test.describe('Rotation handle position at 90° board rotation', () => {
    test('ladder rotation handle should be at correct position at 90°', async ({ page }) => {
        // Capture console logs
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        await goto(page);

        // Add a ladder at a known position
        const elementId = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'ladder',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        await page.waitForTimeout(300);

        // Get ladder position at 0°
        const ladder0deg = await page.locator(`#${elementId}`).boundingBox();
        console.log('Ladder at 0°:', ladder0deg);

        // DEBUG: Check canvas dimensions at 0°
        const canvasInfo0 = await page.evaluate(() => {
            const canvas = AppState.canvas;
            const rect = canvas.getBoundingClientRect();
            return {
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                rectWidth: rect.width,
                rectHeight: rect.height,
                boardWidth: AppState.boardWidth,
                boardHeight: AppState.boardHeight
            };
        });
        console.log('Canvas info at 0°:', canvasInfo0);

        // Select the ladder at 0° and check rotation handle
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        // Wait for rotation handle to appear
        await page.waitForSelector('.rotation-handle', { state: 'visible' });
        const handle0deg = await page.locator('.rotation-handle').boundingBox();
        console.log('Rotation handle at 0°:', handle0deg);

        // Calculate expected offset at 0° (handle should be above the ladder)
        const offset0deg = {
            x: handle0deg.x + handle0deg.width / 2 - (ladder0deg.x + ladder0deg.width / 2),
            y: handle0deg.y + handle0deg.height / 2 - (ladder0deg.y + ladder0deg.height / 2)
        };
        console.log('Handle offset from ladder center at 0°:', offset0deg);

        // Deselect
        const canvas = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(canvas.x + 50, canvas.y + 50);
        await page.waitForTimeout(200);

        // Rotate board 90°
        await page.mouse.click(canvas.x + 10, canvas.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible' });
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Get ladder position at 90°
        const ladder90deg = await page.locator(`#${elementId}`).boundingBox();
        console.log('Ladder at 90°:', ladder90deg);

        // DEBUG: Check canvas dimensions at 90°
        const canvasInfo = await page.evaluate(() => {
            const canvas = AppState.canvas;
            const rect = canvas.getBoundingClientRect();
            return {
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                rectWidth: rect.width,
                rectHeight: rect.height,
                boardWidth: AppState.boardWidth,
                boardHeight: AppState.boardHeight,
                boardRotation: AppState.boardRotation,
                referenceScale: AppState.referenceScale,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor
            };
        });
        console.log('Canvas info at 90°:', canvasInfo);

        // Select the ladder at 90°
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        // DEBUG: Check element rotation
        const elementInfo = await page.evaluate((id) => {
            const element = AppState.elements.find(e => e.id === id);
            return { rotation: element.rotation, x: element.x, y: element.y };
        }, elementId);
        console.log('Element info at 90°:', elementInfo);

        // Get rotation handle position at 90°
        await page.waitForSelector('.rotation-handle', { state: 'visible' });
        const handle90deg = await page.locator('.rotation-handle').boundingBox();
        console.log('Rotation handle at 90°:', handle90deg);

        // Calculate actual offset at 90°
        const offset90deg = {
            x: handle90deg.x + handle90deg.width / 2 - (ladder90deg.x + ladder90deg.width / 2),
            y: handle90deg.y + handle90deg.height / 2 - (ladder90deg.y + ladder90deg.height / 2)
        };
        console.log('Handle offset from ladder center at 90°:', offset90deg);

        // Take screenshots for visual comparison
        await page.screenshot({ path: 'test-results/rotation-handle-90deg-ladder.png' });

        // The offset should be consistent (accounting for board rotation)
        // At 90° rotation, the visual "up" direction is rotated
        // So the handle offset should be rotated as well
        // Expected: offset at 90° = rotate(offset at 0°, 90°)

        // For a 90° CW rotation:
        // (x, y) → (-y, x)
        const expectedOffset90deg = {
            x: -offset0deg.y,
            y: offset0deg.x
        };

        console.log('\n=== ROTATION HANDLE POSITION BUG CHECK ===');
        console.log('Expected offset at 90°:', expectedOffset90deg);
        console.log('Actual offset at 90°:', offset90deg);
        console.log('Difference X:', Math.abs(offset90deg.x - expectedOffset90deg.x));
        console.log('Difference Y:', Math.abs(offset90deg.y - expectedOffset90deg.y));

        const tolerance = 5; // Allow 5px tolerance
        const diffX = Math.abs(offset90deg.x - expectedOffset90deg.x);
        const diffY = Math.abs(offset90deg.y - expectedOffset90deg.y);

        if (diffX > tolerance || diffY > tolerance) {
            console.log(`⚠️  BUG DETECTED: Rotation handle is misplaced!`);
            console.log(`   Expected to be ${tolerance}px from (${expectedOffset90deg.x.toFixed(1)}, ${expectedOffset90deg.y.toFixed(1)})`);
            console.log(`   But found at offset (${offset90deg.x.toFixed(1)}, ${offset90deg.y.toFixed(1)})`);
        } else {
            console.log(`✓ Rotation handle is correctly positioned`);
        }

        // Assert the rotation handle is at the correct position
        expect(diffX).toBeLessThan(tolerance);
        expect(diffY).toBeLessThan(tolerance);
    });

    test('goal rotation handle should be at correct position at 90°', async ({ page }) => {
        await goto(page);

        // Add a goal at a known position
        const elementId = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'goal',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        await page.waitForTimeout(300);

        // Get goal position at 0°
        const goal0deg = await page.locator(`#${elementId}`).boundingBox();

        // Select and check rotation handle at 0°
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        await page.waitForSelector('.rotation-handle', { state: 'visible' });
        const handle0deg = await page.locator('.rotation-handle').boundingBox();
        const offset0deg = {
            x: handle0deg.x + handle0deg.width / 2 - (goal0deg.x + goal0deg.width / 2),
            y: handle0deg.y + handle0deg.height / 2 - (goal0deg.y + goal0deg.height / 2)
        };

        // Deselect
        const canvas = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(canvas.x + 50, canvas.y + 50);
        await page.waitForTimeout(200);

        // Rotate board 90°
        await page.mouse.click(canvas.x + 10, canvas.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible' });
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Get goal position at 90°
        const goal90deg = await page.locator(`#${elementId}`).boundingBox();

        // Select and check rotation handle at 90°
        await page.locator(`#${elementId}`).click();
        await page.waitForTimeout(300);

        await page.waitForSelector('.rotation-handle', { state: 'visible' });
        const handle90deg = await page.locator('.rotation-handle').boundingBox();
        const offset90deg = {
            x: handle90deg.x + handle90deg.width / 2 - (goal90deg.x + goal90deg.width / 2),
            y: handle90deg.y + handle90deg.height / 2 - (goal90deg.y + goal90deg.height / 2)
        };

        // Expected offset after 90° rotation
        const expectedOffset90deg = {
            x: -offset0deg.y,
            y: offset0deg.x
        };

        console.log('\n=== GOAL ROTATION HANDLE AT 90° ===');
        console.log('Expected offset:', expectedOffset90deg);
        console.log('Actual offset:', offset90deg);

        const tolerance = 5;
        const diffX = Math.abs(offset90deg.x - expectedOffset90deg.x);
        const diffY = Math.abs(offset90deg.y - expectedOffset90deg.y);

        expect(diffX).toBeLessThan(tolerance);
        expect(diffY).toBeLessThan(tolerance);
    });
});
