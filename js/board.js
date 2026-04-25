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

        // Maintain aspect ratio
        const aspectRatio = AppState.boardWidth / AppState.boardHeight;
        let width = rect.width;
        let height = rect.height;

        if (width / height > aspectRatio) {
            width = height * aspectRatio;
        } else {
            height = width / aspectRatio;
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

        // Center the canvas to match the background image positioning
        const offsetX = (rect.width - width) / 2;
        const offsetY = (rect.height - height) / 2;
        AppState.canvas.style.left = offsetX + 'px';
        AppState.canvas.style.top = offsetY + 'px';

        // Update paths layer size and position
        const pathsLayer = document.getElementById('paths-layer');
        pathsLayer.setAttribute('width', width);
        pathsLayer.setAttribute('height', height);
        pathsLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
        pathsLayer.style.width = width + 'px';
        pathsLayer.style.height = height + 'px';
        pathsLayer.style.left = offsetX + 'px';
        pathsLayer.style.top = offsetY + 'px';

        // Update drawing layer size and position
        const drawingLayer = document.getElementById('drawing-layer');
        drawingLayer.setAttribute('width', width);
        drawingLayer.setAttribute('height', height);
        drawingLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
        drawingLayer.style.width = width + 'px';
        drawingLayer.style.height = height + 'px';
        drawingLayer.style.left = offsetX + 'px';
        drawingLayer.style.top = offsetY + 'px';

        // Update players layer to cover full container at (0,0)
        const playersLayer = document.getElementById('players-layer');
        playersLayer.style.width = rect.width + 'px';
        playersLayer.style.height = rect.height + 'px';
        playersLayer.style.left = '0';
        playersLayer.style.top = '0';

        // Inner board-area matches the canvas position/size within the container
        const boardArea = document.getElementById('board-area');
        boardArea.style.width = width + 'px';
        boardArea.style.height = height + 'px';
        boardArea.style.left = offsetX + 'px';
        boardArea.style.top = offsetY + 'px';

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
    },

    // Draw the futsal court (now using SVG background)
    draw() {
        // Canvas is now just used for coordinate system
        // The actual court is drawn by the SVG background
        // No need to draw anything on canvas
    },

    // Convert board coordinates to screen coordinates
    boardToScreen(x, y) {
        const scaleX = AppState.canvas.width / AppState.boardWidth;
        const scaleY = AppState.canvas.height / AppState.boardHeight;

        return {
            x: x * scaleX,
            y: y * scaleY
        };
    },

    // Convert screen coordinates to board coordinates
    screenToBoard(x, y) {
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
