import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Cone Plate Overlap Bug', () => {
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

    test('TOUCH MODE: when cone and plate overlays overlap, only one should be selected (no toggling)', async ({ page }) => {
        await page.evaluate(() => {
            // Create a plate (z-index 30)
            AppState.addPlate('A', 1000, 1000, 0);
            Plates.render();

            // Create a cone very close (z-index 30)
            const element = {
                id: 'element-1',
                type: 'cone',
                color: '#ff6b35',
                x: 1000, // Same position = overlapping touch areas
                y: 1000,
                rotation: 0,
                visible: true,
                inherited: false
            };
            AppState.elements.push(element);
            Elements.render();
        });

        await page.waitForTimeout(300);

        const plateId = await page.evaluate(() => AppState.plates[0]?.id);
        const plateOverlay = page.locator(`.touch-overlay[data-plate="${plateId}"]`);
        const coneOverlay = page.locator('.touch-overlay[data-element="element-1"]').first();

        const plateBox = await plateOverlay.boundingBox();
        const coneBox = await coneOverlay.boundingBox();


        // Click on the center of the plate overlay (which should overlap with cone since they're at same position)
        const clickX = plateBox.x + plateBox.width / 2;
        const clickY = plateBox.y + plateBox.height / 2;


        // Check what element is at this point BEFORE clicking
        const elementAtPointBefore = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return {
                tagName: el?.tagName,
                id: el?.id,
                className: el?.className,
                dataPlate: el?.dataset?.plate,
                dataElement: el?.dataset?.element,
                zIndex: el?.style?.zIndex,
                pointerEvents: window.getComputedStyle(el).pointerEvents
            };
        }, { x: clickX, y: clickY });


        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(100);

        const selectedPlateAfterClick1 = await page.evaluate(() => AppState.selectedPlate);
        const selectedElementAfterClick1 = await page.evaluate(() => AppState.selectedElement);


        // Exactly ONE object should be selected
        const selectionCount1 = (selectedPlateAfterClick1 ? 1 : 0) + (selectedElementAfterClick1 ? 1 : 0);
        expect(selectionCount1).toBe(1);

        // Store which one was selected
        const firstSelection = selectedPlateAfterClick1 ? 'plate' : 'element';
        const firstSelectionId = selectedPlateAfterClick1?.id || selectedElementAfterClick1?.id;

        // Click again in the same spot
        // Check element at point before second click
        const elementAtPointBefore2 = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return {
                tagName: el?.tagName,
                className: el?.className,
                dataPlate: el?.dataset?.plate,
                dataElement: el?.dataset?.element
            };
        }, { x: clickX, y: clickY });


        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(100);

        const selectedPlateAfterClick2 = await page.evaluate(() => AppState.selectedPlate);
        const selectedElementAfterClick2 = await page.evaluate(() => AppState.selectedElement);


        // Still exactly ONE object should be selected
        const selectionCount2 = (selectedPlateAfterClick2 ? 1 : 0) + (selectedElementAfterClick2 ? 1 : 0);
        expect(selectionCount2).toBe(1);

        // The SAME object should still be selected (no toggling)
        const secondSelection = selectedPlateAfterClick2 ? 'plate' : 'element';
        const secondSelectionId = selectedPlateAfterClick2?.id || selectedElementAfterClick2?.id;


        expect(secondSelection).toBe(firstSelection);
        expect(secondSelectionId).toBe(firstSelectionId);
    });

    test('TOUCH MODE: clicking on cone overlay should select cone (not plate below)', async ({ page }) => {
        await page.evaluate(() => {
            // Create a plate first (rendered first in DOM)
            AppState.addPlate('A', 1000, 1000, 0);
            Plates.render();

            // Create a cone after (rendered later in DOM, should be on top)
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

        const coneOverlay = page.locator('.touch-overlay[data-element="element-1"]').first();
        const coneBox = await coneOverlay.boundingBox();

        const clickX = coneBox.x + coneBox.width / 2;
        const clickY = coneBox.y + coneBox.height / 2;


        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(100);

        const selectedPlate = await page.evaluate(() => AppState.selectedPlate);
        const selectedElement = await page.evaluate(() => AppState.selectedElement);


        // Cone should be selected (it's on top in DOM)
        expect(selectedElement?.id).toBe('element-1');
        expect(selectedPlate).toBeNull();
    });
});
