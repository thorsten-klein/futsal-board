/**
 * Layer-stacking order tests.
 *
 * Places one of every entity type (player, ball, element, plate, shape) at the
 * board centre so they fully overlap.  Clicking that point must select the
 * topmost entity according to the intended visual order:
 *
 *   player (top)  >  ball  >  element  >  plate  >  shape  (bottom)
 *
 * After each selection the entity is deleted via the Delete key; the next click
 * must then select the next layer down.  The test loops through all five layers
 * and verifies the board is empty at the end.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

// Board centre in stored coordinates (board is 4500 × 2500 units)
const BX = 2250;
const BY = 1250;

/**
 * Adds one entity of every type at the board centre via AppState helpers,
 * then triggers a full App.render() so the DOM stacking order is established.
 */
async function stackAllAtCenter(page) {
    await page.evaluate(({ bx, by }) => {
        // Add each entity to state (no individual render yet)
        AppState.addPlayer(AppState.teams[0]?.id || 'team-1', bx, by);
        AppState.addBall(null, bx, by);
        AppState.addPlate(null, bx, by);
        AppState.addElement('cone', bx, by);
        AppState.shapes.push({
            id: `shape-${AppState.nextShapeId++}`,
            type: 'rectangle',
            x: bx, y: by,
            width: 300, height: 200,
            rotation: 0,
            color: '#3498db',
            fillColor: 'rgba(52,152,219,0.3)',
            strokeWidth: 3,
            visible: true,
            inherited: false,
        });
        AppState.saveToLocalStorage();

        // Single full render establishes the DOM stacking order
        App.render();
    }, { bx: BX, by: BY });
    await page.waitForTimeout(200);
}

test.describe('Layer stacking order', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('clicking overlapping entities selects them top-to-bottom: player > ball > element > plate > shape', async ({ page }) => {
        await stackAllAtCenter(page);

        // Compute the screen click position from the board coordinate
        const { x, y } = await page.evaluate(({ bx, by }) => {
            const bb = AppState.canvas.getBoundingClientRect();
            return {
                x: bb.left + bx * (bb.width  / AppState.boardWidth),
                y: bb.top  + by * (bb.height / AppState.boardHeight),
            };
        }, { bx: BX, by: BY });

        const layers = [
            { name: 'player',  isSelected: () => page.evaluate(() => !!AppState.selectedPlayer)  },
            { name: 'ball',    isSelected: () => page.evaluate(() => !!AppState.selectedBall)    },
            { name: 'element', isSelected: () => page.evaluate(() => !!AppState.selectedElement) },
            { name: 'plate',   isSelected: () => page.evaluate(() => !!AppState.selectedPlate)   },
            { name: 'shape',   isSelected: () => page.evaluate(() => !!AppState.selectedShape)   },
        ];

        for (const layer of layers) {
            await page.mouse.click(x, y);
            await page.waitForTimeout(150);
            expect(
                await layer.isSelected(),
                `expected ${layer.name} to be selected (it should be the topmost remaining layer)`
            ).toBe(true);
            await page.keyboard.press('Delete');
            await page.waitForTimeout(150);
        }

        // All entities removed — nothing should be selected
        const anySelected = await page.evaluate(() =>
            !!(AppState.selectedPlayer || AppState.selectedBall ||
               AppState.selectedElement || AppState.selectedPlate || AppState.selectedShape)
        );
        expect(anySelected, 'nothing should be selected after all entities are removed').toBe(false);
    });
});
