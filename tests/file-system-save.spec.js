/**
 * File System Save/Load tests — verify that loading a file enables auto-save
 * and subsequent saves overwrite the same file.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('File System Save/Load', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('should store file handle after loading a workbook via File System Access API', async ({ page }) => {
        // Mock the File System Access API
        await page.evaluateHandle(() => {
            const mockFileHandle = {
                name: 'test-workbook.json',
                async getFile() {
                    return new File([JSON.stringify({
                        type: 'futsal-workbook',
                        version: '1.0',
                        workbookName: 'Test Workbook',
                        boards: [{
                            id: 'board-1',
                            name: 'Board 1',
                            players: [],
                            drawings: [],
                            elements: [],
                            balls: [],
                            plates: [],
                            shapes: []
                        }],
                        currentBoardId: 'board-1'
                    })], 'test-workbook.json', { type: 'application/json' });
                },
                createWritable: async function() {
                    let content = '';
                    return {
                        write: async (data) => { content = data; },
                        close: async () => {
                            this._lastSavedContent = content;
                        }
                    };
                }
            };

            window.showOpenFilePicker = async () => [mockFileHandle];
            window.showSaveFilePicker = async () => mockFileHandle;
            window._mockFileHandle = mockFileHandle;
        });

        // Click File > Open
        await page.locator('#btn-file-menu').click();

        // Wait for file menu to be visible
        const fileMenu = page.locator('#file-menu');
        await expect(fileMenu).toBeVisible({ timeout: 1000 });

        await page.locator('[data-action="open"]').click();
        await page.waitForTimeout(500);

        // Verify file handle is stored
        const hasFileHandle = await page.evaluate(() => {
            return AppState.currentFileHandle !== null;
        });
        expect(hasFileHandle).toBe(true);

        // Verify workbook was loaded
        const workbookName = await page.evaluate(() => AppState.workbookName);
        expect(workbookName).toBe('Test Workbook');

        // Verify toast shows filename
        const toastText = await page.locator('.toast').textContent();
        expect(toastText).toContain('test-workbook.json');
    });

    test('should save to the same file when clicking Save after loading', async ({ page }) => {
        // Mock the File System Access API with tracking
        await page.evaluateHandle(() => {
            let saveCount = 0;
            let lastSavedContent = null;

            const mockFileHandle = {
                name: 'test-workbook.json',
                async getFile() {
                    return new File([JSON.stringify({
                        type: 'futsal-workbook',
                        version: '1.0',
                        workbookName: 'Test Workbook',
                        boards: [{
                            id: 'board-1',
                            name: 'Board 1',
                            players: [],
                            drawings: [],
                            elements: [],
                            balls: [],
                            plates: [],
                            shapes: []
                        }],
                        currentBoardId: 'board-1'
                    })], 'test-workbook.json', { type: 'application/json' });
                },
                createWritable: async function() {
                    let content = '';
                    return {
                        write: async (data) => { content = data; },
                        close: async () => {
                            saveCount++;
                            lastSavedContent = content;
                            window._saveCount = saveCount;
                            window._lastSavedContent = lastSavedContent;
                        }
                    };
                }
            };

            window.showOpenFilePicker = async () => [mockFileHandle];
            window.showSaveFilePicker = async () => mockFileHandle;
            window._saveCount = 0;
        });

        // Load the file
        await page.locator('#btn-file-menu').click();
        await page.locator('[data-action="open"]').click();
        await page.waitForTimeout(500);

        // Save the file
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="save"]').click();
        await page.waitForTimeout(500);

        // Verify save was called
        const saveCount = await page.evaluate(() => window._saveCount);
        expect(saveCount).toBe(1);

        // Verify the saved content contains the workbook data
        const savedContent = await page.evaluate(() => window._lastSavedContent);
        expect(savedContent).toContain('Test Workbook');
        expect(savedContent).toContain('futsal-workbook');

        // Verify toast shows filename (check the last toast)
        const toastText = await page.locator('.toast').last().textContent();
        expect(toastText).toContain('Saved to test-workbook.json');
    });

    test('should continue saving to the same file on subsequent saves', async ({ page }) => {
        // Mock the File System Access API
        await page.evaluateHandle(() => {
            let saveCount = 0;

            const mockFileHandle = {
                name: 'test-workbook.json',
                async getFile() {
                    return new File([JSON.stringify({
                        type: 'futsal-workbook',
                        version: '1.0',
                        workbookName: 'Test Workbook',
                        boards: [{
                            id: 'board-1',
                            name: 'Board 1',
                            players: [],
                            drawings: [],
                            elements: [],
                            balls: [],
                            plates: [],
                            shapes: []
                        }],
                        currentBoardId: 'board-1'
                    })], 'test-workbook.json', { type: 'application/json' });
                },
                createWritable: async function() {
                    let content = '';
                    return {
                        write: async (data) => { content = data; },
                        close: async () => {
                            saveCount++;
                            window._saveCount = saveCount;
                        }
                    };
                }
            };

            window.showOpenFilePicker = async () => [mockFileHandle];
            window.showSaveFilePicker = async () => mockFileHandle;
            window._saveCount = 0;
        });

        // Load the file
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="open"]').click();
        await page.waitForTimeout(500);

        // Save multiple times
        for (let i = 0; i < 3; i++) {
            await page.locator('#btn-file-menu').click();
            await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
            await page.locator('[data-action="save"]').click();
            await page.waitForTimeout(300);
        }

        // Verify all saves went to the same file
        const saveCount = await page.evaluate(() => window._saveCount);
        expect(saveCount).toBe(3);
    });

    test('should prompt for new file when clicking Save As', async ({ page }) => {
        // Mock the File System Access API
        await page.evaluateHandle(() => {
            let openPickerCalled = false;
            let savePickerCalled = false;

            const mockFileHandle = {
                name: 'test-workbook.json',
                async getFile() {
                    return new File([JSON.stringify({
                        type: 'futsal-workbook',
                        version: '1.0',
                        workbookName: 'Test Workbook',
                        boards: [{
                            id: 'board-1',
                            name: 'Board 1',
                            players: [],
                            drawings: [],
                            elements: [],
                            balls: [],
                            plates: [],
                            shapes: []
                        }],
                        currentBoardId: 'board-1'
                    })], 'test-workbook.json', { type: 'application/json' });
                },
                createWritable: async function() {
                    return {
                        write: async () => {},
                        close: async () => {}
                    };
                }
            };

            window.showOpenFilePicker = async () => {
                openPickerCalled = true;
                window._openPickerCalled = true;
                return [mockFileHandle];
            };
            window.showSaveFilePicker = async () => {
                savePickerCalled = true;
                window._savePickerCalled = true;
                return mockFileHandle;
            };
            window._openPickerCalled = false;
            window._savePickerCalled = false;
        });

        // Load a file first
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="open"]').click();
        await page.waitForTimeout(500);

        // Reset the save picker flag
        await page.evaluate(() => { window._savePickerCalled = false; });

        // Click Save As
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="save-as"]').click();
        await page.waitForTimeout(500);

        // Verify save picker was called (not just using existing file handle)
        const savePickerCalled = await page.evaluate(() => window._savePickerCalled);
        expect(savePickerCalled).toBe(true);
    });

    test('should clear file handle when creating a new workbook', async ({ page }) => {
        // Mock the File System Access API
        await page.evaluateHandle(() => {
            const mockFileHandle = {
                name: 'test-workbook.json',
                async getFile() {
                    return new File([JSON.stringify({
                        type: 'futsal-workbook',
                        version: '1.0',
                        workbookName: 'Test Workbook',
                        boards: [{
                            id: 'board-1',
                            name: 'Board 1',
                            players: [],
                            drawings: [],
                            elements: [],
                            balls: [],
                            plates: [],
                            shapes: []
                        }],
                        currentBoardId: 'board-1'
                    })], 'test-workbook.json', { type: 'application/json' });
                },
                createWritable: async function() {
                    return {
                        write: async () => {},
                        close: async () => {}
                    };
                }
            };

            window.showOpenFilePicker = async () => [mockFileHandle];
        });

        // Load a file
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="open"]').click();
        await page.waitForTimeout(500);

        // Verify file handle exists
        let hasFileHandle = await page.evaluate(() => AppState.currentFileHandle !== null);
        expect(hasFileHandle).toBe(true);

        // Create new workbook
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="new-workbook"]').click();
        await page.waitForTimeout(300);

        // Confirm the modal
        await page.locator('#btn-confirm-new-workbook').click();
        await page.waitForTimeout(300);

        // Enter a name and confirm
        await page.fill('#workbook-name-input', 'New Workbook');
        await page.locator('#btn-confirm-workbook-name').click();
        await page.waitForTimeout(300);

        // Verify file handle is cleared
        hasFileHandle = await page.evaluate(() => AppState.currentFileHandle !== null);
        expect(hasFileHandle).toBe(false);
    });

    test('should show toast with filename when saving', async ({ page }) => {
        // Mock the File System Access API
        await page.evaluateHandle(() => {
            const mockFileHandle = {
                name: 'my-tactics.json',
                async getFile() {
                    return new File([JSON.stringify({
                        type: 'futsal-workbook',
                        version: '1.0',
                        workbookName: 'My Tactics',
                        boards: [{
                            id: 'board-1',
                            name: 'Board 1',
                            players: [],
                            drawings: [],
                            elements: [],
                            balls: [],
                            plates: [],
                            shapes: []
                        }],
                        currentBoardId: 'board-1'
                    })], 'my-tactics.json', { type: 'application/json' });
                },
                createWritable: async function() {
                    return {
                        write: async () => {},
                        close: async () => {}
                    };
                }
            };

            window.showSaveFilePicker = async () => mockFileHandle;
        });

        // Click Save (will prompt for new file since no file is loaded)
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="save"]').click();
        await page.waitForTimeout(500);

        // Verify toast shows filename
        const toast = page.locator('.toast');
        await expect(toast).toContainText('my-tactics.json');
    });

    test('should handle file access errors gracefully', async ({ page }) => {
        // Mock the File System Access API to throw permission error
        await page.evaluateHandle(() => {
            const mockFileHandle = {
                name: 'test.json',
                async getFile() {
                    return new File([JSON.stringify({
                        type: 'futsal-workbook',
                        version: '1.0',
                        workbookName: 'Test',
                        boards: [{
                            id: 'board-1',
                            name: 'Board 1',
                            players: [],
                            drawings: [],
                            elements: [],
                            balls: [],
                            plates: [],
                            shapes: []
                        }],
                        currentBoardId: 'board-1'
                    })], 'test.json', { type: 'application/json' });
                },
                createWritable: async function() {
                    // Simulate permission denied error
                    const error = new Error('Permission denied');
                    error.name = 'NotAllowedError';
                    throw error;
                }
            };

            window.showOpenFilePicker = async () => [mockFileHandle];
            window.showSaveFilePicker = async () => mockFileHandle;
        });

        // Load file
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="open"]').click();
        await page.waitForTimeout(500);

        // Try to save (should fail with permission error and prompt for new location)
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="save"]').click();
        await page.waitForTimeout(500);

        // Verify no crash occurred and file handle is still set
        const hasFileHandle = await page.evaluate(() => AppState.currentFileHandle !== null);
        expect(hasFileHandle).toBe(true);
    });

    test('should differentiate between Save and Save As', async ({ page }) => {
        // Mock the File System Access API
        await page.evaluateHandle(() => {
            window._savePickerCalled = 0;
            window._writeCalled = 0;

            const mockFileHandle = {
                name: 'test.json',
                async getFile() {
                    return new File([JSON.stringify({
                        type: 'futsal-workbook',
                        version: '1.0',
                        workbookName: 'Test',
                        boards: [{
                            id: 'board-1',
                            name: 'Board 1',
                            players: [],
                            drawings: [],
                            elements: [],
                            balls: [],
                            plates: [],
                            shapes: []
                        }],
                        currentBoardId: 'board-1'
                    })], 'test.json', { type: 'application/json' });
                },
                createWritable: async function() {
                    window._writeCalled++;
                    return {
                        write: async () => {},
                        close: async () => {}
                    };
                }
            };

            window.showOpenFilePicker = async () => [mockFileHandle];
            window.showSaveFilePicker = async () => {
                window._savePickerCalled++;
                return mockFileHandle;
            };
        });

        // Load file
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="open"]').click();
        await page.waitForTimeout(500);

        // Save normally (should not prompt)
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="save"]').click();
        await page.waitForTimeout(300);

        // Save As (should prompt even though file is already loaded)
        await page.locator('#btn-file-menu').click();
        await expect(page.locator('#file-menu')).toBeVisible({ timeout: 1000 });
        await page.locator('[data-action="save-as"]').click();
        await page.waitForTimeout(300);

        // Verify Save As called the picker
        const savePickerCount = await page.evaluate(() => window._savePickerCalled);
        expect(savePickerCount).toBeGreaterThanOrEqual(1);

        // Verify both saves wrote to file
        const writeCount = await page.evaluate(() => window._writeCalled);
        expect(writeCount).toBeGreaterThanOrEqual(2);
    });
});
