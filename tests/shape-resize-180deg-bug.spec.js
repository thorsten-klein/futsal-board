/**
 * Test: on a 180°-rotated board, dragging a resize handle must move the DRAGGED
 * edge, not the OPPOSITE (fixed) edge.
 *
 * Root cause: the edgeConfigs `else` branch treats 0° and 180° the same way,
 * but at 180° the board space is flipped so boardOffsetX signs must be negated.
 */
import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Shape resize on 180° rotated board', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        // Rotate board to 180°
        await page.evaluate(() => {
            AppState.boardRotation = 180;
            Board.resize();
        });
        await page.waitForTimeout(200);
        await page.evaluate(() => { AppState.currentTool = 'select'; });
    });

    test('Dragging right handle right should widen shape on the right, not the left', async ({ page }) => {
        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'rect-180-h',
                type: 'rectangle',
                x: 2000, y: 1500,
                width: 400, height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52,152,219,0.3)',
                strokeWidth: 3,
                visible: true, inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });
        await page.waitForTimeout(300);

        const svg = page.locator('svg[data-shape="rect-180-h"]').first();
        const initialBox = await svg.boundingBox();
        const initialLeftX  = initialBox.x;
        const initialRightX = initialBox.x + initialBox.width;

        // Find the rightmost resize handle on screen
        const handles = page.locator('.resize-handle');
        const count = await handles.count();
        let rightHandle = null;
        let rightmostCX = -Infinity;
        for (let i = 0; i < count; i++) {
            const box = await handles.nth(i).boundingBox();
            const cx = box.x + box.width / 2;
            if (cx > rightmostCX) {
                rightmostCX = cx;
                rightHandle = handles.nth(i);
            }
        }
        expect(rightHandle).not.toBeNull();

        // Drag the rightmost handle 80px to the right
        const hBox = await rightHandle.boundingBox();
        const startX = hBox.x + hBox.width / 2;
        const startY = hBox.y + hBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(30);
        await page.mouse.move(startX + 80, startY, { steps: 8 });
        await page.waitForTimeout(50);

        const afterBox = await svg.boundingBox();

        // The LEFT (fixed / opposite) edge must NOT have moved
        expect(Math.abs(afterBox.x - initialLeftX)).toBeLessThan(10);

        // The RIGHT (dragged) edge must have moved to the right
        expect(afterBox.x + afterBox.width).toBeGreaterThan(initialRightX + 30);

        await page.mouse.up();
    });

    test('Dragging left handle left should widen shape on the left, not the right', async ({ page }) => {
        await page.evaluate(() => {
            const shape = {
                id: 'rect-180-h2',
                type: 'rectangle',
                x: 2000, y: 1500,
                width: 400, height: 200,
                rotation: 0,
                color: '#e74c3c',
                fillColor: 'rgba(231,76,60,0.3)',
                strokeWidth: 3,
                visible: true, inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });
        await page.waitForTimeout(300);

        const svg = page.locator('svg[data-shape="rect-180-h2"]').first();
        const initialBox = await svg.boundingBox();
        const initialLeftX  = initialBox.x;
        const initialRightX = initialBox.x + initialBox.width;

        // Find the leftmost resize handle
        const handles = page.locator('.resize-handle');
        const count = await handles.count();
        let leftHandle = null;
        let leftmostCX = Infinity;
        for (let i = 0; i < count; i++) {
            const box = await handles.nth(i).boundingBox();
            const cx = box.x + box.width / 2;
            if (cx < leftmostCX) {
                leftmostCX = cx;
                leftHandle = handles.nth(i);
            }
        }
        expect(leftHandle).not.toBeNull();

        // Drag the leftmost handle 80px to the left
        const hBox = await leftHandle.boundingBox();
        const startX = hBox.x + hBox.width / 2;
        const startY = hBox.y + hBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(30);
        await page.mouse.move(startX - 80, startY, { steps: 8 });
        await page.waitForTimeout(50);

        const afterBox = await svg.boundingBox();

        // The RIGHT (fixed / opposite) edge must NOT have moved
        expect(Math.abs((afterBox.x + afterBox.width) - initialRightX)).toBeLessThan(10);

        // The LEFT (dragged) edge must have moved to the left
        expect(afterBox.x).toBeLessThan(initialLeftX - 30);

        await page.mouse.up();
    });

    test('Dragging top handle up should grow shape upward, not downward', async ({ page }) => {
        await page.evaluate(() => {
            const shape = {
                id: 'rect-180-v',
                type: 'rectangle',
                x: 2000, y: 1500,
                width: 400, height: 200,
                rotation: 0,
                color: '#2ecc71',
                fillColor: 'rgba(46,204,113,0.3)',
                strokeWidth: 3,
                visible: true, inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });
        await page.waitForTimeout(300);

        const svg = page.locator('svg[data-shape="rect-180-v"]').first();
        const initialBox = await svg.boundingBox();
        const initialTopY    = initialBox.y;
        const initialBottomY = initialBox.y + initialBox.height;

        // Find the topmost resize handle
        const handles = page.locator('.resize-handle');
        const count = await handles.count();
        let topHandle = null;
        let topmostCY = Infinity;
        for (let i = 0; i < count; i++) {
            const box = await handles.nth(i).boundingBox();
            const cy = box.y + box.height / 2;
            if (cy < topmostCY) {
                topmostCY = cy;
                topHandle = handles.nth(i);
            }
        }
        expect(topHandle).not.toBeNull();

        const hBox = await topHandle.boundingBox();
        const startX = hBox.x + hBox.width / 2;
        const startY = hBox.y + hBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(30);
        await page.mouse.move(startX, startY - 80, { steps: 8 });
        await page.waitForTimeout(50);

        const afterBox = await svg.boundingBox();

        // The BOTTOM (fixed / opposite) edge must NOT have moved
        expect(Math.abs((afterBox.y + afterBox.height) - initialBottomY)).toBeLessThan(10);

        // The TOP (dragged) edge must have moved upward
        expect(afterBox.y).toBeLessThan(initialTopY - 30);

        await page.mouse.up();
    });
});
