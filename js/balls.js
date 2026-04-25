// Balls module - handles ball elements (always draggable, no selection needed)
const Balls = {
    layer: null,
    ballSvgs: {},
    ballColors: [
        { name: 'White', color: 'white' },
        { name: 'Yellow', color: '#FFD700' },
        { name: 'Orange', color: '#FF6B35' },
        { name: 'Blue', color: '#3498DB' },
        { name: 'Red', color: '#E74C3C' }
    ],

    /** Sets up ball DOM layer, drag/drop, and context-menu event listeners. */
    init() {
        this.layer = document.getElementById('board-area');
        this.contextMenuBall = null;
        this.setupBallContainer();
        this.setupInteractions();
        this.setupContextMenu();
        // Update ball template sizes to match board scale
        this.updateBallTemplatesSizes();
    },

    // Update ball template sizes to match board scale
    updateBallTemplatesSizes() {
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;

        // Ball is 60cm
        const size = Math.max(60 * scaleX, 20); // minimum 20px for visibility

        document.querySelectorAll('.ball-template svg').forEach(svg => {
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
        });
    },

    // Setup ball container with draggable templates
    setupBallContainer() {
        const container = document.getElementById('ball-container');
        const boardContainer = document.querySelector('.board-container');

        this.ballColors.forEach((ballColor, index) => {
            // Wrap SVG in a div to make dragging more reliable
            const wrapper = document.createElement('div');
            wrapper.classList.add('ball-template');
            wrapper.draggable = true;
            wrapper.title = ballColor.name + ' Ball';
            wrapper.dataset.ballcolor = ballColor.color;

            const svg = this.createBallTemplate(ballColor.color);
            wrapper.appendChild(svg);

            // Track if dragging is happening
            let isDragging = false;

            // Drag start
            wrapper.addEventListener('dragstart', (e) => {
                isDragging = true;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', ballColor.color);
                e.dataTransfer.setData('ballColor', ballColor.color);

                // Set drag image centered at cursor (half width/height as offset)
                const halfSize = parseInt(svg.getAttribute('width')) / 2;
                e.dataTransfer.setDragImage(svg, halfSize, halfSize);
            });

            wrapper.addEventListener('dragend', (e) => {
                // Reset dragging flag after a short delay
                setTimeout(() => { isDragging = false; }, 100);
            });

            // Click event to add ball at free position
            wrapper.addEventListener('click', (e) => {
                if (isDragging) return; // Don't trigger if user was dragging
                if (e.detail === 0) return; // Ignore programmatic clicks

                // Can't add balls in child boards
                if (AppState.isChildBoard()) {
                    Utils.showMessage('Balls can only be added on parent boards. Only shapes/draws can be added on child boards.', 'Cannot Add Ball');
                    return;
                }

                const freePos = AppState.findFreePosition(250);
                AppState.addBall(ballColor.color, freePos.x, freePos.y);

                // saveToHistory already called by saveToLocalStorage in addBall
                Balls.render();
            });

            container.appendChild(wrapper);
        });

        // Setup drop zone on board
        const handleBoardDragOver = (e) => {
            // Check if this is a ball being dragged by checking for ballColor data type
            const hasBallData = e.dataTransfer.types.includes('ballcolor');

            if (hasBallData) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                const canvasRect = AppState.canvas.getBoundingClientRect();
                const boardX = (e.clientX - canvasRect.left) * (AppState.boardWidth / canvasRect.width);
                const boardY = (e.clientY - canvasRect.top) * (AppState.boardHeight / canvasRect.height);
                AppState.updatePositionDisplay(boardX, boardY, null, 'ball');
            }
        };

        const handleBoardDragLeave = (e) => {
            if (!e.relatedTarget || !boardContainer.contains(e.relatedTarget)) {
                AppState.hidePositionDisplay();
            }
        };

        const handleBoardDrop = (e) => {
            const ballColor = e.dataTransfer.getData('ballColor') ||
                             e.dataTransfer.getData('text/plain');


            // Check if it's a valid ball color AND has ballcolor type (not platecolor)
            const validColors = ['white', '#FFD700', '#FF6B35', '#3498DB', '#E74C3C'];
            if (ballColor && validColors.includes(ballColor) && e.dataTransfer.types.includes('ballcolor')) {
                e.preventDefault();
                e.stopPropagation();

                // Can't add balls in child boards
                if (AppState.isChildBoard()) {
                    AppState.hidePositionDisplay();
                    Utils.showMessage('Balls can only be added on parent boards. Only shapes/draws can be added on child boards.', 'Cannot Add Ball');
                    return;
                }

                // Get drop position relative to board
                const canvasRect = AppState.canvas.getBoundingClientRect();
                const scaleX = AppState.boardWidth / canvasRect.width;
                const scaleY = AppState.boardHeight / canvasRect.height;

                let boardX = (e.clientX - canvasRect.left) * scaleX;
                let boardY = (e.clientY - canvasRect.top) * scaleY;

                // Keep within board bounds
                boardX = Math.max(0, Math.min(AppState.boardWidth, boardX));
                boardY = Math.max(0, Math.min(AppState.boardHeight, boardY));


                // Create ball at drop position
                AppState.addBall(ballColor, boardX, boardY);
                this.render();
            }
        };

        boardContainer.addEventListener('dragover', handleBoardDragOver, true);
        boardContainer.addEventListener('dragleave', handleBoardDragLeave, true);
        boardContainer.addEventListener('drop', handleBoardDrop, true);
    },

    // Create ball template SVG (sized to match board appearance)
    createBallTemplate(color) {
        // Calculate size based on board scale
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;

        // Ball is 80cm (20cm * 4)
        const size = Math.max(20 * scaleX * 4, 30); // minimum 30px for visibility

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', '0 0 100 100');

        const content = this.createBallSVG(color);
        svg.innerHTML = content;

        return svg;
    },

    // Setup ball interactions (always draggable)
    setupInteractions() {
        this.layer.addEventListener('mousedown', (e) => {
            if (AppState.currentTool !== 'select') return;

            // Find the ball ID by traversing up the DOM tree
            const ballId = Utils.findEntityId(e.target, this.layer, 'ball');

            if (ballId) {
                const ball = AppState.getBall(ballId);
                if (ball) {
                    // Check if ball is already selected
                    if (AppState.selectedBall && AppState.selectedBall.id === ball.id) {
                        // Already selected, prepare to drag
                        AppState.draggedBall = ball;
                        AppState.updatePositionDisplay(ball.x, ball.y, ball, 'ball');

                        const rect = AppState.canvas.getBoundingClientRect();
                        const scaleX = AppState.boardWidth / rect.width;
                        const scaleY = AppState.boardHeight / rect.height;

                        AppState.dragOffset = {
                            x: (e.clientX - rect.left) * scaleX - ball.x,
                            y: (e.clientY - rect.top) * scaleY - ball.y
                        };
                    } else {
                        // Not selected yet, just select it
                        AppState.selectedBall = ball;
                        AppState.selectedElement = null;
                        AppState.selectedPlayer = null;
                        AppState.selectedPlate = null;
                        AppState.selectedShape = null;
                        AppState.selectedPath = null;
                        AppState.selectedGhost = null;
                        AppState.updatePositionDisplay(ball.x, ball.y, ball, 'ball');

                        // Hide path context menu when selecting a ball
                        const pathMenu = document.getElementById('path-context-menu');
                        if (pathMenu) {
                            pathMenu.classList.add('hidden');
                        }

                        // Re-render to show selection
                        this.render();
                        if (typeof Elements !== 'undefined') {
                            Elements.render();
                        }
                        if (typeof Players !== 'undefined') {
                            Players.render();
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

                    e.preventDefault();
                    e.stopPropagation();
                }
            } else {
                // Clicked on empty space - deselect ball
                if (AppState.selectedBall) {
                    AppState.selectedBall = null;
                    if (!AppState.selectedElement && !AppState.selectedPlayer && !AppState.selectedPlate) {
                        AppState.hidePositionDisplay();
                    }
                    this.render();
                }
            }
        });

        Utils.setupEntityDrag({
            dragKey: 'draggedBall',
            selectedKey: 'selectedBall',
            type: 'ball',
            updateDOM(el, x, y, pxW, pxH) {
                const pxX = x * (pxW / AppState.boardWidth);
                const pxY = y * (pxH / AppState.boardHeight);
                const w = 60 * (pxW / AppState.boardWidth);
                const h = 60 * (pxH / AppState.boardHeight);
                el.style.left = pxX + 'px';
                el.style.top  = pxY + 'px';
                el.style.transform = `translate(${-w/2}px, ${-h/2}px)`;
            },
            afterMove() {
                if (typeof Animations !== 'undefined') Animations.renderParentPaths();
            },
            onDrop(ball) {
                if (AppState.isChildBoard()) ball._explicitlySet = true;
            }
        });

        // Context menu for balls (right-click)
        this.layer.addEventListener('contextmenu', (e) => {
            const ballId = Utils.findEntityId(e.target, this.layer, 'ball');

            if (ballId) {
                e.preventDefault();
                const ball = AppState.getBall(ballId);
                if (ball) {
                    this.showContextMenu(e.clientX, e.clientY, ball);
                }
            }
        });

        // Context menu for balls (double-click)
        this.layer.addEventListener('dblclick', (e) => {
            const ballId = Utils.findEntityId(e.target, this.layer, 'ball');

            if (ballId) {
                e.preventDefault();
                const ball = AppState.getBall(ballId);
                if (ball) {
                    this.showContextMenu(e.clientX, e.clientY, ball);
                }
            }
        });

        // Touch events are globally converted to mouse events in app.js
    },

    // Setup context menu handlers
    setupContextMenu() {
        // Menu click handling is done in showContextMenu by temporarily replacing handlers
        // to avoid conflicts with Elements context menu
    },

    // Show context menu
    showContextMenu(x, y, ball) {
        // Set menu open time for Elements module's mouseup handler
        if (typeof Elements !== 'undefined') {
            Elements.menuOpenTime = Date.now();
            Elements.menuVisible = true;
        }

        this.contextMenuBall = ball;
        const menu = document.getElementById('element-context-menu');

        // Clear element context
        if (typeof Elements !== 'undefined') {
            Elements.contextMenuElement = null;
        }

        // Remove custom menu items added by other modules
        const customItems = menu.querySelectorAll('[data-action="name"], [data-action="number"], [data-action="edit-text"], [data-action="size"], [data-action="reset"]');
        customItems.forEach(item => item.remove());

        // Clone menu first for modifications
        const menuCopy = menu.cloneNode(true);
        menu.parentNode.replaceChild(menuCopy, menu);

        menuCopy.classList.remove('hidden');

        // Hide lock menu item for balls (in the copy)
        const lockItem = menuCopy.querySelector('[data-action="lock"]');
        if (lockItem) {
            lockItem.style.display = 'none';
        }

        // Add "Reset" menu item for child boards (after position, before remove divider)
        const isChildBoard = AppState.isChildBoard();
        if (isChildBoard && AppState.parentBallPositions[ball.id]) {
            const positionItem = menuCopy.querySelector('[data-action="position"]');
            if (positionItem && !menuCopy.querySelector('[data-action="reset"]')) {
                const resetItem = document.createElement('div');
                resetItem.className = 'context-menu-item';
                resetItem.dataset.action = 'reset';
                resetItem.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="1 4 1 10 7 10"/>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                    Reset to Parent
                `;
                positionItem.parentNode.insertBefore(resetItem, positionItem.nextSibling);
            }
        }

        // Disable menu options based on board state
        const menuItems = menuCopy.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            const action = item.dataset.action;
            const isInheritedFromParent = isChildBoard && AppState.parentBallPositions[ball.id] !== undefined;
            if (action === 'remove' && isInheritedFromParent) {
                item.classList.add('disabled');
            } else if (action === 'color' && isChildBoard) {
                item.classList.add('disabled');
            } else if (action === 'reset') {
                // Disable reset if ball position hasn't changed from parent
                const parentPos = AppState.parentBallPositions[ball.id];
                const isUnmodified = parentPos &&
                                     ball.x === parentPos.x &&
                                     ball.y === parentPos.y;
                if (isUnmodified) {
                    item.classList.add('disabled');
                } else {
                    item.classList.remove('disabled');
                }
            } else {
                item.classList.remove('disabled');
            }
        });

        // Position menu after all items are added so the full height is measured correctly
        Utils.positionContextMenu(menuCopy, x, y);

        menuCopy.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item || !this.contextMenuBall) return;

            // Always hide menu first, even if item is disabled
            menuCopy.classList.add('hidden');
            menuCopy.style.display = 'none';
            const ball = this.contextMenuBall;
            this.contextMenuBall = null;

            // Restore Elements menu handler
            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }

            // Don't execute if item is disabled
            if (item.classList.contains('disabled')) {
                return;
            }

            const action = item.dataset.action;

            switch (action) {
                case 'remove':
                    // Can't remove balls inherited from parent board
                    if (AppState.isChildBoard() && AppState.parentBallPositions[ball.id] !== undefined) return;
                    AppState.removeBall(ball.id);
                    this.render();
                    break;
                case 'position':
                    this.showPositionDialog(ball);
                    break;
                case 'color':
                    // Can't change color in child boards
                    if (AppState.isChildBoard()) return;
                    this.showColorDialog(ball);
                    break;
                case 'reset':
                    this.resetToParent(ball);
                    break;
            }
        });

        // Hide menu when clicking outside or losing focus
        const hideHandler = () => {
            menuCopy.classList.add('hidden');
            menuCopy.style.display = 'none';
            document.removeEventListener('click', hideHandler);
            window.removeEventListener('blur', hideHandler);
        };
        setTimeout(() => {
            document.addEventListener('click', hideHandler);
            window.addEventListener('blur', hideHandler);
        }, 0);
    },

    // Show position dialog
    showPositionDialog(ball) {
        this.contextMenuBall = ball;

        // Convert board coordinates to pitch coordinates
        const pitchX = Math.round(ball.x - AppState.pitchOffsetX);
        const pitchY = Math.round(ball.y - AppState.pitchOffsetY);

        document.getElementById('element-pos-x').value = pitchX;
        document.getElementById('element-pos-y').value = pitchY;

        // Hide rotation group for balls
        const rotationGroup = document.getElementById('rotation-group');
        rotationGroup.style.display = 'none';

        // Store initial values for rounding logic
        if (typeof Elements !== 'undefined') {
            Elements.positionInitialValues = { x: pitchX, y: pitchY };
        }

        // Override the confirm button handler temporarily
        const confirmBtn = document.getElementById('btn-confirm-position');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const pitchX = parseInt(document.getElementById('element-pos-x').value);
            const pitchY = parseInt(document.getElementById('element-pos-y').value);

            if (isNaN(pitchX) || isNaN(pitchY)) {
                Utils.showMessage('Please enter valid numbers for X and Y position.', 'Invalid Position');
                return;
            }

            ball.x = Math.max(0, Math.min(AppState.boardWidth, pitchX + AppState.pitchOffsetX));
            ball.y = Math.max(0, Math.min(AppState.boardHeight, pitchY + AppState.pitchOffsetY));

            // Mark as explicitly set in child board
            if (AppState.isChildBoard()) {
                ball._explicitlySet = true;
            }

            AppState.updatePositionDisplay(ball.x, ball.y, ball, 'ball');
            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('element-position-modal').classList.add('hidden');

            // Restore original handler
            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        Utils.openModal('element-position-modal');
    },

    // Show color dialog
    showColorDialog(ball) {
        // Can't change color in child boards
        if (AppState.isChildBoard()) return;

        this.contextMenuBall = ball;

        const currentColor = ball.color || 'white';
        document.getElementById('element-color-picker').value = currentColor;

        // Override the confirm button handler temporarily
        const confirmBtn = document.getElementById('btn-confirm-color');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const color = document.getElementById('element-color-picker').value;
            ball.color = color;

            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('element-color-modal').classList.add('hidden');

            // Restore original handler if needed
            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        Utils.openModal('element-color-modal');
    },

    // Reset ball to parent position by removing from current board
    resetToParent(ball) {
        const parentPos = AppState.parentBallPositions[ball.id];
        if (!parentPos) {
            Utils.showMessage('No parent position available for this ball', 'Cannot Reset');
            return;
        }

        // Remove the ball from the current board so it falls back to parent's version
        const currentBoard = AppState.boards.find(b => b.id === AppState.currentBoardId);
        if (currentBoard) {
            currentBoard.balls = (currentBoard.balls || []).filter(b => b.id !== ball.id);

            // Also remove any path intermediates for this ball
            const pathKey = `ball-${ball.id}`;
            if (currentBoard.pathIntermediates && currentBoard.pathIntermediates[pathKey]) {
                delete currentBoard.pathIntermediates[pathKey];
            }
        }

        // Reload the board to refresh the inherited state
        AppState.loadBoard(AppState.currentBoardId);
        AppState.saveToLocalStorage();

        // Re-render all components
        this.render();
        if (typeof Players !== 'undefined') {
            Players.render();
        }
        if (typeof Elements !== 'undefined') {
            Elements.render();
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
    },

    /** Clears and re-creates all ball DOM elements from AppState.balls. */
    render() {
        // Safety check: don't render if layer is not initialized yet
        if (!this.layer) {
            return;
        }


        // Clear ALL ball SVGs from the DOM (not just tracked ones)
        this.layer.querySelectorAll('.ball-svg').forEach(svg => {
            svg.remove();
        });
        this.ballSvgs = {};

        // Render each ball
        AppState.balls.forEach(ball => {
            if (ball.visible) {
                // Check if we should hide unchanged objects
                if (AppState.showOnlyChangedObjects && AppState.isChildBoard() && !AppState.isAnimating) {
                    const parentPos = AppState.parentBallPositions[ball.id];
                    if (parentPos) {
                        // Check if position has changed
                        const posChanged = Math.abs(ball.x - parentPos.x) > 1 || Math.abs(ball.y - parentPos.y) > 1;

                        // Skip rendering if nothing changed
                        if (!posChanged) {
                            return;
                        }
                    }
                }

                this.renderBall(ball);
            }
        });

        // Update parent paths if on child board
        if (typeof Animations !== 'undefined') {
            Animations.renderParentPaths();
        }

    },

    // Render individual ball
    renderBall(ball) {
        const svg = this.createBallElementSvg(ball);
        if (svg) {
            this.layer.appendChild(svg);
            this.ballSvgs[ball.id] = svg;
        } else {
            console.error('Failed to create SVG for ball:', ball);
        }
    },

    // Create SVG for ball on board
    createBallElementSvg(ball) {
        const canvasRect = AppState.canvas.getBoundingClientRect();

        // Scale based on actual rendered canvas size
        const scaleX = canvasRect.width / AppState.boardWidth;
        const scaleY = canvasRect.height / AppState.boardHeight;

        // Position relative to players-layer (which is already positioned to match canvas)
        const x = ball.x * scaleX;
        const y = ball.y * scaleY;

        // Ball is 60cm diameter
        const width = 60 * scaleX;
        const height = 60 * scaleY;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'ball-svg');

        // Add selected class if this ball is selected
        if (AppState.selectedBall && AppState.selectedBall.id === ball.id) {
            svg.classList.add('ball-selected');
        }

        svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.position = 'absolute';
        svg.style.left = x + 'px';
        svg.style.top = y + 'px';
        svg.style.overflow = 'visible';
        svg.style.pointerEvents = 'all';
        svg.style.cursor = 'default';
        svg.style.setProperty('cursor', 'default', 'important');
        svg.style.touchAction = 'none';
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.style.transform = `translate(${-width/2}px, ${-height/2}px)`;
        svg.id = ball.id; // Use ID for fast lookup, consistent with players
        svg.dataset.ball = ball.id; // Keep data attribute for compatibility

        // Add transparent background rect for clickability
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', '0');
        bgRect.setAttribute('y', '0');
        bgRect.setAttribute('width', '100');
        bgRect.setAttribute('height', '100');
        bgRect.setAttribute('fill', 'transparent');
        bgRect.style.pointerEvents = 'all';

        const content = this.createBallSVG(ball.color);
        svg.innerHTML = content;
        svg.insertBefore(bgRect, svg.firstChild);

        return svg;
    },

    // SVG content for ball with color
    createBallSVG(color) {
        return `
            <g transform="translate(0, 0) scale(0.105, 0.105)">
                <circle r="476" cx="476" cy="476" fill="${color}" />
                <path d="M813 139A475 475 0 000 476a474 474 0 00476 476 474 474 0 00476-476 474 474 0 00-139-337zm-600-31l12-10a457 457 0 01370-60c-14 6-33 18-65 45a393 393 0 00-182 22c-31 11-55 23-71 33l-74-25c3 1 8-4 10-5zm433 119l-81 222-196 37-161-166c11-76 63-143 63-143s34-25 88-44a403 403 0 01174-20l113 114zM39 460c-5 32-6 66-3 100l-9-20a451 451 0 0136-252c-3 30-2 61 0 85-11 28-19 57-24 87zm40 173a418 418 0 018-239c33-28 77-44 101-52l158 164-16 179-155 52c-39-29-72-68-96-104zm470 260c-34 22-121 28-157 29a451 451 0 01-200-92c0-1-4-49-4-66l156-52 181 78 25 103h-1zm300-158c-27 38-59 75-98 102-36 25-85 34-128 41-3 1-44 8-45 6l-25-103 128-132 168-15 8 89-8 12zm3-135l-2 3-168 16-90-158 82-223 115 7a366 366 0 01118 169 434 434 0 01-55 186zm60-250a396 396 0 00-108-131c-5-25-19-65-57-107l2 2 7 5a459 459 0 01156 230v1z"
                      fill="#000" opacity="1"/>
            </g>
        `;
    }
};
