import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Player-Element Stack Test', () => {
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

    test('TOUCH MODE: player stacked on element - element should be selected', async ({ page }) => {
        const x = 1000;
        const y = 1000;

        // Create element first (visual z-index 3)
        await page.evaluate(({ x, y }) => {
            AppState.elements = [];
            AppState.players = [];
            AppState.teams = [];

            // Element
            AppState.elements.push({
                id: 'test-element',
                type: 'cone',
                color: '#ff6b35',
                x, y,
                rotation: 0,
                visible: true,
                inherited: false
            });

            // Player on top (visual z-index 5 > element z-index 3)
            AppState.teams = [{ id: 'team-1', name: 'Team A', color: '#27ae60' }];
            AppState.players.push({
                id: 'test-player',
                teamId: 'team-1',
                number: 1,
                name: 'Test Player',
                color: '#27ae60',
                x, y,
                rotation: 0,
                visible: true
            });

            Elements.render();
            Players.render();
        }, { x, y });

        await page.waitForTimeout(500);

        // Check what document.elementFromPoint returns
        const topOverlayInfo = await page.evaluate(({ x, y }) => {
            const rect = AppState.canvas.getBoundingClientRect();
            const screenX = rect.left + (x * rect.width / AppState.boardWidth);
            const screenY = rect.top + (y * rect.height / AppState.boardHeight);

            const el = document.elementFromPoint(screenX, screenY);
            return {
                tagName: el?.tagName,
                className: el?.className,
                zIndex: el?.style?.zIndex || getComputedStyle(el).zIndex,
                elementId: el?.dataset?.element,
                playerId: el?.dataset?.playerId,
                isOverlay: el?.classList?.contains('touch-overlay')
            };
        }, { x, y });


        // Player overlay (z-index 25) should be on top of element overlay (z-index 23)
        // because player is visually on top (visual z-index 5 > 3)
        expect(topOverlayInfo.isOverlay).toBe(true);
        expect(topOverlayInfo.playerId).toBe('test-player');

        // Now click at that position
        const screenCoords = await page.evaluate(({ x, y }) => {
            const rect = AppState.canvas.getBoundingClientRect();
            return {
                x: rect.left + (x * rect.width / AppState.boardWidth),
                y: rect.top + (y * rect.height / AppState.boardHeight)
            };
        }, { x, y });

        await page.mouse.click(screenCoords.x, screenCoords.y);
        await page.waitForTimeout(100);

        // Check what was selected
        const selected = await page.evaluate(() => ({
            element: AppState.selectedElement?.id,
            player: AppState.selectedPlayer?.id
        }));


        // Player should be selected (overlay z-index 25 > 23, matching visual hierarchy)
        expect(selected.player).toBe('test-player');
        expect(selected.element).toBeUndefined();
    });

    test('TOUCH MODE: check visual vs overlay z-index in DOM', async ({ page }) => {
        const x = 1000;
        const y = 1000;

        await page.evaluate(({ x, y }) => {
            AppState.elements = [];
            AppState.players = [];
            AppState.teams = [];

            AppState.elements.push({
                id: 'test-element',
                type: 'cone',
                color: '#ff6b35',
                x, y,
                rotation: 0,
                visible: true,
                inherited: false
            });

            AppState.teams = [{ id: 'team-1', name: 'Team A', color: '#27ae60' }];
            AppState.players.push({
                id: 'test-player',
                teamId: 'team-1',
                number: 1,
                name: 'Test Player',
                color: '#27ae60',
                x, y,
                rotation: 0,
                visible: true
            });

            Elements.render();
            Players.render();
        }, { x, y });

        await page.waitForTimeout(500);

        // Check actual z-index values in DOM
        const zIndexInfo = await page.evaluate(() => {
            const elementVisual = document.querySelector('.element-svg[data-element="test-element"]');
            const elementOverlay = document.querySelector('.touch-overlay[data-element="test-element"]');
            const playerVisual = document.querySelector('.player[data-player-id="test-player"]');
            const playerOverlay = document.querySelector('.touch-overlay[data-player-id="test-player"]');

            return {
                elementVisual: {
                    exists: !!elementVisual,
                    zIndex: elementVisual?.style?.zIndex || getComputedStyle(elementVisual).zIndex
                },
                elementOverlay: {
                    exists: !!elementOverlay,
                    zIndex: elementOverlay?.style?.zIndex || getComputedStyle(elementOverlay).zIndex
                },
                playerVisual: {
                    exists: !!playerVisual,
                    zIndex: playerVisual?.style?.zIndex || getComputedStyle(playerVisual).zIndex
                },
                playerOverlay: {
                    exists: !!playerOverlay,
                    zIndex: playerOverlay?.style?.zIndex || getComputedStyle(playerOverlay).zIndex
                }
            };
        });


        // Verify z-index hierarchy
        expect(zIndexInfo.elementVisual.exists).toBe(true);
        expect(zIndexInfo.elementOverlay.exists).toBe(true);
        expect(zIndexInfo.playerVisual.exists).toBe(true);
        expect(zIndexInfo.playerOverlay.exists).toBe(true);

        // Visual elements
        expect(parseInt(zIndexInfo.playerVisual.zIndex)).toBe(50);
        expect(parseInt(zIndexInfo.elementVisual.zIndex)).toBe(30); // cone

        // Overlays should be visual z-index + 100
        expect(parseInt(zIndexInfo.elementOverlay.zIndex)).toBe(130); // 30 + 100
        expect(parseInt(zIndexInfo.playerOverlay.zIndex)).toBe(150);  // 50 + 100

        // Player overlay should be higher than element overlay (matching visual hierarchy)
        expect(parseInt(zIndexInfo.playerOverlay.zIndex)).toBeGreaterThan(parseInt(zIndexInfo.elementOverlay.zIndex));
    });
});
