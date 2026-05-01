import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Element Touch Overlay', () => {
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

    test('TOUCH MODE: element should have touch overlay', async ({ page }) => {
        await page.evaluate(() => {
            const element = {
                id: 'element-1',
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

        await page.waitForTimeout(300);

        // Check how many overlays exist
        const overlayCount = await page.locator('.touch-overlay[data-element="element-1"]').count();

        const elementOverlay = page.locator('.touch-overlay[data-element="element-1"]').first();
        await expect(elementOverlay).toBeVisible();

    });

    test('TOUCH MODE: element overlay should move with element when dragged', async ({ page }) => {
        await page.evaluate(() => {
            const element = {
                id: 'element-1',
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

        await page.waitForTimeout(300);

        const elementSvg = page.locator('svg[data-element="element-1"]').first();
        const elementOverlay = page.locator('.touch-overlay[data-element="element-1"]').first();

        const initialElementBox = await elementSvg.boundingBox();
        const initialOverlayBox = await elementOverlay.boundingBox();

        const elementCenterX = initialElementBox.x + initialElementBox.width / 2;
        const elementCenterY = initialElementBox.y + initialElementBox.height / 2;

        // First click to select
        await page.mouse.click(elementCenterX, elementCenterY);
        await page.waitForTimeout(50);

        // Then drag
        await page.mouse.move(elementCenterX, elementCenterY);
        await page.mouse.down();
        await page.mouse.move(elementCenterX + 100, elementCenterY + 100, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        const finalElementBox = await elementSvg.boundingBox();
        const finalOverlayBox = await elementOverlay.boundingBox();

        // Overlay should have moved with the element
        expect(Math.abs((finalOverlayBox.x - initialOverlayBox.x) - 100)).toBeLessThan(10);
        expect(Math.abs((finalOverlayBox.y - initialOverlayBox.y) - 100)).toBeLessThan(10);
    });
});
