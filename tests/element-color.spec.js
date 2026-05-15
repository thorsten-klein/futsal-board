/**
 * Element color tests - verify color picker works for elements
 */
import { test, expect } from './test-config.js';
import { goto, addElement } from './helpers.js';

test.describe('Element Color', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('Can change element color via color modal', async ({ page }) => {
        // Add a cone element
        const element = await addElement(page, 'cone');
        await page.waitForTimeout(300);

        // Get the initial color by reading the SVG fill
        const initialColor = await element.evaluate(el => {
            const svg = el.querySelector('svg');
            if (!svg) return null;
            // Find the polygon (cone) or other element that has the color fill
            const colored = svg.querySelector('polygon, ellipse, rect, path');
            return colored ? colored.getAttribute('fill') : null;
        });

        // Double-click to open context menu
        await element.dblclick();
        await page.waitForTimeout(300);

        // Verify context menu is visible
        const menu = page.locator('#element-context-menu:not(.hidden)');
        await expect(menu).toBeVisible();

        // Click "Color" from context menu
        await page.locator('#element-context-menu .context-menu-item[data-action="color"]').click();
        await page.waitForTimeout(300);

        // Verify color modal is open
        const colorModal = page.locator('#element-color-modal');
        await expect(colorModal).toBeVisible();

        // Pick a different color - use a preset color button
        const presetColor = '#2ecc71'; // Green (actual preset color)
        await page.locator(`#element-color-modal .color-preset[data-color="${presetColor}"]`).click();
        await page.waitForTimeout(200);

        // Verify the color picker input was updated
        const colorPickerValue = await page.locator('#element-color-picker').inputValue();
        expect(colorPickerValue).toBe(presetColor);

        // Click Apply button
        await page.locator('#btn-confirm-color').click();
        await page.waitForTimeout(500); // Wait for modal to close and element to re-render

        // Modal should close
        await expect(colorModal).toBeHidden();

        // Wait for re-render
        await page.waitForTimeout(300);

        // Verify the element's color has changed by checking AppState
        const elementData = await page.evaluate(() => {
            // Debug: log all elements
            console.log('Elements:', AppState.elements);
            const el = AppState.elements.find(e => e.type === 'cone');
            return el ? { color: el.color, type: el.type, id: el.id } : null;
        });

        expect(elementData).not.toBeNull();
        expect(elementData.color).toBe(presetColor);
        expect(elementData.color).not.toBe(initialColor);
    });

    test('Can cancel color modal without changing color', async ({ page }) => {
        // Add a ladder element (colorable)
        const element = await addElement(page, 'ladder');
        await page.waitForTimeout(300);

        // Get the initial color
        const initialColor = await element.evaluate(el => {
            const svg = el.querySelector('svg');
            if (!svg) return null;
            // Find element with color - check both fill and stroke
            const colored = svg.querySelector('polygon, ellipse, rect, path, line, g');
            if (!colored) return null;
            return colored.getAttribute('fill') || colored.getAttribute('stroke');
        });

        // Double-click to open context menu
        await element.dblclick();
        await page.waitForTimeout(300);

        // Click "Color" from context menu
        await page.locator('#element-context-menu .context-menu-item[data-action="color"]').click();
        await page.waitForTimeout(300);

        // Verify color modal is open
        const colorModal = page.locator('#element-color-modal');
        await expect(colorModal).toBeVisible();

        // Pick a different color
        const presetColor = '#3498db'; // Blue (actual preset color)
        await page.locator(`#element-color-modal .color-preset[data-color="${presetColor}"]`).click();
        await page.waitForTimeout(200);

        // Click Cancel button
        await page.locator('#btn-cancel-color').click();
        await page.waitForTimeout(300);

        // Verify modal is closed
        await expect(colorModal).toBeHidden();

        // Verify the element's color has NOT changed
        const currentColor = await element.evaluate(el => {
            const svg = el.querySelector('svg');
            if (!svg) return null;
            // Find element with color - check both fill and stroke
            const colored = svg.querySelector('polygon, ellipse, rect, path, line, g');
            if (!colored) return null;
            return colored.getAttribute('fill') || colored.getAttribute('stroke');
        });

        expect(currentColor).toBe(initialColor);
    });

    test('Can change color using color picker input directly', async ({ page }) => {
        // Add a pole element
        const element = await addElement(page, 'pole');
        await page.waitForTimeout(300);

        // Double-click to open context menu
        await element.dblclick();
        await page.waitForTimeout(300);

        // Click "Color" from context menu
        await page.locator('#element-context-menu .context-menu-item[data-action="color"]').click();
        await page.waitForTimeout(300);

        // Verify color modal is open
        const colorModal = page.locator('#element-color-modal');
        await expect(colorModal).toBeVisible();

        // Set color using the color picker input
        const customColor = '#ff00ff'; // Magenta
        await page.locator('#element-color-picker').fill(customColor);
        await page.waitForTimeout(200);

        // Click Apply button
        await page.locator('#btn-confirm-color').click();
        await page.waitForTimeout(500); // Wait for modal to close and element to re-render

        // Verify modal is closed
        await expect(colorModal).toBeHidden();

        // Wait for re-render
        await page.waitForTimeout(300);

        // Verify the element's color has changed by checking AppState
        const elementData = await page.evaluate(() => {
            const el = AppState.elements.find(e => e.type === 'pole');
            return el ? { color: el.color, type: el.type, id: el.id } : null;
        });

        expect(elementData).not.toBeNull();
        expect(elementData.color).toBe(customColor);
    });

    test('Color menu item only appears for colorable elements', async ({ page }) => {
        // Test colorable element types - should show color menu item
        const colorableTypes = ['cone', 'ladder', 'pole', 'small-hurdle', 'ball-box'];

        for (const type of colorableTypes) {
            // Add element
            const element = await addElement(page, type);
            await page.waitForTimeout(300);

            // Right-click to open context menu
            await element.click({ button: 'right' });
            await page.waitForTimeout(300);

            // Verify color menu item is visible
            const colorItem = page.locator('#element-context-menu .context-menu-item[data-action="color"]');
            await expect(colorItem).toBeVisible({ timeout: 1000 });

            // Close menu by clicking board
            const board = page.locator('#board-canvas');
            const boardBox = await board.boundingBox();
            await page.mouse.click(boardBox.x + 50, boardBox.y + 50);
            await page.waitForTimeout(300);

            // Delete the element for next iteration
            await element.click();
            await page.waitForTimeout(200);
            await page.keyboard.press('Delete');
            await page.waitForTimeout(300);
        }

        // Test non-colorable element types - should NOT show color menu item
        const nonColorableTypes = ['goal', 'small-goal', 'big-wall', 'small-wall'];

        for (const type of nonColorableTypes) {
            // Add element
            const element = await addElement(page, type);
            await page.waitForTimeout(300);

            // Right-click to open context menu
            await element.click({ button: 'right' });
            await page.waitForTimeout(300);

            // Verify color menu item is NOT visible
            const colorItem = page.locator('#element-context-menu .context-menu-item[data-action="color"]');
            await expect(colorItem).toBeHidden({ timeout: 1000 });

            // Close menu by clicking board
            const board = page.locator('#board-canvas');
            const boardBox = await board.boundingBox();
            await page.mouse.click(boardBox.x + 50, boardBox.y + 50);
            await page.waitForTimeout(300);

            // Delete the element for next iteration
            await element.click();
            await page.waitForTimeout(200);
            await page.keyboard.press('Delete');
            await page.waitForTimeout(300);
        }
    });
});
