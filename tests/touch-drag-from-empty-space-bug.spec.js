import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Touch Mode: Drag from Empty Space Bug', () => {
    test('selected element should NOT drag when touch starts on empty space far from element', async ({ page }) => {
        await goto(page);

        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create and select an element
        await page.evaluate(() => {
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

        // Get canvas position
        const canvasRect = await page.evaluate(() => {
            const canvas = AppState.canvas;
            const rect = canvas.getBoundingClientRect();
            return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        });

        // Touch on empty space VERY far from the element (element is at 2000, 1000)
        // Click near top-left corner of canvas
        const emptyX = canvasRect.left + 100;
        const emptyY = canvasRect.top + 100;

        // Simulate touch: mousedown on empty space
        await page.mouse.move(emptyX, emptyY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        const afterMouseDown = await page.evaluate(() => ({
            selectedElement: AppState.selectedElement ? AppState.selectedElement.id : null,
            draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null,
            dragOffset: AppState.dragOffset
        }));

        // Move mouse (simulating finger drag)
        await page.mouse.move(emptyX + 200, emptyY + 200);
        await page.waitForTimeout(50);

        const afterMove = await page.evaluate(() => {
            const el = AppState.elements.find(e => e.id === 'element-test-99');
            return {
                x: el.x,
                y: el.y,
                draggedElement: AppState.draggedElement ? AppState.draggedElement.id : null
            };
        });

        await page.mouse.up();

        expect(afterMove.x).toBe(initialPos.x);
        expect(afterMove.y).toBe(initialPos.y);
    });

    test('same bug with shapes/text', async ({ page }) => {
        await goto(page);

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        await page.evaluate(() => {
            const shape = {
                id: 'text-test',
                type: 'text',
                x: 2000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 0,
                text: 'Test',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            AppState.currentTool = 'select';
            Shapes.render();
        });

        await page.waitForTimeout(300);

        const initialPos = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'text-test');
            return { x: shape.x, y: shape.y };
        });

        const canvasRect = await page.evaluate(() => {
            const canvas = AppState.canvas;
            const rect = canvas.getBoundingClientRect();
            return { left: rect.left, top: rect.top };
        });

        // Touch empty space far from shape
        const emptyX = canvasRect.left + 100;
        const emptyY = canvasRect.top + 100;

        await page.mouse.move(emptyX, emptyY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        await page.mouse.move(emptyX + 200, emptyY + 200);
        await page.waitForTimeout(50);

        const afterMove = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'text-test');
            return { x: shape.x, y: shape.y };
        });

        await page.mouse.up();

        expect(afterMove.x).toBe(initialPos.x);
        expect(afterMove.y).toBe(initialPos.y);
    });

    test('same bug with players', async ({ page }) => {
        await goto(page);

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        await page.evaluate(() => {
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

        const initialPos = await page.evaluate(() => {
            const player = AppState.players.find(p => p.id === 'player-test');
            return { x: player.x, y: player.y };
        });

        const canvasRect = await page.evaluate(() => {
            const canvas = AppState.canvas;
            const rect = canvas.getBoundingClientRect();
            return { left: rect.left, top: rect.top };
        });

        const emptyX = canvasRect.left + 100;
        const emptyY = canvasRect.top + 100;

        await page.mouse.move(emptyX, emptyY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        await page.mouse.move(emptyX + 200, emptyY + 200);
        await page.waitForTimeout(50);

        const afterMove = await page.evaluate(() => {
            const player = AppState.players.find(p => p.id === 'player-test');
            return { x: player.x, y: player.y };
        });

        await page.mouse.up();

        expect(afterMove.x).toBe(initialPos.x);
        expect(afterMove.y).toBe(initialPos.y);
    });
});
