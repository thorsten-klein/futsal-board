import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Shape Rotation Jump Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#board-area', { state: 'attached' });
        await page.waitForTimeout(300);

        // Enable select tool
        await page.evaluate(() => {
            AppState.currentTool = 'select';
        });
    });

    test('TOUCH MODE: Rectangle should not jump when rotation starts', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'rect-jump-touch',
                type: 'rectangle',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get initial shape position
        const svg = page.locator('svg[data-shape="rect-jump-touch"]').first();
        const initialBox = await svg.boundingBox();
        const initialCenterX = initialBox.x + initialBox.width / 2;
        const initialCenterY = initialBox.y + initialBox.height / 2;


        // Get rotation handle
        const rotationHandle = page.locator('.rotation-handle').first();
        const handleBox = await rotationHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;


        // Start rotating
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get shape position immediately after mousedown
        const afterMouseDownBox = await svg.boundingBox();
        const afterMouseDownCenterX = afterMouseDownBox.x + afterMouseDownBox.width / 2;
        const afterMouseDownCenterY = afterMouseDownBox.y + afterMouseDownBox.height / 2;


        // Calculate jump
        const jumpX = Math.abs(afterMouseDownCenterX - initialCenterX);
        const jumpY = Math.abs(afterMouseDownCenterY - initialCenterY);


        // Shape should not jump in touch mode
        expect(jumpX).toBeLessThan(2);
        expect(jumpY).toBeLessThan(2);

        await page.mouse.up();
    });

    test('Rectangle should not jump when rotation starts', async ({ page }) => {
        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'rect-jump',
                type: 'rectangle',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get initial shape position
        const svg = page.locator('svg[data-shape="rect-jump"]').first();
        const initialBox = await svg.boundingBox();
        const initialCenterX = initialBox.x + initialBox.width / 2;
        const initialCenterY = initialBox.y + initialBox.height / 2;


        // Get rotation handle
        const rotationHandle = page.locator('.rotation-handle').first();
        const handleBox = await rotationHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;


        // Start rotating (mousedown on handle)
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get shape position immediately after mousedown
        const afterMouseDownBox = await svg.boundingBox();
        const afterMouseDownCenterX = afterMouseDownBox.x + afterMouseDownBox.width / 2;
        const afterMouseDownCenterY = afterMouseDownBox.y + afterMouseDownBox.height / 2;


        // Calculate jump on mousedown
        const jumpOnMouseDownX = Math.abs(afterMouseDownCenterX - initialCenterX);
        const jumpOnMouseDownY = Math.abs(afterMouseDownCenterY - initialCenterY);


        // Shape should not jump when rotation starts
        expect(jumpOnMouseDownX).toBeLessThan(2);
        expect(jumpOnMouseDownY).toBeLessThan(2);

        // Move slightly
        await page.mouse.move(handleCenterX + 5, handleCenterY + 5, { steps: 1 });
        await page.waitForTimeout(50);

        const afterSmallMoveBox = await svg.boundingBox();
        const afterSmallMoveCenterX = afterSmallMoveBox.x + afterSmallMoveBox.width / 2;
        const afterSmallMoveCenterY = afterSmallMoveBox.y + afterSmallMoveBox.height / 2;


        // Shape center should remain stable during small rotation
        const driftX = Math.abs(afterSmallMoveCenterX - afterMouseDownCenterX);
        const driftY = Math.abs(afterSmallMoveCenterY - afterMouseDownCenterY);


        expect(driftX).toBeLessThan(2);
        expect(driftY).toBeLessThan(2);

        await page.mouse.up();
    });

    test('Text should not jump when rotation starts', async ({ page }) => {
        // Create a text shape
        await page.evaluate(() => {
            const shape = {
                id: 'text-jump',
                type: 'text',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 0,
                text: 'Test Text',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get initial shape position
        const svg = page.locator('svg[data-shape="text-jump"]').first();
        const initialBox = await svg.boundingBox();
        const initialCenterX = initialBox.x + initialBox.width / 2;
        const initialCenterY = initialBox.y + initialBox.height / 2;


        // Get rotation handle
        const rotationHandle = page.locator('.rotation-handle').first();
        const handleBox = await rotationHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;

        // Start rotating
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get shape position immediately after mousedown
        const afterMouseDownBox = await svg.boundingBox();
        const afterMouseDownCenterX = afterMouseDownBox.x + afterMouseDownBox.width / 2;
        const afterMouseDownCenterY = afterMouseDownBox.y + afterMouseDownBox.height / 2;


        // Calculate jump
        const jumpX = Math.abs(afterMouseDownCenterX - initialCenterX);
        const jumpY = Math.abs(afterMouseDownCenterY - initialCenterY);


        // Text should not jump when rotation starts
        expect(jumpX).toBeLessThan(2);
        expect(jumpY).toBeLessThan(2);

        await page.mouse.up();
    });

    test('Ellipse should not jump when rotation starts', async ({ page }) => {
        // Create an ellipse
        await page.evaluate(() => {
            const shape = {
                id: 'ellipse-jump',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get initial shape position
        const svg = page.locator('svg[data-shape="ellipse-jump"]').first();
        const initialBox = await svg.boundingBox();
        const initialCenterX = initialBox.x + initialBox.width / 2;
        const initialCenterY = initialBox.y + initialBox.height / 2;


        // Get rotation handle
        const rotationHandle = page.locator('.rotation-handle').first();
        const handleBox = await rotationHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;

        // Start rotating
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get shape position immediately after mousedown
        const afterMouseDownBox = await svg.boundingBox();
        const afterMouseDownCenterX = afterMouseDownBox.x + afterMouseDownBox.width / 2;
        const afterMouseDownCenterY = afterMouseDownBox.y + afterMouseDownBox.height / 2;


        // Calculate jump
        const jumpX = Math.abs(afterMouseDownCenterX - initialCenterX);
        const jumpY = Math.abs(afterMouseDownCenterY - initialCenterY);


        // Ellipse should not jump when rotation starts
        expect(jumpX).toBeLessThan(2);
        expect(jumpY).toBeLessThan(2);

        await page.mouse.up();
    });

    test('Rotation handle should not jump away from mouse during rotation', async ({ page }) => {
        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'rect-handle-jump',
                type: 'rectangle',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get initial rotation handle position
        const rotationHandle = page.locator('.rotation-handle').first();
        const initialHandleBox = await rotationHandle.boundingBox();
        const initialHandleCenterX = initialHandleBox.x + initialHandleBox.width / 2;
        const initialHandleCenterY = initialHandleBox.y + initialHandleBox.height / 2;


        // Start rotating from handle center
        await page.mouse.move(initialHandleCenterX, initialHandleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Move mouse to rotate
        const newMouseX = initialHandleCenterX + 50;
        const newMouseY = initialHandleCenterY;
        await page.mouse.move(newMouseX, newMouseY, { steps: 10 });
        await page.waitForTimeout(100);

        // Get handle position after rotation
        const afterRotateHandleBox = await rotationHandle.boundingBox();
        const afterRotateHandleCenterX = afterRotateHandleBox.x + afterRotateHandleBox.width / 2;
        const afterRotateHandleCenterY = afterRotateHandleBox.y + afterRotateHandleBox.height / 2;


        // The handle should have moved to follow the rotation,
        // but should still be reasonably close to where the mouse is
        // (it won't be exact since the handle orbits around the shape center)
        const handleToMouseDist = Math.sqrt(
            Math.pow(afterRotateHandleCenterX - newMouseX, 2) +
            Math.pow(afterRotateHandleCenterY - newMouseY, 2)
        );


        // The handle shouldn't be too far from the mouse
        // During rotation, the handle orbits, so some distance is expected
        // But it shouldn't jump to a completely different location
        expect(handleToMouseDist).toBeLessThan(150);

        await page.mouse.up();
    });
});
