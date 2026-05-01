import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Element Rotation in Touch Mode', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('TOUCH MODE: should be able to rotate an element using rotation handle', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            // Create a cone element
            const element = {
                id: 'element-1',
                type: 'cone',
                x: 2000,
                y: 1500,
                rotation: 0,
                visible: true,
                inherited: false
            };

            AppState.elements.push(element);
            AppState.nextElementId = 2;

            if (typeof Elements !== 'undefined') {
                Elements.render();
            }
        });

        await page.waitForTimeout(300);

        // Select the element first (in touch mode, click on the overlay)
        const elementSvg = page.locator('.element-svg').first();
        await expect(elementSvg).toBeVisible();

        // In touch mode, click on the touch overlay instead of the SVG directly
        const touchOverlay = page.locator('.touch-overlay[data-element]').first();
        await touchOverlay.click();
        await page.waitForTimeout(200);

        // Verify element is selected
        const isSelected = await page.evaluate(() => AppState.selectedElement !== null);
        expect(isSelected).toBe(true);

        // Wait for rotation handle to appear
        await page.waitForTimeout(200);
        const rotationHandle = page.locator('.rotation-handle');
        await expect(rotationHandle).toBeVisible();

        // Get initial rotation
        const initialRotation = await page.evaluate(() => {
            const element = AppState.elements.find(e => e.id === 'element-1');
            return element ? element.rotation : null;
        });

        // Get rotation handle position
        const handleBox = await rotationHandle.boundingBox();

        // Try to click on the rotation handle
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;

        // Check what element is at the handle position before clicking
        const elementAtHandle = await page.evaluate((pos) => {
            const el = document.elementFromPoint(pos.x, pos.y);
            return {
                tagName: el ? el.tagName : null,
                className: el ? el.className : null,
                id: el ? el.id : null
            };
        }, { x: handleCenterX, y: handleCenterY });

        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.waitForTimeout(100);

        // Check if rotation started
        const isRotating = await page.evaluate(() => {
            return typeof Elements !== 'undefined' && Elements.isRotating;
        });

        // Move mouse to rotate (move to the right side)
        const elementBox = await elementSvg.boundingBox();
        const targetX = elementBox.x + elementBox.width + 100;
        const targetY = elementBox.y + elementBox.height / 2;

        await page.mouse.move(targetX, targetY);
        await page.waitForTimeout(100);

        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get final rotation
        const finalRotation = await page.evaluate(() => {
            const element = AppState.elements.find(e => e.id === 'element-1');
            return element ? element.rotation : null;
        });

        // Check debug info if rotation didn't work
        if (initialRotation === finalRotation) {
            const debugInfo = await page.evaluate(() => {
                const overlays = document.querySelectorAll('.touch-overlay[data-element]');
                const handles = document.querySelectorAll('.rotation-handle');

                return {
                    overlayCount: overlays.length,
                    overlayZIndex: overlays.length > 0 ? overlays[0].style.zIndex : null,
                    overlayPointerEvents: overlays.length > 0 ? getComputedStyle(overlays[0]).pointerEvents : null,
                    handleCount: handles.length,
                    handleZIndex: handles.length > 0 ? handles[0].style.zIndex : null,
                    handlePointerEvents: handles.length > 0 ? getComputedStyle(handles[0]).pointerEvents : null,
                    touchMode: document.body.classList.contains('touch-mode')
                };
            });
        }

        // Rotation should have changed
        expect(finalRotation).not.toBe(initialRotation);
    });

    test('TOUCH MODE: touch overlay should not block rotation handle clicks', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            const element = {
                id: 'element-1',
                type: 'cone',
                x: 2000,
                y: 1500,
                rotation: 0,
                visible: true,
                inherited: false
            };

            AppState.elements.push(element);
            AppState.nextElementId = 2;

            if (typeof Elements !== 'undefined') {
                Elements.render();
            }
        });

        await page.waitForTimeout(300);

        // Select the element (in touch mode, click on the overlay)
        const elementSvg = page.locator('.element-svg').first();
        await expect(elementSvg).toBeVisible();

        const touchOverlay = page.locator('.touch-overlay[data-element]').first();
        await touchOverlay.click();
        await page.waitForTimeout(200);

        // Check z-index hierarchy
        const zIndexInfo = await page.evaluate(() => {
            const overlay = document.querySelector('.touch-overlay[data-element]');
            const handle = document.querySelector('.rotation-handle');

            const overlayZIndex = overlay ? parseInt(overlay.style.zIndex || '0') : null;
            const handleZIndex = handle ? parseInt(handle.style.zIndex || '0') : null;

            return {
                overlayZIndex,
                handleZIndex,
                handleAboveOverlay: handleZIndex > overlayZIndex
            };
        });


        // Rotation handle must be above overlay
        expect(zIndexInfo.handleAboveOverlay).toBe(true);

        // Check pointer-events on overlay
        const overlayPointerEvents = await page.evaluate(() => {
            const overlay = document.querySelector('.touch-overlay[data-element]');
            return overlay ? getComputedStyle(overlay).pointerEvents : null;
        });


        // If overlay has pointer-events: all, it might block the handle even with lower z-index
        // This is a potential bug
    });

    test('DESKTOP MODE: rotation should work normally without touch overlays', async ({ page }) => {
        // Desktop mode (no touch-mode class)
        await page.evaluate(() => {
            const element = {
                id: 'element-1',
                type: 'cone',
                x: 2000,
                y: 1500,
                rotation: 0,
                visible: true,
                inherited: false
            };

            AppState.elements.push(element);
            AppState.nextElementId = 2;

            if (typeof Elements !== 'undefined') {
                Elements.render();
            }
        });

        await page.waitForTimeout(300);

        // Select element
        const elementSvg = page.locator('.element-svg').first();
        await elementSvg.click();
        await page.waitForTimeout(200);

        // No touch overlays should exist in desktop mode
        const overlayCount = await page.evaluate(() => {
            return document.querySelectorAll('.touch-overlay[data-element]').length;
        });

        expect(overlayCount).toBe(0);

        // Rotation handle should be visible
        const rotationHandle = page.locator('.rotation-handle');
        await expect(rotationHandle).toBeVisible();

        const initialRotation = await page.evaluate(() => {
            const element = AppState.elements.find(e => e.id === 'element-1');
            return element.rotation;
        });

        // Drag rotation handle
        const handleBox = await rotationHandle.boundingBox();
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();

        const elementBox = await elementSvg.boundingBox();
        await page.mouse.move(elementBox.x + elementBox.width + 100, elementBox.y + elementBox.height / 2);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const finalRotation = await page.evaluate(() => {
            const element = AppState.elements.find(e => e.id === 'element-1');
            return element.rotation;
        });

        // Rotation should work in desktop mode
        expect(finalRotation).not.toBe(initialRotation);
    });
});
