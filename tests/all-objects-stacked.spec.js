import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('All Objects Stacked Test', () => {
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

    test('TOUCH MODE: all object types stacked, move each type away', async ({ page }) => {
        const startX = 1000;
        const startY = 1000;

        // Create ALL object types at exactly the same position
        const objectCount = await page.evaluate(({ x, y }) => {
            // Clear all existing objects first
            AppState.shapes = [];
            AppState.players = [];
            AppState.balls = [];
            AppState.plates = [];
            AppState.elements = [];
            AppState.teams = [];

            // Create teams first
            AppState.teams = [
                { id: 'team-1', name: 'Team A', color: '#27ae60' },
                { id: 'team-2', name: 'Team B', color: '#e74c3c' }
            ];

            // === SHAPES (overlay z-index 111-115) ===
            // Rectangle (visual z-index 11, overlay 111)
            AppState.shapes.push({
                id: 'shape-rectangle',
                type: 'rectangle',
                x, y,
                width: 100,
                height: 100,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            });

            // Circle (visual z-index 12, overlay 112)
            AppState.shapes.push({
                id: 'shape-circle',
                type: 'circle',
                x, y,
                width: 100,
                height: 100,
                rotation: 0,
                color: '#9b59b6',
                fillColor: 'rgba(155, 89, 182, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            });

            // Line (visual z-index 13, overlay 113)
            AppState.shapes.push({
                id: 'shape-line',
                type: 'line',
                x, y,
                width: 200,
                height: 5,
                rotation: 0,
                color: '#e67e22',
                strokeWidth: 2,
                visible: true,
                inherited: false
            });

            // Arrow (visual z-index 14, overlay 114)
            AppState.shapes.push({
                id: 'shape-arrow',
                type: 'arrow',
                x, y,
                width: 200,
                height: 5,
                rotation: 0,
                color: '#1abc9c',
                strokeWidth: 2,
                visible: true,
                inherited: false
            });

            // Text (visual z-index 15, overlay 115)
            AppState.shapes.push({
                id: 'shape-text',
                type: 'text',
                x, y,
                width: 100,
                height: 50,
                rotation: 0,
                color: '#34495e',
                text: 'Test',
                fontSize: 24,
                visible: true,
                inherited: false
            });

            // === PLATES (overlay z-index 120) ===
            AppState.addPlate('A', x, y, 0);
            AppState.addPlate('B', x, y, 0);
            AppState.addPlate('C', x, y, 0);

            // === BALLS (overlay z-index 140) ===
            AppState.addBall('#f39c12', x, y);
            AppState.addBall('#e74c3c', x, y);
            AppState.addBall('#3498db', x, y);

            // === PLAYERS (overlay z-index 150) ===
            AppState.players.push({
                id: 'player-1',
                teamId: 'team-1',
                number: 1,
                name: 'Player 1',
                color: '#27ae60',
                x, y,
                rotation: 0,
                visible: true
            });

            AppState.players.push({
                id: 'player-2',
                teamId: 'team-2',
                number: 2,
                name: 'Player 2',
                color: '#e74c3c',
                x, y,
                rotation: 0,
                visible: true
            });

            // === ELEMENTS (overlay z-index 130-137) ===
            const elementTypes = [
                { type: 'cone', id: 'elem-cone' },
                { type: 'ladder', id: 'elem-ladder' },
                { type: 'rebounce', id: 'elem-rebounce' },
                { type: 'big-wall', id: 'elem-bigwall' },
                { type: 'small-wall', id: 'elem-smallwall' },
                { type: 'small-goal', id: 'elem-smallgoal' },
                { type: 'goal', id: 'elem-goal' },
                { type: 'pole', id: 'elem-pole' },
                { type: 'small-hurdle', id: 'elem-hurdle' }
            ];

            elementTypes.forEach(elem => {
                AppState.elements.push({
                    id: elem.id,
                    type: elem.type,
                    color: '#ff6b35',
                    x, y,
                    rotation: 0,
                    visible: true,
                    inherited: false
                });
            });

            // Render all
            Shapes.render();
            Players.render();
            Balls.render();
            Plates.render();
            Elements.render();

            // Return counts
            return {
                shapes: AppState.shapes.length,
                plates: AppState.plates.length,
                balls: AppState.balls.length,
                players: AppState.players.length,
                elements: AppState.elements.length,
                total: AppState.shapes.length + AppState.plates.length + AppState.balls.length + AppState.players.length + AppState.elements.length
            };
        }, { x: startX, y: startY });

        await page.waitForTimeout(500);


        // Get the actual ball and plate IDs that were created
        const { ballIds, plateIds } = await page.evaluate(() => ({
            ballIds: AppState.balls.map(b => b.id),
            plateIds: AppState.plates.map(p => p.id)
        }));


        // Expected order based on overlay z-index = visual z-index + 100 (highest to lowest):
        // Players (visual 50, overlay 150) →
        // Balls (visual 40, overlay 140) →
        // Elements (visual 30-37, overlay 130-137) →
        // Plates (visual 20, overlay 120) →
        // Shapes (visual 11-15, overlay 111-115)
        // Within each category with same z-index, last rendered/added is on top due to DOM order
        const expectedOrder = [
            // Players (overlay z-index 150) - last added is on top
            'player-2',         // last player (on top)
            'player-1',
            // Balls (overlay z-index 140) - last added is on top
            ballIds[2],         // 3rd ball (last added)
            ballIds[1],         // 2nd ball
            ballIds[0],         // 1st ball
            // Elements (overlay z-index 130-137) - highest z-index on top
            'elem-hurdle',      // small-hurdle overlay 137 (highest element)
            'elem-pole',        // pole overlay 136
            'elem-goal',        // goal overlay 135
            'elem-smallgoal',   // small-goal overlay 134
            'elem-smallwall',   // small-wall overlay 133 (added after big-wall)
            'elem-bigwall',     // big-wall overlay 133 (added before small-wall)
            'elem-rebounce',    // rebounce overlay 132
            'elem-ladder',      // ladder overlay 131
            'elem-cone',        // cone overlay 130 (lowest element)
            // Plates (overlay z-index 120) - last added is on top
            plateIds[2],        // 3rd plate (last added)
            plateIds[1],        // 2nd plate
            plateIds[0],        // 1st plate
            // Shapes (overlay z-index 111-115) - highest z-index on top
            'shape-text',       // text overlay 115 (highest shape)
            'shape-arrow',      // arrow overlay 114
            'shape-line',       // line overlay 113
            'shape-circle',     // circle overlay 112
            'shape-rectangle'   // rectangle overlay 111 (lowest shape)
        ];
        const moved = [];

        // Calculate screen coordinates for the start position
        const screenCoords = await page.evaluate(({ x, y }) => {
            const rect = AppState.canvas.getBoundingClientRect();
            return {
                x: rect.left + (x * rect.width / AppState.boardWidth),
                y: rect.top + (y * rect.height / AppState.boardHeight)
            };
        }, { x: startX, y: startY });

        for (let i = 0; i < expectedOrder.length; i++) {
            const expectedId = expectedOrder[i];

            // Find which object is on top at the center
            const centerOverlay = await page.evaluate(({ x, y }) => {
                const el = document.elementFromPoint(x, y);
                if (!el || !el.classList.contains('touch-overlay')) return null;
                return {
                    shape: el.dataset.shape,
                    player: el.dataset.playerId,
                    ball: el.dataset.ball,
                    plate: el.dataset.plate,
                    element: el.dataset.element
                };
            }, screenCoords);


            // Determine which ID is on top
            let topId;
            if (centerOverlay?.element) {
                topId = centerOverlay.element;
            } else if (centerOverlay?.player) {
                topId = centerOverlay.player;
            } else if (centerOverlay?.ball) {
                topId = centerOverlay.ball; // Use actual ball ID
            } else if (centerOverlay?.plate) {
                topId = centerOverlay.plate; // Use actual plate ID
            } else if (centerOverlay?.shape) {
                topId = centerOverlay.shape;
            }

            expect(topId).toBeDefined();
            expect(moved).not.toContain(topId); // Not already moved

            // Verify this matches the expected ID based on z-index order
            expect(topId).toBe(expectedId);

            // Get the overlay based on ID
            let overlaySelector;
            if (topId.startsWith('elem-')) {
                overlaySelector = `.touch-overlay[data-element="${topId}"]`;
            } else if (topId.startsWith('player-')) {
                overlaySelector = `.touch-overlay[data-player-id="${topId}"]`;
            } else if (topId.startsWith('ball-')) {
                overlaySelector = `.touch-overlay[data-ball="${topId}"]`;
            } else if (topId.startsWith('plate-')) {
                overlaySelector = `.touch-overlay[data-plate="${topId}"]`;
            } else if (topId.startsWith('shape-')) {
                overlaySelector = `.touch-overlay[data-shape="${topId}"]`;
            }

            const overlay = page.locator(overlaySelector).first();
            const overlayBox = await overlay.boundingBox();
            const cx = overlayBox.x + overlayBox.width / 2;
            const cy = overlayBox.y + overlayBox.height / 2;

            // Drag away in different directions (in touch mode, mousedown selects and starts drag)
            const directions = [
                { dx: 200, dy: 0 },   // right
                { dx: 0, dy: 200 },   // down
                { dx: -200, dy: 0 },  // left
                { dx: 0, dy: -200 },  // up
                { dx: 150, dy: 150 }  // diagonal
            ];
            const dir = directions[i % directions.length];

            // Start drag with mousedown, move, then mouseup
            await page.mouse.move(cx, cy);
            await page.mouse.down();
            await page.waitForTimeout(50);
            await page.mouse.move(cx + dir.dx, cy + dir.dy, { steps: 10 });
            await page.mouse.up();
            await page.waitForTimeout(200);

            moved.push(topId);
        }

        // Verify all objects were moved in the correct z-index order
        expect(moved.length).toBe(expectedOrder.length);
        expect(moved).toEqual(expectedOrder);


        // Verify all objects have moved away from start position
        const finalPositions = await page.evaluate(() => {
            const positions = {
                elements: AppState.elements.map(e => ({ id: e.id, x: e.x, y: e.y })),
                players: AppState.players.map(p => ({ id: p.id, x: p.x, y: p.y })),
                balls: AppState.balls.map(b => ({ id: b.id, x: b.x, y: b.y })),
                plates: AppState.plates.map(p => ({ id: p.id, x: p.x, y: p.y })),
                shapes: AppState.shapes.map(s => ({ id: s.id, x: s.x, y: s.y }))
            };
            return positions;
        });


        // Verify all objects moved significantly from start position
        const allPositions = [
            ...finalPositions.elements,
            ...finalPositions.players,
            ...finalPositions.balls,
            ...finalPositions.plates,
            ...finalPositions.shapes
        ];

        allPositions.forEach(obj => {
            const distance = Math.sqrt(Math.pow(obj.x - startX, 2) + Math.pow(obj.y - startY, 2));
            expect(distance).toBeGreaterThan(100);
        });
    });
});
