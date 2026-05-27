/**
 * Verify the rendered stacking of a player ghost vs a shape (zone/rectangle).
 *
 * User report: "I can see that a player ghost is behind a zone."  This test
 * places a ghost and a shape at overlapping screen positions on a child board
 * and uses document.elementsFromPoint to determine which is rendered on top.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Ghost vs shape stacking', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        await addPlayer(page);
    });

    test('player ghost renders on top of a rectangle shape that overlaps it', async ({ page }) => {
        // Create child board with a player path intermediate (ghost).
        const playerId = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 1000;
            player.y = 1250;
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);

            const id = player.id;
            const ply = AppState.players.find(p => p.id === id);
            ply.x = 3500;
            ply.y = 1250;
            ply._explicitlySet = true;
            AppState.pathIntermediates[`player-${id}`] = [
                { x: 2250, y: 1250, rotation: 0 }
            ];
            AppState.animationShowGhostsBoard = true;

            // Add a rectangle shape that overlaps the ghost position.
            Shapes.addShapeAtPosition('rectangle', 2250, 1250);
            // Grow it so it clearly covers the ghost on screen.
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 1100;
            shape.height = 700;
            AppState.saveCurrentBoard();

            Players.render();
            Shapes.render();
            Animations.renderParentPaths();
            return id;
        });

        await page.waitForTimeout(200);

        const ghostId = `ghost-player-${playerId}-0`;
        const ghost = page.locator(`#${ghostId}`);
        await expect(ghost).toBeVisible({ timeout: 3000 });

        // Centre of the ghost on screen.
        const box = await ghost.boundingBox();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;

        // Crop screenshot around the ghost so we can visually inspect the stacking.
        await page.screenshot({
            path: 'test_results/ghost-vs-shape.png',
            clip: { x: cx - 200, y: cy - 150, width: 400, height: 300 },
        });

        // Which element is on top at the ghost's centre?
        const topInfo = await page.evaluate(({ x, y, ghostId }) => {
            const els = document.elementsFromPoint(x, y);
            const visible = els.map(e => ({
                tag: e.tagName, id: e.id, cls: e.className && e.className.baseVal !== undefined
                    ? e.className.baseVal : (e.className || ''),
                zIndex: getComputedStyle(e).zIndex,
            }));
            // Find the first element that's the ghost or a shape (skip the page bg etc).
            const ghostIdx = visible.findIndex(v => v.id === ghostId);
            const shapeIdx = visible.findIndex(v =>
                typeof v.cls === 'string' && v.cls.includes('shape')
                || (typeof v.id === 'string' && v.id.startsWith('shape-')));
            return { ghostIdx, shapeIdx, visible: visible.slice(0, 6) };
        }, { x: cx, y: cy, ghostId });

        console.log('Stacking at ghost centre:', topInfo);

        // elementsFromPoint returns elements from front to back.  We want the ghost
        // to appear BEFORE (in the array) the shape — i.e. on top.
        expect(topInfo.ghostIdx).toBeGreaterThanOrEqual(0);
        expect(topInfo.shapeIdx).toBeGreaterThanOrEqual(0);
        expect(topInfo.ghostIdx).toBeLessThan(topInfo.shapeIdx);
    });

    test('path line can be SELECTED by clicking when the path crosses over a shape', async ({ page }) => {
        // Setup: child board with player path crossing a rectangle shape.
        const playerId = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 500;
            player.y = 1250;
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);

            const id = player.id;
            const ply = AppState.players.find(p => p.id === id);
            ply.x = 4000;
            ply.y = 1250;
            ply._explicitlySet = true;

            // Rectangle straddles the middle of the path.
            Shapes.addShapeAtPosition('rectangle', 2250, 1250);
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 1400;
            shape.height = 600;
            AppState.saveCurrentBoard();

            Players.render();
            Shapes.render();
            Animations.renderParentPaths();
            return id;
        });
        await page.waitForTimeout(200);

        // Click the path roughly at board centre (where it crosses the shape).
        const target = await page.evaluate(() => {
            // Board centre = (2250, 1250). Convert to screen coords.
            const s = Utils.boardToScreenCoords(2250, 1250);
            const container = document.querySelector('.board-container').getBoundingClientRect();
            return { x: container.left + s.x, y: container.top + s.y };
        });

        // Show what's on top at that point.
        const top = await page.evaluate(({ x, y }) => {
            const els = document.elementsFromPoint(x, y);
            return els.slice(0, 6).map(e => ({
                tag: e.tagName, id: e.id,
                cls: typeof e.className === 'string' ? e.className : (e.className.baseVal || ''),
                z: getComputedStyle(e).zIndex, pe: getComputedStyle(e).pointerEvents,
            }));
        }, target);
        console.log('Stacking at path-over-shape point:', top);

        await page.mouse.click(target.x, target.y);
        await page.waitForTimeout(120);

        const sel = await page.evaluate(() => ({
            selectedPath: AppState.selectedPath,
            selectedShape: AppState.selectedShape,
        }));
        console.log('Selection after clicking on path over shape:', sel);
        expect(sel.selectedPath).toBe(`player-${playerId}`);
    });

    test('player ghost can be SELECTED in TOUCH MODE when an overlapping shape sits below it', async ({ page }) => {
        // Switch to touch mode — this adds .touch-overlay elements (z-index 111+)
        // on top of shapes, which is a real-world scenario that can swallow the
        // click before the ghost gets it.
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        const playerId = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 1000;
            player.y = 1250;
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);

            const id = player.id;
            const ply = AppState.players.find(p => p.id === id);
            ply.x = 3500;
            ply.y = 1250;
            ply._explicitlySet = true;
            AppState.pathIntermediates[`player-${id}`] = [
                { x: 2250, y: 1250, rotation: 0 }
            ];
            AppState.animationShowGhostsBoard = true;

            Shapes.addShapeAtPosition('rectangle', 2250, 1250);
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 1100;
            shape.height = 700;
            AppState.saveCurrentBoard();

            Players.render();
            Shapes.render(); // re-render so the touch-overlay is created
            Animations.renderParentPaths();
            return id;
        });

        await page.waitForTimeout(200);

        const ghostId = `ghost-player-${playerId}-0`;
        const ghost = page.locator(`#${ghostId}`);
        await expect(ghost).toBeVisible({ timeout: 3000 });

        const box = await ghost.boundingBox();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;

        // Sanity: which element is actually on top in touch mode?
        const topInfo = await page.evaluate(({ x, y, ghostId }) => {
            const els = document.elementsFromPoint(x, y);
            return els.map(e => ({
                tag: e.tagName, id: e.id,
                cls: typeof e.className === 'string' ? e.className : (e.className.baseVal || ''),
                zIndex: getComputedStyle(e).zIndex,
                pe: getComputedStyle(e).pointerEvents,
            }));
        }, { x: cx, y: cy, ghostId });
        console.log('Touch-mode stacking at ghost centre:');
        topInfo.forEach((el, i) => console.log(`  [${i}]`, el));

        await page.mouse.click(cx, cy);
        await page.waitForTimeout(120);

        const sel = await page.evaluate(() => ({
            selectedGhost: AppState.selectedGhost,
            selectedShape: AppState.selectedShape,
        }));
        console.log('Touch-mode selection after click:', sel);
        expect(sel.selectedGhost).toBe(ghostId);
    });

    test('player ghost can be SELECTED by clicking when an overlapping shape sits below it', async ({ page }) => {
        // Same scene: child-board ghost + overlapping rectangle.
        const playerId = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 1000;
            player.y = 1250;
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);

            const id = player.id;
            const ply = AppState.players.find(p => p.id === id);
            ply.x = 3500;
            ply.y = 1250;
            ply._explicitlySet = true;
            AppState.pathIntermediates[`player-${id}`] = [
                { x: 2250, y: 1250, rotation: 0 }
            ];
            AppState.animationShowGhostsBoard = true;

            Shapes.addShapeAtPosition('rectangle', 2250, 1250);
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 1100;
            shape.height = 700;
            AppState.saveCurrentBoard();

            Players.render();
            Shapes.render();
            Animations.renderParentPaths();
            return id;
        });

        await page.waitForTimeout(200);

        const ghostId = `ghost-player-${playerId}-0`;
        const ghost = page.locator(`#${ghostId}`);
        await expect(ghost).toBeVisible({ timeout: 3000 });

        const box = await ghost.boundingBox();
        // Click the ghost's centre.  This is the SAME thing the user does — and
        // it should select the ghost, NOT the shape that sits behind it.
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(120);

        const sel = await page.evaluate(() => ({
            selectedGhost: AppState.selectedGhost,
            selectedShape: AppState.selectedShape,
            selectedPath: AppState.selectedPath,
        }));
        console.log('Selection after click on ghost over shape:', sel);
        expect(sel.selectedGhost).toBe(ghostId);
    });
});
