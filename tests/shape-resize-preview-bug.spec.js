/**
 * Test for shape resize bug where the shape changes size when clicking
 * on empty board area after resizing, and the touch overlay doesn't match.
 */
import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Shape resize preview bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await goto(page);
        await page.evaluate(() => {
            AppState.currentTool = 'select';
            document.body.classList.add('touch-mode');
        });
    });

    test('TOUCH MODE: shape should maintain size after resize and touch overlay should match', async ({ page }) => {
        // Create a rectangle shape
        await page.evaluate(() => {
            const shape = {
                id: 'test-shape',
                type: 'rectangle',
                x: 1000,
                y: 1000,
                width: 200,
                height: 100,
                rotation: 0,
                color: '#ff6b35',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Select the shape
        const overlay = page.locator('.touch-overlay[data-shape="test-shape"]');
        await expect(overlay).toBeVisible();
        await overlay.click();
        await page.waitForTimeout(100);

        // Get initial dimensions from the shape and overlay
        const initialDims = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-shape');
            const overlay = document.querySelector('.touch-overlay[data-shape="test-shape"]');
            const svgShape = document.querySelector('[data-shape="test-shape"]');
            const rect = svgShape.querySelector('rect[stroke]') || svgShape;
            return {
                shape: {
                    width: shape.width,
                    height: shape.height
                },
                overlay: {
                    width: parseFloat(overlay.style.width),
                    height: parseFloat(overlay.style.height)
                },
                svgRect: {
                    width: parseFloat(rect.getAttribute('width')),
                    height: parseFloat(rect.getAttribute('height'))
                },
                svgBBox: {
                    width: svgShape.getBoundingClientRect().width,
                    height: svgShape.getBoundingClientRect().height
                }
            };
        });

        // Verify initial state
        expect(initialDims.shape.width).toBe(200);
        expect(initialDims.shape.height).toBe(100);

        // Find and drag the resize handle to make the shape bigger
        // For rectangles, there are multiple resize handles, use the bottom-right one
        const resizeHandle = page.locator('.resize-handle').first();
        await expect(resizeHandle).toBeVisible();
        const handleBox = await resizeHandle.boundingBox();

        // Drag the handle to resize (make it 100px wider)
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Move 100px to the right
        await page.mouse.move(handleBox.x + handleBox.width / 2 + 100, handleBox.y + handleBox.height / 2, { steps: 5 });
        await page.waitForTimeout(50);

        // Get dimensions during resize (before mouseup)
        const duringResizeDims = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-shape');
            const overlay = document.querySelector('.touch-overlay[data-shape="test-shape"]');
            const svgShape = document.querySelector('[data-shape="test-shape"]');
            const rect = svgShape.querySelector('rect[stroke]') || svgShape;
            return {
                shape: {
                    width: shape.width,
                    height: shape.height
                },
                overlay: {
                    width: parseFloat(overlay.style.width),
                    height: parseFloat(overlay.style.height)
                },
                svgRect: {
                    width: parseFloat(rect.getAttribute('width')),
                    height: parseFloat(rect.getAttribute('height'))
                },
                svgBBox: {
                    width: svgShape.getBoundingClientRect().width,
                    height: svgShape.getBoundingClientRect().height
                }
            };
        });

        // Release the mouse
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Get dimensions immediately after resize
        const afterResizeDims = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-shape');
            const overlay = document.querySelector('.touch-overlay[data-shape="test-shape"]');
            const svgShape = document.querySelector('[data-shape="test-shape"]');
            const rect = svgShape.querySelector('rect[stroke]') || svgShape;
            return {
                shape: {
                    width: shape.width,
                    height: shape.height
                },
                overlay: {
                    width: parseFloat(overlay.style.width),
                    height: parseFloat(overlay.style.height)
                },
                svgRect: {
                    width: parseFloat(rect.getAttribute('width')),
                    height: parseFloat(rect.getAttribute('height'))
                },
                svgBBox: {
                    width: svgShape.getBoundingClientRect().width,
                    height: svgShape.getBoundingClientRect().height
                }
            };
        });

        // Now click on empty board area to deselect
        const canvasRect = await page.evaluate(() => {
            const rect = AppState.canvas.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            };
        });

        // Click at top-left corner (empty area)
        await page.mouse.click(canvasRect.left + 50, canvasRect.top + 50);
        await page.waitForTimeout(200);

        // Get dimensions after clicking background
        const afterBackgroundClickDims = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-shape');
            const overlay = document.querySelector('.touch-overlay[data-shape="test-shape"]');
            const svgShape = document.querySelector('[data-shape="test-shape"]');
            const rect = svgShape.querySelector('rect[stroke]') || svgShape;
            return {
                shape: {
                    width: shape.width,
                    height: shape.height
                },
                overlay: {
                    width: parseFloat(overlay.style.width),
                    height: parseFloat(overlay.style.height)
                },
                svgRect: {
                    width: parseFloat(rect.getAttribute('width')),
                    height: parseFloat(rect.getAttribute('height'))
                },
                svgBBox: {
                    width: svgShape.getBoundingClientRect().width,
                    height: svgShape.getBoundingClientRect().height
                }
            };
        });

        // EXPECTED BEHAVIOR:
        // 1. The shape should have been resized (width should be ~300)
        expect(afterResizeDims.shape.width).toBeGreaterThan(initialDims.shape.width);

        // 2. The shape size should NOT change when clicking background
        // BUG: The shape changes size after clicking background
        expect(afterBackgroundClickDims.shape.width).toBe(afterResizeDims.shape.width);
        expect(afterBackgroundClickDims.shape.height).toBe(afterResizeDims.shape.height);

        // 3. The SVG rect element should match the shape data (within margin tolerance)
        // The rect is smaller than the shape by 2*margin (10px total)
        const marginTotal = 10;
        expect(Math.abs(afterBackgroundClickDims.svgRect.width - (afterBackgroundClickDims.shape.width - marginTotal))).toBeLessThan(1);
        expect(Math.abs(afterBackgroundClickDims.svgRect.height - (afterBackgroundClickDims.shape.height - marginTotal))).toBeLessThan(1);

        // 4. The touch overlay should be larger than the SVG bounding box (includes 8px tolerance)
        // The overlay provides a larger tap target for easier interaction
        expect(afterBackgroundClickDims.overlay.width).toBeGreaterThan(afterBackgroundClickDims.svgBBox.width);
        expect(afterBackgroundClickDims.overlay.height).toBeGreaterThan(afterBackgroundClickDims.svgBBox.height);
    });

    test('TOUCH MODE: arrow resize should maintain size after background click', async ({ page }) => {
        // Create an arrow shape
        await page.evaluate(() => {
            const shape = {
                id: 'test-arrow',
                type: 'arrow',
                x: 1000,
                y: 1000,
                width: 300,
                height: 0,
                rotation: 0,
                color: '#000000',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Select the arrow
        const overlay = page.locator('.touch-overlay[data-shape="test-arrow"]');
        await expect(overlay).toBeVisible();
        await overlay.click();
        await page.waitForTimeout(100);

        // Get initial width
        const initialWidth = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-arrow');
            return shape.width;
        });

        // Find and drag the resize handle
        const resizeHandle = page.locator('.resize-handle');
        await expect(resizeHandle).toBeVisible();
        const handleBox = await resizeHandle.boundingBox();

        // Drag to make arrow longer (150px longer)
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(50);
        await page.mouse.move(handleBox.x + handleBox.width / 2 + 150, handleBox.y + handleBox.height / 2, { steps: 5 });
        await page.waitForTimeout(50);

        // Get width during resize
        const duringResizeWidth = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-arrow');
            return shape.width;
        });

        await page.mouse.up();
        await page.waitForTimeout(100);

        // Get width after resize
        const afterResizeWidth = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-arrow');
            return shape.width;
        });

        // Click background to deselect
        await page.mouse.click(50, 50);
        await page.waitForTimeout(200);

        // Get width after background click
        const afterClickWidth = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-arrow');
            return shape.width;
        });

        // Shape should have been resized
        expect(afterResizeWidth).toBeGreaterThan(initialWidth);

        // BUG: Width should NOT change when clicking background
        expect(afterClickWidth).toBe(afterResizeWidth);
    });
});
