// Player management
const Players = {
    // Calculate if a color is bright (for text contrast)
    isBrightColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);

        // Calculate relative luminance (ITU-R BT.709)
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        // Return true if bright (luminance > 0.5)
        return luminance > 0.5;
    },

    /** Sets up player DOM layer, drag/drop, keyboard, and context-menu event listeners. */
    init() {
        this.rotationHandle = null;
        this.isRotating = false;
        this.contextMenuPlayer = null;
        this.pathUpdatePending = false; // Throttle path updates during drag
        this.render();
        this.setupEventListeners();
        this.setupRotationHandling();
    },

    // Create player arms (reusable for both board players and sidebar templates)
    createPlayerArms(playerSize, color) {
        const armsContainer = document.createElement('div');
        armsContainer.className = 'player-arms';

        const leftArm = document.createElement('div');
        leftArm.className = 'player-arm player-arm-left';
        leftArm.style.width = (playerSize) + 'px';
        leftArm.style.height = (playerSize * 0.15) + 'px';
        leftArm.style.backgroundColor = color;

        const rightArm = document.createElement('div');
        rightArm.className = 'player-arm player-arm-right';
        rightArm.style.width = (playerSize) + 'px';
        rightArm.style.height = (playerSize * 0.15) + 'px';
        rightArm.style.backgroundColor = color;

        armsContainer.appendChild(leftArm);
        armsContainer.appendChild(rightArm);

        return armsContainer;
    },

    /** Clears and re-creates all player DOM elements from AppState.players. Called after every state change. */
    render() {
        const container = document.getElementById('board-area');

        // Safety check: don't render if container doesn't exist yet
        if (!container) {
            return;
        }

        // Clear existing player elements, names, and touch overlays
        container.querySelectorAll('.player').forEach(el => el.remove());
        container.querySelectorAll('.player-name').forEach(el => el.remove());
        container.querySelectorAll('.touch-overlay[data-player-id]').forEach(el => el.remove());

        // Remove debug boxes for players
        document.querySelectorAll('.debug-tolerance-box[data-debug-type="player"]').forEach(box => box.remove());

        // Add current players
        AppState.players.forEach(player => {
            // Clamp position to board bounds
            player.x = Math.max(0, Math.min(AppState.boardWidth, player.x));
            player.y = Math.max(0, Math.min(AppState.boardHeight, player.y));

            if (player.visible) {
                // Check if we should hide unchanged objects
                if (AppState.showOnlyChangedObjects && AppState.isChildBoard() && !AppState.isAnimating) {
                    const parentPos = AppState.parentPlayerPositions[player.id];
                    if (parentPos) {
                        // Check if position or rotation has changed
                        const posChanged = Math.abs(player.x - parentPos.x) > 1 || Math.abs(player.y - parentPos.y) > 1;
                        const rotChanged = Math.abs((player.rotation || 0) - (parentPos.rotation || 0)) > 1;

                        // Skip rendering if nothing changed
                        if (!posChanged && !rotChanged) {
                            return;
                        }
                    }
                }

                const element = this.createPlayerElement(player);
                container.appendChild(element);

                // DEBUG: Show bounding box for player
                if (typeof Utils !== 'undefined') {
                    Utils.showDebugBox(player.id, 'player');
                }

                // Add a larger transparent hit area in touch mode
                if (document.body.classList.contains('touch-mode')) {
                    const pos = Board.boardToScreen(player.x, player.y);
                    const overlay = document.createElement('div');
                    overlay.className = 'touch-overlay';
                    overlay.style.left = pos.x + 'px';
                    overlay.style.top  = pos.y + 'px';
                    overlay.style.zIndex = '150'; // Player overlay = visual z-index (50) + 100
                    overlay.style.pointerEvents = 'auto';
                    overlay.dataset.playerId = player.id;
                    container.appendChild(overlay);
                }
            }
        });

        // Update rotation handle if a player is selected (but not during active rotation)
        if (!this.isRotating) {
            this.updateRotationHandle();
        }

        // Update parent paths if on child board
        if (typeof Animations !== 'undefined') {
            Animations.renderParentPaths();
        }
    },

    // Create player DOM element
    createPlayerElement(player) {
        const div = document.createElement('div');
        div.className = 'player';
        div.id = player.id;
        div.dataset.playerId = player.id;

        const team = AppState.getTeam(player.teamId);
        const color = team ? team.color : '#95a5a6';
        div.style.backgroundColor = color;

        // Calculate player size based on board scale (100 units = 100cm)
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;
        const playerSize = 100 * scaleX; // 100cm in board units

        div.style.width = playerSize + 'px';
        div.style.height = playerSize + 'px';
        div.style.zIndex = '50'; // Players visual z-index (integer)

        // Font size should scale proportionally (about 60% of player size)
        div.style.fontSize = (playerSize * 0.6) + 'px';

        // Create arms using reusable function
        const armsContainer = this.createPlayerArms(playerSize, color);

        // Show player number in a span so we can counter-rotate it
        const numberSpan = document.createElement('span');
        numberSpan.textContent = player.number || '?';
        numberSpan.className = 'player-number';

        // Set text color based on background brightness
        numberSpan.style.color = this.isBrightColor(color) ? '#000000' : '#ffffff';

        // Counter-rotate the number to keep it upright
        const rotation = player.rotation || 0;
        if (rotation !== 0) {
            numberSpan.style.transform = `rotate(${-rotation}deg)`;
            numberSpan.style.display = 'inline-block';
        }

        // Add arms first (so they render behind), then number
        div.appendChild(armsContainer);
        div.appendChild(numberSpan);

        const pos = Board.boardToScreen(player.x, player.y);
        const halfSize = playerSize / 2;
        div.style.left = (pos.x - halfSize) + 'px';
        div.style.top = (pos.y - halfSize) + 'px';

        // Apply rotation if set
        if (rotation !== 0) {
            div.style.transform = `rotate(${rotation}deg)`;
        }

        if (AppState.selectedPlayer && AppState.selectedPlayer.id === player.id) {
            div.classList.add('selected');
        }

        // Add player name if set (positioned relative to board, not player rotation)
        if (player.name) {
            const nameSpan = document.createElement('span');
            nameSpan.textContent = player.name;
            nameSpan.className = 'player-name';
            nameSpan.dataset.playerId = player.id; // Link name to player

            // Position the name based on namePosition setting (board-relative, not player-relative)
            const namePosition = player.namePosition || 'below';
            const fontSize = Math.max(playerSize * 0.25, 10); // Scale font with player size, min 10px
            nameSpan.style.fontSize = fontSize + 'px';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.fontWeight = 'bold';
            nameSpan.style.color = 'white';
            nameSpan.style.textShadow = '0 0 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)';
            nameSpan.style.pointerEvents = 'none';
            nameSpan.style.userSelect = 'none';

            // Position absolutely relative to the players-layer, not the player div
            nameSpan.style.position = 'absolute';

            const offset = playerSize * 0.6; // Distance from player center

            switch (namePosition) {
                case 'below':
                    nameSpan.style.left = (pos.x) + 'px';
                    nameSpan.style.top = (pos.y + offset) + 'px';
                    nameSpan.style.transform = 'translateX(-50%)';
                    break;
                case 'above':
                    nameSpan.style.left = (pos.x) + 'px';
                    nameSpan.style.top = (pos.y - offset) + 'px';
                    nameSpan.style.transform = 'translate(-50%, -100%)';
                    break;
                case 'left':
                    nameSpan.style.left = (pos.x - offset) + 'px';
                    nameSpan.style.top = (pos.y) + 'px';
                    nameSpan.style.transform = 'translate(-100%, -50%)';
                    break;
                case 'right':
                    nameSpan.style.left = (pos.x + offset) + 'px';
                    nameSpan.style.top = (pos.y) + 'px';
                    nameSpan.style.transform = 'translateY(-50%)';
                    break;
            }

            // Append to players-layer instead of player div so it doesn't rotate
            const playersLayer = document.getElementById('board-area');
            playersLayer.appendChild(nameSpan);
        }

        return div;
    },

    // Setup event listeners
    setupEventListeners() {
        const container = document.getElementById('board-area');
        const boardContainer = document.querySelector('.board-container');

        container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Drag and drop for adding players
        boardContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (Teams.draggedTemplate) {
                const rect = AppState.canvas.getBoundingClientRect();
                const boardX = (e.clientX - rect.left) * (AppState.boardWidth / rect.width);
                const boardY = (e.clientY - rect.top) * (AppState.boardHeight / rect.height);
                AppState.updatePositionDisplay(boardX, boardY, null, 'player');
            }
        });

        boardContainer.addEventListener('dragleave', (e) => {
            if (!e.relatedTarget || !boardContainer.contains(e.relatedTarget)) {
                AppState.hidePositionDisplay();
            }
        });

        boardContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            if (Teams.draggedTemplate) {
                // Can't add players in child boards
                if (AppState.isChildBoard()) {
                    AppState.hidePositionDisplay();
                    Utils.showMessage('Players can only be added on parent boards. Only shapes/draws can be added on child boards.', 'Cannot Add Player');
                    return;
                }

                const rect = AppState.canvas.getBoundingClientRect();
                const scaleX = AppState.canvas.width / rect.width;
                const scaleY = AppState.canvas.height / rect.height;

                const screenX = (e.clientX - rect.left) * scaleX;
                const screenY = (e.clientY - rect.top) * scaleY;

                const boardPos = Board.screenToBoard(screenX, screenY);

                // Keep within bounds (entire SVG viewBox: 0 0 4500 2500)
                boardPos.x = Math.max(20, Math.min(AppState.boardWidth - 20, boardPos.x));
                boardPos.y = Math.max(20, Math.min(AppState.boardHeight - 20, boardPos.y));

                AppState.addPlayer(Teams.draggedTemplate, boardPos.x, boardPos.y);
                this.render();
                Teams.render(); // Update the template number
            }
        });

        // Context menu for players (right-click)
        container.addEventListener('contextmenu', (e) => {
            if (!e.target) return;
            const playerEl = e.target.closest('.player');
            const playerId = playerEl?.dataset.playerId || e.target.dataset?.playerId;
            if (playerId) {
                e.preventDefault();
                const player = AppState.getPlayer(playerId);
                if (player) this.showContextMenu(e.clientX, e.clientY, player);
            }
        });

        // Context menu for players (double-click)
        container.addEventListener('dblclick', (e) => {
            if (!e.target) return;
            const playerEl = e.target.closest('.player');
            const playerId = playerEl?.dataset.playerId || e.target.dataset?.playerId;
            if (playerId) {
                e.preventDefault();
                const player = AppState.getPlayer(playerId);
                if (player) this.showContextMenu(e.clientX, e.clientY, player);
            }
        });
    },

    // Handle mouse down
    handleMouseDown(e) {
        if (AppState.currentTool !== 'select') return;

        // Prevent player selection while recording
        if (typeof Animations !== 'undefined' && Animations.isRecording) return;

        // Safety check for null target
        if (!e.target) return;

        // Support touch overlays: check for data-player-id directly on target (overlay)
        // or traverse up to find the nearest .player element
        const playerEl = e.target.closest('.player');
        const playerId = playerEl?.dataset.playerId || e.target.dataset?.playerId;
        const target = playerEl || (playerId ? document.getElementById(playerId) : null);

        if (target && playerId) {
            // In touch mode, when overlays overlap, only handle if THIS overlay is on top
            if (document.body.classList.contains('touch-mode')) {
                const topElement = document.elementFromPoint(e.clientX, e.clientY);
                // If the top element is a touch overlay but NOT this player's overlay, don't handle this click
                if (topElement && topElement.classList.contains('touch-overlay') && topElement.dataset.playerId !== playerId) {
                    return;
                }
            }

            const player = AppState.getPlayer(playerId);
            if (player) {
                const isTouchMode = document.body.classList.contains('touch-mode');
                const isAlreadySelected = AppState.selectedPlayer && AppState.selectedPlayer.id === player.id;

                // Select the player if not already selected
                if (!isAlreadySelected) {
                    AppState.selectedPlayer = player;
                    AppState.selectedElement = null;
                    AppState.selectedBall = null;
                    AppState.selectedPlate = null;
                    AppState.selectedShape = null;
                    AppState.selectedPath = null;
                    AppState.selectedGhost = null;
                    AppState.updatePositionDisplay(player.x, player.y, player, 'player');

                    const pathMenu = document.getElementById('path-context-menu');
                    if (pathMenu) pathMenu.classList.add('hidden');

                    // Render in consistent order: shapes(25) first, then players/balls/plates/elements(30)
                    // Last rendered is on top in DOM, so elements are on top when same z-index
                    if (typeof Shapes !== 'undefined') Shapes.render();
                    this.render();
                    if (typeof Balls !== 'undefined') Balls.render();
                    if (typeof Plates !== 'undefined') Plates.render();
                    if (typeof Elements !== 'undefined') Elements.render();
                    if (typeof Animations !== 'undefined') Animations.renderParentPaths();
                }

                // In touch mode: immediately start drag (skip two-tap workflow)
                // In desktop mode: start drag only on second tap (already selected)
                if (isTouchMode || isAlreadySelected) {
                    // Clear all other drag states to prevent cross-entity drag interference
                    AppState.draggedElement = null;
                    AppState.draggedShape = null;
                    AppState.draggedBall = null;
                    AppState.draggedPlate = null;
                    AppState.draggedPlayer = player;
                    AppState.updatePositionDisplay(player.x, player.y, player, 'player');

                    // Calculate drag offset to prevent jump when dragging from edge
                    // dragOffset is in screen pixels relative to canvas
                    const canvasRect = AppState.canvas.getBoundingClientRect();
                    const playerScreenPos = Board.boardToScreen(player.x, player.y);
                    AppState.dragOffset = {
                        x: e.clientX - canvasRect.left - playerScreenPos.x,
                        y: e.clientY - canvasRect.top - playerScreenPos.y
                    };

                    target.classList.add('dragging');
                }
            }
        } else {
            // Don't deselect if click missed the rotation handle slightly (always)
            // or missed the player body in touch mode
            if (AppState.selectedPlayer && (
                Utils.isNearElement(e.clientX, e.clientY, this.rotationHandle) ||
                (document.body.classList.contains('touch-mode') &&
                 Utils.isNearElement(e.clientX, e.clientY, document.getElementById(AppState.selectedPlayer.id), 30))
            )) return;

            AppState.selectedPlayer = null;
            if (!AppState.selectedElement && !AppState.selectedBall && !AppState.selectedPlate) {
                AppState.hidePositionDisplay();
            }
            this.render();
        }
    },

    // Handle mouse move
    handleMouseMove(e) {
        if (!AppState.draggedPlayer || AppState.currentTool !== 'select' || this.isRotating) return;

        e.preventDefault();

        const containerRect = document.getElementById('board-area').getBoundingClientRect();
        const canvasRect = AppState.canvas.getBoundingClientRect();

        const screenX = e.clientX - canvasRect.left - AppState.dragOffset.x;
        const screenY = e.clientY - canvasRect.top - AppState.dragOffset.y;

        const boardPos = Board.screenToBoard(screenX, screenY);

        // Keep player within bounds (entire SVG viewBox: 0 0 4500 2500)
        boardPos.x = Math.max(20, Math.min(4480, boardPos.x));
        boardPos.y = Math.max(20, Math.min(2480, boardPos.y));

        AppState.draggedPlayer.x = boardPos.x;
        AppState.draggedPlayer.y = boardPos.y;
        AppState.updatePositionDisplay(boardPos.x, boardPos.y, AppState.draggedPlayer, 'player');

        const element = document.getElementById(AppState.draggedPlayer.id);
        if (element) {
            const pos = Board.boardToScreen(boardPos.x, boardPos.y);
            // Calculate player size for proper centering
            const scaleX = canvasRect.width / AppState.boardWidth;
            const playerSize = 100 * scaleX;
            const halfSize = playerSize / 2;
            element.style.left = (pos.x - halfSize) + 'px';
            element.style.top = (pos.y - halfSize) + 'px';

            // Update player name position during drag
            const nameElement = document.querySelector(`.player-name[data-player-id="${AppState.draggedPlayer.id}"]`);
            if (nameElement && AppState.draggedPlayer.name) {
                const namePosition = AppState.draggedPlayer.namePosition || 'below';
                const offset = playerSize * 0.6;

                switch (namePosition) {
                    case 'below':
                        nameElement.style.left = (pos.x) + 'px';
                        nameElement.style.top = (pos.y + offset) + 'px';
                        break;
                    case 'above':
                        nameElement.style.left = (pos.x) + 'px';
                        nameElement.style.top = (pos.y - offset) + 'px';
                        break;
                    case 'left':
                        nameElement.style.left = (pos.x - offset) + 'px';
                        nameElement.style.top = (pos.y) + 'px';
                        break;
                    case 'right':
                        nameElement.style.left = (pos.x + offset) + 'px';
                        nameElement.style.top = (pos.y) + 'px';
                        break;
                }
            }

            // Update touch overlay position during drag (touch mode)
            if (document.body.classList.contains('touch-mode')) {
                const overlay = document.querySelector(`.touch-overlay[data-player-id="${AppState.draggedPlayer.id}"]`);
                if (overlay) {
                    overlay.style.left = pos.x + 'px';
                    overlay.style.top = pos.y + 'px';
                }
            }

            // Update debug box position during drag
            if (typeof Utils !== 'undefined') {
                Utils.updateDebugBox(AppState.draggedPlayer.id, 'player');
            }
        }

        // Update rotation handle position during drag (but not during active rotation)
        if (!this.isRotating) {
            this.updateRotationHandlePosition();
        }

        // Update parent paths during drag (throttled for performance)
        if (typeof Animations !== 'undefined') {
            if (!this.pathUpdatePending) {
                this.pathUpdatePending = true;
                requestAnimationFrame(() => {
                    Animations.renderParentPaths();
                    this.pathUpdatePending = false;
                });
            }
        }
    },

    // Handle mouse up
    handleMouseUp(e) {
        if (AppState.draggedPlayer) {
            const element = document.getElementById(AppState.draggedPlayer.id);
            if (element) {
                element.classList.remove('dragging');
            }
            const player = AppState.draggedPlayer;

            // Mark as explicitly set in child board
            if (AppState.isChildBoard()) {
                player._explicitlySet = true;
            }

            AppState.draggedPlayer = null;
            // Keep position display visible if player is still selected
            if (AppState.selectedPlayer && AppState.selectedPlayer.id === player.id) {
                AppState.updatePositionDisplay(player.x, player.y, player, 'player');
            } else {
                AppState.hidePositionDisplay();
            }

            // Final path update after drag ends
            if (typeof Animations !== 'undefined') {
                Animations.renderParentPaths();
            }

            AppState.saveToLocalStorage();
        }
    },

    // Setup rotation handling
    setupRotationHandling() {
        document.addEventListener('mousemove', (e) => {
            if (this.isRotating && AppState.selectedPlayer) {
                e.preventDefault();
                this.handleRotationMove(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isRotating) {
                this.isRotating = false;

                // Mark as explicitly set in child board
                if (AppState.selectedPlayer && AppState.isChildBoard()) {
                    AppState.selectedPlayer._explicitlySet = true;
                }

                AppState.saveToLocalStorage();
                AppState.hidePositionDisplay();
            }
        });
    },

    // Update rotation handle position (lightweight - just moves it, doesn't recreate)
    updateRotationHandlePosition() {
        if (!this.rotationHandle || !AppState.selectedPlayer) return;

        const player = AppState.selectedPlayer;
        const pos = Board.boardToScreen(player.x, player.y);

        const handleDistance = 50;
        const rotation = (player.rotation || 0) * Math.PI / 180;

        const handleX = pos.x + Math.cos(rotation - Math.PI / 2) * handleDistance;
        const handleY = pos.y + Math.sin(rotation - Math.PI / 2) * handleDistance;

        const handleSize = 28;

        this.rotationHandle.style.left = (handleX - handleSize / 2) + 'px';
        this.rotationHandle.style.top = (handleY - handleSize / 2) + 'px';
    },

    // Update rotation handle position
    updateRotationHandle() {
        // Remove existing handle
        if (this.rotationHandle) {
            this.rotationHandle.remove();
            this.rotationHandle = null;
        }

        // Only show handle if a player is selected
        if (AppState.selectedPlayer && AppState.currentTool === 'select') {
            const player = AppState.selectedPlayer;
            const pos = Board.boardToScreen(player.x, player.y);

            const handleDistance = 50;
            const rotation = (player.rotation || 0) * Math.PI / 180;

            const handleX = pos.x + Math.cos(rotation - Math.PI / 2) * handleDistance;
            const handleY = pos.y + Math.sin(rotation - Math.PI / 2) * handleDistance;

            const handleSize = 28;

            // Create rotation handle
            this.rotationHandle = document.createElement('div');
            this.rotationHandle.className = 'rotation-handle';
            this.rotationHandle.style.width = handleSize + 'px';
            this.rotationHandle.style.height = handleSize + 'px';
            this.rotationHandle.style.left = (handleX - handleSize / 2) + 'px';
            this.rotationHandle.style.top = (handleY - handleSize / 2) + 'px';

            // Add event listener
            this.rotationHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.isRotating = true;
                AppState.draggedPlayer = null;
                AppState.updatePositionDisplay(player.x, player.y, player, 'player');
            });

            const container = document.getElementById('board-area');
            container.appendChild(this.rotationHandle);
        }
    },

    // Handle rotation movement
    handleRotationMove(e) {
        const player = AppState.selectedPlayer;
        if (!player) return;

        const pos = Board.boardToScreen(player.x, player.y);
        const canvasRect = AppState.canvas.getBoundingClientRect();

        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        // Calculate angle
        const angle = Math.atan2(mouseY - pos.y, mouseX - pos.x);
        const degrees = (angle * 180 / Math.PI) + 90;

        // Normalize to 0-360
        player.rotation = ((degrees % 360) + 360) % 360;

        // Update display
        AppState.updatePositionDisplay(player.x, player.y, player, 'player');

        // Update rotation handle position (lightweight update)
        this.updateRotationHandlePosition();

        // Update debug box during rotation
        if (typeof Utils !== 'undefined') {
            Utils.updateDebugBox(player.id, 'player');
        }

        // Re-render
        this.render();
    },

    // Show context menu
    showContextMenu(x, y, player) {
        // Set menu open time for Elements module's mouseup handler
        if (typeof Elements !== 'undefined') {
            Elements.menuOpenTime = Date.now();
            Elements.menuVisible = true;
        }

        this.contextMenuPlayer = player;
        const menu = document.getElementById('element-context-menu');

        // Clear other contexts
        if (typeof Elements !== 'undefined') {
            Elements.contextMenuElement = null;
        }
        if (typeof Balls !== 'undefined') {
            Balls.contextMenuBall = null;
        }
        if (typeof Plates !== 'undefined') {
            Plates.contextMenuPlate = null;
        }

        // Remove custom menu items added by other modules before cloning
        const customItems = menu.querySelectorAll('[data-action="edit-text"], [data-action="size"], [data-action="reset"]');
        customItems.forEach(item => item.remove());

        // Clone menu first for modifications
        const menuCopy = menu.cloneNode(true);
        menu.parentNode.replaceChild(menuCopy, menu);

        menuCopy.classList.remove('hidden');

        // Hide lock menu item for players (in the copy)
        const lockItem = menuCopy.querySelector('[data-action="lock"]');
        if (lockItem) {
            lockItem.style.display = 'none';
        }

        // Add "Set Name" and "Edit Number" menu items for players (after color, before divider)
        const colorItem = menuCopy.querySelector('[data-action="color"]');
        if (colorItem) {
            // Only add if not already present
            if (!menuCopy.querySelector('[data-action="name"]')) {
                const nameItem = document.createElement('div');
                nameItem.className = 'context-menu-item';
                nameItem.dataset.action = 'name';
                nameItem.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Set Name
                `;
                colorItem.parentNode.insertBefore(nameItem, colorItem.nextSibling);
            }

            if (!menuCopy.querySelector('[data-action="number"]')) {
                const nameItem = menuCopy.querySelector('[data-action="name"]');
                const numberItem = document.createElement('div');
                numberItem.className = 'context-menu-item';
                numberItem.dataset.action = 'number';
                numberItem.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="4" y1="9" x2="20" y2="9"/>
                        <line x1="4" y1="15" x2="20" y2="15"/>
                        <line x1="10" y1="3" x2="8" y2="21"/>
                        <line x1="16" y1="3" x2="14" y2="21"/>
                    </svg>
                    Edit Number
                `;
                if (nameItem) {
                    nameItem.parentNode.insertBefore(numberItem, nameItem.nextSibling);
                }
            }
        }

        // Add "Reset" menu item for child boards (after position, before remove divider)
        const isChildBoard = AppState.isChildBoard();
        if (isChildBoard && AppState.parentPlayerPositions[player.id]) {
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
            const isInheritedFromParent = isChildBoard && AppState.parentPlayerPositions[player.id] !== undefined;
            if (action === 'remove' && isInheritedFromParent) {
                item.classList.add('disabled');
            } else if ((action === 'color' || action === 'number') && isChildBoard) {
                item.classList.add('disabled');
            } else if (action === 'reset') {
                // Disable reset if player position hasn't changed from parent
                const parentPos = AppState.parentPlayerPositions[player.id];
                const isUnmodified = parentPos &&
                                     player.x === parentPos.x &&
                                     player.y === parentPos.y &&
                                     (player.rotation || 0) === (parentPos.rotation || 0);
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
            if (!item || !this.contextMenuPlayer) return;

            // Always hide menu first, even if item is disabled
            menuCopy.classList.add('hidden');
            menuCopy.style.display = 'none';
            const player = this.contextMenuPlayer;
            this.contextMenuPlayer = null;

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
                    // Can't remove players inherited from parent board
                    if (AppState.isChildBoard() && AppState.parentPlayerPositions[player.id] !== undefined) return;
                    // Clear rotation handle and selection before render so
                    // updateRotationHandle() doesn't recreate it for the deleted player
                    if (this.rotationHandle) {
                        this.rotationHandle.remove();
                        this.rotationHandle = null;
                    }
                    AppState.selectedPlayer = null;
                    AppState.hidePositionDisplay();
                    AppState.removePlayer(player.id);
                    this.render();
                    if (typeof Teams !== 'undefined') {
                        Teams.render(); // Update the template number
                    }
                    break;
                case 'position':
                    this.showPositionDialog(player);
                    break;
                case 'color':
                    // Can't change color in child boards
                    if (AppState.isChildBoard()) return;
                    this.showColorDialog(player);
                    break;
                case 'name':
                    this.showNameDialog(player);
                    break;
                case 'number':
                    // Can't change number in child boards
                    if (AppState.isChildBoard()) return;
                    this.showNumberDialog(player);
                    break;
                case 'reset':
                    this.resetToParent(player);
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

    // Show color dialog for player
    showColorDialog(player) {
        // Can't change color in child boards
        if (AppState.isChildBoard()) return;

        this.contextMenuPlayer = player;

        const team = AppState.getTeam(player.teamId);
        const currentColor = team ? team.color : '#95a5a6';
        document.getElementById('element-color-picker').value = currentColor;

        // Override the confirm button handler temporarily
        const confirmBtn = document.getElementById('btn-confirm-color');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const color = document.getElementById('element-color-picker').value;
            // Update the team color
            if (team) {
                team.color = color;
                AppState.saveToLocalStorage();
                this.render();
                if (typeof Teams !== 'undefined') {
                    Teams.render(); // Update sidebar template number color
                }
            }

            document.getElementById('element-color-modal').classList.add('hidden');

            // Restore original handler if needed
            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        Utils.openModal('element-color-modal');
    },

    // Show position dialog for player
    showPositionDialog(player) {
        // Reuse the element position dialog
        Elements.contextMenuElement = player;

        // Convert board coordinates to pitch coordinates
        const pitchX = Math.round(player.x - AppState.pitchOffsetX);
        const pitchY = Math.round(player.y - AppState.pitchOffsetY);
        const rotation = Math.round(player.rotation || 0);

        document.getElementById('element-pos-x').value = pitchX;
        document.getElementById('element-pos-y').value = pitchY;
        document.getElementById('element-rotation').value = rotation;

        // Always show rotation group for players
        const rotationGroup = document.getElementById('rotation-group');
        rotationGroup.style.display = 'block';

        // Store initial values for rounding logic
        Elements.positionInitialValues = { x: pitchX, y: pitchY, rotation: rotation };

        // Override the confirm button handler temporarily
        const confirmBtn = document.getElementById('btn-confirm-position');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const pitchX = parseInt(document.getElementById('element-pos-x').value);
            const pitchY = parseInt(document.getElementById('element-pos-y').value);
            const rotation = parseInt(document.getElementById('element-rotation').value);

            if (isNaN(pitchX) || isNaN(pitchY)) {
                Utils.showMessage('Please enter valid numbers for X and Y position.', 'Invalid Position');
                return;
            }

            player.x = Math.max(0, Math.min(AppState.boardWidth, pitchX + AppState.pitchOffsetX));
            player.y = Math.max(0, Math.min(AppState.boardHeight, pitchY + AppState.pitchOffsetY));
            player.rotation = ((rotation % 360) + 360) % 360;

            // Mark as explicitly set in child board
            if (AppState.isChildBoard()) {
                player._explicitlySet = true;
            }

            AppState.updatePositionDisplay(player.x, player.y, player, 'player');
            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('element-position-modal').classList.add('hidden');

            // Restore original handler
            Elements.setupContextMenu();
        });

        Utils.openModal('element-position-modal');
    },

    // Show name dialog for player
    showNameDialog(player) {
        this.contextMenuPlayer = player;

        document.getElementById('player-name-input').value = player.name || '';
        document.getElementById('player-name-position').value = player.namePosition || 'below';

        // Override the confirm button handler temporarily
        const confirmBtn = document.getElementById('btn-confirm-player-name');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const name = document.getElementById('player-name-input').value.trim();
            const position = document.getElementById('player-name-position').value;

            player.name = name;
            player.namePosition = position;

            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('player-name-modal').classList.add('hidden');
        });

        // Override cancel button
        const cancelBtn = document.getElementById('btn-cancel-player-name');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newCancelBtn.addEventListener('click', () => {
            document.getElementById('player-name-modal').classList.add('hidden');
        });

        // Override remove button
        const removeBtn = document.getElementById('btn-remove-player-name');
        const newRemoveBtn = removeBtn.cloneNode(true);
        removeBtn.parentNode.replaceChild(newRemoveBtn, removeBtn);

        newRemoveBtn.addEventListener('click', () => {
            // Remove the name (delete property so it can inherit from parent if in child board)
            delete player.name;
            delete player.namePosition;

            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('player-name-modal').classList.add('hidden');
        });

        Utils.openModal('player-name-modal');
        document.getElementById('player-name-input').focus();
    },

    // Show number dialog for player
    showNumberDialog(player) {
        this.contextMenuPlayer = player;

        document.getElementById('player-number-input').value = player.number || 1;

        // Override the confirm button handler temporarily
        const confirmBtn = document.getElementById('btn-player-number-ok');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const rawValue = document.getElementById('player-number-input').value.trim();
            // Allow '00' as a special jersey number, or integers 1-99
            const newNumber = rawValue === '00' ? '00' : parseInt(rawValue);

            if (rawValue !== '00' && (!newNumber || newNumber < 1 || newNumber > 99)) {
                Utils.showMessage('Please enter a valid number between 1 and 99, or 00', 'Invalid Number');
                return;
            }

            // Check if the number is already taken by another player on the same team
            const isNumberTaken = AppState.players.some(p =>
                p.id !== player.id &&
                p.teamId === player.teamId &&
                p.number === newNumber
            );

            if (isNumberTaken) {
                Utils.showMessage('This number is already used by another player on this team', 'Number Already Taken');
                return;
            }

            // Release the old number back to the pool
            const oldNumber = player.number;
            if (oldNumber && AppState.teamPlayerNumbers[player.teamId]) {
                const index = AppState.teamPlayerNumbers[player.teamId].indexOf(oldNumber);
                if (index > -1) {
                    AppState.teamPlayerNumbers[player.teamId].splice(index, 1);
                }
            }

            // Set the new number
            player.number = newNumber;

            // Mark the new number as used
            if (!AppState.teamPlayerNumbers[player.teamId]) {
                AppState.teamPlayerNumbers[player.teamId] = [];
            }
            if (!AppState.teamPlayerNumbers[player.teamId].includes(newNumber)) {
                AppState.teamPlayerNumbers[player.teamId].push(newNumber);
            }

            AppState.saveToLocalStorage();
            this.render();
            if (typeof Teams !== 'undefined') {
                Teams.render(); // Update the template number
            }

            document.getElementById('player-number-modal').classList.add('hidden');
        });

        // Override cancel button
        const cancelBtn = document.getElementById('btn-cancel-player-number');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newCancelBtn.addEventListener('click', () => {
            document.getElementById('player-number-modal').classList.add('hidden');
        });

        Utils.openModal('player-number-modal');
        document.getElementById('player-number-input').focus();
        document.getElementById('player-number-input').select();
    },

    // Reset player to parent position and rotation by removing from current board
    resetToParent(player) {
        const parentPos = AppState.parentPlayerPositions[player.id];
        if (!parentPos) {
            Utils.showMessage('No parent position available for this player', 'Cannot Reset');
            return;
        }

        // Remove the player from the current board so it falls back to parent's version
        const currentBoard = AppState.boards.find(b => b.id === AppState.currentBoardId);
        if (currentBoard) {
            currentBoard.players = (currentBoard.players || []).filter(p => p.id !== player.id);

            // Also remove any path intermediates for this player
            const pathKey = `player-${player.id}`;
            if (currentBoard.pathIntermediates && currentBoard.pathIntermediates[pathKey]) {
                delete currentBoard.pathIntermediates[pathKey];
            }
        }

        // Reload the board to refresh the inherited state
        AppState.loadBoard(AppState.currentBoardId);
        AppState.saveToLocalStorage();

        // Re-render all components
        this.render();
        if (typeof Balls !== 'undefined') {
            Balls.render();
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
    }

};
