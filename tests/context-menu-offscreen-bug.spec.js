/**
 * Test for context menu positioning bug where menu goes off-screen
 * when double-tapping elements in quick succession in touch mode.
 */
import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Context menu off-screen bug', () => {
    test.beforeEach(async ({ page }) => {
        // Use a wide but short viewport (1600x600) to make bottom overflow more likely
        await page.setViewportSize({ width: 1600, height: 600 });
        await goto(page);
        await page.evaluate(() => {
            AppState.currentTool = 'select';
            document.body.classList.add('touch-mode');
        });
    });

    test('TOUCH MODE: context menu should stay on screen when double-tapping second shape while first menu is open', async ({ page }) => {
        // Get viewport dimensions first
        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const viewportWidth = await page.evaluate(() => window.innerWidth);

        // Create two SHAPES positioned at y=2000, spaced apart horizontally
        await page.evaluate(() => {
            const shape1 = {
                id: 'shape-1',
                type: 'rectangle',
                x: 800,
                y: 2000,  // Far down on board
                width: 200,
                height: 100,
                rotation: 0,
                color: '#ff6b35',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            const shape2 = {
                id: 'shape-2',
                type: 'rectangle',
                x: 1600,  // Further apart horizontally to avoid menu overlap
                y: 2000,  // Same y position
                width: 200,
                height: 100,
                rotation: 0,
                color: '#4ecdc4',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape1, shape2);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Scroll to make shapes visible at bottom of viewport
        const overlay1 = page.locator('.touch-overlay[data-shape="shape-1"]').first();
        await expect(overlay1).toBeVisible();

        // Scroll so the shape is near the bottom edge of viewport
        await overlay1.scrollIntoViewIfNeeded();

        // Additional scroll to position shape very close to bottom edge
        await page.evaluate(() => {
            const overlay = document.querySelector('.touch-overlay[data-shape="shape-1"]');
            if (overlay) {
                const rect = overlay.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                // Scroll so shape is within last 100px of viewport
                const targetY = viewportHeight - 80;
                const currentY = rect.top;
                const scrollAmount = currentY - targetY;
                window.scrollBy(0, scrollAmount);
            }
        });
        await page.waitForTimeout(200);

        const box1 = await overlay1.boundingBox();
        const centerX1 = box1.x + box1.width / 2;
        const centerY1 = box1.y + box1.height / 2;

        // Simulate double-tap on first shape
        await overlay1.dblclick();
        await page.waitForTimeout(100);

        // First menu should be visible (shapes use element-context-menu)
        const menu = page.locator('#element-context-menu');
        await expect(menu).toBeVisible();

        // Get first menu position
        const firstMenuBox = await menu.boundingBox();

        // Verify first menu is on screen
        expect(firstMenuBox.x).toBeGreaterThanOrEqual(0);
        expect(firstMenuBox.y).toBeGreaterThanOrEqual(0);
        expect(firstMenuBox.x + firstMenuBox.width).toBeLessThanOrEqual(viewportWidth);
        expect(firstMenuBox.y + firstMenuBox.height).toBeLessThanOrEqual(viewportHeight);

        // Now double-tap second shape while first menu is still open
        const overlay2 = page.locator('.touch-overlay[data-shape="shape-2"]').first();
        await expect(overlay2).toBeVisible();
        const box2 = await overlay2.boundingBox();
        const centerX2 = box2.x + box2.width / 2;
        const centerY2 = box2.y + box2.height / 2;

        // Simulate double-tap on second shape by directly triggering the event
        // (bypasses menu overlap issue in the test)
        await page.evaluate(() => {
            const shape2 = document.querySelector('[data-shape="shape-2"]');
            const event = new MouseEvent('dblclick', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: shape2.getBoundingClientRect().x + shape2.getBoundingClientRect().width / 2,
                clientY: shape2.getBoundingClientRect().y + shape2.getBoundingClientRect().height / 2
            });
            shape2.dispatchEvent(event);
        });
        await page.waitForTimeout(100);

        // Menu should still be visible
        await expect(menu).toBeVisible();

        // Get second menu position
        const secondMenuBox = await menu.boundingBox();

        // BUG: The menu should be on screen, but it may go off-screen for shapes
        // Check if menu is fully visible in viewport
        expect(secondMenuBox.x).toBeGreaterThanOrEqual(0);
        expect(secondMenuBox.y).toBeGreaterThanOrEqual(0);
        expect(secondMenuBox.x + secondMenuBox.width).toBeLessThanOrEqual(viewportWidth);
        expect(secondMenuBox.y + secondMenuBox.height).toBeLessThanOrEqual(viewportHeight);
    });

    test('TOUCH MODE: context menu positioning with elements at different y positions', async ({ page }) => {
        // Create two elements at different y positions
        await page.evaluate(() => {
            const element1 = {
                id: 'element-1',
                type: 'cone',
                color: '#ff6b35',
                x: 1000,
                y: 500,
                rotation: 0,
                visible: true,
                inherited: false
            };
            const element2 = {
                id: 'element-2',
                type: 'cone',
                color: '#4ecdc4',
                x: 1200,
                y: 2000,
                rotation: 0,
                visible: true,
                inherited: false
            };
            AppState.elements.push(element1, element2);
            Elements.render();
        });

        await page.waitForTimeout(300);

        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const viewportWidth = await page.evaluate(() => window.innerWidth);

        // Double-tap first element (at y=500)
        const overlay1 = page.locator('.touch-overlay[data-element="element-1"]').first();
        await expect(overlay1).toBeVisible();
        const box1 = await overlay1.boundingBox();

        await overlay1.dblclick();
        await page.waitForTimeout(100);

        const menu = page.locator('#element-context-menu');
        await expect(menu).toBeVisible();

        // Now double-tap second element (at y=2000) while menu is still open
        const overlay2 = page.locator('.touch-overlay[data-element="element-2"]').first();
        await expect(overlay2).toBeVisible();
        const box2 = await overlay2.boundingBox();

        await overlay2.dblclick();
        await page.waitForTimeout(100);

        // Menu should be repositioned and still on screen
        await expect(menu).toBeVisible();

        const menuBox = await menu.boundingBox();

        // Verify menu is fully visible
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.y).toBeGreaterThanOrEqual(0);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewportWidth);
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewportHeight);
    });

    test('context menu positioning function handles near-edge coordinates correctly', async ({ page }) => {
        // Test the positionContextMenu function directly with edge case coordinates
        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const viewportWidth = await page.evaluate(() => window.innerWidth);

        // Create an element to get the menu
        await page.evaluate(() => {
            const element = {
                id: 'test-element',
                type: 'cone',
                color: '#ff6b35',
                x: 1000,
                y: 1000,
                rotation: 0,
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);
            Elements.render();
        });
        await page.waitForTimeout(200);

        // Test 1: Position menu near bottom-right edge
        let menuBox = await page.evaluate(({ vw, vh }) => {
            const menu = document.getElementById('element-context-menu');
            // Try to position at bottom-right (would overflow)
            Utils.positionContextMenu(menu, vw - 50, vh - 50);
            const rect = menu.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        }, { vw: viewportWidth, vh: viewportHeight });

        // Menu should be adjusted to stay on screen
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.y).toBeGreaterThanOrEqual(0);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewportWidth);
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewportHeight);

        // Test 2: Position menu near top-left edge
        menuBox = await page.evaluate(() => {
            const menu = document.getElementById('element-context-menu');
            // Try to position at top-left (would overflow left/top)
            Utils.positionContextMenu(menu, -50, -50);
            const rect = menu.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        });

        // Menu should be clamped to stay on screen (minimum 5px margin)
        expect(menuBox.x).toBeGreaterThanOrEqual(5);
        expect(menuBox.y).toBeGreaterThanOrEqual(5);

        // Test 3: Position menu, then reposition (simulates opening menu on element 1, then element 2)
        const positions = await page.evaluate(({ vw, vh }) => {
            const menu = document.getElementById('element-context-menu');
            const results = [];

            // First position - near bottom
            Utils.positionContextMenu(menu, 100, vh - 50);
            let rect = menu.getBoundingClientRect();
            results.push({
                name: 'first',
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            });

            // Second position - near bottom but different x (simulates clicking second element)
            // This is the bug scenario: menu is already visible and positioned
            Utils.positionContextMenu(menu, vw - 100, vh - 50);
            rect = menu.getBoundingClientRect();
            results.push({
                name: 'second',
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            });

            return results;
        }, { vw: viewportWidth, vh: viewportHeight });

        // Both positions should keep menu on screen
        for (const pos of positions) {
            expect(pos.x, `${pos.name} position x`).toBeGreaterThanOrEqual(0);
            expect(pos.y, `${pos.name} position y`).toBeGreaterThanOrEqual(0);
            expect(pos.x + pos.width, `${pos.name} position right edge`).toBeLessThanOrEqual(viewportWidth);
            expect(pos.y + pos.height, `${pos.name} position bottom edge`).toBeLessThanOrEqual(viewportHeight);
        }
    });
});
