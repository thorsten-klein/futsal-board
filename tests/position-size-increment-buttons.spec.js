/**
 * Tests for +/- increment buttons in Set Position and Set Size dialogs.
 * These buttons should jump in 50 steps, with the first click rounding to nearest 50.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addElement } from './helpers.js';

test.describe('Position and Size Increment Buttons', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    // ============================================================================
    // PLAYER POSITION TESTS
    // ============================================================================
    test.describe('Player Position Dialog', () => {
        test('Player position X has +/- buttons that round then increment by 50', async ({ page }) => {
            // Add a player at a non-round position
            await page.locator('.team-player-template').first().click();
            await page.waitForTimeout(500);

            // Click player to select
            const player = page.locator('[data-player-id]').first();
            await player.click();
            await page.waitForTimeout(300);

            // Right-click to open context menu
            await player.click({ button: 'right' });
            await page.waitForTimeout(500);

            // Click "Set Position" - players use element-position-modal
            await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
            await page.waitForTimeout(500);

            // Get initial X value
            const initialX = await page.locator('#element-pos-x').inputValue();
            const initialXNum = parseInt(initialX);

            // Click increase button for X
            await page.locator('.position-btn[data-field="x"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const firstClickX = await page.locator('#element-pos-x').inputValue();
            const firstClickXNum = parseInt(firstClickX);

            // First click should always increment to the next multiple of 50,
            // even if the current value is already on a 50 boundary.
            const expectedFirstClick = Math.ceil((initialXNum + 1) / 50) * 50;
            expect(firstClickXNum).toBe(expectedFirstClick);

            // Click increase again
            await page.locator('.position-btn[data-field="x"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const secondClickX = await page.locator('#element-pos-x').inputValue();
            const secondClickXNum = parseInt(secondClickX);

            // Second click should add 50
            expect(secondClickXNum).toBe(firstClickXNum + 50);
        });

        test('Player position Y decrease button rounds down then decrements by 50', async ({ page }) => {
            // Add a player
            await page.locator('.team-player-template').first().click();
            await page.waitForTimeout(500);

            // Open position dialog
            const player = page.locator('[data-player-id]').first();
            await player.click();
            await page.waitForTimeout(300);
            await player.click({ button: 'right' });
            await page.waitForTimeout(500);
            await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
            await page.waitForTimeout(500);

            // Set a non-round Y value
            await page.locator('#element-pos-y').fill('1237');
            await page.waitForTimeout(100);

            // Click decrease button for Y
            await page.locator('.position-btn[data-field="y"][data-action="decrease"]').click();
            await page.waitForTimeout(100);

            const firstClickY = await page.locator('#element-pos-y').inputValue();
            const firstClickYNum = parseInt(firstClickY);

            // First click should round down to nearest 50
            expect(firstClickYNum).toBe(1200);

            // Click decrease again
            await page.locator('.position-btn[data-field="y"][data-action="decrease"]').click();
            await page.waitForTimeout(100);

            const secondClickY = await page.locator('#element-pos-y').inputValue();
            const secondClickYNum = parseInt(secondClickY);

            // Second click should subtract 50
            expect(secondClickYNum).toBe(1150);
        });
    });

    // ============================================================================
    // BALL POSITION TESTS
    // ============================================================================
    test.describe('Ball Position Dialog', () => {
        test('Ball position has +/- buttons that work correctly', async ({ page }) => {
            // Add a ball
            await addBall(page);
            await page.waitForTimeout(500);

            // Click ball to select
            const ball = page.locator('[data-ball]').first();
            await ball.click();
            await page.waitForTimeout(300);

            // Right-click to open context menu
            await ball.click({ button: 'right' });
            await page.waitForTimeout(500);

            // Click "Set Position" - balls use element-position-modal
            await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
            await page.waitForTimeout(500);

            // Set a non-round X value
            await page.locator('#element-pos-x').fill('1123');
            await page.waitForTimeout(100);

            // Click increase button
            await page.locator('.position-btn[data-field="x"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const firstClickX = await page.locator('#element-pos-x').inputValue();
            expect(parseInt(firstClickX)).toBe(1150); // Rounded up to nearest 50

            // Click increase again
            await page.locator('.position-btn[data-field="x"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const secondClickX = await page.locator('#element-pos-x').inputValue();
            expect(parseInt(secondClickX)).toBe(1200); // Added 50
        });
    });

    // ============================================================================
    // ELEMENT POSITION TESTS
    // ============================================================================
    test.describe('Element Position Dialog', () => {
        test('Element position has +/- buttons that work correctly', async ({ page }) => {
            // Add a cone element
            await page.locator('.element-btn[data-element="cone"]').click();
            await page.waitForTimeout(500);

            // Click element to select
            const element = page.locator('.element-svg').first();
            await element.click();
            await page.waitForTimeout(300);

            // Right-click to open context menu
            await element.click({ button: 'right' });
            await page.waitForTimeout(500);

            // Click "Set Position" - elements use element-position-modal
            await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
            await page.waitForTimeout(500);

            // Set a non-round value
            await page.locator('#element-pos-y').fill('877');
            await page.waitForTimeout(100);

            // Click decrease button
            await page.locator('.position-btn[data-field="y"][data-action="decrease"]').click();
            await page.waitForTimeout(100);

            const firstClickY = await page.locator('#element-pos-y').inputValue();
            expect(parseInt(firstClickY)).toBe(850); // Rounded down to nearest 50

            // Click decrease again
            await page.locator('.position-btn[data-field="y"][data-action="decrease"]').click();
            await page.waitForTimeout(100);

            const secondClickY = await page.locator('#element-pos-y').inputValue();
            expect(parseInt(secondClickY)).toBe(800); // Subtracted 50
        });
    });

    // ============================================================================
    // PLATE POSITION TESTS
    // ============================================================================
    test.describe('Plate Position Dialog', () => {
        test('Plate position has +/- buttons that work correctly', async ({ page }) => {
            // Add a plate
            await page.locator('.plate-template').first().click();
            await page.waitForTimeout(500);

            // Click plate to select
            const plate = page.locator('[data-plate]').first();
            await plate.click();
            await page.waitForTimeout(300);

            // Right-click to open context menu
            await plate.click({ button: 'right' });
            await page.waitForTimeout(500);

            // Click "Set Position" - plates use element-position-modal
            await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
            await page.waitForTimeout(500);

            // Set a non-round X value
            await page.locator('#element-pos-x').fill('1367');
            await page.waitForTimeout(100);

            // Click increase button
            await page.locator('.position-btn[data-field="x"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const firstClickX = await page.locator('#element-pos-x').inputValue();
            expect(parseInt(firstClickX)).toBe(1400); // Rounded up to nearest 50

            // Click increase again
            await page.locator('.position-btn[data-field="x"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const secondClickX = await page.locator('#element-pos-x').inputValue();
            expect(parseInt(secondClickX)).toBe(1450); // Added 50
        });
    });

    // ============================================================================
    // SHAPE SIZE TESTS
    // ============================================================================
    test.describe('Shape Size Dialog', () => {
        test('Shape width has +/- buttons that round then increment by 50', async ({ page }) => {
            // Add a rectangle shape
            await page.locator('.draw-btn[data-draw="rectangle"]').click();
            await page.waitForTimeout(300);

            // Draw a rectangle
            const board = page.locator('#board-canvas');
            const boardBox = await board.boundingBox();
            await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
            await page.mouse.down();
            await page.mouse.move(boardBox.x + 200, boardBox.y + 200);
            await page.mouse.up();
            await page.waitForTimeout(500);

            // Click shape to select
            const shape = page.locator('.shape-svg').first();
            await shape.click();
            await page.waitForTimeout(300);

            // Right-click to open context menu
            await shape.click({ button: 'right' });
            await page.waitForTimeout(500);

            // Click "Set Size"
            await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="size"]').click();
            await page.waitForTimeout(500);

            // Set a non-round width value
            await page.locator('#shape-width').fill('237');
            await page.waitForTimeout(300);

            // Click increase button for width (force needed due to rotation handle overlay)
            await page.locator('.position-btn[data-field="width"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const firstClickWidth = await page.locator('#shape-width').inputValue();
            const firstClickWidthNum = parseInt(firstClickWidth);

            // First click should round up to nearest 50
            expect(firstClickWidthNum).toBe(250);

            // Click increase again
            await page.locator('.position-btn[data-field="width"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const secondClickWidth = await page.locator('#shape-width').inputValue();
            const secondClickWidthNum = parseInt(secondClickWidth);

            // Second click should add 50
            expect(secondClickWidthNum).toBe(300);
        });

        test('Shape height decrease button rounds down then decrements by 50', async ({ page }) => {
            // Add a rectangle shape
            await page.locator('.draw-btn[data-draw="rectangle"]').click();
            await page.waitForTimeout(300);

            // Draw a rectangle
            const board = page.locator('#board-canvas');
            const boardBox = await board.boundingBox();
            await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
            await page.mouse.down();
            await page.mouse.move(boardBox.x + 200, boardBox.y + 200);
            await page.mouse.up();
            await page.waitForTimeout(500);

            // Click shape to select
            const shape = page.locator('.shape-svg').first();
            await shape.click();
            await page.waitForTimeout(300);

            // Right-click to open context menu
            await shape.click({ button: 'right' });
            await page.waitForTimeout(500);

            // Click "Set Size"
            await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="size"]').click();
            await page.waitForTimeout(500);

            // Set a non-round height value
            await page.locator('#shape-height').fill('423');
            await page.waitForTimeout(100);

            // Click decrease button for height
            await page.locator('.position-btn[data-field="height"][data-action="decrease"]').click();
            await page.waitForTimeout(100);

            const firstClickHeight = await page.locator('#shape-height').inputValue();
            expect(parseInt(firstClickHeight)).toBe(400); // Rounded down to nearest 50

            // Click decrease again
            await page.locator('.position-btn[data-field="height"][data-action="decrease"]').click();
            await page.waitForTimeout(100);

            const secondClickHeight = await page.locator('#shape-height').inputValue();
            expect(parseInt(secondClickHeight)).toBe(350); // Subtracted 50
        });

        test('Shape size buttons handle values exactly on 50 boundaries', async ({ page }) => {
            // Add a rectangle shape
            await page.locator('.draw-btn[data-draw="rectangle"]').click();
            await page.waitForTimeout(300);

            // Draw a rectangle
            const board = page.locator('#board-canvas');
            const boardBox = await board.boundingBox();
            await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
            await page.mouse.down();
            await page.mouse.move(boardBox.x + 200, boardBox.y + 200);
            await page.mouse.up();
            await page.waitForTimeout(500);

            // Open size dialog
            const shape = page.locator('.shape-svg').first();
            await shape.click();
            await page.waitForTimeout(300);
            await shape.click({ button: 'right' });
            await page.waitForTimeout(500);
            await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="size"]').click();
            await page.waitForTimeout(500);

            // Set width to exactly 300
            await page.locator('#shape-width').fill('300');
            await page.waitForTimeout(300);

            // First click increase - already at a 50 boundary, so it increments to 350
            await page.locator('.position-btn[data-field="width"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const firstIncreaseWidth = await page.locator('#shape-width').inputValue();
            expect(parseInt(firstIncreaseWidth)).toBe(350);

            // Second click increase - should add 50 to get 400
            await page.locator('.position-btn[data-field="width"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const secondIncreaseWidth = await page.locator('#shape-width').inputValue();
            expect(parseInt(secondIncreaseWidth)).toBe(400);

            // Click decrease - should go to 350
            await page.locator('.position-btn[data-field="width"][data-action="decrease"]').click();
            await page.waitForTimeout(100);

            const afterDecreaseWidth = await page.locator('#shape-width').inputValue();
            expect(parseInt(afterDecreaseWidth)).toBe(350);
        });
    });

    // ============================================================================
    // TEXT SHAPE SIZE TESTS
    // ============================================================================
    test.describe('Text Shape Size Dialog', () => {
        test('Text shape has size +/- buttons that work correctly', async ({ page }) => {
            // Add a text shape
            await page.locator('.draw-btn[data-draw="text"]').click();
            await page.waitForTimeout(300);

            // Click on board to place text
            const board = page.locator('#board-canvas');
            const boardBox = await board.boundingBox();
            await page.mouse.click(boardBox.x + 200, boardBox.y + 200);
            await page.waitForTimeout(500);

            // Type some text and confirm
            await page.keyboard.type('Test');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            // Click text to select
            const text = page.locator('.shape-svg').first();
            await text.click();
            await page.waitForTimeout(300);

            // Right-click to open context menu
            await text.click({ button: 'right' });
            await page.waitForTimeout(500);

            // Click "Set Size"
            await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="size"]').click();
            await page.waitForTimeout(500);

            // Set a non-round width value
            await page.locator('#shape-width').fill('163');
            await page.waitForTimeout(100);

            // Click increase button
            await page.locator('.position-btn[data-field="width"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const firstClickWidth = await page.locator('#shape-width').inputValue();
            expect(parseInt(firstClickWidth)).toBe(200); // Rounded up to nearest 50

            // Click increase again
            await page.locator('.position-btn[data-field="width"][data-action="increase"]').click();
            await page.waitForTimeout(100);

            const secondClickWidth = await page.locator('#shape-width').inputValue();
            expect(parseInt(secondClickWidth)).toBe(250); // Added 50
        });
    });
});
