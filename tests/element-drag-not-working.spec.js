import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Element Drag Not Working Debug', () => {
    test('Debug why element doesnt move during drag', async ({ page }) => {
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

        // Create and select a cone
        await page.evaluate(() => {
            const element = {
                id: 'cone-drag-debug',
                type: 'cone',
                x: 1000,
                y: 1000,
                rotation: 0,
                color: 'orange',
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);
            AppState.selectedElement = element;  // Pre-select
            Elements.render();
        });

        await page.waitForTimeout(300);

        // Get overlay and click on it
        const overlay = page.locator('.touch-overlay[data-element="cone-drag-debug"]').first();
        const overlayBox = await overlay.boundingBox();
        const centerX = overlayBox.x + overlayBox.width / 2;
        const centerY = overlayBox.y + overlayBox.height / 2;

        // Check state before mousedown
        const beforeMouseDown = await page.evaluate(() => {
            const element = AppState.getElement('cone-drag-debug');
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                elementX: element.x,
                elementY: element.y
            };
        });


        // Mousedown to start drag
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Check state after mousedown
        const afterMouseDown = await page.evaluate(() => {
            const element = AppState.getElement('cone-drag-debug');
            return {
                selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                dragOffset: AppState.dragOffset,
                elementX: element.x,
                elementY: element.y
            };
        });


        expect(afterMouseDown.draggedElement).toBe('cone-drag-debug');

        // Move mouse
        await page.mouse.move(centerX + 50, centerY + 30, { steps: 5 });
        await page.waitForTimeout(50);

        // Check state after mousemove
        const afterMouseMove = await page.evaluate(() => {
            const element = AppState.getElement('cone-drag-debug');
            return {
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
                elementX: element.x,
                elementY: element.y
            };
        });


        // Element should have moved
        expect(afterMouseMove.elementX).not.toBe(1000);

        await page.mouse.up();
    });
});
