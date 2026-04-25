/**
 * Shape position persistence tests for parent/child board inheritance.
 *
 * Original bug (FIXED): When a shape is dragged to a new position on a child board,
 * the new position was not persisted.
 *
 * Root cause (FIXED): setupEntityDrag for shapes now has an onDrop callback that
 * clears shape.inherited = true when dragging, ensuring saveCurrentBoard() persists
 * the new position.
 *
 * Tests verify:
 * 1. Dragging a shape on a child board persists the new position
 * 2. Dragging a shape on a child board shows the new position in grandchild boards
 * 3. Moving a shape on a parent board updates all child boards
 * 4. Moving a shape on a parent board updates all sibling child boards
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

async function createAndSwitchToChildBoard(page) {
    return await page.evaluate(() => {
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        if (childId) {
            AppState.loadBoard(childId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }
        return childId;
    });
}

/** Click a shape element once to select it, then drag it by (dx, dy) pixels. */
async function selectAndDragShape(page, shapeLocator, dx, dy) {
    // First click: select the shape
    await shapeLocator.click();
    await page.waitForTimeout(100);

    // Second mousedown on the (now-selected) shape starts the drag
    const bb = await shapeLocator.boundingBox();
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx, cy + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);
}

test.describe('Shape position persistence in child board', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('dragging a shape on a child board saves the new position', async ({ page }) => {
        // Add a shape on the parent board
        await page.evaluate(() => {
            Shapes.addShapeAtPosition('rectangle', 2000, 1500);
            Shapes.render();
        });
        await page.waitForTimeout(200);

        // Switch to child board
        const childBoardId = await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Verify shape is visible (inherited from parent)
        const shapeEl = page.locator('[data-shape]').first();
        await expect(shapeEl).toBeVisible();

        // Record position before drag
        const before = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });

        // Drag the shape to a new position
        await selectAndDragShape(page, shapeEl, 150, 100);

        // Record position right after drag
        const afterDrag = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });
        // Position must have changed in memory
        expect(afterDrag.x).not.toBe(before.x);

        // Navigate to parent board, then back to child board (triggers save + reload)
        await page.evaluate((cid) => {
            AppState.loadBoard('board-1');
            Shapes.render();
            AppState.loadBoard(cid);
            Shapes.render();
        }, childBoardId);
        await page.waitForTimeout(200);

        // VERIFY: shape must still be at the dragged position, not the original
        const afterReload = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });

        expect(afterReload.x).toBe(afterDrag.x);
        expect(afterReload.y).toBe(afterDrag.y);
    });

    test('shape dragged on child board is shown at the new position in grandchild board', async ({ page }) => {
        // Add a shape on the parent board
        await page.evaluate(() => {
            Shapes.addShapeAtPosition('rectangle', 2000, 1500);
            Shapes.render();
        });
        await page.waitForTimeout(200);

        // Switch to child board
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Drag the shape on the child board
        const shapeEl = page.locator('[data-shape]').first();
        await selectAndDragShape(page, shapeEl, 150, 100);

        // Record the position right after drag (what the grandchild should inherit)
        const childPos = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });

        // Switch to grandchild board
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // VERIFY: grandchild must show the shape at the child board's dragged position
        const grandchildPos = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });

        expect(grandchildPos.x).toBe(childPos.x);
        expect(grandchildPos.y).toBe(childPos.y);
    });

    test('moving a shape on parent board applies to child board', async ({ page }) => {
        // Add a shape on the parent board
        await page.evaluate(() => {
            Shapes.addShapeAtPosition('rectangle', 2000, 1500);
            Shapes.render();
        });
        await page.waitForTimeout(200);

        // Create a child board
        const childBoardId = await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Verify shape is visible on child board (inherited from parent)
        const shapeEl = page.locator('[data-shape]').first();
        await expect(shapeEl).toBeVisible();

        // Go back to parent board
        await page.evaluate(() => {
            AppState.loadBoard('board-1');
            Shapes.render();
        });
        await page.waitForTimeout(200);

        // Move the shape on the parent board
        const parentShapeEl = page.locator('[data-shape]').first();
        await selectAndDragShape(page, parentShapeEl, 300, 200);

        // Record the new position on parent board
        const parentPos = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });

        // Switch back to child board
        await page.evaluate((cid) => {
            AppState.loadBoard(cid);
            Shapes.render();
        }, childBoardId);
        await page.waitForTimeout(200);

        // VERIFY: child board should show the shape at the NEW parent position
        const childPos = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });

        expect(childPos.x).toBe(parentPos.x);
        expect(childPos.y).toBe(parentPos.y);
    });

    test('moving a shape on parent board applies to all child boards', async ({ page }) => {
        // Add a shape on the parent board
        await page.evaluate(() => {
            Shapes.addShapeAtPosition('rectangle', 2000, 1500);
            Shapes.render();
        });
        await page.waitForTimeout(200);

        // Create child board A
        const childAId = await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Go back to parent and create child board B
        await page.evaluate(() => {
            AppState.loadBoard('board-1');
            Shapes.render();
        });
        await page.waitForTimeout(200);

        const childBId = await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Go back to parent
        await page.evaluate(() => {
            AppState.loadBoard('board-1');
            Shapes.render();
        });
        await page.waitForTimeout(200);

        // Move the shape on parent board
        const parentShapeEl = page.locator('[data-shape]').first();
        await selectAndDragShape(page, parentShapeEl, 300, 200);

        // Record the new position
        const parentPos = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });

        // Check child board A
        await page.evaluate((cid) => {
            AppState.loadBoard(cid);
            Shapes.render();
        }, childAId);
        await page.waitForTimeout(200);

        const childAPos = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });

        expect(childAPos.x).toBe(parentPos.x);
        expect(childAPos.y).toBe(parentPos.y);

        // Check child board B
        await page.evaluate((cid) => {
            AppState.loadBoard(cid);
            Shapes.render();
        }, childBId);
        await page.waitForTimeout(200);

        const childBPos = await page.evaluate(() => {
            const s = AppState.shapes[0];
            return { x: s.x, y: s.y };
        });

        expect(childBPos.x).toBe(parentPos.x);
        expect(childBPos.y).toBe(parentPos.y);
    });
});
