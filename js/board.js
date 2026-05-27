// Futsal board drawing and management
const Board = {
    /** Sets up the canvas, resize observer, and court background rendering. */
    init() {
        AppState.canvas = document.getElementById('board-canvas');
        AppState.ctx = AppState.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => {
            this.resize();
            // Ensure rotation handles are updated after window resize
            requestAnimationFrame(() => {
                if (typeof Players !== 'undefined' && Players.updateRotationHandle) {
                    Players.updateRotationHandle();
                }
                if (typeof Elements !== 'undefined' && Elements.updateRotationHandle) {
                    Elements.updateRotationHandle();
                }
            });
        });

        this.draw();

        // Click on board container background to deselect all
        const boardContainer = document.querySelector('.board-container');
        boardContainer.addEventListener('mousedown', (e) => {
            // Check if we clicked on the background (not on an interactive element)
            const isBackground = e.target === boardContainer ||
                                 e.target.id === 'board-canvas' ||
                                 e.target.id === 'drawing-layer' ||
                                 e.target.id === 'paths-layer' ||
                                 e.target.classList.contains('board-container');

            if (isBackground) {
                // A new mousedown on empty background means no entity is being dragged.
                // Clear any stale drag state that can survive when a touchend fired on
                // a detached overlay (render() removes and recreates overlays during
                // mousedown processing, so the touchend target is no longer in the DOM
                // and its event never reaches setupTouchToMouse to produce a mouseup).
                AppState.draggedElement = null;
                AppState.draggedPlayer = null;
                AppState.draggedBall = null;
                AppState.draggedPlate = null;
                AppState.draggedShape = null;
                AppState.dragOffset = null;

                // In touch mode, don't deselect if click is near the selected entity
                // This tolerance prevents accidental deselection when trying to interact with the entity
                if (document.body.classList.contains('touch-mode')) {
                    // Check if click is near selected element
                    if (AppState.selectedElement && typeof Elements !== 'undefined') {
                        const selectedElementDom = document.getElementById(AppState.selectedElement.id);
                        if (selectedElementDom && Utils.isNearElement(e.clientX, e.clientY, selectedElementDom, 30)) {
                            e.stopPropagation();
                            return; // Don't deselect
                        }
                    }

                    // Check if click is near selected player
                    if (AppState.selectedPlayer && typeof Players !== 'undefined') {
                        const selectedPlayerDom = document.getElementById(AppState.selectedPlayer.id);
                        if (selectedPlayerDom && Utils.isNearElement(e.clientX, e.clientY, selectedPlayerDom, 30)) {
                            e.stopPropagation();
                            return; // Don't deselect
                        }
                    }

                    // Check if click is near selected ball
                    if (AppState.selectedBall && typeof Balls !== 'undefined') {
                        const selectedBallDom = document.getElementById(AppState.selectedBall.id);
                        if (selectedBallDom && Utils.isNearElement(e.clientX, e.clientY, selectedBallDom, 30)) {
                            e.stopPropagation();
                            return; // Don't deselect
                        }
                    }

                    // Check if click is near selected plate
                    if (AppState.selectedPlate && typeof Plates !== 'undefined') {
                        const selectedPlateDom = document.getElementById(AppState.selectedPlate.id);
                        if (selectedPlateDom && Utils.isNearElement(e.clientX, e.clientY, selectedPlateDom, 30)) {
                            e.stopPropagation();
                            return; // Don't deselect
                        }
                    }

                    // Check if click is inside the touch overlay of selected shape
                    if (AppState.selectedShape && typeof Shapes !== 'undefined') {
                        const touchOverlay = document.querySelector(`.touch-overlay[data-shape="${AppState.selectedShape}"]`);
                        if (touchOverlay) {
                            const overlayRect = touchOverlay.getBoundingClientRect();
                            // Check if click is inside the overlay bounds
                            if (e.clientX >= overlayRect.left && e.clientX <= overlayRect.right &&
                                e.clientY >= overlayRect.top && e.clientY <= overlayRect.bottom) {
                                e.stopPropagation();
                                return; // Don't deselect - click is inside touch overlay
                            }
                        }
                    }
                }
                // In non-touch mode, shapes don't need tolerance - they deselect on any background click

                if (AppState.selectedElement || AppState.selectedPlayer || AppState.selectedBall || AppState.selectedPlate || AppState.selectedPath || AppState.selectedGhost || AppState.selectedShape) {
                    AppState.selectedElement = null;
                    AppState.selectedPlayer = null;
                    AppState.selectedBall = null;
                    AppState.selectedPlate = null;
                    AppState.selectedPath = null;
                    AppState.selectedGhost = null;
                    AppState.selectedShape = null;
                    AppState.hidePositionDisplay();

                    // Hide path context menu when deselecting
                    const pathMenu = document.getElementById('path-context-menu');
                    if (pathMenu) {
                        pathMenu.classList.add('hidden');
                    }

                    // Re-render all to remove selection highlights
                    if (typeof Elements !== 'undefined') {
                        Elements.render();
                    }
                    if (typeof Players !== 'undefined') {
                        Players.render();
                    }
                    if (typeof Balls !== 'undefined') {
                        Balls.render();
                    }
                    if (typeof Plates !== 'undefined') {
                        Plates.render();
                    }
                    if (typeof Shapes !== 'undefined') {
                        Shapes.render();
                    }
                    if (typeof Animations !== 'undefined') {
                        Animations.renderParentPaths();
                    }
                }
            }
        });
    },

    // Resize canvas to fit container
    resize() {
        const container = document.querySelector('.board-container');
        const rect = container.getBoundingClientRect();

        // Account for board rotation
        const rotation = AppState.boardRotation || 0;

        let width, height;
        let scaleFactor = 1;

        if (rotation === 90 || rotation === 270) {
            // When rotated 90°/270°, we apply rotate(90deg) scale(s) CSS transform.
            // Always use the CURRENT container rect so the canvas tracks zoom changes
            // correctly (a stale cache would prevent adaptation to viewport resize).

            // scaleAt0: what the scale would be if the board were displayed at 0°
            const scaleAt0 = Math.min(
                rect.width  / AppState.boardWidth,
                rect.height / AppState.boardHeight
            );

            // scaleAt90: the scale actually applied when the board is rotated 90°
            const scaleAt90 = Math.min(
                rect.width  / AppState.boardHeight,
                rect.height / AppState.boardWidth
            );

            scaleFactor = scaleAt90 / scaleAt0;

            // Canvas dimensions: work backwards from the container height so the
            // rotated-and-scaled canvas fills the container.
            const visualHeight = rect.height;
            const swappedAspectRatio = AppState.boardHeight / AppState.boardWidth;
            const visualWidth = visualHeight * swappedAspectRatio;

            width  = visualHeight / scaleFactor;
            height = visualWidth  / scaleFactor;
        } else {
            // At 0°/180°, no scaling, normal aspect ratio
            const aspectRatio = AppState.boardWidth / AppState.boardHeight;
            width = rect.width;
            height = rect.height;

            if (width / height > aspectRatio) {
                width = height * aspectRatio;
            } else {
                height = width / aspectRatio;
            }
        }

        // Round to integers so every coordinate system (canvas attribute,
        // CSS style, SVG viewBox, offsetWidth) uses the same value.
        // Fractional values cause canvas.width (which truncates) to diverge
        // from canvasRect.width, shifting entity layers in screenshots.
        width  = Math.round(width);
        height = Math.round(height);

        AppState.canvas.width = width;
        AppState.canvas.height = height;
        AppState.canvas.style.width = width + 'px';
        AppState.canvas.style.height = height + 'px';

        // Calculate referenceScale: the effective scale at the current container size
        // (used by elements.js to maintain constant px-per-cm regardless of board rotation).
        // Always derive from the current container rect so zoom changes are reflected.
        const aspectRatio = AppState.boardWidth / AppState.boardHeight;
        let refWidth  = rect.width;
        let refHeight = rect.height;

        if (refWidth / refHeight > aspectRatio) {
            refWidth = refHeight * aspectRatio;
        } else {
            refHeight = refWidth / aspectRatio;
        }
        AppState.referenceScale = Math.min(refWidth / AppState.boardWidth, refHeight / AppState.boardHeight);

        // Store the board rotation scale factor for use in updateBoardVisualRotation()
        // This is calculated once in resize() to avoid getBoundingClientRect() zoom issues
        AppState.boardRotationScaleFactor = scaleFactor;

        // Center the canvas
        // Since transform-origin is "center center", the canvas rotates/scales around its center point
        // To center the canvas in the container, we position it so its center aligns with container center
        const offsetX = (rect.width - width) / 2;
        const offsetY = (rect.height - height) / 2;
        // Stash the layout offset on each layer so updateBoardVisualRotation() can
        // re-apply pan without losing track of the centering offset.
        const setLayer = (layer, w, h, ox, oy) => {
            if (!layer) return;
            layer.dataset.baseLeft = String(ox);
            layer.dataset.baseTop = String(oy);
            if (layer.tagName.toLowerCase() === 'svg') {
                layer.setAttribute('width', w);
                layer.setAttribute('height', h);
                layer.setAttribute('viewBox', `0 0 ${w} ${h}`);
            }
            layer.style.width = w + 'px';
            layer.style.height = h + 'px';
            layer.style.left = ox + 'px';
            layer.style.top = oy + 'px';
        };
        setLayer(AppState.canvas, width, height, offsetX, offsetY);

        // Update paths layer size and position.  paths-layer lives INSIDE
        // players-layer (so it shares its rotated stacking context), so it sits
        // at (0, 0) relative to its parent — the parent already carries the
        // offsetX/offsetY centering.
        const pathsLayer = document.getElementById('paths-layer');
        setLayer(pathsLayer, width, height, 0, 0);

        // Update drawing layer size and position
        const drawingLayer = document.getElementById('drawing-layer');
        setLayer(drawingLayer, width, height, offsetX, offsetY);

        // Update court SVG size and position
        const courtSvg = document.getElementById('court-svg');
        if (courtSvg) {
            courtSvg.dataset.baseLeft = String(offsetX);
            courtSvg.dataset.baseTop = String(offsetY);
            courtSvg.style.width = width + 'px';
            courtSvg.style.height = height + 'px';
            courtSvg.style.left = offsetX + 'px';
            courtSvg.style.top = offsetY + 'px';
        }

        // Players layer should be exactly the same size and position as board-canvas
        const playersLayer = document.getElementById('players-layer');
        setLayer(playersLayer, width, height, offsetX, offsetY);

        // board-area is at (0,0) inside players-layer, same size as players-layer
        const boardArea = document.getElementById('board-area');
        boardArea.style.width = '100%';
        boardArea.style.height = '100%';
        boardArea.style.left = '0';
        boardArea.style.top = '0';

        this.draw();

        // Scale the parquet tile so it stays proportional to the court regardless
        // of window size — tile height = 1/5 of court height (driven by layout
        // resize only, not by devicePixelRatio or CSS transforms).
        const tileH = Math.round(height / 5);
        container.style.backgroundSize = `${tileH * 5}px ${tileH}px`;

        // Re-render all elements at correct positions after resize
        if (typeof Elements !== 'undefined') {
            Elements.updateElementButtonSizes();
            Elements.render();
        }
        if (typeof Balls !== 'undefined') {
            Balls.updateBallTemplatesSizes();
            Balls.render();
        }
        if (typeof Plates !== 'undefined') {
            Plates.updatePlateTemplatesSizes();
            Plates.render();
        }
        if (typeof Players !== 'undefined') {
            Players.render();
        }
        if (typeof Drawings !== 'undefined') {
            Drawings.render();
        }
        if (typeof Animations !== 'undefined') {
            Animations.renderParentPaths();
        }

        // Re-apply the CSS rotate+scale transform with the updated scaleFactor so the
        // visual canvas fills the container.  App.updateBoardVisualRotation() is the
        // authoritative setter for the CSS transform; we call it here so that ANY
        // resize() call (window resize, sidebar change, rotation) keeps the display
        // in sync without relying on callers to remember to invoke it.
        if (typeof App !== 'undefined' && App.updateBoardVisualRotation) {
            App.updateBoardVisualRotation();
        }
    },

    // Draw the futsal court (now using SVG background)
    draw() {
        // Canvas is now just used for coordinate system
        // The actual court is drawn by the SVG background
        // No need to draw anything on canvas
    },

    // Convert board coordinates to canvas/board-area coordinates (pre-transform)
    boardToScreen(x, y) {
        // Canvas dimensions are already adjusted for rotation in resize()
        // At 90°/270°, canvas.width/height are pre-swapped to match the rotated board
        // So we always use canvas.width/height directly without additional swapping
        const scaleX = AppState.canvas.width / AppState.boardWidth;
        const scaleY = AppState.canvas.height / AppState.boardHeight;

        return {
            x: x * scaleX,
            y: y * scaleY
        };
    },

    // Convert canvas/board-area coordinates to board coordinates
    screenToBoard(x, y) {
        // Canvas dimensions are already adjusted for rotation in resize()
        // So we always use canvas.width/height directly
        const scaleX = AppState.boardWidth / AppState.canvas.width;
        const scaleY = AppState.boardHeight / AppState.canvas.height;

        return {
            x: x * scaleX,
            y: y * scaleY
        };
    },

    // Get mouse position relative to canvas
    getMousePos(e) {
        const rect = AppState.canvas.getBoundingClientRect();
        const scaleX = AppState.canvas.width / rect.width;
        const scaleY = AppState.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
};
