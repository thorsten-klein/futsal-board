import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Shape Resize Jump Bug', () => {
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

    test('Rectangle should not jump when resize starts', async ({ page }) => {
        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'rect-resize',
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
        const svg = page.locator('svg[data-shape="rect-resize"]').first();
        const initialBox = await svg.boundingBox();
        const initialCenterX = initialBox.x + initialBox.width / 2;
        const initialCenterY = initialBox.y + initialBox.height / 2;


        // Get a resize handle (horizontal edge)
        const resizeHandle = page.locator('.resize-handle').first();
        await expect(resizeHandle).toBeVisible();

        const handleBox = await resizeHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;


        // Start resizing (mousedown on handle)
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get shape position immediately after mousedown
        const afterMouseDownBox = await svg.boundingBox();
        const afterMouseDownCenterX = afterMouseDownBox.x + afterMouseDownBox.width / 2;
        const afterMouseDownCenterY = afterMouseDownBox.y + afterMouseDownBox.height / 2;


        // Calculate jump on mousedown
        const jumpX = Math.abs(afterMouseDownCenterX - initialCenterX);
        const jumpY = Math.abs(afterMouseDownCenterY - initialCenterY);


        // Shape center might shift slightly during resize, but not drastically
        expect(jumpX).toBeLessThan(5);
        expect(jumpY).toBeLessThan(5);

        await page.mouse.up();
    });

    test('Ellipse should not jump when resize starts', async ({ page }) => {
        // Create an ellipse
        await page.evaluate(() => {
            const shape = {
                id: 'ellipse-resize',
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
        const svg = page.locator('svg[data-shape="ellipse-resize"]').first();
        const initialBox = await svg.boundingBox();
        const initialCenterX = initialBox.x + initialBox.width / 2;
        const initialCenterY = initialBox.y + initialBox.height / 2;


        // Get a resize handle
        const resizeHandle = page.locator('.resize-handle').first();
        await expect(resizeHandle).toBeVisible();

        const handleBox = await resizeHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;

        // Start resizing
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get shape position after mousedown
        const afterMouseDownBox = await svg.boundingBox();
        const afterMouseDownCenterX = afterMouseDownBox.x + afterMouseDownBox.width / 2;
        const afterMouseDownCenterY = afterMouseDownBox.y + afterMouseDownBox.height / 2;


        // Calculate jump
        const jumpX = Math.abs(afterMouseDownCenterX - initialCenterX);
        const jumpY = Math.abs(afterMouseDownCenterY - initialCenterY);


        expect(jumpX).toBeLessThan(5);
        expect(jumpY).toBeLessThan(5);

        await page.mouse.up();
    });

    test('TOUCH MODE: Rectangle should not jump when resize starts', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'rect-resize-touch',
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
        const svg = page.locator('svg[data-shape="rect-resize-touch"]').first();
        const initialBox = await svg.boundingBox();
        const initialCenterX = initialBox.x + initialBox.width / 2;
        const initialCenterY = initialBox.y + initialBox.height / 2;


        // Get a resize handle
        const resizeHandle = page.locator('.resize-handle').first();
        await expect(resizeHandle).toBeVisible();

        const handleBox = await resizeHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;

        // Start resizing
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get shape position after mousedown
        const afterMouseDownBox = await svg.boundingBox();
        const afterMouseDownCenterX = afterMouseDownBox.x + afterMouseDownBox.width / 2;
        const afterMouseDownCenterY = afterMouseDownBox.y + afterMouseDownBox.height / 2;


        // Calculate jump
        const jumpX = Math.abs(afterMouseDownCenterX - initialCenterX);
        const jumpY = Math.abs(afterMouseDownCenterY - initialCenterY);


        expect(jumpX).toBeLessThan(5);
        expect(jumpY).toBeLessThan(5);

        await page.mouse.up();
    });

    test('Text should not jump when resize starts', async ({ page }) => {
        // Create a text shape
        await page.evaluate(() => {
            const shape = {
                id: 'text-resize',
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
        const svg = page.locator('svg[data-shape="text-resize"]').first();
        const initialBox = await svg.boundingBox();
        const initialCenterX = initialBox.x + initialBox.width / 2;
        const initialCenterY = initialBox.y + initialBox.height / 2;


        // Get resize handle
        const resizeHandle = page.locator('.resize-handle').first();
        await expect(resizeHandle).toBeVisible();

        const handleBox = await resizeHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;

        // Start resizing
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get shape position after mousedown
        const afterMouseDownBox = await svg.boundingBox();
        const afterMouseDownCenterX = afterMouseDownBox.x + afterMouseDownBox.width / 2;
        const afterMouseDownCenterY = afterMouseDownBox.y + afterMouseDownBox.height / 2;


        // Calculate jump
        const jumpX = Math.abs(afterMouseDownCenterX - initialCenterX);
        const jumpY = Math.abs(afterMouseDownCenterY - initialCenterY);


        expect(jumpX).toBeLessThan(5);
        expect(jumpY).toBeLessThan(5);

        await page.mouse.up();
    });
});
