import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Tolerance Zone Should Allow Interaction', () => {
    test('clicking within tolerance zone should keep element selected and NOT start drag (unless on overlay)', async ({ page }) => {
        await goto(page);

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        await page.evaluate(() => {
            const element = {
                id: 'element-test-99',
                x: 1000,
                y: 1000,
                type: 'cone',
                color: 'orange',
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);
            AppState.selectedElement = element;
            AppState.currentTool = 'select';
            Elements.render();
        });

        await page.waitForTimeout(300);

        const elementInfo = await page.evaluate(() => {
            const domEl = document.getElementById('element-test-99');
            const rect = domEl.getBoundingClientRect();
            return {
                right: rect.right,
                centerY: rect.top + rect.height / 2
            };
        });

        const initialPos = await page.evaluate(() => {
            const el = AppState.elements.find(e => e.id === 'element-test-99');
            return { x: el.x, y: el.y };
        });

        // Click 20px to the right (within tolerance but outside overlay)
        const clickX = elementInfo.right + 20;
        const clickY = elementInfo.centerY;

        await page.mouse.move(clickX, clickY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        const afterMouseDown = await page.evaluate(() => ({
            selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
            draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null
        }));

        // Element should stay selected
        expect(afterMouseDown.selectedElement).toBe('element-test-99');

        // But drag should NOT start (we're outside the overlay)
        expect(afterMouseDown.draggedElement).toBe(null);

        // Move mouse
        await page.mouse.move(clickX + 200, clickY + 200);
        await page.waitForTimeout(50);

        const afterMove = await page.evaluate(() => {
            const el = AppState.elements.find(e => e.id === 'element-test-99');
            return { x: el.x, y: el.y };
        });

        await page.mouse.up();

        // Element should NOT have moved (drag didn't start)
        expect(afterMove.x).toBe(initialPos.x);
        expect(afterMove.y).toBe(initialPos.y);
    });
});
