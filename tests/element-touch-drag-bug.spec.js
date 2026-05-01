import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Element Touch Drag Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#board-area', { state: 'attached' });
        await page.waitForTimeout(300);

        // Enable select tool and touch mode
        await page.evaluate(() => {
            AppState.currentTool = 'select';
            document.body.classList.add('touch-mode');
        });
    });

    test('TOUCH MODE: clicking element overlay should not unselect element', async ({ page }) => {
        // Create a cone
        await page.evaluate(() => {
            const element = {
                id: 'cone-select',
                type: 'cone',
                x: 1000,
                y: 1000,
                rotation: 0,
                color: 'orange',
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);
            Elements.render();
        });

        await page.waitForTimeout(300);

        // Click on the overlay to select
        const overlay = page.locator('.touch-overlay[data-element="cone-select"]').first();
        await expect(overlay).toBeVisible();

        const overlayBox = await overlay.boundingBox();
        const overlayCenterX = overlayBox.x + overlayBox.width / 2;
        const overlayCenterY = overlayBox.y + overlayBox.height / 2;

        await page.mouse.click(overlayCenterX, overlayCenterY);
        await page.waitForTimeout(100);

        // Element should be selected
        const isSelectedAfterFirstClick = await page.evaluate(() => {
            return AppState.selectedElement && AppState.selectedElement.id === 'cone-select';
        });

        expect(isSelectedAfterFirstClick).toBe(true);

        // Click on the overlay again (simulating drag start)
        await page.mouse.click(overlayCenterX, overlayCenterY);
        await page.waitForTimeout(100);

        // Element should still be selected (not unselected)
        const isStillSelected = await page.evaluate(() => {
            return AppState.selectedElement && AppState.selectedElement.id === 'cone-select';
        });

        expect(isStillSelected).toBe(true);
    });

    test('TOUCH MODE: element should not jump when dragging from overlay edge', async ({ page }) => {
        // Create a cone
        await page.evaluate(() => {
            const element = {
                id: 'cone-drag',
                type: 'cone',
                x: 1000,
                y: 1000,
                rotation: 0,
                color: 'orange',
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);
            AppState.selectedElement = element;  // Set as object, not ID
            Elements.render();
        });

        await page.waitForTimeout(300);

        // Get initial element position
        const initialPosition = await page.evaluate(() => {
            const element = AppState.getElement('cone-drag');
            return { x: element.x, y: element.y };
        });


        // Get overlay
        const overlay = page.locator('.touch-overlay[data-element="cone-drag"]').first();
        const overlayBox = await overlay.boundingBox();

        // Click near the edge of the overlay (not center)
        const edgeX = overlayBox.x + overlayBox.width * 0.2; // 20% from left edge
        const edgeY = overlayBox.y + overlayBox.height * 0.2; // 20% from top edge


        // Start drag from edge
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get position immediately after mousedown
        const afterMouseDownPosition = await page.evaluate(() => {
            const element = AppState.getElement('cone-drag');
            return { x: element.x, y: element.y };
        });


        // Element should not have jumped
        const jumpX = Math.abs(afterMouseDownPosition.x - initialPosition.x);
        const jumpY = Math.abs(afterMouseDownPosition.y - initialPosition.y);


        expect(jumpX).toBeLessThan(5);
        expect(jumpY).toBeLessThan(5);

        // Now drag slightly
        await page.mouse.move(edgeX + 50, edgeY + 30, { steps: 5 });
        await page.waitForTimeout(50);

        // Get position after drag
        const afterDragPosition = await page.evaluate(() => {
            const element = AppState.getElement('cone-drag');
            return { x: element.x, y: element.y };
        });


        // Calculate expected movement accounting for board-to-screen scaling
        const { expectedDeltaX, expectedDeltaY } = await page.evaluate(() => {
            const rect = AppState.canvas.getBoundingClientRect();
            const scaleX = AppState.boardWidth / rect.width;
            const scaleY = AppState.boardHeight / rect.height;
            return {
                expectedDeltaX: 50 * scaleX,
                expectedDeltaY: 30 * scaleY
            };
        });

        const actualDeltaX = afterDragPosition.x - initialPosition.x;
        const actualDeltaY = afterDragPosition.y - initialPosition.y;


        // The element should move by approximately the expected amount (with some tolerance for rounding)
        expect(Math.abs(actualDeltaX - expectedDeltaX)).toBeLessThan(10);
        expect(Math.abs(actualDeltaY - expectedDeltaY)).toBeLessThan(10);

        await page.mouse.up();
    });

    test('TOUCH MODE: pole should not jump when dragging from overlay edge', async ({ page }) => {
        // Create a pole
        await page.evaluate(() => {
            const element = {
                id: 'pole-drag',
                type: 'pole',
                x: 1200,
                y: 1200,
                rotation: 0,
                color: 'red',
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);
            AppState.selectedElement = element;  // Set as object, not ID
            Elements.render();
        });

        await page.waitForTimeout(300);

        // Get initial element position
        const initialPosition = await page.evaluate(() => {
            const element = AppState.getElement('pole-drag');
            return { x: element.x, y: element.y };
        });


        // Get overlay
        const overlay = page.locator('.touch-overlay[data-element="pole-drag"]').first();
        const overlayBox = await overlay.boundingBox();

        // Click near the top edge
        const topEdgeX = overlayBox.x + overlayBox.width / 2;
        const topEdgeY = overlayBox.y + overlayBox.height * 0.1; // Near top

        // Start drag from top edge
        await page.mouse.move(topEdgeX, topEdgeY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get position immediately after mousedown
        const afterMouseDownPosition = await page.evaluate(() => {
            const element = AppState.getElement('pole-drag');
            return { x: element.x, y: element.y };
        });


        // Element should not have jumped
        const jumpX = Math.abs(afterMouseDownPosition.x - initialPosition.x);
        const jumpY = Math.abs(afterMouseDownPosition.y - initialPosition.y);


        expect(jumpX).toBeLessThan(5);
        expect(jumpY).toBeLessThan(5);

        await page.mouse.up();
    });

    test('TOUCH MODE: rotated element should not jump when dragging', async ({ page }) => {
        // Create a rotated cone
        await page.evaluate(() => {
            const element = {
                id: 'cone-rotated-drag',
                type: 'cone',
                x: 1000,
                y: 1000,
                rotation: 45,
                color: 'orange',
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);
            AppState.selectedElement = element;  // Set as object, not ID
            Elements.render();
        });

        await page.waitForTimeout(300);

        // Get initial element position
        const initialPosition = await page.evaluate(() => {
            const element = AppState.getElement('cone-rotated-drag');
            return { x: element.x, y: element.y };
        });


        // Get overlay
        const overlay = page.locator('.touch-overlay[data-element="cone-rotated-drag"]').first();
        const overlayBox = await overlay.boundingBox();

        // Click at overlay center
        const centerX = overlayBox.x + overlayBox.width / 2;
        const centerY = overlayBox.y + overlayBox.height / 2;

        // Start drag
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get position immediately after mousedown
        const afterMouseDownPosition = await page.evaluate(() => {
            const element = AppState.getElement('cone-rotated-drag');
            return { x: element.x, y: element.y };
        });


        // Element should not have jumped
        const jumpX = Math.abs(afterMouseDownPosition.x - initialPosition.x);
        const jumpY = Math.abs(afterMouseDownPosition.y - initialPosition.y);


        expect(jumpX).toBeLessThan(5);
        expect(jumpY).toBeLessThan(5);

        await page.mouse.up();
    });
});
