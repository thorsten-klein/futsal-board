/**
 * Tests to verify element sizes stay consistent during board rotation
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

/** Right-click on an empty part of the board to open context menu. */
async function rightClickBoard(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Get the board canvas context menu. */
async function getBoardCanvasMenu(page) {
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu;
}

test.describe('Element size during rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('goal size stays consistent after 90° rotation', async ({ page }) => {
        const goalId = await page.evaluate(() => {
            const goal = {
                id: `element-${AppState.nextElementId++}`,
                type: 'goal',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(goal);
            Elements.render();
            return goal.id;
        });

        const sizeBefore = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }, goalId);

        console.log('Goal size before rotation:', sizeBefore.width, 'x', sizeBefore.height);

        // Rotate 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const sizeAfter = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            const transformMatch = svg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
            const cssRotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
            const element = AppState.elements.find(el => el.id === id);
            return {
                width: rect.width,
                height: rect.height,
                svgWidth: parseFloat(svg.getAttribute('width')),
                svgHeight: parseFloat(svg.getAttribute('height')),
                cssRotation: cssRotation,
                elementRotation: element.rotation,
                boardRotation: AppState.boardRotation
            };
        }, goalId);

        console.log('Goal bounding box after rotation:', sizeAfter.width, 'x', sizeAfter.height);
        console.log('Goal SVG size after rotation:', sizeAfter.svgWidth, 'x', sizeAfter.svgHeight);
        console.log('Goal CSS rotation:', sizeAfter.cssRotation);
        console.log('Goal element.rotation:', sizeAfter.elementRotation);
        console.log('Board rotation:', sizeAfter.boardRotation);

        // Goal scales proportionally with board layer at 90°:
        // - Board layer scaled by ~0.556, so goal is also ~0.556x smaller on screen
        // - Bounding box also rotates: width/height swap places
        // Expected: before 22x67 → after (67*0.556)x(22*0.556) ≈ 37x12
        const boardScale = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        expect(Math.abs(sizeAfter.width - sizeBefore.height * boardScale)).toBeLessThan(sizeBefore.height * 0.15);
        expect(Math.abs(sizeAfter.height - sizeBefore.width * boardScale)).toBeLessThan(sizeBefore.width * 0.15);
    });

    test('pole size stays consistent after 90° rotation', async ({ page }) => {
        const poleId = await page.evaluate(() => {
            const pole = {
                id: `element-${AppState.nextElementId++}`,
                type: 'pole',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(pole);
            Elements.render();
            return pole.id;
        });

        const sizeBefore = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }, poleId);

        console.log('Pole size before rotation:', sizeBefore.width, 'x', sizeBefore.height);

        // Rotate 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const sizeAfter = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            const transformMatch = svg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
            const cssRotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
            return {
                width: rect.width,
                height: rect.height,
                cssRotation: cssRotation,
                boardRotation: AppState.boardRotation
            };
        }, poleId);

        console.log('Pole size after rotation:', sizeAfter.width, 'x', sizeAfter.height);
        console.log('Pole CSS rotation:', sizeAfter.cssRotation);
        console.log('Board rotation:', sizeAfter.boardRotation);

        // Pole is non-rotatable (stays upright), but scales with board
        // At 90°, board layer scaled by ~0.556, so pole is ~0.556x smaller
        // Dimensions don't swap (pole stays vertical): 20x67 → 11x37
        const boardScalePole = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        expect(Math.abs(sizeAfter.width - sizeBefore.width * boardScalePole)).toBeLessThan(sizeBefore.width * 0.15);
        expect(Math.abs(sizeAfter.height - sizeBefore.height * boardScalePole)).toBeLessThan(sizeBefore.height * 0.15);
    });

    test('rebounce size stays consistent after 90° rotation', async ({ page }) => {
        const rebounceId = await page.evaluate(() => {
            const rebounce = {
                id: `element-${AppState.nextElementId++}`,
                type: 'rebounce',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(rebounce);
            Elements.render();
            return rebounce.id;
        });

        const sizeBefore = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }, rebounceId);

        console.log('Rebounce size before rotation:', sizeBefore.width, 'x', sizeBefore.height);

        // Rotate 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const sizeAfter = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }, rebounceId);

        console.log('Rebounce size after rotation:', sizeAfter.width, 'x', sizeAfter.height);

        // Rebounce scales proportionally with board layer and rotates
        const boardScale2 = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        expect(Math.abs(sizeAfter.width - sizeBefore.height * boardScale2)).toBeLessThan(sizeBefore.height * 0.15);
        expect(Math.abs(sizeAfter.height - sizeBefore.width * boardScale2)).toBeLessThan(sizeBefore.width * 0.15);
    });

    test('ladder size stays consistent after 90° rotation', async ({ page }) => {
        const ladderId = await page.evaluate(() => {
            const ladder = {
                id: `element-${AppState.nextElementId++}`,
                type: 'ladder',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(ladder);
            Elements.render();
            return ladder.id;
        });

        const sizeBefore = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }, ladderId);

        console.log('Ladder size before rotation:', sizeBefore.width, 'x', sizeBefore.height);

        // Rotate 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const sizeAfter = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }, ladderId);

        console.log('Ladder size after rotation:', sizeAfter.width, 'x', sizeAfter.height);

        // Ladder scales proportionally with board layer and rotates
        const boardScale3 = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        expect(Math.abs(sizeAfter.width - sizeBefore.height * boardScale3)).toBeLessThan(sizeBefore.height * 0.15);
        expect(Math.abs(sizeAfter.height - sizeBefore.width * boardScale3)).toBeLessThan(sizeBefore.width * 0.15);
    });
});
