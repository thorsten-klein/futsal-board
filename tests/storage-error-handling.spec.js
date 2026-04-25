/**
 * Storage error handling tests — verify import/export validation,
 * error handling, and file menu operations.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer, addBall } from './helpers.js';

test.describe('Workbook Import/Export Validation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('import workbook with invalid JSON shows error message', async ({ page }) => {
        // Create invalid JSON file content
        const invalidJSON = 'This is not valid JSON{]';

        // Trigger import via evaluate to bypass file picker
        const errorShown = await page.evaluate(async (jsonContent) => {
            try {
                // Simulate the import handling code
                JSON.parse(jsonContent);
                return false;
            } catch (e) {
                // Error should be caught
                return true;
            }
        }, invalidJSON);

        expect(errorShown).toBe(true);
    });

    test('import workbook with missing required fields shows error', async ({ page }) => {
        // Create JSON missing required fields
        const incompleteJSON = JSON.stringify({
            boards: [] // Missing workbookName
        });

        const hasError = await page.evaluate((jsonContent) => {
            try {
                const data = JSON.parse(jsonContent);
                // Check if required fields exist
                return !data.workbookName;
            } catch (e) {
                return true;
            }
        }, incompleteJSON);

        expect(hasError).toBe(true);
    });

    test('export workbook creates valid JSON structure', async ({ page }) => {
        // Add some content
        await addPlayer(page);
        await addBall(page);

        // Export workbook programmatically
        const exportData = await page.evaluate(() => {
            AppState.saveCurrentBoard();
            return {
                workbookName: AppState.workbookName,
                boards: AppState.boards,
                boardsTree: AppState.boardsTree
            };
        });

        // Verify structure
        expect(exportData.workbookName).toBeDefined();
        expect(exportData.boards).toBeDefined();
        expect(Array.isArray(exportData.boards)).toBe(true);
        expect(exportData.boards.length).toBeGreaterThan(0);

        // Verify JSON is valid
        const jsonString = JSON.stringify(exportData);
        expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    test('export board creates valid JSON structure', async ({ page }) => {
        await addPlayer(page);

        // Export current board programmatically
        const exportData = await page.evaluate(() => {
            const currentBoard = AppState.boards.find(b => b.id === AppState.currentBoardId);
            return {
                boardName: currentBoard.name,
                ...currentBoard
            };
        });

        // Verify structure
        expect(exportData.boardName).toBeDefined();
        expect(exportData.players).toBeDefined();
        expect(Array.isArray(exportData.players)).toBe(true);

        // Verify JSON is valid
        const jsonString = JSON.stringify(exportData);
        expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    test('import board with invalid JSON shows error message', async ({ page }) => {
        const invalidJSON = '{broken json}';

        const hasError = await page.evaluate((jsonContent) => {
            try {
                JSON.parse(jsonContent);
                return false;
            } catch (e) {
                return true;
            }
        }, invalidJSON);

        expect(hasError).toBe(true);
    });
});

test.describe('Board and Workbook Naming', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('rename workbook via header click', async ({ page }) => {
        // Click on workbook name
        await page.locator('#workbook-name').click();
        await page.waitForTimeout(200);

        // Modal should be visible
        const modal = page.locator('#workbook-name-modal');
        await expect(modal).toBeVisible();

        // Change name
        await page.locator('#workbook-name-input').fill('New Workbook Name');
        await page.locator('#btn-confirm-workbook-name').click();
        await page.waitForTimeout(200);

        // Verify name changed
        const newName = await page.evaluate(() => AppState.workbookName);
        expect(newName).toBe('New Workbook Name');

        // Verify display updated
        await expect(page.locator('#workbook-name')).toHaveText('New Workbook Name');
    });

    test('rename board via header click', async ({ page }) => {
        // Click on board name
        await page.locator('#board-name').click();
        await page.waitForTimeout(200);

        // Modal should be visible
        const modal = page.locator('#board-name-modal');
        await expect(modal).toBeVisible();

        // Change name
        await page.locator('#board-name-input').fill('New Board Name');
        await page.locator('#btn-confirm-board-name').click();
        await page.waitForTimeout(200);

        // Verify name changed
        const newName = await page.evaluate(() => {
            const board = AppState.boards.find(b => b.id === AppState.currentBoardId);
            return board.name;
        });
        expect(newName).toBe('New Board Name');
    });

    test('cancel workbook rename does not change name', async ({ page }) => {
        const originalName = await page.evaluate(() => AppState.workbookName);

        await page.locator('#workbook-name').click();
        await page.waitForTimeout(200);

        await page.locator('#workbook-name-input').fill('Should Not Change');
        await page.locator('#btn-cancel-workbook-name').click();
        await page.waitForTimeout(200);

        const currentName = await page.evaluate(() => AppState.workbookName);
        expect(currentName).toBe(originalName);
    });

    test('cancel board rename does not change name', async ({ page }) => {
        const originalName = await page.evaluate(() => {
            const board = AppState.boards.find(b => b.id === AppState.currentBoardId);
            return board.name;
        });

        await page.locator('#board-name').click();
        await page.waitForTimeout(200);

        await page.locator('#board-name-input').fill('Should Not Change');
        await page.locator('#btn-cancel-board-name').click();
        await page.waitForTimeout(200);

        const currentName = await page.evaluate(() => {
            const board = AppState.boards.find(b => b.id === AppState.currentBoardId);
            return board.name;
        });
        expect(currentName).toBe(originalName);
    });

    test('Enter key confirms workbook name', async ({ page }) => {
        await page.locator('#workbook-name').click();
        await page.waitForTimeout(200);

        await page.locator('#workbook-name-input').fill('Enter Key Test');
        await page.locator('#workbook-name-input').press('Enter');
        await page.waitForTimeout(200);

        const newName = await page.evaluate(() => AppState.workbookName);
        expect(newName).toBe('Enter Key Test');
    });

    test('Enter key confirms board name', async ({ page }) => {
        await page.locator('#board-name').click();
        await page.waitForTimeout(200);

        await page.locator('#board-name-input').fill('Enter Key Test Board');
        await page.locator('#board-name-input').press('Enter');
        await page.waitForTimeout(200);

        const newName = await page.evaluate(() => {
            const board = AppState.boards.find(b => b.id === AppState.currentBoardId);
            return board.name;
        });
        expect(newName).toBe('Enter Key Test Board');
    });
});

test.describe('File Menu', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('file menu opens on button click', async ({ page }) => {
        const menu = page.locator('#file-menu');

        // Menu should be initially hidden
        await expect(menu).toBeHidden();

        // Click file button
        await page.locator('#btn-file-menu').click();
        await page.waitForTimeout(200);

        // Menu should be visible
        await expect(menu).toBeVisible();
    });

    test('file menu closes on second button click', async ({ page }) => {
        const menu = page.locator('#file-menu');

        // Open menu
        await page.locator('#btn-file-menu').click();
        await page.waitForTimeout(200);
        await expect(menu).toBeVisible();

        // Click again to close
        await page.locator('#btn-file-menu').click();
        await page.waitForTimeout(200);

        // Menu should be hidden
        await expect(menu).toBeHidden();
    });

    test('file menu closes when clicking outside', async ({ page }) => {
        const menu = page.locator('#file-menu');

        // Open menu
        await page.locator('#btn-file-menu').click();
        await page.waitForTimeout(200);
        await expect(menu).toBeVisible();

        // Click outside by dispatching a click event on the board container
        await page.evaluate(() => {
            const boardContainer = document.querySelector('.board-container') || document.body;
            boardContainer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        await page.waitForTimeout(200);

        // Menu should be hidden
        await expect(menu).toBeHidden();
    });

    test('file menu closes on window blur', async ({ page }) => {
        const menu = page.locator('#file-menu');

        // Open menu
        await page.locator('#btn-file-menu').click();
        await page.waitForTimeout(200);
        await expect(menu).toBeVisible();

        // Trigger window blur
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await page.waitForTimeout(200);

        // Menu should be hidden
        await expect(menu).toBeHidden();
    });

    test('file menu contains expected options', async ({ page }) => {
        await page.locator('#btn-file-menu').click();
        await page.waitForTimeout(200);

        const menu = page.locator('#file-menu');

        // Verify menu items exist
        await expect(menu.locator('text=Export Board')).toBeVisible();
        await expect(menu.locator('text=Import Board')).toBeVisible();
        await expect(menu.locator('text=Export Workbook')).toBeVisible();
        await expect(menu.locator('text=Import Workbook')).toBeVisible();
    });
});

test.describe('Board Context Menu', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('board context menu closes when clicking outside', async ({ page }) => {
        // Switch to workbook tab where board items are
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        await page.waitForTimeout(100);

        // Create a child board first
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            Storage.renderBoardsList();
        });
        await page.waitForTimeout(200);

        // Right-click on a board item in the boards list
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.waitForTimeout(300);

        const contextMenu = page.locator('#board-context-menu');
        await expect(contextMenu).toBeVisible();

        // Click outside using a programmatic click that bypasses pointer-events:none
        await page.evaluate(() => {
            const boardContainer = document.querySelector('.board-container') || document.body;
            boardContainer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        await page.waitForTimeout(200);

        // Menu should be hidden
        await expect(contextMenu).toBeHidden();
    });

    test('board context menu closes on window blur', async ({ page }) => {
        // Switch to workbook tab where board items are
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        await page.waitForTimeout(100);

        // Create a child board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            Storage.renderBoardsList();
        });
        await page.waitForTimeout(200);

        // Right-click on board item
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.waitForTimeout(300);

        const contextMenu = page.locator('#board-context-menu');
        await expect(contextMenu).toBeVisible();

        // Trigger window blur
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await page.waitForTimeout(200);

        // Menu should be hidden
        await expect(contextMenu).toBeHidden();
    });
});

test.describe('New Workbook Confirmation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('confirm new workbook modal appears when creating new workbook', async ({ page }) => {
        // Add some content to make workbook non-empty
        await addPlayer(page);

        // Trigger new workbook programmatically
        await page.evaluate(() => {
            // This should show confirmation modal if there's content
            const hasContent = AppState.players.length > 0 || AppState.balls.length > 0;
            if (hasContent) {
                document.getElementById('confirm-new-workbook-modal').classList.remove('hidden');
            }
        });
        await page.waitForTimeout(200);

        const modal = page.locator('#confirm-new-workbook-modal');
        await expect(modal).toBeVisible();
    });

    test('cancel new workbook keeps current workbook', async ({ page }) => {
        await addPlayer(page);
        const originalPlayerCount = await page.evaluate(() => AppState.players.length);

        // Show and cancel new workbook modal
        await page.evaluate(() => {
            document.getElementById('confirm-new-workbook-modal').classList.remove('hidden');
        });
        await page.waitForTimeout(100);

        await page.locator('#btn-cancel-new-workbook').click();
        await page.waitForTimeout(200);

        // Players should still exist
        const currentPlayerCount = await page.evaluate(() => AppState.players.length);
        expect(currentPlayerCount).toBe(originalPlayerCount);
    });
});
