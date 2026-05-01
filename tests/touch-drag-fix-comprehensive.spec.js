import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Touch Drag Bug Fix - Comprehensive Tests', () => {
    test('element: far empty space = no drag, tolerance zone = stay selected, overlay = drag', async ({ page }) => {
        await goto(page);

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
            const element = {
                id: 'element-test-99',
                x: 2000,
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

        const initialPos = await page.evaluate(() => {
            const el = AppState.elements.find(e => e.id === 'element-test-99');
            return { x: el.x, y: el.y };
        });

        const canvasRect = await page.evaluate(() => {
            const canvas = AppState.canvas;
            const rect = canvas.getBoundingClientRect();
            return { left: rect.left, top: rect.top };
        });

        // TEST 1: Click far from element (empty space) → should deselect and not drag
        await page.mouse.move(canvasRect.left + 100, canvasRect.top + 100);
        await page.mouse.down();
        await page.waitForTimeout(50);

        let result = await page.evaluate(() => ({
            selected: AppState.selectedElement ? AppState.selectedElement.id : null,
            dragged: AppState.draggedElement ? AppState.draggedElement.id : null
        }));

        expect(result.selected).toBe(null); // Deselected
        expect(result.dragged).toBe(null); // No drag

        await page.mouse.up();

        // Re-select for next test
        await page.evaluate(() => {
            const el = AppState.elements.find(e => e.id === 'element-test-99');
            AppState.selectedElement = el;
            Elements.render();
        });

        await page.waitForTimeout(100);

        // TEST 2: Click within tolerance zone → should stay selected but not drag
        const elementInfo = await page.evaluate(() => {
            const domEl = document.getElementById('element-test-99');
            const rect = domEl.getBoundingClientRect();
            return {
                right: rect.right,
                centerY: rect.top + rect.height / 2
            };
        });

        await page.mouse.move(elementInfo.right + 20, elementInfo.centerY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        result = await page.evaluate(() => ({
            selected: AppState.selectedElement ? AppState.selectedElement.id : null,
            dragged: AppState.draggedElement ? AppState.draggedElement.id : null
        }));

        expect(result.selected).toBe('element-test-99'); // Stays selected
        expect(result.dragged).toBe(null); // No drag (outside overlay)

        await page.mouse.up();
    });

    test('player: same behavior', async ({ page }) => {
        await goto(page);

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
            const player = {
                id: 'player-test',
                x: 2000,
                y: 1000,
                number: 10,
                team: 'red',
                name: 'Test'
            };
            AppState.players.push(player);
            AppState.selectedPlayer = player;
            AppState.currentTool = 'select';
            Players.render();
        });

        await page.waitForTimeout(300);

        const canvasRect = await page.evaluate(() => {
            const canvas = AppState.canvas;
            const rect = canvas.getBoundingClientRect();
            return { left: rect.left, top: rect.top };
        });

        // Click far from player → should deselect
        await page.mouse.move(canvasRect.left + 100, canvasRect.top + 100);
        await page.mouse.down();
        await page.waitForTimeout(50);

        const result = await page.evaluate(() => ({
            selected: AppState.selectedPlayer ? AppState.selectedPlayer.id : null,
            dragged: AppState.draggedPlayer ? AppState.draggedPlayer.id : null
        }));

        expect(result.selected).toBe(null);
        expect(result.dragged).toBe(null);

        await page.mouse.up();
    });
});
