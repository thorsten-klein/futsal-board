/**
 * Test: dragging a resize handle past the opposite edge must not flip/jump the shape.
 * The fixed (opposite) edge should stay in place; the dragged edge should clamp at the minimum
 * size before it crosses.
 */
import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Shape resize handle cannot cross opposite edge', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        await page.evaluate(() => { AppState.currentTool = 'select'; });
    });

    test('Dragging right edge past left edge must not flip the rectangle', async ({ page }) => {
        // Create a rectangle with known position/size
        await page.evaluate(() => {
            const shape = {
                id: 'rect-no-cross',
                type: 'rectangle',
                x: 2000,
                y: 1500,
                width: 400,
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

        const svg = page.locator('svg[data-shape="rect-no-cross"]').first();
        const initialBox = await svg.boundingBox();
        const initialLeftX = initialBox.x;

        // Find the rightmost resize handle (right edge handle)
        const handles = page.locator('.resize-handle');
        const count = await handles.count();
        let rightmostHandle = null;
        let rightmostCX = -Infinity;
        for (let i = 0; i < count; i++) {
            const box = await handles.nth(i).boundingBox();
            const cx = box.x + box.width / 2;
            if (cx > rightmostCX) {
                rightmostCX = cx;
                rightmostHandle = handles.nth(i);
            }
        }
        expect(rightmostHandle).not.toBeNull();

        // Drag the right edge handle far to the LEFT – well past the left (fixed) edge
        const handleBox = await rightmostHandle.boundingBox();
        const startX = handleBox.x + handleBox.width / 2;
        const startY = handleBox.y + handleBox.height / 2;
        const targetX = initialLeftX - 150; // 150px past the left edge

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(30);
        await page.mouse.move(targetX, startY, { steps: 10 });
        await page.waitForTimeout(50);

        // The left (fixed) edge must not have moved
        const duringBox = await svg.boundingBox();
        const leftEdgeDuring = duringBox.x;
        expect(Math.abs(leftEdgeDuring - initialLeftX)).toBeLessThan(10);

        await page.mouse.up();
    });

    test('Dragging left edge past right edge must not flip the rectangle', async ({ page }) => {
        await page.evaluate(() => {
            const shape = {
                id: 'rect-no-cross-left',
                type: 'rectangle',
                x: 2000,
                y: 1500,
                width: 400,
                height: 200,
                rotation: 0,
                color: '#e74c3c',
                fillColor: 'rgba(231, 76, 60, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });
        await page.waitForTimeout(300);

        const svg = page.locator('svg[data-shape="rect-no-cross-left"]').first();
        const initialBox = await svg.boundingBox();
        const initialRightX = initialBox.x + initialBox.width;

        // Find the leftmost resize handle (left edge handle)
        const handles = page.locator('.resize-handle');
        const count = await handles.count();
        let leftmostHandle = null;
        let leftmostCX = Infinity;
        for (let i = 0; i < count; i++) {
            const box = await handles.nth(i).boundingBox();
            const cx = box.x + box.width / 2;
            if (cx < leftmostCX) {
                leftmostCX = cx;
                leftmostHandle = handles.nth(i);
            }
        }
        expect(leftmostHandle).not.toBeNull();

        // Drag the left edge handle far to the RIGHT – well past the right (fixed) edge
        const handleBox = await leftmostHandle.boundingBox();
        const startX = handleBox.x + handleBox.width / 2;
        const startY = handleBox.y + handleBox.height / 2;
        const targetX = initialRightX + 150;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(30);
        await page.mouse.move(targetX, startY, { steps: 10 });
        await page.waitForTimeout(50);

        // The right (fixed) edge must not have moved
        const duringBox = await svg.boundingBox();
        const rightEdgeDuring = duringBox.x + duringBox.width;
        expect(Math.abs(rightEdgeDuring - initialRightX)).toBeLessThan(10);

        await page.mouse.up();
    });

    test('Dragging top edge past bottom edge must not flip the rectangle', async ({ page }) => {
        await page.evaluate(() => {
            const shape = {
                id: 'rect-no-cross-top',
                type: 'rectangle',
                x: 2000,
                y: 1500,
                width: 400,
                height: 200,
                rotation: 0,
                color: '#2ecc71',
                fillColor: 'rgba(46, 204, 113, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });
        await page.waitForTimeout(300);

        const svg = page.locator('svg[data-shape="rect-no-cross-top"]').first();
        const initialBox = await svg.boundingBox();
        const initialBottomY = initialBox.y + initialBox.height;

        // Find the topmost resize handle (top edge handle)
        const handles = page.locator('.resize-handle');
        const count = await handles.count();
        let topmostHandle = null;
        let topmostCY = Infinity;
        for (let i = 0; i < count; i++) {
            const box = await handles.nth(i).boundingBox();
            const cy = box.y + box.height / 2;
            if (cy < topmostCY) {
                topmostCY = cy;
                topmostHandle = handles.nth(i);
            }
        }
        expect(topmostHandle).not.toBeNull();

        // Drag the top edge handle far DOWN – well past the bottom (fixed) edge
        const handleBox = await topmostHandle.boundingBox();
        const startX = handleBox.x + handleBox.width / 2;
        const startY = handleBox.y + handleBox.height / 2;
        const targetY = initialBottomY + 150;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(30);
        await page.mouse.move(startX, targetY, { steps: 10 });
        await page.waitForTimeout(50);

        // The bottom (fixed) edge must not have moved
        const duringBox = await svg.boundingBox();
        const bottomEdgeDuring = duringBox.y + duringBox.height;
        expect(Math.abs(bottomEdgeDuring - initialBottomY)).toBeLessThan(10);

        await page.mouse.up();
    });
});
