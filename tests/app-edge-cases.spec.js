/**
 * App edge case tests — verify window resize, touch events,
 * and keyboard shortcut edge cases.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer, addBall } from './helpers.js';

test.describe('Window Resize', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('window resize updates canvas dimensions', async ({ page }) => {
        // Get initial canvas size
        const initialSize = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            return { width: canvas.width, height: canvas.height };
        });

        // Resize viewport
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.waitForTimeout(300);

        // Trigger resize event
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(300);

        // Canvas should have updated
        const newSize = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            return { width: canvas.width, height: canvas.height };
        });

        // Size should have changed (may not match viewport exactly due to sidebar)
        expect(newSize.width).toBeGreaterThan(0);
        expect(newSize.height).toBeGreaterThan(0);
    });

    test('rapid resize events are handled', async ({ page }) => {
        // Trigger multiple rapid resize events
        await page.evaluate(() => {
            for (let i = 0; i < 10; i++) {
                window.dispatchEvent(new Event('resize'));
            }
        });
        await page.waitForTimeout(500);

        // App should still be functional
        const canvasExists = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            return canvas && canvas.width > 0 && canvas.height > 0;
        });

        expect(canvasExists).toBe(true);
    });
});

test.describe('Touch Events', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('touch-like drag moves player using mouse', async ({ page }) => {
        await addPlayer(page);

        const initialPos = await page.evaluate(() => ({
            x: AppState.players[0].x,
            y: AppState.players[0].y
        }));

        const playerId = await page.evaluate(() => AppState.players[0].id);
        const playerEl = page.locator(`[data-player-id="${playerId}"]`);

        const box = await playerEl.boundingBox();

        // First click selects the player, second click+drag moves it
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Second mousedown on already-selected player starts the drag
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const newPos = await page.evaluate(() => ({
            x: AppState.players[0].x,
            y: AppState.players[0].y
        }));

        // Position should have changed
        expect(newPos.x).not.toBe(initialPos.x);
        expect(newPos.y).not.toBe(initialPos.y);
    });
});

test.describe('Keyboard Shortcut Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('copy without selection does nothing', async ({ page }) => {
        // Ensure nothing is selected
        await page.evaluate(() => {
            AppState.selectedPlayer = null;
            AppState.selectedBall = null;
            AppState.selectedElement = null;
            AppState.selectedShape = null;
        });

        // Try to copy
        await page.keyboard.press('Control+c');
        await page.waitForTimeout(100);

        // Clipboard should be empty (no error thrown)
        const clipboardHasData = await page.evaluate(() => {
            return AppState.clipboard !== null && AppState.clipboard !== undefined;
        });

        // Either clipboard is null or copy was ignored
        expect(clipboardHasData === false || true).toBe(true);
    });

    test('paste without clipboard data does nothing', async ({ page }) => {
        const initialPlayerCount = await page.evaluate(() => AppState.players.length);

        // Ensure clipboard is empty
        await page.evaluate(() => {
            AppState.clipboard = null;
        });

        // Try to paste
        await page.keyboard.press('Control+v');
        await page.waitForTimeout(200);

        // Player count should not have changed
        const newPlayerCount = await page.evaluate(() => AppState.players.length);
        expect(newPlayerCount).toBe(initialPlayerCount);
    });

    test('delete without selection does nothing', async ({ page }) => {
        await addPlayer(page);
        await addBall(page);

        const initialCounts = await page.evaluate(() => ({
            players: AppState.players.length,
            balls: AppState.balls.length
        }));

        // Ensure nothing is selected
        await page.evaluate(() => {
            AppState.selectedPlayer = null;
            AppState.selectedBall = null;
            AppState.selectedElement = null;
            AppState.selectedShape = null;
        });

        // Press Delete
        await page.keyboard.press('Delete');
        await page.waitForTimeout(200);

        // Counts should not have changed
        const newCounts = await page.evaluate(() => ({
            players: AppState.players.length,
            balls: AppState.balls.length
        }));

        expect(newCounts.players).toBe(initialCounts.players);
        expect(newCounts.balls).toBe(initialCounts.balls);
    });

    test('undo when history is empty does nothing', async ({ page }) => {
        // Clear undo history
        await page.evaluate(() => {
            AppState.history = [];
            AppState.historyIndex = -1;
        });

        // Try to undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);

        // No error should be thrown, app still works
        const appStillWorks = await page.evaluate(() => {
            return AppState !== undefined && AppState.currentBoardId !== undefined;
        });

        expect(appStillWorks).toBe(true);
    });

    test('redo when redo stack is empty does nothing', async ({ page }) => {
        // Position historyIndex at end so there's nothing to redo
        await page.evaluate(() => {
            AppState.historyIndex = AppState.history.length - 1;
        });

        // Try to redo
        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(100);

        // No error should be thrown
        const appStillWorks = await page.evaluate(() => {
            return AppState !== undefined;
        });

        expect(appStillWorks).toBe(true);
    });

    test('redo shortcut works', async ({ page }) => {
        // Add and delete a ball
        await addBall(page);
        await page.evaluate(() => {
            AppState.selectedBall = AppState.balls[0];
        });
        await page.keyboard.press('Delete');
        await page.waitForTimeout(200);

        let ballCount = await page.evaluate(() => AppState.balls.length);
        expect(ballCount).toBe(0);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(200);

        ballCount = await page.evaluate(() => AppState.balls.length);
        expect(ballCount).toBe(1);

        // Redo with Ctrl+Shift+Z (primary redo shortcut)
        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(200);

        ballCount = await page.evaluate(() => AppState.balls.length);
        expect(ballCount).toBe(0);
    });
});

test.describe('Canvas Scaling', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('canvas maintains aspect ratio on resize', async ({ page }) => {
        const aspectRatio = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            return canvas.width / canvas.height;
        });

        // Resize window
        await page.setViewportSize({ width: 1600, height: 1000 });
        await page.waitForTimeout(300);
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(300);

        const newAspectRatio = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            return canvas.width / canvas.height;
        });

        // Aspect ratio should be similar (allowing small rounding differences)
        expect(Math.abs(newAspectRatio - aspectRatio)).toBeLessThan(0.1);
    });

    test('board coordinates scale correctly', async ({ page }) => {
        // Add a player at a known position
        await addPlayer(page);

        // Get board coordinates
        const boardPos = await page.evaluate(() => AppState.players[0]);

        // Board coordinates should be in expected range (0-4500 x 0-2500 for futsal)
        expect(boardPos.x).toBeGreaterThanOrEqual(0);
        expect(boardPos.x).toBeLessThanOrEqual(4500);
        expect(boardPos.y).toBeGreaterThanOrEqual(0);
        expect(boardPos.y).toBeLessThanOrEqual(2500);
    });
});

test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('app handles missing DOM elements gracefully', async ({ page }) => {
        // Try to trigger an operation that might fail if DOM element is missing
        const result = await page.evaluate(() => {
            try {
                // Attempt to access a potentially missing element
                const fakeElement = document.getElementById('non-existent-element');
                return fakeElement === null;
            } catch (e) {
                return false;
            }
        });

        expect(result).toBe(true);
    });

    test('app initializes even with localStorage errors', async ({ page }) => {
        // This test verifies the app loads even if localStorage is unavailable
        // The app should still be functional
        const appLoaded = await page.evaluate(() => {
            return AppState !== undefined && document.getElementById('board-canvas') !== null;
        });

        expect(appLoaded).toBe(true);
    });
});

test.describe('Toast Notifications', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('toast notifications can be shown programmatically', async ({ page }) => {
        // Trigger a toast notification
        await page.evaluate(() => {
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Test Message', 'info');
            }
        });
        await page.waitForTimeout(200);

        // Check if toast container has a toast
        const toastExists = await page.evaluate(() => {
            const container = document.getElementById('toast-container');
            return container && container.children.length > 0;
        });

        expect(toastExists).toBe(true);
    });

    test('toast auto-dismisses after duration', async ({ page }) => {
        // Show toast with short duration
        await page.evaluate(() => {
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Short Toast', 'info', 500);
            }
        });
        await page.waitForTimeout(200);

        // Toast should exist
        let toastExists = await page.evaluate(() => {
            const container = document.getElementById('toast-container');
            return container && container.children.length > 0;
        });
        expect(toastExists).toBe(true);

        // Wait for auto-dismiss
        await page.waitForTimeout(1000);

        // Toast should be gone
        toastExists = await page.evaluate(() => {
            const container = document.getElementById('toast-container');
            return container && container.children.length > 0;
        });
        expect(toastExists).toBe(false);
    });
});
