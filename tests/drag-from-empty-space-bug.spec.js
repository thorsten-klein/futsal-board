import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Drag from Empty Space Bug', () => {
    test('selected object should NOT move when dragging from empty board space', async ({ page }) => {
        await goto(page);

        // Create and select a text shape at position 1000, 1000
        const initialPosition = await page.evaluate(() => {
            const shape = {
                id: 'text-1',
                type: 'text',
                x: 1000,
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

            return { x: shape.x, y: shape.y };
        });

        await page.waitForTimeout(200);

        // Click on empty board space (far from the shape) and drag
        const canvasRect = await page.evaluate(() => {
            const canvas = AppState.canvas;
            const rect = canvas.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            };
        });

        // Click on empty space (top-left corner, far from shape at 1000,1000)
        const emptySpaceX = canvasRect.left + 50;
        const emptySpaceY = canvasRect.top + 50;

        // Simulate click and drag from empty space
        await page.mouse.move(emptySpaceX, emptySpaceY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Drag to a different position
        await page.mouse.move(emptySpaceX + 100, emptySpaceY + 100);
        await page.waitForTimeout(50);
        await page.mouse.up();

        // Check that the shape has NOT moved
        const finalPosition = await page.evaluate(() => {
            const shape = AppState.shapes[0];
            return { x: shape.x, y: shape.y };
        });

        // Position should be unchanged
        expect(finalPosition.x).toBe(initialPosition.x);
        expect(finalPosition.y).toBe(initialPosition.y);
    });

    test('selected object SHOULD move when dragging from its overlay', async ({ page }) => {
        await goto(page);

        // Enable touch mode for overlays
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create and select a text shape
        await page.evaluate(() => {
            const shape = {
                id: 'text-1',
                type: 'text',
                x: 1000,
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

        await page.waitForTimeout(200);

        // Get the overlay position
        const overlayRect = await page.evaluate(() => {
            const overlay = document.querySelector('.touch-overlay[data-shape="text-1"]');
            const rect = overlay.getBoundingClientRect();
            return {
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2
            };
        });

        // Click on the overlay and drag
        await page.mouse.move(overlayRect.centerX, overlayRect.centerY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Drag 100 pixels to the right
        await page.mouse.move(overlayRect.centerX + 100, overlayRect.centerY);
        await page.waitForTimeout(50);
        await page.mouse.up();

        // Check that the shape HAS moved
        const movedPosition = await page.evaluate(() => {
            const shape = AppState.shapes[0];
            return { x: shape.x, y: shape.y };
        });

        // Position should have changed (moved to the right)
        expect(movedPosition.x).toBeGreaterThan(1000);
    });

    test('selected player should NOT move when dragging from empty space', async ({ page }) => {
        await goto(page);

        // Create and select a player
        const initialPosition = await page.evaluate(() => {
            const player = {
                id: 'player-1',
                x: 1500,
                y: 1500,
                number: 10,
                team: 'red',
                name: 'Test Player'
            };
            AppState.players.push(player);
            AppState.selectedPlayer = player;
            AppState.currentTool = 'select';
            Players.render();

            return { x: player.x, y: player.y };
        });

        await page.waitForTimeout(200);

        // Click on empty space and drag
        const canvasRect = await page.evaluate(() => {
            const canvas = AppState.canvas;
            const rect = canvas.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top
            };
        });

        const emptySpaceX = canvasRect.left + 50;
        const emptySpaceY = canvasRect.top + 50;

        await page.mouse.move(emptySpaceX, emptySpaceY);
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(emptySpaceX + 100, emptySpaceY + 100);
        await page.waitForTimeout(50);
        await page.mouse.up();

        // Check that the player has NOT moved
        const finalPosition = await page.evaluate(() => {
            const player = AppState.players[0];
            return { x: player.x, y: player.y };
        });

        expect(finalPosition.x).toBe(initialPosition.x);
        expect(finalPosition.y).toBe(initialPosition.y);
    });
});
