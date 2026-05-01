import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Drag from Empty Space - Elements and Balls', () => {
    test('selected element should NOT move when dragging from empty space', async ({ page }) => {
        await goto(page);

        // Create and select an element
        const initialPosition = await page.evaluate(() => {
            const element = {
                id: 'element-test-99',
                x: 1500,
                y: 1500,
                type: 'cone',
                color: 'orange',
                rotation: 0
            };
            AppState.elements.push(element);
            AppState.selectedElement = element;
            AppState.currentTool = 'select';
            Elements.render();

            return { x: element.x, y: element.y };
        });

        await page.waitForTimeout(200);

        // Click on empty space far from the element
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

        // Simulate click and drag from empty space
        await page.mouse.move(emptySpaceX, emptySpaceY);
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(emptySpaceX + 100, emptySpaceY + 100);
        await page.waitForTimeout(50);
        await page.mouse.up();

        // Check that the element has NOT moved
        const finalPosition = await page.evaluate(() => {
            const element = AppState.elements.find(e => e.id === 'element-test-99');
            return { x: element.x, y: element.y };
        });

        expect(finalPosition.x).toBe(initialPosition.x);
        expect(finalPosition.y).toBe(initialPosition.y);
    });

    test('selected ball should NOT move when dragging from empty space', async ({ page }) => {
        await goto(page);

        // Create and select a ball
        const initialPosition = await page.evaluate(() => {
            const ball = {
                id: 'ball-1',
                x: 1500,
                y: 1500,
                type: 'soccer'
            };
            AppState.balls.push(ball);
            AppState.selectedBall = ball;
            AppState.currentTool = 'select';
            Balls.render();

            return { x: ball.x, y: ball.y };
        });

        await page.waitForTimeout(200);

        // Click on empty space far from the ball
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

        // Simulate click and drag from empty space
        await page.mouse.move(emptySpaceX, emptySpaceY);
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(emptySpaceX + 100, emptySpaceY + 100);
        await page.waitForTimeout(50);
        await page.mouse.up();

        // Check that the ball has NOT moved
        const finalPosition = await page.evaluate(() => {
            const ball = AppState.balls.find(b => b.id === 'ball-1');
            return { x: ball.x, y: ball.y };
        });

        expect(finalPosition.x).toBe(initialPosition.x);
        expect(finalPosition.y).toBe(initialPosition.y);
    });

    test('selected element in touch mode should NOT move when dragging from empty space', async ({ page }) => {
        await goto(page);

        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create and select an element
        const initialPosition = await page.evaluate(() => {
            const element = {
                id: 'element-test-99',
                x: 1500,
                y: 1500,
                type: 'cone',
                color: 'orange',
                rotation: 0
            };
            AppState.elements.push(element);
            AppState.selectedElement = element;
            AppState.currentTool = 'select';
            Elements.render();

            return { x: element.x, y: element.y };
        });

        await page.waitForTimeout(200);

        // Click on empty space far from the element (not within 30px tolerance)
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

        // Simulate touch (mousedown) and drag from empty space
        await page.mouse.move(emptySpaceX, emptySpaceY);
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(emptySpaceX + 100, emptySpaceY + 100);
        await page.waitForTimeout(50);
        await page.mouse.up();

        // Check that the element has NOT moved
        const finalPosition = await page.evaluate(() => {
            const element = AppState.elements.find(e => e.id === 'element-test-99');
            return { x: element.x, y: element.y };
        });

        expect(finalPosition.x).toBe(initialPosition.x);
        expect(finalPosition.y).toBe(initialPosition.y);
    });
});
