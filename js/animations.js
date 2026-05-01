// Animation management
const Animations = {
    startTime: null,

    /** Sets up animation panel buttons, play controls, and download event listeners. */
    init() {
        this.setupEventListeners();
        this.setupPathContextMenu();
        this.setupGhostDragging();
        this.setupPathSelection();
        this.setupAnimationOverlayDragging();
        this.contextMenuPath = null; // Track which path's context menu is open
        this.draggedGhost = null; // Track dragged ghost
        this.rotatingGhost = null; // Track rotating ghost
        this.rotationUpdatePending = false; // Throttle rotation renders
        this.lastGhostClickTime = 0; // Track for double-click detection
        this.lastGhostClickId = null; // Track which ghost was clicked
        this.animationChainPlayers = {}; // Full animation chain for players
        this.animationChainBalls = {}; // Full animation chain for balls
        this.animationPhaseCount = 1; // Number of board transitions
        this.animationPhaseSpeeds = []; // Per-phase playback speeds
        this.animationPhaseDurations = []; // Real ms duration per phase
        this.animationTotalRealDuration = 0; // Sum of all phase durations in ms
        this.isRecording = false; // Track if recording animation
        this.pausedProgress = 0; // Track progress when paused for resume

        // Sync breadcrumb checkbox with persisted state
        document.getElementById('show-board-breadcrumb').checked = AppState.showBoardBreadcrumb;

        // Set initial FPS display
        document.getElementById('fps-value').textContent = AppState.animationFPS;

        // Set initial speed dropdown value
        const speedDropdown = document.getElementById('animation-speed-dropdown');
        const durationValue = String(AppState.animationDuration);
        // Check if the value exists in the dropdown options
        const hasMatchingOption = Array.from(speedDropdown.options).some(opt => opt.value === durationValue);
        if (hasMatchingOption) {
            speedDropdown.value = durationValue;
        } else {
            // Fallback to default 2000ms if no match
            speedDropdown.value = '2000';
            AppState.animationDuration = 2000;
        }

        // Set initial frame speed dropdown value
        this.updateFrameSpeedUI();
    },

    // Update frame speed dropdown to match current board's playback speed
    updateFrameSpeedUI() {
        const dropdown = document.getElementById('frame-speed-dropdown');
        if (dropdown) {
            const speed = AppState.playbackSpeed !== undefined ? AppState.playbackSpeed : 1.0;
            dropdown.value = speed.toFixed(1);
        }
    },

    // Setup event listeners
    setupEventListeners() {
        document.getElementById('btn-go-to-start').addEventListener('click', () => this.goToStart());
        document.getElementById('btn-play-pause').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('btn-play-frame').addEventListener('click', () => this.playFrame());
        document.getElementById('btn-stop').addEventListener('click', () => this.goToFrameEnd());

        // Setup animation quality menu
        this.setupAnimationMenu();

        // FPS buttons
        const fpsOptions = [5, 10, 15, 20, 25, 30];
        document.querySelectorAll('.fps-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                let currentIndex = fpsOptions.indexOf(AppState.animationFPS);

                if (currentIndex === -1) {
                    currentIndex = 2; // Default to 15 FPS if not found
                }

                if (action === 'increase') {
                    currentIndex = Math.min(fpsOptions.length - 1, currentIndex + 1);
                } else {
                    currentIndex = Math.max(0, currentIndex - 1);
                }

                AppState.animationFPS = fpsOptions[currentIndex];
                document.getElementById('fps-value').textContent = AppState.animationFPS;
            });
        });

        // Animation bar speed dropdown
        document.getElementById('animation-speed-dropdown').addEventListener('change', (e) => {
            const newDuration = parseInt(e.target.value);
            AppState.animationDuration = newDuration;
        });

        // Frame speed dropdown (board-specific playback speed)
        document.getElementById('frame-speed-dropdown').addEventListener('change', (e) => {
            const newSpeed = parseFloat(e.target.value);
            AppState.playbackSpeed = newSpeed;
            AppState.saveToLocalStorage();
        });

        // Animation bar toggle buttons
        document.getElementById('btn-toggle-paths').addEventListener('click', (e) => {
            e.preventDefault();
            AppState.animationShowPathsAnimation = !AppState.animationShowPathsAnimation;
            e.currentTarget.classList.toggle('active', AppState.animationShowPathsAnimation);
            document.getElementById('animation-show-paths-animation').checked = AppState.animationShowPathsAnimation;
            if (AppState.isAnimating) {
                this.renderParentPaths(false, this.getCurrentProgress());
            }
        });

        document.getElementById('btn-toggle-path-labels').addEventListener('click', (e) => {
            e.preventDefault();
            AppState.animationShowPathLabelsAnimation = !AppState.animationShowPathLabelsAnimation;
            e.currentTarget.classList.toggle('active', AppState.animationShowPathLabelsAnimation);
            document.getElementById('animation-show-path-labels-animation').checked = AppState.animationShowPathLabelsAnimation;
            if (AppState.isAnimating) {
                this.renderParentPaths(false, this.getCurrentProgress());
            }
        });

        document.getElementById('btn-toggle-remove-paths').addEventListener('click', (e) => {
            e.preventDefault();
            AppState.animationRemovePathAfterFrame = !AppState.animationRemovePathAfterFrame;
            e.currentTarget.classList.toggle('active', AppState.animationRemovePathAfterFrame);
            document.getElementById('animation-remove-path-after-frame').checked = AppState.animationRemovePathAfterFrame;
            if (AppState.isAnimating) {
                this.renderParentPaths(false, this.getCurrentProgress());
            }
        });

        document.getElementById('btn-toggle-ghosts').addEventListener('click', (e) => {
            e.preventDefault();
            AppState.animationShowGhostsAnimation = !AppState.animationShowGhostsAnimation;
            e.currentTarget.classList.toggle('active', AppState.animationShowGhostsAnimation);
            document.getElementById('animation-show-ghosts-animation').checked = AppState.animationShowGhostsAnimation;
            if (AppState.isAnimating) {
                this.renderParentPaths(false, this.getCurrentProgress());
            }
        });

        document.getElementById('btn-toggle-repeat').addEventListener('click', (e) => {
            e.preventDefault();
            AppState.animationRepeat = !AppState.animationRepeat;
            e.currentTarget.classList.toggle('active', AppState.animationRepeat);
            document.getElementById('animation-repeat').checked = AppState.animationRepeat;
        });

        // Show paths toggle
        document.getElementById('animation-show-paths').addEventListener('change', (e) => {
            AppState.animationShowPaths = e.target.checked;
            // Update visibility immediately if not animating
            if (!AppState.isAnimating) {
                this.updatePathsVisibility();
            }
        });

        // Show all paths toggle
        document.getElementById('animation-show-all-paths').addEventListener('change', (e) => {
            AppState.animationShowAllPaths = e.target.checked;
            // Update visibility immediately if not animating
            if (!AppState.isAnimating) {
                this.updatePathsVisibility();
            }
        });

        // Show all ghosts toggle
        document.getElementById('animation-show-all-ghosts').addEventListener('change', (e) => {
            AppState.animationShowAllGhosts = e.target.checked;
            // Update visibility immediately if not animating
            if (!AppState.isAnimating) {
                this.updatePathsVisibility();
            }
        });

        // Show paths during animation toggle
        document.getElementById('animation-show-paths-animation').addEventListener('change', (e) => {
            AppState.animationShowPathsAnimation = e.target.checked;
            document.getElementById('btn-toggle-paths').classList.toggle('active', e.target.checked);
            // Update visibility immediately if animating
            if (AppState.isAnimating) {
                this.renderParentPaths(false, this.getCurrentProgress());
            }
        });

        // Show ghosts on board toggle
        document.getElementById('animation-show-ghosts-board').addEventListener('change', (e) => {
            AppState.animationShowGhostsBoard = e.target.checked;
            // Update visibility immediately if not animating
            if (!AppState.isAnimating) {
                this.renderParentPaths();
            }
        });

        // Show ghosts during animation toggle
        document.getElementById('animation-show-ghosts-animation').addEventListener('change', (e) => {
            AppState.animationShowGhostsAnimation = e.target.checked;
            document.getElementById('btn-toggle-ghosts').classList.toggle('active', e.target.checked);
            // Update visibility immediately if animating
            if (AppState.isAnimating) {
                this.renderParentPaths(false, this.getCurrentProgress());
            }
        });

        // Show path labels toggle
        document.getElementById('animation-show-path-labels').addEventListener('change', (e) => {
            AppState.animationShowPathLabels = e.target.checked;
            // Update visibility immediately if not animating
            if (!AppState.isAnimating) {
                this.renderParentPaths();
            }
        });

        // Show path labels during animation toggle
        document.getElementById('animation-show-path-labels-animation').addEventListener('change', (e) => {
            AppState.animationShowPathLabelsAnimation = e.target.checked;
            document.getElementById('btn-toggle-path-labels').classList.toggle('active', e.target.checked);
            // Update visibility immediately if animating
            if (AppState.isAnimating) {
                this.renderParentPaths(false, this.getCurrentProgress());
            }
        });

        // Show board breadcrumb toggle
        document.getElementById('show-board-breadcrumb').addEventListener('change', (e) => {
            Breadcrumb.setVisible(e.target.checked);
        });

        // Show only changed objects toggle
        document.getElementById('show-only-changed-objects').addEventListener('change', (e) => {
            AppState.showOnlyChangedObjects = e.target.checked;

            // Deselect all items when toggling this option
            AppState.selectedPlayer = null;
            AppState.selectedBall = null;
            AppState.selectedElement = null;
            AppState.selectedPlate = null;
            AppState.selectedShape = null;
            AppState.selectedPath = null;
            AppState.selectedGhost = null;
            AppState.hidePositionDisplay();

            // Update visibility immediately if not animating
            if (!AppState.isAnimating) {
                Players.render();
                Balls.render();
                if (typeof Elements !== 'undefined') {
                    Elements.render();
                }
                if (typeof Plates !== 'undefined') {
                    Plates.render();
                }
                if (typeof Shapes !== 'undefined') {
                    Shapes.render();
                }
                this.renderParentPaths();
            }
        });

        // Remove path after frame toggle
        document.getElementById('animation-remove-path-after-frame').addEventListener('change', (e) => {
            AppState.animationRemovePathAfterFrame = e.target.checked;
            document.getElementById('btn-toggle-remove-paths').classList.toggle('active', e.target.checked);
            // Update visibility immediately if animating
            if (AppState.isAnimating) {
                this.renderParentPaths(false, this.getCurrentProgress());
            }
        });

        // Repeat toggle
        document.getElementById('animation-repeat').addEventListener('change', (e) => {
            AppState.animationRepeat = e.target.checked;
            document.getElementById('btn-toggle-repeat').classList.toggle('active', e.target.checked);
        });

        // Crop video toggle
        document.getElementById('animation-crop-video').addEventListener('change', (e) => {
            AppState.animationCropVideo = e.target.checked;
        });

        // Path color picker
        document.getElementById('path-color-picker').addEventListener('input', (e) => {
            AppState.pathColor = e.target.value;
            // Update visibility immediately
            this.updatePathsVisibility();
        });

        // Path opacity buttons
        document.querySelectorAll('.opacity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                let currentOpacity = Math.round(AppState.pathOpacity * 100);

                if (action === 'increase') {
                    currentOpacity = Math.min(100, currentOpacity + 5);
                } else {
                    currentOpacity = Math.max(0, currentOpacity - 5);
                }

                AppState.pathOpacity = currentOpacity / 100;
                document.getElementById('path-opacity-value').textContent = currentOpacity + '%';
                // Update visibility immediately
                this.updatePathsVisibility();
            });
        });

        // Progress bar click and dot drag → seek to position
        const progressContainer = document.getElementById('animation-progress-container');
        const progressDot = document.getElementById('animation-progress-dot');
        if (progressContainer) {
            const getFraction = (clientX) => {
                const rect = progressContainer.getBoundingClientRect();
                return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            };

            // Click anywhere on the bar
            progressContainer.addEventListener('click', (e) => {
                // Ignore clicks that were part of a drag (dot mouseup fires click too)
                if (this._progressDragging) return;
                this.seekTo(getFraction(e.clientX));
            });

            // Mouse drag on the dot
            if (progressDot) {
                progressDot.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this._progressDragging = true;
                    progressDot.classList.add('dragging');

                    const onMove = (ev) => {
                        this.seekTo(getFraction(ev.clientX));
                    };
                    const onUp = () => {
                        this._progressDragging = false;
                        progressDot.classList.remove('dragging');
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                    };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });

                // Touch drag on the dot (mobile support)
                progressDot.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this._progressDragging = true;
                    progressDot.classList.add('dragging');

                    const onMove = (ev) => {
                        if (ev.touches.length === 1) {
                            this.seekTo(getFraction(ev.touches[0].clientX));
                        }
                    };
                    const onEnd = () => {
                        this._progressDragging = false;
                        progressDot.classList.remove('dragging');
                        document.removeEventListener('touchmove', onMove);
                        document.removeEventListener('touchend', onEnd);
                    };
                    document.addEventListener('touchmove', onMove, { passive: false });
                    document.addEventListener('touchend', onEnd);
                }, { passive: false });
            }
        }

        // Click on board area (outside animation bar) to go to frame end
        const boardContainer = document.querySelector('.board-container');
        if (boardContainer) {
            const shouldGoToFrameEnd = (target) => {
                const animationBar = document.getElementById('animation-player-overlay');
                if (animationBar && animationBar.contains(target)) return false;
                const hasAnimationChain = Object.keys(this.animationChainPlayers).length > 0;
                return AppState.isAnimating || (hasAnimationChain && this.pausedProgress < 1);
            };

            boardContainer.addEventListener('click', (e) => {
                if (shouldGoToFrameEnd(e.target)) this.goToFrameEnd();
            });

            // Touch devices: the global touchend calls preventDefault() which suppresses
            // the browser's synthetic click, so we handle touch taps separately.
            let boardTouchStartX = 0;
            let boardTouchStartY = 0;
            boardContainer.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    boardTouchStartX = e.touches[0].clientX;
                    boardTouchStartY = e.touches[0].clientY;
                }
            }, { passive: true });
            boardContainer.addEventListener('touchend', (e) => {
                if (this.draggedGhost || this.rotatingGhost) return;
                if (e.changedTouches.length !== 1) return;
                const t = e.changedTouches[0];
                const dx = Math.abs(t.clientX - boardTouchStartX);
                const dy = Math.abs(t.clientY - boardTouchStartY);
                if (dx > 10 || dy > 10) return; // drag, not a tap
                const target = document.elementFromPoint(t.clientX, t.clientY);
                if (shouldGoToFrameEnd(target)) this.goToFrameEnd();
            }, { passive: true });
        }
    },

    // Setup dragging for the animation player overlay
    setupAnimationOverlayDragging() {
        const overlay = document.getElementById('animation-player-overlay');
        if (!overlay) return;

        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        // Load saved position from localStorage
        const savedPosition = localStorage.getItem('animationOverlayPosition');
        if (savedPosition) {
            try {
                const { x, y } = JSON.parse(savedPosition);
                overlay.style.left = `${x}px`;
                overlay.style.top = `${y}px`;
                overlay.style.transform = 'none';
            } catch (e) {
                console.error('Failed to load overlay position:', e);
            }
        }

        // Helper to check if target is draggable area (drag handle only)
        const isDraggableArea = (target) => {
            // Only allow drag on the drag handle
            if (target.classList && target.classList.contains('drag-handle')) return true;
            // Also check if parent is drag handle (for the SVG inside)
            if (target.parentElement && target.parentElement.classList.contains('drag-handle')) return true;
            return false;
        };

        // Mouse events
        overlay.addEventListener('mousedown', (e) => {
            // Only start drag if clicking on draggable area
            if (!isDraggableArea(e.target)) {
                return;
            }

            isDragging = true;
            const rect = overlay.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            overlay.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const boardContainer = document.querySelector('.board-container');
            const containerRect = boardContainer.getBoundingClientRect();

            let x = e.clientX - containerRect.left - dragOffsetX;
            let y = e.clientY - containerRect.top - dragOffsetY;

            // Keep overlay within board bounds
            const overlayRect = overlay.getBoundingClientRect();
            const maxX = containerRect.width - overlayRect.width;
            const maxY = containerRect.height - overlayRect.height;

            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));

            overlay.style.left = `${x}px`;
            overlay.style.top = `${y}px`;
            overlay.style.transform = 'none';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                overlay.style.cursor = '';

                // Save position to localStorage
                const rect = overlay.getBoundingClientRect();
                const boardContainer = document.querySelector('.board-container');
                const containerRect = boardContainer.getBoundingClientRect();
                const position = {
                    x: rect.left - containerRect.left,
                    y: rect.top - containerRect.top
                };
                localStorage.setItem('animationOverlayPosition', JSON.stringify(position));
            }
        });

        // Touch events
        overlay.addEventListener('touchstart', (e) => {
            // Only start drag if touching draggable area
            if (!isDraggableArea(e.target)) {
                return;
            }

            if (e.touches.length !== 1) return;

            isDragging = true;
            const touch = e.touches[0];
            const rect = overlay.getBoundingClientRect();
            dragOffsetX = touch.clientX - rect.left;
            dragOffsetY = touch.clientY - rect.top;
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length !== 1) return;

            const touch = e.touches[0];
            const boardContainer = document.querySelector('.board-container');
            const containerRect = boardContainer.getBoundingClientRect();

            let x = touch.clientX - containerRect.left - dragOffsetX;
            let y = touch.clientY - containerRect.top - dragOffsetY;

            // Keep overlay within board bounds
            const overlayRect = overlay.getBoundingClientRect();
            const maxX = containerRect.width - overlayRect.width;
            const maxY = containerRect.height - overlayRect.height;

            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));

            overlay.style.left = `${x}px`;
            overlay.style.top = `${y}px`;
            overlay.style.transform = 'none';

            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;

                // Save position to localStorage
                const rect = overlay.getBoundingClientRect();
                const boardContainer = document.querySelector('.board-container');
                const containerRect = boardContainer.getBoundingClientRect();
                const position = {
                    x: rect.left - containerRect.left,
                    y: rect.top - containerRect.top
                };
                localStorage.setItem('animationOverlayPosition', JSON.stringify(position));
            }
        });
    },

    // Build animation chain from board ancestry
    buildAnimationChain(boardChain) {
        this.animationChainPlayers = {};
        this.animationChainBalls = {};
        this.animationChainIntermediates = {}; // Store intermediates for each board transition
        this.animationChainBoardId = AppState.currentBoardId; // Track which board this chain was built for

        // Build merged state for each board in the chain (like loadBoard does)
        const mergedStates = [];

        boardChain.forEach((board, index) => {
            let mergedPlayers = [];
            let mergedBalls = [];

            // Start from root and merge up to this board
            for (let i = 0; i <= index; i++) {
                const ancestorBoard = boardChain[i];

                // Merge players
                const boardPlayers = ancestorBoard.players || [];
                boardPlayers.forEach(player => {
                    const existingIndex = mergedPlayers.findIndex(p => p.id === player.id);
                    if (existingIndex >= 0) {
                        mergedPlayers[existingIndex] = { ...player };
                    } else {
                        mergedPlayers.push({ ...player });
                    }
                });

                // Merge balls
                const boardBalls = ancestorBoard.balls || [];
                boardBalls.forEach(ball => {
                    const existingIndex = mergedBalls.findIndex(b => b.id === ball.id);
                    if (existingIndex >= 0) {
                        mergedBalls[existingIndex] = { ...ball };
                    } else {
                        mergedBalls.push({ ...ball });
                    }
                });
            }

            mergedStates.push({
                players: mergedPlayers,
                balls: mergedBalls,
                pathIntermediates: board.pathIntermediates || {} // Store intermediates from this board
            });
        });

        // Now extract positions for each player across all boards
        AppState.players.forEach(player => {
            const positions = [];
            mergedStates.forEach((state, index) => {
                // For the last board in the chain (current board), use current AppState positions
                // This ensures we get the latest positions even if they haven't been saved to the board yet
                const isCurrentBoard = index === boardChain.length - 1;

                if (isCurrentBoard) {
                    // Use current position from AppState
                    positions.push({
                        x: player.x,
                        y: player.y,
                        rotation: player.rotation || 0
                    });
                } else {
                    // Use saved position from board state
                    const playerInState = state.players.find(p => p.id === player.id);
                    if (playerInState && playerInState.x !== undefined && playerInState.y !== undefined) {
                        positions.push({
                            x: playerInState.x,
                            y: playerInState.y,
                            rotation: playerInState.rotation || 0
                        });
                    } else if (positions.length > 0) {
                        // Player existed before, use last known position
                        positions.push({ ...positions[positions.length - 1] });
                    } else {
                        // Player doesn't exist yet, push undefined as placeholder
                        positions.push(undefined);
                    }
                }
            });

            // Backfill undefined positions at the start with first valid position
            if (positions.length > 0) {
                const firstValidIndex = positions.findIndex(p => p !== undefined && p.x !== undefined && p.y !== undefined);
                if (firstValidIndex > 0) {
                    const firstPosition = positions[firstValidIndex];
                    for (let i = 0; i < firstValidIndex; i++) {
                        positions[i] = { ...firstPosition };
                    }
                }
                this.animationChainPlayers[player.id] = positions;
            }
        });

        // Extract positions for each ball across all boards
        AppState.balls.forEach(ball => {
            const positions = [];
            mergedStates.forEach((state, index) => {
                // For the last board in the chain (current board), use current AppState positions
                const isCurrentBoard = index === boardChain.length - 1;

                if (isCurrentBoard) {
                    // Use current position from AppState
                    positions.push({
                        x: ball.x,
                        y: ball.y
                    });
                } else {
                    // Use saved position from board state
                    const ballInState = state.balls.find(b => b.id === ball.id);
                    if (ballInState && ballInState.x !== undefined && ballInState.y !== undefined) {
                        positions.push({
                            x: ballInState.x,
                            y: ballInState.y
                        });
                    } else if (positions.length > 0) {
                        // Ball existed before, use last known position
                        positions.push({ ...positions[positions.length - 1] });
                    } else {
                        // Ball doesn't exist yet, push undefined as placeholder
                        positions.push(undefined);
                    }
                }
            });

            // Backfill undefined positions at the start with first valid position
            if (positions.length > 0) {
                const firstValidIndex = positions.findIndex(p => p !== undefined && p.x !== undefined && p.y !== undefined);
                if (firstValidIndex > 0) {
                    const firstPosition = positions[firstValidIndex];
                    for (let i = 0; i < firstValidIndex; i++) {
                        positions[i] = { ...firstPosition };
                    }
                }
                this.animationChainBalls[ball.id] = positions;
            }
        });

        // Store intermediates for each board transition
        boardChain.forEach((board, index) => {
            const boardIntermediates = board.pathIntermediates || {};
            Object.keys(boardIntermediates).forEach(key => {
                if (!this.animationChainIntermediates[key]) {
                    this.animationChainIntermediates[key] = [];
                }
                // Store intermediates for this transition (index represents the transition TO this board)
                this.animationChainIntermediates[key][index] = boardIntermediates[key];
            });
        });

        // Per-phase speed: phase i is the transition from boardChain[i] → boardChain[i+1],
        // so it runs at the speed saved on boardChain[i+1] (the child board).
        this.animationPhaseSpeeds = boardChain.slice(1).map(b =>
            (b.playbackSpeed !== undefined ? b.playbackSpeed : 1.0)
        );
        this.animationPhaseDurations = this.animationPhaseSpeeds.map(s =>
            AppState.animationDuration / s
        );
        this.animationTotalRealDuration = this.animationPhaseDurations.reduce((sum, d) => sum + d, 0);
    },

    // Convert normalized progress [0,1] to real elapsed milliseconds.
    normalizedToRealMs(normalizedProgress) {
        const N = this.animationPhaseCount;
        if (!this.animationPhaseDurations || this.animationPhaseDurations.length === 0) {
            return normalizedProgress * AppState.animationDuration * N;
        }
        const phaseRaw = normalizedProgress * N;
        const phase = Math.min(Math.floor(phaseRaw), N - 1);
        const progressInPhase = phaseRaw - phase;
        let realMs = 0;
        for (let i = 0; i < phase; i++) {
            realMs += this.animationPhaseDurations[i];
        }
        realMs += progressInPhase * (this.animationPhaseDurations[phase] || 0);
        return realMs;
    },

    // Convert real elapsed milliseconds to normalized progress [0,1].
    realMsToNormalized(elapsedMs) {
        const N = this.animationPhaseCount;
        if (!this.animationPhaseDurations || this.animationPhaseDurations.length === 0) {
            return Math.min(elapsedMs / (AppState.animationDuration * N), 1);
        }
        const total = this.animationTotalRealDuration;
        if (total <= 0) return 1;
        let remaining = Math.min(elapsedMs, total);
        for (let i = 0; i < N; i++) {
            const phaseDur = this.animationPhaseDurations[i] || 0;
            if (remaining <= phaseDur || i === N - 1) {
                const progressInPhase = phaseDur > 0 ? Math.min(remaining / phaseDur, 1) : 1;
                return Math.min((i + progressInPhase) / N, 1);
            }
            remaining -= phaseDur;
        }
        return 1;
    },

    // Toggle play/pause
    togglePlayPause() {
        if (AppState.isAnimating) {
            this.pause();
        } else {
            this.play();
        }
    },

    // Update play/pause button state
    updatePlayPauseButton(isPlaying) {
        const btn = document.getElementById('btn-play-pause');
        const playIcon = btn.querySelector('.play-icon');
        const pauseIcon = btn.querySelector('.pause-icon');
        const playText = btn.querySelector('.play-text');
        const pauseText = btn.querySelector('.pause-text');

        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            if (playText) playText.style.display = 'none';
            if (pauseText) pauseText.style.display = 'inline';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            if (playText) playText.style.display = 'inline';
            if (pauseText) pauseText.style.display = 'none';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        }
    },

    // Play only the current frame (parent to current board)
    playFrame() {
        if (AppState.isAnimating) return;

        // Don't animate if not on a child board
        if (!AppState.isChildBoard()) {
            Utils.showMessage('Animation only works on child boards with parent positions.', 'Cannot Animate');
            return;
        }

        // Build a single-frame chain (just parent -> current)
        const currentBoard = AppState.boards.find(b => b.id === AppState.currentBoardId);
        const parentBoard = AppState.boards.find(b => b.id === currentBoard.parentId);

        if (!parentBoard) {
            Utils.showMessage('Cannot find parent board.', 'Cannot Animate');
            return;
        }

        // Build single-frame animation chain
        this.buildAnimationChain([parentBoard, currentBoard]);

        // If animation was completed (pausedProgress >= 1), start fresh
        if (this.pausedProgress >= 1) {
            this.pausedProgress = 0;
        }

        // Save current positions as end positions (only if starting fresh)
        if (this.pausedProgress === 0) {
            AppState.saveCurrentPositions();
        }

        this.animationPhaseCount = 1; // Only one transition

        // If resuming from paused state, adjust startTime and set positions to paused progress
        if (this.pausedProgress > 0) {
            // Set startTime to simulate we started earlier
            this.startTime = performance.now() - this.normalizedToRealMs(this.pausedProgress);

            // Set positions to the paused progress
            this.animatePlayersAlongChain(this.pausedProgress);
            this.renderParentPaths(false, this.pausedProgress);
        } else {
            // Starting fresh - move players and balls to parent positions
            AppState.players.forEach(player => {
                const startPos = this.animationChainPlayers[player.id]?.[0];
                if (startPos) {
                    player.x = startPos.x;
                    player.y = startPos.y;
                    player.rotation = startPos.rotation || 0;
                }
            });

            AppState.balls.forEach(ball => {
                const startPos = this.animationChainBalls[ball.id]?.[0];
                if (startPos) {
                    ball.x = startPos.x;
                    ball.y = startPos.y;
                }
            });

            // Render at start positions
            Players.render();
            Balls.render();

            this.startTime = performance.now();
        }

        AppState.isAnimating = true;

        this.updatePlayPauseButton(true);

        // Add animating class to players
        document.querySelectorAll('.player').forEach(p => p.classList.add('animating'));

        this.animate();
    },

    // Play animation (full chain from root to current)
    play() {
        if (AppState.isAnimating) return;

        // Don't animate if not on a child board
        if (!AppState.isChildBoard()) {
            Utils.showMessage('Animation only works on child boards with parent positions.', 'Cannot Animate');
            return;
        }

        // Get the full board ancestry chain
        const boardChain = AppState.getBoardAncestryChain();
        if (boardChain.length < 2) {
            Utils.showMessage('Animation requires at least one parent board.', 'Cannot Animate');
            return;
        }

        // Build the full animation chain with positions from each board
        this.buildAnimationChain(boardChain);

        // If animation was completed (pausedProgress >= 1), start fresh
        if (this.pausedProgress >= 1) {
            this.pausedProgress = 0;
        }

        // Save current positions as end positions (only if starting fresh)
        if (this.pausedProgress === 0) {
            AppState.saveCurrentPositions();
        }

        this.animationPhaseCount = boardChain.length - 1; // Number of transitions

        // If resuming from paused state, adjust startTime and set positions to paused progress
        if (this.pausedProgress > 0) {
            // Set startTime to simulate we started earlier
            this.startTime = performance.now() - this.normalizedToRealMs(this.pausedProgress);

            // Set positions to the paused progress
            this.animatePlayersAlongChain(this.pausedProgress);
            this.renderParentPaths(false, this.pausedProgress);
        } else {
            // Starting fresh - move players and balls to the root board positions
            AppState.players.forEach(player => {
                const startPos = this.animationChainPlayers[player.id]?.[0];
                if (startPos) {
                    player.x = startPos.x;
                    player.y = startPos.y;
                    player.rotation = startPos.rotation || 0;
                }
            });

            AppState.balls.forEach(ball => {
                const startPos = this.animationChainBalls[ball.id]?.[0];
                if (startPos) {
                    ball.x = startPos.x;
                    ball.y = startPos.y;
                }
            });

            // Render at start positions
            Players.render();
            Balls.render();

            this.startTime = performance.now();
        }

        AppState.isAnimating = true;

        this.updatePlayPauseButton(true);

        // Add animating class to players
        document.querySelectorAll('.player').forEach(p => p.classList.add('animating'));

        this.animate();
    },

    // Pause animation
    pause() {
        // Save current progress before pausing
        if (AppState.isAnimating && this.startTime) {
            const now = performance.now();
            const elapsed = now - this.startTime;
            this.pausedProgress = this.realMsToNormalized(elapsed);
        }

        AppState.isAnimating = false;

        if (AppState.animationFrame) {
            cancelAnimationFrame(AppState.animationFrame);
            AppState.animationFrame = null;
        }

        this.updatePlayPauseButton(false);

        // Remove animating class
        document.querySelectorAll('.player').forEach(p => p.classList.remove('animating'));

        // Final render to ensure clean state and show ghosts again
        Players.render();
        Balls.render();
        // Preserve the animation state by passing the paused progress
        this.renderParentPaths(false, this.pausedProgress);
    },

    // Go to frame end - pause and restore to end positions
    goToFrameEnd() {
        this.pause();

        // Go to end of animation
        this.pausedProgress = 1;

        // Restore original positions (saved at animation start, i.e. end positions)
        AppState.restorePositions();

        // Re-render
        Players.render();
        Balls.render();
        // Re-render paths at end state (progress = 1 means full path with arrow)
        this.renderParentPaths();

        this.updateProgressBar(1);
        this.lastProgressBoardId = AppState.currentBoardId;
    },

    // Stop animation (backwards compatibility - calls goToFrameEnd)
    stop() {
        this.goToFrameEnd();
    },

    // Go to frame start - move to parent board positions (start of current frame)
    goToStart() {
        // Check if we had an animation chain before (to know if we should update progress bar)
        const hadAnimationChain = Object.keys(this.animationChainPlayers).length > 0;

        this.pause();

        // Don't animate if not on a child board
        if (!AppState.isChildBoard()) {
            return;
        }

        // Get the board ancestry chain up to current board
        const boardChain = AppState.getBoardAncestryChain();
        if (boardChain.length < 2) {
            return;
        }

        // Build the animation chain for the current view (up to current board)
        this.buildAnimationChain(boardChain);

        // Move players and balls to the PARENT board positions (frame start)
        // Parent is at index boardChain.length - 2 (second to last in the chain)
        const parentIndex = boardChain.length - 2;

        AppState.players.forEach(player => {
            const parentPos = this.animationChainPlayers[player.id]?.[parentIndex];
            if (parentPos) {
                player.x = parentPos.x;
                player.y = parentPos.y;
                player.rotation = parentPos.rotation || 0;
                // Clear _explicitlySet flag so this temporary position doesn't get saved
                // when navigating to another board via breadcrumb
                delete player._explicitlySet;
            }
        });

        AppState.balls.forEach(ball => {
            const parentPos = this.animationChainBalls[ball.id]?.[parentIndex];
            if (parentPos) {
                ball.x = parentPos.x;
                ball.y = parentPos.y;
                // Clear _explicitlySet flag so this temporary position doesn't get saved
                delete ball._explicitlySet;
            }
        });

        // Render at parent (frame start) positions
        Players.render();
        Balls.render();
        this.renderParentPaths(false, 0);

        // Calculate progress position based on current board's depth in hierarchy
        // Formula: (depth - 1) / depth
        // Examples:
        //   - Child (depth 1): (1-1)/1 = 0%
        //   - Grandchild (depth 2): (2-1)/2 = 50%
        //   - Great-grandchild (depth 3): (2/3) = 66.67%
        const depth = boardChain.length - 1; // Current board's depth (0 = root)
        const progressPosition = depth > 0 ? (depth - 1) / depth : 0;

        // Update paused progress and progress bar
        this.pausedProgress = progressPosition;
        this.updateProgressBar(progressPosition);
        this.lastProgressBoardId = AppState.currentBoardId;
    },

    // Reset animation (backwards compatibility - calls stop)
    reset() {
        this.stop();
    },

    // Update the scrubber / progress bar fill width and dot position (0–1)
    updateProgressBar(progress) {
        const pct = (progress * 100) + '%';
        const fill = document.getElementById('animation-progress-fill');
        if (fill) fill.style.width = pct;
        const dot = document.getElementById('animation-progress-dot');
        if (dot) dot.style.left = pct;
    },

    // Update progress bar to show current board's position in visible hierarchy
    updateProgressBarForCurrentBoard() {
        if (!AppState.isChildBoard()) {
            // On root board, progress is always 0
            this.pausedProgress = 0;
            this.updateProgressBar(0);
            return;
        }

        // When viewing a board, show it at the end of its visible ancestry (100%)
        // This is different from "go to frame start" which shows position in full hierarchy
        this.pausedProgress = 1;
        this.updateProgressBar(1);
    },

    // Seek animation to a specific progress value (0–1) without auto-playing
    seekTo(progress) {
        if (!AppState.isChildBoard()) return;
        const boardChain = AppState.getBoardAncestryChain();
        if (boardChain.length < 2) return;

        // Rebuild chain when never started or when animation already completed
        const needsInit = Object.keys(this.animationChainPlayers).length === 0 || this.pausedProgress >= 1;
        if (needsInit) {
            this.buildAnimationChain(boardChain);
            this.animationPhaseCount = boardChain.length - 1;
            AppState.saveCurrentPositions();
            this.pausedProgress = 0;
        }

        // Stop the animation loop if currently playing
        if (AppState.isAnimating) {
            AppState.isAnimating = false;
            if (AppState.animationFrame) {
                cancelAnimationFrame(AppState.animationFrame);
                AppState.animationFrame = null;
            }
            this.updatePlayPauseButton(false);
            document.querySelectorAll('.player').forEach(p => p.classList.remove('animating'));
        }

        this.pausedProgress = progress;
        this.animatePlayersAlongChain(progress);
        this.renderParentPaths(false, progress);
        this.updateProgressBar(progress);
    },

    // ========== CANVAS RENDERING FOR VIDEO EXPORT ==========
    // These functions render directly to canvas for efficient video recording

    // Draw the futsal court lines directly to canvas
    drawCourt(ctx, width, height) {
        const scaleX = width / AppState.boardWidth;
        const scaleY = height / AppState.boardHeight;

        // Court dimensions (from court.svg viewBox="0 0 4500 2500")
        const courtWidth = 4000;
        const courtHeight = 2000;
        const offsetX = 250;
        const offsetY = 250;

        const sx = (x) => (offsetX + x) * scaleX;
        const sy = (y) => (offsetY + y) * scaleY;

        // Background (grey border)
        ctx.fillStyle = '#b7b7b7';
        ctx.fillRect(0, 0, width, height);

        // Court (blue)
        ctx.fillStyle = '#0280c6';
        ctx.fillRect(sx(0), sy(0), courtWidth * scaleX, courtHeight * scaleY);

        // White lines
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8 * Math.min(scaleX, scaleY);
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';

        // Court border
        ctx.strokeRect(sx(0), sy(0), courtWidth * scaleX, courtHeight * scaleY);

        // Center line
        ctx.beginPath();
        ctx.moveTo(sx(2000), sy(0));
        ctx.lineTo(sx(2000), sy(2000));
        ctx.stroke();

        // Center circle
        ctx.beginPath();
        ctx.arc(sx(2000), sy(1000), 300 * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(sx(2000), sy(1000), 12 * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
        ctx.fill();

        // Corner marks (arcs)
        const drawCornerArc = (x, y, startAngle, endAngle) => {
            ctx.beginPath();
            ctx.arc(sx(x), sy(y), 25 * Math.min(scaleX, scaleY), startAngle, endAngle);
            ctx.stroke();
        };
        drawCornerArc(0, 0, 0, Math.PI / 2);
        drawCornerArc(4000, 0, Math.PI / 2, Math.PI);
        drawCornerArc(0, 2000, -Math.PI / 2, 0);
        drawCornerArc(4000, 2000, Math.PI, -Math.PI / 2);

        // Substitution zones
        const subLines = [
            [1000, -48, 1000, 32],
            [1500, -48, 1500, 32],
            [2500, -48, 2500, 32],
            [3000, -48, 3000, 32],
            [1000, 1968, 1000, 2052],
            [1500, 1968, 1500, 2052],
            [2500, 1968, 2500, 2052],
            [3000, 1968, 3000, 2052]
        ];
        subLines.forEach(([x1, y1, x2, y2]) => {
            ctx.beginPath();
            ctx.moveTo(sx(x1), sy(y1));
            ctx.lineTo(sx(x2), sy(y2));
            ctx.stroke();
        });

        // Left penalty area
        ctx.beginPath();
        ctx.moveTo(sx(600), sy(842));
        ctx.lineTo(sx(600), sy(1158));
        ctx.stroke();

        // Left penalty dot
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(sx(600), sy(1000), 12 * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
        ctx.fill();

        // Left penalty arc
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.arc(sx(0), sy(842), 600 * Math.min(scaleX, scaleY), 0, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx(0), sy(1158), 600 * Math.min(scaleX, scaleY), -Math.PI / 2, 0);
        ctx.stroke();

        // Left goal markers
        ctx.beginPath();
        ctx.moveTo(sx(0), sy(500));
        ctx.lineTo(sx(-40), sy(500));
        ctx.moveTo(sx(0), sy(1500));
        ctx.lineTo(sx(-40), sy(1500));
        ctx.stroke();

        // Left penalty markers (small squares)
        ctx.fillRect(sx(992), sy(492), 16 * scaleX, 16 * scaleY);
        ctx.fillRect(sx(992), sy(1492), 16 * scaleX, 16 * scaleY);
        ctx.beginPath();
        ctx.arc(sx(1000), sy(1000), 12 * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
        ctx.fill();

        // Right penalty area
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(sx(3400), sy(842));
        ctx.lineTo(sx(3400), sy(1158));
        ctx.stroke();

        // Right penalty dot
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(sx(3400), sy(1000), 12 * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
        ctx.fill();

        // Right penalty arc
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.arc(sx(4000), sy(842), 600 * Math.min(scaleX, scaleY), Math.PI / 2, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx(4000), sy(1158), 600 * Math.min(scaleX, scaleY), Math.PI, -Math.PI / 2);
        ctx.stroke();

        // Right goal markers
        ctx.beginPath();
        ctx.moveTo(sx(4000), sy(500));
        ctx.lineTo(sx(4040), sy(500));
        ctx.moveTo(sx(4000), sy(1500));
        ctx.lineTo(sx(4040), sy(1500));
        ctx.stroke();

        // Right penalty markers (small squares)
        ctx.fillStyle = 'white';
        ctx.fillRect(sx(2992), sy(492), 16 * scaleX, 16 * scaleY);
        ctx.fillRect(sx(2992), sy(1492), 16 * scaleX, 16 * scaleY);
        ctx.beginPath();
        ctx.arc(sx(3000), sy(1000), 12 * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
        ctx.fill();
    },

    // Draw a player on canvas
    drawPlayer(ctx, player, canvasWidth, canvasHeight) {
        const scaleX = canvasWidth / AppState.boardWidth;
        const scaleY = canvasHeight / AppState.boardHeight;
        const scale = Math.min(scaleX, scaleY);

        const pos = {
            x: player.x * scaleX,
            y: player.y * scaleY
        };

        const team = AppState.getTeam(player.teamId);
        const color = team ? team.color : '#95a5a6';
        const playerSize = 100 * scale; // 100cm
        const radius = playerSize / 2;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate((player.rotation || 0) * Math.PI / 180);

        // Draw arms (behind the body)
        const armWidth = playerSize * 0.2;
        const armLength = playerSize * 0.8;
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;

        // Left arm
        ctx.save();
        ctx.translate(radius * 0.6, -radius * 0.2);
        ctx.rotate(-45 * Math.PI / 180);
        ctx.fillRect(-armLength, -armWidth / 2, armLength, armWidth);
        ctx.strokeRect(-armLength, -armWidth / 2, armLength, armWidth);
        ctx.restore();

        // Right arm
        ctx.save();
        ctx.translate(-radius * 0.6, -radius * 0.2);
        ctx.rotate(45 * Math.PI / 180);
        ctx.fillRect(0, -armWidth / 2, armLength, armWidth);
        ctx.strokeRect(0, -armWidth / 2, armLength, armWidth);
        ctx.restore();

        // Draw player circle
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw number (counter-rotated)
        ctx.save();
        ctx.rotate(-(player.rotation || 0) * Math.PI / 180);
        ctx.fillStyle = this.isBrightColor(color) ? '#000000' : '#ffffff';
        ctx.font = `bold ${playerSize * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player.number || '?', 0, 0);
        ctx.restore();

        ctx.restore();

        // Draw player name if it exists
        if (player.name) {
            const namePosition = player.namePosition || 'below';
            const fontSize = Math.max(playerSize * 0.25, 10);
            const offset = playerSize * 0.6;

            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 3;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let nameX = pos.x;
            let nameY = pos.y;

            switch (namePosition) {
                case 'below':
                    nameY = pos.y + offset;
                    break;
                case 'above':
                    nameY = pos.y - offset;
                    break;
                case 'left':
                    nameX = pos.x - offset;
                    ctx.textAlign = 'right';
                    break;
                case 'right':
                    nameX = pos.x + offset;
                    ctx.textAlign = 'left';
                    break;
            }

            // Draw text shadow
            ctx.strokeText(player.name, nameX, nameY);
            ctx.fillText(player.name, nameX, nameY);
        }
    },

    // Helper to determine if color is bright
    isBrightColor(color) {
        // Convert hex to RGB
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else {
            return false;
        }
        // Calculate luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        return luminance > 186;
    },

    // Draw a ball on canvas
    drawBall(ctx, ball, canvasWidth, canvasHeight) {
        const scaleX = canvasWidth / AppState.boardWidth;
        const scaleY = canvasHeight / AppState.boardHeight;
        const scale = Math.min(scaleX, scaleY);

        const pos = {
            x: ball.x * scaleX,
            y: ball.y * scaleY
        };

        const size = Math.max(60 * scale, 20); // 60cm minimum 20px
        const radius = size / 2;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = ball.color || 'white';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    // Draw paths on canvas
    drawPaths(ctx, canvasWidth, canvasHeight) {
        const scaleX = canvasWidth / AppState.boardWidth;
        const scaleY = canvasHeight / AppState.boardHeight;

        // Get the paths SVG element
        const pathsLayer = document.getElementById('paths-layer');
        if (!pathsLayer) return;

        const paths = pathsLayer.querySelectorAll('.path-line-visible');
        paths.forEach(path => {
            const d = path.getAttribute('d');
            if (!d) return;

            const color = path.getAttribute('stroke') || 'black';
            const opacity = parseFloat(path.getAttribute('stroke-opacity') || '1');
            const width = parseFloat(path.getAttribute('stroke-width') || '2');

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Parse the path data and draw it
            const path2d = new Path2D(d);
            ctx.stroke(path2d);

            ctx.restore();
        });
    },

    // Draw drawing shapes on canvas
    drawShapes(ctx, canvasWidth, canvasHeight) {
        const scaleX = canvasWidth / AppState.boardWidth;
        const scaleY = canvasHeight / AppState.boardHeight;

        const drawingLayer = document.getElementById('drawing-layer');
        if (!drawingLayer) return;

        // Draw lines
        drawingLayer.querySelectorAll('line:not([marker-end])').forEach(line => {
            const x1 = parseFloat(line.getAttribute('x1')) * scaleX;
            const y1 = parseFloat(line.getAttribute('y1')) * scaleY;
            const x2 = parseFloat(line.getAttribute('x2')) * scaleX;
            const y2 = parseFloat(line.getAttribute('y2')) * scaleY;
            const stroke = line.getAttribute('stroke') || '#2c3e50';
            const width = parseFloat(line.getAttribute('stroke-width') || '3');

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = width;
            ctx.stroke();
        });

        // Draw arrows
        drawingLayer.querySelectorAll('line[marker-end]').forEach(arrow => {
            const x1 = parseFloat(arrow.getAttribute('x1')) * scaleX;
            const y1 = parseFloat(arrow.getAttribute('y1')) * scaleY;
            const x2 = parseFloat(arrow.getAttribute('x2')) * scaleX;
            const y2 = parseFloat(arrow.getAttribute('y2')) * scaleY;
            const stroke = arrow.getAttribute('stroke') || '#2c3e50';
            const width = parseFloat(arrow.getAttribute('stroke-width') || '3');

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = width;
            ctx.stroke();

            // Draw arrowhead
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const headLen = 15;
            ctx.fillStyle = stroke;
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
        });

        // Draw rectangles
        drawingLayer.querySelectorAll('rect').forEach(rect => {
            const x = parseFloat(rect.getAttribute('x')) * scaleX;
            const y = parseFloat(rect.getAttribute('y')) * scaleY;
            const w = parseFloat(rect.getAttribute('width')) * scaleX;
            const h = parseFloat(rect.getAttribute('height')) * scaleY;
            const fill = rect.getAttribute('fill') || 'rgba(52, 152, 219, 0.3)';
            const stroke = rect.getAttribute('stroke') || '#3498db';
            const strokeWidth = parseFloat(rect.getAttribute('stroke-width') || '3');

            ctx.fillStyle = fill;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = strokeWidth;
            ctx.strokeRect(x, y, w, h);
        });

        // Draw ellipses
        drawingLayer.querySelectorAll('ellipse').forEach(ellipse => {
            const cx = parseFloat(ellipse.getAttribute('cx')) * scaleX;
            const cy = parseFloat(ellipse.getAttribute('cy')) * scaleY;
            const rx = parseFloat(ellipse.getAttribute('rx')) * scaleX;
            const ry = parseFloat(ellipse.getAttribute('ry')) * scaleY;
            const fill = ellipse.getAttribute('fill') || 'rgba(52, 152, 219, 0.3)';
            const stroke = ellipse.getAttribute('stroke') || '#3498db';
            const strokeWidth = parseFloat(ellipse.getAttribute('stroke-width') || '3');

            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = stroke;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        });

        // Draw text
        drawingLayer.querySelectorAll('text').forEach(text => {
            const x = parseFloat(text.getAttribute('x')) * scaleX;
            const y = parseFloat(text.getAttribute('y')) * scaleY;
            const content = text.textContent;
            const fontSize = parseFloat(text.getAttribute('font-size') || '40');
            const fill = text.getAttribute('fill') || '#2c3e50';

            ctx.fillStyle = fill;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(content, x, y);
        });
    },

    // Render complete frame to canvas
    renderFrameToCanvas(ctx, canvasWidth, canvasHeight, woodTexture) {
        // Draw wood texture if available
        if (woodTexture && woodTexture.complete && woodTexture.naturalWidth > 0) {
            ctx.fillStyle = '#34495e';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            const pattern = ctx.createPattern(woodTexture, 'repeat');
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
            // Draw court with opacity over wood
            ctx.save();
            ctx.globalAlpha = 0.8;
            this.drawCourt(ctx, canvasWidth, canvasHeight);
            ctx.restore();
        } else {
            // No wood texture - draw court directly (court fills its own background)
            this.drawCourt(ctx, canvasWidth, canvasHeight);
        }

        // Draw drawing shapes (under players)
        this.drawShapes(ctx, canvasWidth, canvasHeight);

        // Draw paths
        this.drawPaths(ctx, canvasWidth, canvasHeight);

        // Draw all players
        AppState.players.forEach(player => {
            if (player.visible) {
                this.drawPlayer(ctx, player, canvasWidth, canvasHeight);
            }
        });

        // Draw all balls
        AppState.balls.forEach(ball => {
            if (ball.visible) {
                this.drawBall(ctx, ball, canvasWidth, canvasHeight);
            }
        });
    },

    // ========== END CANVAS RENDERING ==========

    // Update animation button states based on board type
    updateAnimationButtonStates() {
        const headerDownloadBtn = document.getElementById('btn-header-download-animation');

        const isChild = AppState.isChildBoard();

        if (headerDownloadBtn) {
            if (isChild) {
                headerDownloadBtn.disabled = false;
                headerDownloadBtn.style.opacity = '1';
            } else {
                headerDownloadBtn.disabled = true;
                headerDownloadBtn.style.opacity = '0.5';
            }
        }
    },

    // Setup animation quality menu
    setupAnimationMenu() {
        const headerDownloadBtn = document.getElementById('btn-header-download-animation');
        const animationMenu = document.getElementById('animation-menu');

        if (!animationMenu) {
            console.error('Animation menu not found!');
            return;
        }

        // Set initial button states
        this.updateAnimationButtonStates();

        // Function to show menu positioned near a button
        const showMenu = (button) => {
            if (animationMenu.classList.contains('hidden')) {
                const rect = button.getBoundingClientRect();
                animationMenu.classList.remove('hidden');
                animationMenu.style.display = 'block';

                // Get menu dimensions after making it visible
                const menuRect = animationMenu.getBoundingClientRect();

                // Calculate position
                let left = rect.left;
                let top = rect.bottom + 5;

                // Ensure menu fits horizontally
                if (left + menuRect.width > window.innerWidth) {
                    left = window.innerWidth - menuRect.width - 10;
                }
                if (left < 10) {
                    left = 10;
                }

                // Ensure menu fits vertically
                if (top + menuRect.height > window.innerHeight) {
                    // Position above button instead
                    top = rect.top - menuRect.height - 5;
                }
                if (top < 10) {
                    top = 10;
                }

                animationMenu.style.left = left + 'px';
                animationMenu.style.top = top + 'px';
            } else {
                animationMenu.classList.add('hidden');
                animationMenu.style.display = 'none';
            }
        };

        // Header download button
        if (headerDownloadBtn) {
            headerDownloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showMenu(headerDownloadBtn);
            });
        }

        // Hide menu when clicking outside or on other buttons
        document.addEventListener('click', (e) => {
            if (animationMenu.classList.contains('hidden')) return;

            // Don't close if clicking the download button itself
            if (headerDownloadBtn && (e.target === headerDownloadBtn || headerDownloadBtn.contains(e.target))) return;

            // Don't close if clicking inside the menu
            if (animationMenu.contains(e.target)) return;

            // Close menu for any other click
            animationMenu.classList.add('hidden');
            animationMenu.style.display = 'none';
        }, true);

        // Hide menu on window blur
        window.addEventListener('blur', () => {
            animationMenu.classList.add('hidden');
            animationMenu.style.display = 'none';
        });

        // Handle menu item clicks
        animationMenu.addEventListener('click', async (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item) return;

            const width = parseInt(item.dataset.width);
            const height = parseInt(item.dataset.height);

            // Hide menu
            animationMenu.classList.add('hidden');
            animationMenu.style.display = 'none';

            // Download with selected dimensions
            await this.downloadAnimation(width, height);
        });
    },

    /**
     * Records the board animation chain and downloads the result as a WebM video file.
     * Requires at least two boards in the ancestry chain (parent + at least one child).
     * Uses MediaRecorder with VP9/VP8/WebM MIME type — not supported on Safari/iOS.
     * Shows a user-visible error if WebM recording is unavailable in the current browser.
     */
    async downloadAnimation(targetWidth = null, targetHeight = null) {
        // Don't start if already animating or recording
        if (AppState.isAnimating || this.isRecording) {
            Utils.showMessage('Animation is already playing or recording.', 'Cannot Download');
            return;
        }

        // Don't animate if not on a child board
        if (!AppState.isChildBoard()) {
            Utils.showMessage('Animation only works on child boards with parent positions.', 'Cannot Download');
            return;
        }

        // Get the full board ancestry chain
        const boardChain = AppState.getBoardAncestryChain();
        if (boardChain.length < 2) {
            Utils.showMessage('Animation requires at least one parent board.', 'Cannot Download');
            return;
        }

        // Build the chain data so players move correctly even if playAnimation()
        // was never called.
        this.buildAnimationChain(boardChain);
        this.animationPhaseCount = boardChain.length - 1;

        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
            Utils.showMessage('Video recording is not supported in your browser.', 'Cannot Download');
            return;
        }

        // Recording progress bar helpers (defined before try so catch can access them)
        const progressEl = document.getElementById('recording-progress');
        const progressFill = document.getElementById('recording-progress-fill');
        const progressLabel = document.getElementById('recording-progress-label');
        const abortBtn = document.getElementById('recording-abort-btn');

        // Abort flag and handler
        let abortRequested = false;
        const handleAbort = () => {
            abortRequested = true;
            if (progressLabel) progressLabel.textContent = 'Canceling...';
        };

        if (abortBtn) {
            abortBtn.addEventListener('click', handleAbort);
        }

        const updateProgress = (frame, total) => {
            if (progressFill) progressFill.style.width = `${Math.round((frame / total) * 100)}%`;
            if (progressLabel) progressLabel.textContent = `Recording Frame ${frame}/${total}`;
        };

        const hideProgress = () => {
            if (progressEl) progressEl.classList.add('hidden');
            if (abortBtn) abortBtn.removeEventListener('click', handleAbort);
        };

        try {
            // Update buttons to show recording state
            const headerDownloadBtn = document.getElementById('btn-header-download-animation');
            const originalHeaderBtnHTML = headerDownloadBtn ? headerDownloadBtn.innerHTML : '';

            if (headerDownloadBtn) {
                headerDownloadBtn.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" fill="red"/>
                    </svg>
                `;
                headerDownloadBtn.disabled = true;
            }

            // Load html-to-image library if not already loaded
            if (typeof htmlToImage === 'undefined') {
                const script = document.createElement('script');
                    script.src = 'ext/html-to-image.js';
                document.head.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }

            // Get board container for dimensions
            const boardContainer = document.querySelector('.board-container');
            if (!boardContainer) {
                throw new Error('Board container not found');
            }

            const rect = boardContainer.getBoundingClientRect();

            // Calculate crop bounds for cropping if enabled (use paths-layer dimensions)
            let cropX = 0, cropY = 0, cropWidth = rect.width, cropHeight = rect.height;

            if (AppState.animationCropVideo) {
                // Use paths-layer dimensions which match the canvas (actual court rendering area)
                const pathsLayer = document.getElementById('paths-layer');
                const pathsRect = pathsLayer.getBoundingClientRect();
                const containerRect = boardContainer.getBoundingClientRect();

                // Calculate offset relative to board container
                cropX = pathsRect.left - containerRect.left;
                cropY = pathsRect.top - containerRect.top;
                cropWidth = pathsRect.width;
                cropHeight = pathsRect.height;
            }

            // Create canvas for recording at specified resolution
            const canvas = document.createElement('canvas');
            if (targetWidth && targetHeight) {
                // Use specified dimensions
                canvas.width = targetWidth;
                canvas.height = targetHeight;
            } else {
                // Default to 3x for better quality
                canvas.width = cropWidth * 3;
                canvas.height = cropHeight * 3;
            }
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // Setup MediaRecorder
            const stream = canvas.captureStream(AppState.animationFPS);
            const chunks = [];

            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                Utils.showMessage('Video export is not supported in this browser. Safari and iOS do not support WebM video recording. Please use Chrome or Firefox to export animations.', 'Browser Not Supported');
                return;
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                videoBitsPerSecond: 12000000  // 12 Mbps for higher quality
            });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                let blob = new Blob(chunks, { type: mimeType });
                blob = await this.injectWebmDuration(blob, totalDuration);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                const boardName = AppState.boards.find(b => b.id === AppState.currentBoardId)?.name || 'Board';
                const workbookName = AppState.workbookName || 'Futsal';
                const now = new Date();
                const date = now.toISOString().slice(0, 10).replace(/-/g, '');
                const time = now.toISOString().slice(11, 19).replace(/:/g, '');
                const timestamp = `${date}-${time}`;
                a.download = `${workbookName}-${boardName}-animation-${timestamp}.webm`;

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                hideProgress();

                // Restore UI overlays
                if (frameSpeedControl && originalFrameSpeedDisplay !== null) {
                    frameSpeedControl.style.display = originalFrameSpeedDisplay;
                }
                if (animationOverlay && originalAnimationOverlayDisplay !== null) {
                    animationOverlay.style.display = originalAnimationOverlayDisplay;
                }

                if (headerDownloadBtn) {
                    headerDownloadBtn.innerHTML = originalHeaderBtnHTML;
                    headerDownloadBtn.disabled = false;
                }

                // Reset animation state
                AppState.isAnimating = false;
                this.isRecording = false;

                // Show success toast with resolution
                Utils.showToast(`Animation exported (${canvas.width}×${canvas.height})`, 'success');
            };

            // Capture function that captures exactly what's visible on screen (including wood background)
            const pixelRatio = canvas.width / cropWidth;
            const captureToCanvas = async () => {
                try {
                    // Capture using toCanvas at higher resolution - this will include the wood background
                    const capturedCanvas = await htmlToImage.toCanvas(boardContainer, {
                        width: rect.width,
                        height: rect.height,
                        pixelRatio: pixelRatio,  // Match target resolution
                        cacheBust: false,
                        skipFonts: false
                        // No backgroundColor or style override - capture exactly as displayed
                    });

                    // Draw to recording canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    if (AppState.animationCropVideo) {
                        // Crop to court area
                        // Source coordinates in captured canvas (at target resolution)
                        const sx = cropX * pixelRatio;
                        const sy = cropY * pixelRatio;
                        const sw = cropWidth * pixelRatio;
                        const sh = cropHeight * pixelRatio;

                        // Draw cropped area to full canvas
                        ctx.drawImage(capturedCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
                    } else {
                        // Draw entire capture
                        ctx.drawImage(capturedCanvas, 0, 0, canvas.width, canvas.height);
                    }
                } catch (err) {
                    console.error('Capture failed:', err);
                }
            };

            // Use configured FPS for video export
            const captureFPS = AppState.animationFPS;
            const frameTime = 1000 / captureFPS; // Time per frame in ms
            const totalDuration = AppState.animationDuration * this.animationPhaseCount;
            const totalFrames = Math.ceil((totalDuration / 1000) * captureFPS);

            // Set animation as "playing" so renders work correctly
            AppState.isAnimating = true;

            // Clear any selected player to prevent interference during recording
            AppState.selectedPlayer = null;
            if (typeof Players !== 'undefined') {
                Players.render();
            }

            // Hide UI overlays that shouldn't be captured in the video
            const frameSpeedControl = document.getElementById('frame-speed-control');
            const animationOverlay = document.getElementById('animation-player-overlay');
            const originalFrameSpeedDisplay = frameSpeedControl ? frameSpeedControl.style.display : null;
            const originalAnimationOverlayDisplay = animationOverlay ? animationOverlay.style.display : null;

            if (frameSpeedControl) frameSpeedControl.style.display = 'none';
            if (animationOverlay) animationOverlay.style.display = 'none';

            // Show recording progress bar
            if (progressEl) progressEl.classList.remove('hidden');

            // Phase 1: pre-render all frames as fast as possible into ImageData snapshots.
            // This decouples capture speed from video playback FPS.
            const frameSnapshots = [];
            for (let i = 0; i < totalFrames; i++) {
                // Check for abort
                if (abortRequested) {
                    throw new Error('Export canceled by user');
                }

                updateProgress(i + 1, totalFrames);

                const totalProgress = totalFrames > 1 ? i / (totalFrames - 1) : 1;
                this.animatePlayersAlongChain(totalProgress);
                this.renderParentPaths(false, totalProgress);

                // Brief yield so the DOM renders before we capture.
                await new Promise(r => setTimeout(r, 10));

                try {
                    await captureToCanvas();
                } catch (err) {
                    console.error('Capture error:', err);
                }

                frameSnapshots.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            }

            // Phase 2: replay snapshots into MediaRecorder at the target frame rate.
            // Each snapshot is held on the canvas for exactly frameTime ms so
            // captureStream samples it at the configured FPS.
            this.isRecording = true;
            mediaRecorder.start();

            for (const snapshot of frameSnapshots) {
                // Check for abort
                if (abortRequested) {
                    mediaRecorder.stop();
                    this.isRecording = false;
                    throw new Error('Export canceled by user');
                }

                ctx.putImageData(snapshot, 0, 0);
                await new Promise(r => setTimeout(r, frameTime));
            }

            // Give the encoder a brief flush window then stop.
            setTimeout(() => {
                mediaRecorder.stop();
                this.isRecording = false;
            }, 50);

        } catch (error) {
            console.error('Animation recording failed:', error);

            // Show different message for user cancellation vs actual error
            if (error.message === 'Export canceled by user') {
                Utils.showToast('Export canceled', 'error');
            } else {
                Utils.showMessage('Failed to record animation: ' + error.message, 'Recording Error');
            }

            // Cleanup on error
            hideProgress();

            // Reset animation state
            AppState.isAnimating = false;
            this.isRecording = false;

            // Restore UI overlays
            const frameSpeedControl = document.getElementById('frame-speed-control');
            const animationOverlay = document.getElementById('animation-player-overlay');
            if (frameSpeedControl && typeof originalFrameSpeedDisplay !== 'undefined' && originalFrameSpeedDisplay !== null) {
                frameSpeedControl.style.display = originalFrameSpeedDisplay;
            }
            if (animationOverlay && typeof originalAnimationOverlayDisplay !== 'undefined' && originalAnimationOverlayDisplay !== null) {
                animationOverlay.style.display = originalAnimationOverlayDisplay;
            }

            const headerDownloadBtn = document.getElementById('btn-header-download-animation');
            if (headerDownloadBtn) {
                headerDownloadBtn.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                `;
                headerDownloadBtn.disabled = false;
            }
        }
    },

    // Animation loop
    animate() {
        if (!AppState.isAnimating) return;

        const now = performance.now();
        const elapsed = now - this.startTime;
        const totalProgress = this.realMsToNormalized(elapsed);
        this.pausedProgress = totalProgress;

        // Animate players along full chain
        this.animatePlayersAlongChain(totalProgress);

        // Update paths to only show traveled portion (using phase-relative progress)
        this.renderParentPaths(false, totalProgress);

        this.updateProgressBar(totalProgress);

        if (totalProgress < 1) {
            AppState.animationFrame = requestAnimationFrame(() => this.animate());
        } else {
            // Animation completed
            if (AppState.animationRepeat) {
                // Restart animation
                this.startTime = performance.now();
                AppState.animationFrame = requestAnimationFrame(() => this.animate());
            } else {
                // Go to frame end to ensure exact end positions
                this.goToFrameEnd();
            }
        }
    },

    // Animate players along the full board chain
    animatePlayersAlongChain(totalProgress) {
        // Animate players through all boards in the chain
        AppState.players.forEach(player => {
            if (!player.visible) return;

            const chainPositions = this.animationChainPlayers[player.id];
            if (!chainPositions || chainPositions.length < 2) return;

            const key = `player-${player.id}`;
            const allIntermediates = this.animationChainIntermediates[key] || [];

            // Calculate which phase (board transition) we're in
            const phaseProgress = totalProgress * this.animationPhaseCount;
            const currentPhase = Math.min(Math.floor(phaseProgress), this.animationPhaseCount - 1);
            const progressInPhase = currentPhase === this.animationPhaseCount - 1
                ? Math.min(phaseProgress - currentPhase, 1)  // Clamp to 1 for last phase
                : phaseProgress - currentPhase;

            // Build path points for current phase only
            const phasePathPoints = [];
            phasePathPoints.push(chainPositions[currentPhase]);

            const transitionIntermediates = allIntermediates[currentPhase + 1] || [];
            transitionIntermediates.forEach(int => {
                phasePathPoints.push({
                    x: int.x,
                    y: int.y,
                    rotation: typeof int.rotation === 'number' ? int.rotation : 0
                });
            });

            phasePathPoints.push(chainPositions[currentPhase + 1]);

            // Animate along the current phase path
            const state = this.getPositionAlongPath(phasePathPoints, progressInPhase);
            player.x = state.x;
            player.y = state.y;
            player.rotation = typeof state.rotation === 'number' ? state.rotation : 0;
        });

        // Animate balls along the full chain (no intermediates)
        AppState.balls.forEach(ball => {
            const chainPositions = this.animationChainBalls[ball.id];
            if (!chainPositions || chainPositions.length < 2) return;

            // Calculate which phase we're in
            const phaseProgress = totalProgress * this.animationPhaseCount;
            const currentPhase = Math.min(Math.floor(phaseProgress), this.animationPhaseCount - 1);
            const progressInPhase = currentPhase === this.animationPhaseCount - 1
                ? Math.min(phaseProgress - currentPhase, 1)  // Clamp to 1 for last phase
                : phaseProgress - currentPhase;

            // Build path points for current phase
            const phasePathPoints = [
                chainPositions[currentPhase],
                chainPositions[currentPhase + 1]
            ];

            // Simple interpolation along current phase
            const state = this.getPositionAlongPath(phasePathPoints, progressInPhase);
            ball.x = state.x;
            ball.y = state.y;
        });

        Players.render();
        Balls.render();
    },

    // Animate players along paths (legacy - keeping for compatibility)
    animatePlayersAlongPaths(progress) {
        // Animate players along their paths (parent -> intermediates -> current)
        AppState.players.forEach(player => {
            if (!player.visible) return;

            const parentPos = AppState.parentPlayerPositions[player.id];
            const endPos = AppState.playerStartPositions.find(p => p.id === player.id);

            if (!parentPos || !endPos) return;

            const key = `player-${player.id}`;
            const intermediates = AppState.pathIntermediates[key] || [];

            // Build the full path with rotation: parent -> intermediates -> end
            // Ensure all rotations are valid numbers
            const parentRotation = typeof parentPos.rotation === 'number' ? parentPos.rotation : 0;
            const endRotation = typeof endPos.rotation === 'number' ? endPos.rotation : 0;

            const pathPoints = [
                { x: parentPos.x, y: parentPos.y, rotation: parentRotation },
                ...intermediates.map(int => ({
                    x: int.x,
                    y: int.y,
                    rotation: typeof int.rotation === 'number' ? int.rotation : 0
                })),
                { x: endPos.x, y: endPos.y, rotation: endRotation }
            ];

            // Animate along the path (returns position and rotation)
            const state = this.getPositionAlongPath(pathPoints, progress);
            player.x = state.x;
            player.y = state.y;
            player.rotation = typeof state.rotation === 'number' ? state.rotation : 0;
        });

        // Animate balls along their paths (parent -> current, no intermediates)
        AppState.balls.forEach(ball => {
            const parentPos = AppState.parentBallPositions[ball.id];
            const endPos = AppState.ballStartPositions.find(b => b.id === ball.id);

            if (!parentPos || !endPos) return;

            // Simple linear interpolation for balls
            ball.x = parentPos.x + (endPos.x - parentPos.x) * progress;
            ball.y = parentPos.y + (endPos.y - parentPos.y) * progress;
        });

        Players.render();
        Balls.render();
    },

    // Get position and rotation along a path at a given progress (0-1)
    getPositionAlongPath(pathPoints, progress) {
        if (pathPoints.length === 0) return { x: 0, y: 0, rotation: 0 };
        if (pathPoints.length === 1) {
            const rot = pathPoints[0].rotation !== undefined ? pathPoints[0].rotation : 0;
            return { x: pathPoints[0].x, y: pathPoints[0].y, rotation: rot };
        }

        // Calculate which segment we're on
        const segmentCount = pathPoints.length - 1;
        const totalProgress = progress * segmentCount;
        const segmentIndex = Math.min(Math.floor(totalProgress), segmentCount - 1);
        const segmentProgress = totalProgress - segmentIndex;

        const startPoint = pathPoints[segmentIndex];
        const endPoint = pathPoints[segmentIndex + 1];

        // Get rotations (default to 0 if not set), normalize to 0-360
        let startRotation = startPoint.rotation !== undefined ? startPoint.rotation : 0;
        let endRotation = endPoint.rotation !== undefined ? endPoint.rotation : 0;

        // Normalize rotations to 0-360 range
        startRotation = ((startRotation % 360) + 360) % 360;
        endRotation = ((endRotation % 360) + 360) % 360;

        // Interpolate rotation (handle wrapping around 360 degrees)
        let rotationDiff = endRotation - startRotation;
        // Take shortest path around the circle
        if (rotationDiff > 180) rotationDiff -= 360;
        if (rotationDiff < -180) rotationDiff += 360;

        let interpolatedRotation = startRotation + rotationDiff * segmentProgress;
        // Normalize result to 0-360
        interpolatedRotation = ((interpolatedRotation % 360) + 360) % 360;

        // Linear interpolation between segment points
        return {
            x: startPoint.x + (endPoint.x - startPoint.x) * segmentProgress,
            y: startPoint.y + (endPoint.y - startPoint.y) * segmentProgress,
            rotation: interpolatedRotation
        };
    },

    // Get path points up to a given progress (for progressive path rendering)
    getPathPointsUpToProgress(allPoints, progress) {
        if (allPoints.length === 0) return [];
        if (allPoints.length === 1) return allPoints;

        const segmentCount = allPoints.length - 1;
        const totalProgress = progress * segmentCount;
        const segmentIndex = Math.min(Math.floor(totalProgress), segmentCount - 1);
        const segmentProgress = totalProgress - segmentIndex;

        // Include all points up to the current segment
        const points = allPoints.slice(0, segmentIndex + 1);

        // Add the intermediate point on the current segment
        if (segmentProgress > 0 && segmentIndex < segmentCount) {
            const startPoint = allPoints[segmentIndex];
            const endPoint = allPoints[segmentIndex + 1];
            points.push({
                x: startPoint.x + (endPoint.x - startPoint.x) * segmentProgress,
                y: startPoint.y + (endPoint.y - startPoint.y) * segmentProgress
            });
        }

        return points;
    },

    // Update paths visibility based on toggle and animation state
    updatePathsVisibility() {
        // This is now used for rendering parent position paths
        this.renderParentPaths();
    },

    // Get current animation progress (for live toggle updates during animation)
    getCurrentProgress() {
        if (!AppState.isAnimating || !this.startTime) return null;
        const now = performance.now();
        const elapsed = now - this.startTime;
        return this.realMsToNormalized(elapsed);
    },

    // Setup ghost dragging handlers (only for player ghosts)
    setupGhostDragging() {
        const playersLayer = document.getElementById('board-area');

        // Double-click handler for ghosts (show path context menu)
        playersLayer.addEventListener('dblclick', (e) => {
            const ghost = e.target.closest('.ghost-player');
            if (!ghost) return;

            e.preventDefault();
            e.stopPropagation();

            const ghostKey = ghost.dataset.ghostKey;
            const parts = ghostKey.split('-');

            // Check if this is a board-prefixed ghost ID
            let type, id, key;
            if (parts[1].startsWith('board')) {
                // Format: ghost-board0-player-{id}-{index}
                type = parts[2];
                id = parts.slice(3, -1).join('-');
                key = `${type}-${id}`;
            } else {
                // Format: ghost-player-{id}-{index}
                type = parts[1];
                id = parts.slice(2, -1).join('-');
                key = `${type}-${id}`;
            }

            if (type !== 'player') return;

            this.showPathContextMenu(e.clientX, e.clientY, key);
        });

        // Right-click handler for ghosts (show path context menu)
        playersLayer.addEventListener('contextmenu', (e) => {
            const ghost = e.target.closest('.ghost-player');
            if (!ghost) return;

            e.preventDefault();
            e.stopPropagation();

            const ghostKey = ghost.dataset.ghostKey;
            const parts = ghostKey.split('-');

            // Check if this is a board-prefixed ghost ID
            let type, id, key;
            if (parts[1].startsWith('board')) {
                // Format: ghost-board0-player-{id}-{index}
                type = parts[2];
                id = parts.slice(3, -1).join('-');
                key = `${type}-${id}`;
            } else {
                // Format: ghost-player-{id}-{index}
                type = parts[1];
                id = parts.slice(2, -1).join('-');
                key = `${type}-${id}`;
            }

            if (type !== 'player') return;

            this.showPathContextMenu(e.clientX, e.clientY, key);
        });

        const handlePointerDown = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            // Check if clicking on rotation handle
            if (e.target.classList.contains('ghost-rotation-handle')) {
                const ghost = e.target.closest('.ghost-player');
                if (!ghost) return;

                e.preventDefault();
                e.stopPropagation();

                const ghostKey = ghost.dataset.ghostKey;
                const ghostId = ghostKey;
                const parts = ghostKey.split('-');

                // Check if this is a board-prefixed ghost ID
                let type, id, index, key, intermediates;
                if (parts[1].startsWith('board')) {
                    // Format: ghost-board0-player-{id}-{index}
                    type = parts[2];
                    index = parseInt(parts[parts.length - 1]);
                    id = parts.slice(3, -1).join('-');
                    key = `${type}-${id}`;
                    intermediates = AppState.pathIntermediates[key];
                } else {
                    // Format: ghost-player-{id}-{index}
                    type = parts[1];
                    index = parseInt(parts[parts.length - 1]);
                    id = parts.slice(2, -1).join('-');
                    key = `${type}-${id}`;
                    intermediates = AppState.pathIntermediates[key];
                }

                if (type !== 'player') return;
                if (!intermediates || !intermediates[index]) return;

                // Start rotating ghost
                this.rotatingGhost = {
                    key,
                    index,
                    ghostId,
                    startRotation: intermediates[index].rotation || 0
                };

                return;
            }

            const ghost = e.target.closest('.ghost-player');
            if (!ghost || AppState.currentTool !== 'select') return;

            e.preventDefault();
            e.stopPropagation();

            const ghostKey = ghost.dataset.ghostKey;
            const ghostId = ghostKey;
            const parts = ghostKey.split('-');
            // ghostKey format: "ghost-player-{id}-{index}" or "ghost-boardX-player-{id}-{index}"

            // Check if this is a board-prefixed ghost ID
            let type, id, index, key, intermediates;
            if (parts[1].startsWith('board')) {
                // Format: ghost-board0-player-{id}-{index}
                type = parts[2]; // 'player'
                index = parseInt(parts[parts.length - 1]);
                id = parts.slice(3, -1).join('-');
                key = `${type}-${id}`;

                // Only allow dragging current frame ghosts, not parent frame ghosts
                // Parent frame ghosts are non-selectable (created with selectable=false)
                intermediates = AppState.pathIntermediates[key];
            } else {
                // Format: ghost-player-{id}-{index}
                type = parts[1]; // 'player'
                index = parseInt(parts[parts.length - 1]);
                id = parts.slice(2, -1).join('-');
                key = `${type}-${id}`;
                intermediates = AppState.pathIntermediates[key];
            }

            // Only allow for player ghosts
            if (type !== 'player') return;

            if (!intermediates || !intermediates[index]) return;

            // Check for double-click (within 300ms)
            const now = Date.now();
            const isDoubleClick = (now - this.lastGhostClickTime < 300) && (this.lastGhostClickId === ghostId);
            this.lastGhostClickTime = now;
            this.lastGhostClickId = ghostId;

            if (isDoubleClick) {
                // Double-click detected - show context menu
                this.showPathContextMenu(clientX, clientY, key);
                return;
            }

            // Check if ghost is already selected
            if (AppState.selectedGhost === ghostId) {
                // Already selected, start dragging
                const rect = AppState.canvas.getBoundingClientRect();
                const scaleX = AppState.boardWidth / rect.width;
                const scaleY = AppState.boardHeight / rect.height;

                this.draggedGhost = {
                    key,
                    index,
                    ghostId, // Store the actual ghost ID for updates
                    offsetX: (clientX - rect.left) * scaleX - intermediates[index].x,
                    offsetY: (clientY - rect.top) * scaleY - intermediates[index].y
                };

                // Update position display
                AppState.updatePositionDisplay(intermediates[index].x, intermediates[index].y, intermediates[index], 'ghost');
            } else {
                // Not selected, select it
                AppState.selectedGhost = ghostId;
                AppState.selectedPath = key;
                AppState.selectedPlayer = null;
                AppState.selectedBall = null;
                AppState.selectedElement = null;
                AppState.selectedPlate = null;

                // Show position display for ghost
                AppState.updatePositionDisplay(intermediates[index].x, intermediates[index].y, intermediates[index], 'ghost');

                // Re-render to show selection
                this.renderParentPaths();
                if (typeof Players !== 'undefined') {
                    Players.render();
                }
                if (typeof Balls !== 'undefined') {
                    Balls.render();
                }
                if (typeof Elements !== 'undefined') {
                    Elements.render();
                }
                if (typeof Plates !== 'undefined') {
                    Plates.render();
                }
            }
        };

        playersLayer.addEventListener('mousedown', handlePointerDown);
        playersLayer.addEventListener('touchstart', handlePointerDown, { passive: false });

        const handlePointerMove = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            // Handle ghost rotation
            if (this.rotatingGhost) {
                e.preventDefault();

                const intermediates = AppState.pathIntermediates[this.rotatingGhost.key];
                if (!intermediates || !intermediates[this.rotatingGhost.index]) return;

                const intermediate = intermediates[this.rotatingGhost.index];
                const rect = AppState.canvas.getBoundingClientRect();
                const scaleX = rect.width / AppState.boardWidth;
                const scaleY = rect.height / AppState.boardHeight;

                const centerX = intermediate.x * scaleX;
                const centerY = intermediate.y * scaleY;

                const dx = clientX - rect.left - centerX;
                const dy = clientY - rect.top - centerY;

                let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                angle = (angle + 90 + 360) % 360;

                intermediate.rotation = Math.round(angle);

                // Update the ghost element directly without re-rendering
                const ghostElement = document.getElementById(this.rotatingGhost.ghostId);
                if (ghostElement) {
                    ghostElement.style.transform = `rotate(${Math.round(angle)}deg)`;

                    // Counter-rotate the number to keep it upright
                    const numberSpan = ghostElement.querySelector('.player-number');
                    if (numberSpan && Math.round(angle) !== 0) {
                        numberSpan.style.transform = `rotate(${-Math.round(angle)}deg)`;
                    }
                }

                return;
            }

            // Handle ghost dragging
            if (!this.draggedGhost) return;

            e.preventDefault();

            const rect = AppState.canvas.getBoundingClientRect();
            const scaleX = AppState.boardWidth / rect.width;
            const scaleY = AppState.boardHeight / rect.height;

            let newX = (clientX - rect.left) * scaleX - this.draggedGhost.offsetX;
            let newY = (clientY - rect.top) * scaleY - this.draggedGhost.offsetY;

            // Keep within board bounds
            newX = Math.max(0, Math.min(AppState.boardWidth, newX));
            newY = Math.max(0, Math.min(AppState.boardHeight, newY));

            const intermediates = AppState.pathIntermediates[this.draggedGhost.key];
            if (intermediates && intermediates[this.draggedGhost.index]) {
                // Round to avoid sub-pixel positioning issues
                intermediates[this.draggedGhost.index].x = Math.round(newX);
                intermediates[this.draggedGhost.index].y = Math.round(newY);

                // Update position display
                AppState.updatePositionDisplay(Math.round(newX), Math.round(newY), intermediates[this.draggedGhost.index], 'ghost');

                // Update ghost position directly (match real players exactly)
                const ghostElement = document.getElementById(this.draggedGhost.ghostId);
                if (ghostElement) {
                    const canvasRect = AppState.canvas.getBoundingClientRect();
                    const displayScaleX = canvasRect.width / AppState.boardWidth;
                    const playerSize = 100 * displayScaleX;
                    const halfSize = playerSize / 2;
                    const screenPos = Board.boardToScreen(Math.round(newX), Math.round(newY));

                    ghostElement.style.left = (screenPos.x - halfSize) + 'px';
                    ghostElement.style.top = (screenPos.y - halfSize) + 'px';
                }

                // Update path to reflect new position (throttled, skip ghost re-render)
                if (!this.rotationUpdatePending) {
                    this.rotationUpdatePending = true;
                    requestAnimationFrame(() => {
                        this.renderParentPaths(true); // Skip ghost re-render during drag
                        this.rotationUpdatePending = false;
                    });
                }
            }
        };

        const handlePointerUp = () => {
            if (this.draggedGhost) {
                // Full re-render after drag completes
                this.renderParentPaths(true);
                AppState.saveToLocalStorage();
                this.draggedGhost = null;
            }
            if (this.rotatingGhost) {
                // Full re-render after rotation completes
                this.renderParentPaths(true);
                AppState.saveToLocalStorage();
                this.rotatingGhost = null;
            }
        };

        document.addEventListener('mousemove', handlePointerMove);
        document.addEventListener('touchmove', handlePointerMove, { passive: false });
        document.addEventListener('mouseup', handlePointerUp);
        document.addEventListener('touchend', handlePointerUp);
    },

    // Setup path selection (similar to how elements work)
    setupPathSelection() {
        const pathsLayer = document.getElementById('paths-layer');

        pathsLayer.addEventListener('mousedown', (e) => {
            if (AppState.currentTool !== 'select') return;

            // Find the path key by traversing up the DOM tree
            let target = e.target;
            let pathKey = null;

            while (target && target !== pathsLayer) {
                if (target.dataset && target.dataset.pathKey) {
                    pathKey = target.dataset.pathKey;
                    break;
                }
                target = target.parentElement;
            }

            if (pathKey) {
                // Select this path
                AppState.selectedPath = pathKey;

                // Deselect other items
                AppState.selectedPlayer = null;
                AppState.selectedBall = null;
                AppState.selectedElement = null;
                AppState.selectedPlate = null;
                AppState.selectedShape = null;
                AppState.selectedGhost = null;

                // Show position display for the path's current position
                const parts = pathKey.split('-');
                const type = parts[0];
                const id = parts.slice(1).join('-');

                if (type === 'player') {
                    const player = AppState.getPlayer(id);
                    if (player) {
                        AppState.updatePositionDisplay(player.x, player.y, player, 'player');
                    }
                } else if (type === 'ball') {
                    const ball = AppState.getBall(id);
                    if (ball) {
                        AppState.updatePositionDisplay(ball.x, ball.y, ball, 'ball');
                    }
                }

                // Update selection visually without triggering full re-renders.
                // Calling Players/Balls/Elements/Plates.render() would indirectly call
                // renderParentPaths(), which does pathsLayer.innerHTML = '' — destroying
                // and recreating SVG path elements. That breaks dblclick because the
                // browser requires the same element to be the target of both clicks.
                // Instead, directly toggle CSS classes to show/hide selection state.
                const pathsLayerEl = document.getElementById('paths-layer');
                if (pathsLayerEl) {
                    pathsLayerEl.querySelectorAll('.path-selected')
                        .forEach(el => el.classList.remove('path-selected'));
                    pathsLayerEl.querySelectorAll(`[data-path-key="${pathKey}"]`)
                        .forEach(el => el.classList.add('path-selected'));
                }
                document.querySelectorAll('.player.selected').forEach(el => el.classList.remove('selected'));
                document.querySelectorAll('.ball-selected').forEach(el => el.classList.remove('ball-selected'));
                document.querySelectorAll('.element-selected').forEach(el => el.classList.remove('element-selected'));
                document.querySelectorAll('.plate-selected').forEach(el => el.classList.remove('plate-selected'));
                document.querySelectorAll('.shape-selected').forEach(el => el.classList.remove('shape-selected'));

                e.preventDefault();
                e.stopPropagation();
            }
        });

        // Double-click and right-click for context menu
        pathsLayer.addEventListener('dblclick', (e) => {
            let target = e.target;
            let pathKey = null;

            while (target && target !== pathsLayer) {
                if (target.dataset && target.dataset.pathKey) {
                    pathKey = target.dataset.pathKey;
                    break;
                }
                target = target.parentElement;
            }

            if (pathKey) {
                e.preventDefault();
                e.stopPropagation();
                this.showPathContextMenu(e.clientX, e.clientY, pathKey);
            }
        });

        pathsLayer.addEventListener('contextmenu', (e) => {
            let target = e.target;
            let pathKey = null;

            while (target && target !== pathsLayer) {
                if (target.dataset && target.dataset.pathKey) {
                    pathKey = target.dataset.pathKey;
                    break;
                }
                target = target.parentElement;
            }

            if (pathKey) {
                e.preventDefault();
                e.stopPropagation();
                this.showPathContextMenu(e.clientX, e.clientY, pathKey);
            }
        });

        // Add touch event handling for double-tap (converts to dblclick)
        let lastTapTime = 0;
        let lastTapTarget = null;
        pathsLayer.addEventListener('touchend', (e) => {
            const now = Date.now();
            const target = e.target;

            // Check if this is a path element
            let checkTarget = target;
            let pathKey = null;
            while (checkTarget && checkTarget !== pathsLayer) {
                if (checkTarget.dataset && checkTarget.dataset.pathKey) {
                    pathKey = checkTarget.dataset.pathKey;
                    break;
                }
                checkTarget = checkTarget.parentElement;
            }

            if (pathKey) {
                // Check if this is a double-tap (within 300ms on same target)
                if (lastTapTarget === target && now - lastTapTime < 300) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Get touch coordinates
                    const touch = e.changedTouches[0];
                    this.showPathContextMenu(touch.clientX, touch.clientY, pathKey);

                    // Reset
                    lastTapTime = 0;
                    lastTapTarget = null;
                } else {
                    // First tap
                    lastTapTime = now;
                    lastTapTarget = target;
                }
            }
        }, { passive: false });
    },

    // Setup path context menu handlers
    setupPathContextMenu() {
        const menu = document.getElementById('path-context-menu');
        const increaseBtn = menu.querySelector('[data-action="increase-ghosts"]');
        const decreaseBtn = menu.querySelector('[data-action="decrease-ghosts"]');
        const countSpan = document.getElementById('path-intermediate-count');

        increaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.contextMenuPath) return;

            const key = this.contextMenuPath.key;
            const parts = key.split('-');
            const type = parts[0];

            // Only allow for player paths
            if (type !== 'player') return;

            const current = (AppState.pathIntermediates[key] || []).length;
            this.setIntermediateCount(key, current + 1);
            countSpan.textContent = current + 1;

            // Keep menu open after action
        });

        decreaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.contextMenuPath) return;

            const key = this.contextMenuPath.key;
            const parts = key.split('-');
            const type = parts[0];

            // Only allow for player paths
            if (type !== 'player') return;

            const current = (AppState.pathIntermediates[key] || []).length;
            if (current > 0) {
                this.setIntermediateCount(key, current - 1);
                countSpan.textContent = current - 1;
            }

            // Keep menu open after action
        });

        // Hide menu when clicking outside
        const hideMenu = (e) => {
            // Don't hide if menu was just shown (within 300ms) - prevents double-click from hiding
            if (this.pathMenuShowTime && (Date.now() - this.pathMenuShowTime) < 300) return;

            // Don't hide if clicking on the menu itself
            if (menu.contains(e.target)) return;

            // Don't hide if clicking on path-related elements
            if (e.target.closest('.path-line')) return;
            if (e.target.closest('.ghost-player')) return;
            if (e.target.closest('.ghost-rotation-handle')) return;

            // Don't hide if clicking on the paths layer itself (might be a path element)
            if (e.target.closest('#paths-layer')) return;

            // Otherwise, hide the menu
            menu.classList.add('hidden');
            this.contextMenuPath = null;
        };

        document.addEventListener('click', hideMenu);
        // Use touchend instead of touchstart to avoid interfering with touch drag
        document.addEventListener('touchend', hideMenu);
    },

    // Set intermediate position count for a path (only for player paths)
    setIntermediateCount(key, count) {
        const parts = key.split('-');
        const type = parts[0]; // 'player' or 'ball'
        const id = parts.slice(1).join('-');

        // Only allow intermediates for player paths
        if (type !== 'player') return;

        const parentPos = AppState.parentPlayerPositions[id];
        const player = AppState.getPlayer(id);
        if (!player || !parentPos) return;

        const currentPos = { x: player.x, y: player.y };

        // Get existing intermediates to preserve rotation only
        const existingIntermediates = AppState.pathIntermediates[key] || [];

        // Calculate evenly spaced positions along the line
        // Always recalculate positions to ensure ghosts are on the path at correct intervals
        const intermediates = [];
        for (let i = 1; i <= count; i++) {
            const t = i / (count + 1); // For count=2: 1/3 and 2/3
            const existing = existingIntermediates[i - 1];

            intermediates.push({
                x: parentPos.x + (currentPos.x - parentPos.x) * t,
                y: parentPos.y + (currentPos.y - parentPos.y) * t,
                rotation: existing?.rotation !== undefined ? existing.rotation : (player.rotation || 0)
            });
        }

        AppState.pathIntermediates[key] = intermediates;
        AppState.saveToLocalStorage();
        this.renderParentPaths();
    },

    // Show path context menu (only for player paths)
    showPathContextMenu(x, y, key) {
        const parts = key.split('-');
        const type = parts[0];

        // Only show context menu for player paths
        if (type !== 'player') return;

        this.contextMenuPath = { key };
        this.pathMenuShowTime = Date.now(); // Track when menu was shown
        const menu = document.getElementById('path-context-menu');
        const countSpan = document.getElementById('path-intermediate-count');

        const currentCount = (AppState.pathIntermediates[key] || []).length;
        countSpan.textContent = currentCount;

        menu.classList.remove('hidden');
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        // Keep menu within viewport
        setTimeout(() => {
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = (window.innerWidth - rect.width - 5) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = (window.innerHeight - rect.height - 5) + 'px';
            }
        }, 0);
    },

    // Render dotted lines from parent positions to current positions
    renderParentPaths(skipGhostRender = false, animationProgress = null) {
        // Update animation button states based on board type
        this.updateAnimationButtonStates();

        const pathsLayer = document.getElementById('paths-layer');
        if (!pathsLayer) return;

        // If board changed, clear any animation chain from previous board
        // This ensures paths are shown for the current board's full hierarchy
        const boardChanged = this.animationChainBoardId !== AppState.currentBoardId;
        if (boardChanged && !AppState.isAnimating) {
            this.animationChainPlayers = {};
            this.animationChainBalls = {};
            this.animationChainIntermediates = {};
            this.animationChainBoardId = null;
        }

        // Clear existing paths
        pathsLayer.innerHTML = '';

        // Create arrow marker definitions for the paths
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'path-arrow');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '0');  // Position at back of arrow to prevent overlap with path line
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('markerUnits', 'strokeWidth');
        marker.setAttribute('opacity', AppState.pathOpacity); // Set opacity on marker itself

        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
        arrowPath.setAttribute('fill', AppState.pathColor);
        // Don't set opacity here - let it inherit from marker

        marker.appendChild(arrowPath);
        defs.appendChild(marker);
        pathsLayer.appendChild(defs);

        // Check if we're on a child board
        if (!AppState.isChildBoard()) {
            // Not a child board - clear ghosts and update progress bar to 0
            if (!skipGhostRender) {
                const playersLayer = document.getElementById('board-area');
                if (playersLayer) {
                    playersLayer.querySelectorAll('.ghost-player, .ghost-ball').forEach(el => el.remove());
                }
            }

            // Update progress bar for root board (should be 0)
            if (!AppState.isAnimating && animationProgress === null) {
                this.updateProgressBarForCurrentBoard();
            }

            return;
        }

        const canvas = AppState.canvas;
        if (!canvas) return;

        // Render dotted path lines based on animation state
        const shouldShowPaths = AppState.isAnimating ? AppState.animationShowPathsAnimation : AppState.animationShowPaths;
        if (shouldShowPaths) {
            // Use canvas internal size for paths (SVG coordinates)
            const scaleX = canvas.width / AppState.boardWidth;
            const scaleY = canvas.height / AppState.boardHeight;

            // Determine if we should show all ancestor paths or just immediate parent
            const showAllAncestorPaths = AppState.animationShowAllPaths === true;

            // Draw paths for players
            AppState.players.forEach(player => {
                // Check if we should render with animation progress (either actively animating or paused with progress)
                if ((AppState.isAnimating || animationProgress !== null) && this.animationChainPlayers) {
                    // During animation or paused state, render path based on toggle
                    const chainPositions = this.animationChainPlayers[player.id];
                    if (!chainPositions || chainPositions.length < 2) return;

                    const key = `player-${player.id}`;
                    const allIntermediates = this.animationChainIntermediates[key] || [];

                    // Calculate which phase we're in (same as animatePlayersAlongChain)
                    const phaseProgress = animationProgress * this.animationPhaseCount;
                    const currentPhase = Math.min(Math.floor(phaseProgress), this.animationPhaseCount - 1);
                    const progressInPhase = currentPhase === this.animationPhaseCount - 1
                        ? Math.min(phaseProgress - currentPhase, 1)  // Clamp to 1 for last phase
                        : phaseProgress - currentPhase;

                    let startPos, endPos, renderIntermediates, segmentProgress, labels;

                    // Determine how to handle path visibility based on settings
                    const shouldShowOnlyCurrentPhase = AppState.animationRemovePathAfterFrame && !showAllAncestorPaths;

                    if (shouldShowOnlyCurrentPhase) {
                        // Only show current phase (remove past paths)
                        const clampedPhase = Math.min(currentPhase, chainPositions.length - 2);
                        startPos = chainPositions[clampedPhase];
                        endPos = chainPositions[clampedPhase + 1];
                        renderIntermediates = allIntermediates[clampedPhase + 1] || [];
                        segmentProgress = progressInPhase;

                        // Check if player actually moved in this phase
                        if (Math.abs(startPos.x - endPos.x) >= 1 || Math.abs(startPos.y - endPos.y) >= 1) {
                            labels = [String(clampedPhase + 1)];
                            this.renderPath(pathsLayer, startPos, endPos, renderIntermediates, scaleX, scaleY, key, 'player', segmentProgress, labels, false);
                        }
                    } else {
                        // Show completed and current phases (progressive animation)
                        for (let i = 0; i < chainPositions.length - 1; i++) {
                            startPos = chainPositions[i];
                            endPos = chainPositions[i + 1];
                            renderIntermediates = allIntermediates[i + 1] || [];

                            // Calculate if this phase should show progress
                            let thisSegmentProgress = null;
                            if (i < currentPhase) {
                                // Already completed - show full path
                                thisSegmentProgress = 1;
                            } else if (i === currentPhase) {
                                // Current phase - show progressive animation
                                thisSegmentProgress = progressInPhase;
                            } else {
                                // Future phases - don't show
                                continue;
                            }

                            // Check if player actually moved in this phase
                            if (Math.abs(startPos.x - endPos.x) >= 1 || Math.abs(startPos.y - endPos.y) >= 1) {
                                labels = [String(i + 1)];
                                this.renderPath(pathsLayer, startPos, endPos, renderIntermediates, scaleX, scaleY, key, 'player', thisSegmentProgress, labels, false);
                            }
                        }
                    }
                } else {
                    // Not animating - check if we should show all paths or just immediate parent
                    const key = `player-${player.id}`;
                    const intermediates = AppState.pathIntermediates[key] || [];

                    // IMPORTANT: Only show parent frame paths if "Show all paths" is explicitly enabled
                    if (showAllAncestorPaths) {
                        // Show all paths from ancestry chain as separate paths
                        const boardChain = AppState.getBoardAncestryChain();
                        if (boardChain.length < 2) return;

                        // Render each board transition as a separate path
                        for (let i = 0; i < boardChain.length - 1; i++) {
                            const parentBoard = boardChain[i];
                            const childBoard = boardChain[i + 1];
                            const isCurrentFrame = (i === boardChain.length - 2);

                            // Get player positions in parent and child boards
                            const playerInParent = (parentBoard.players || []).find(p => p.id === player.id);
                            const playerInChild = (childBoard.players || []).find(p => p.id === player.id);

                            if (!playerInParent || !playerInChild) continue;

                            const startPos = {
                                x: playerInParent.x,
                                y: playerInParent.y,
                                rotation: playerInParent.rotation || 0
                            };

                            const endPos = {
                                x: playerInChild.x,
                                y: playerInChild.y,
                                rotation: playerInChild.rotation || 0
                            };

                            // Check if player moved
                            if (Math.abs(startPos.x - endPos.x) < 1 && Math.abs(startPos.y - endPos.y) < 1) {
                                continue; // Player didn't move, don't show path
                            }

                            // Get intermediates from child board (only for current frame)
                            const pathIntermediates = isCurrentFrame ? intermediates : (childBoard.pathIntermediates?.[key] || []);

                            const label = [String(i + 1)];

                            // Only current frame is selectable
                            this.renderPath(pathsLayer, startPos, endPos, pathIntermediates, scaleX, scaleY, key, 'player', null, label, isCurrentFrame);
                        }
                    } else {
                        // Show only immediate parent path
                        const startPos = AppState.parentPlayerPositions[player.id];
                        if (!startPos) return; // No parent position
                        const endPos = { x: player.x, y: player.y, rotation: player.rotation || 0 };

                        // Check if player moved
                        if (Math.abs(startPos.x - endPos.x) < 1 && Math.abs(startPos.y - endPos.y) < 1) {
                            return; // Player didn't move, don't show path
                        }

                        // Calculate which segment number this is
                        const boardChain = AppState.getBoardAncestryChain();
                        const segmentNumber = boardChain.length - 1; // Last transition
                        const labels = [String(segmentNumber)];

                        this.renderPath(pathsLayer, startPos, endPos, intermediates, scaleX, scaleY, key, 'player', null, labels, true);
                    }
                }
            });

            // Draw paths for balls (always straight, no intermediates)
            AppState.balls.forEach(ball => {
                // Check if we should render with animation progress (either actively animating or paused with progress)
                if ((AppState.isAnimating || animationProgress !== null) && this.animationChainBalls) {
                    // During animation or paused state, render path based on toggle
                    const chainPositions = this.animationChainBalls[ball.id];
                    if (!chainPositions || chainPositions.length < 2) return;

                    const key = `ball-${ball.id}`;

                    let startPos, endPos, renderIntermediates, segmentProgress;

                    // Determine how to handle path visibility based on settings
                    const shouldShowOnlyCurrentSegment = AppState.animationRemovePathAfterFrame && !showAllAncestorPaths;

                    if (shouldShowOnlyCurrentSegment) {
                        // Only show current frame/segment (remove past paths)
                        const totalProgress = animationProgress * this.animationPhaseCount;
                        const segmentIndex = Math.floor(totalProgress);
                        const clampedIndex = Math.min(segmentIndex, chainPositions.length - 2);

                        // Calculate progress within current segment (0-1)
                        segmentProgress = totalProgress - segmentIndex;

                        startPos = chainPositions[clampedIndex];
                        endPos = chainPositions[clampedIndex + 1];
                        renderIntermediates = []; // Balls don't have intermediates

                        // Check if ball actually moved in this segment
                        if (Math.abs(startPos.x - endPos.x) >= 1 || Math.abs(startPos.y - endPos.y) >= 1) {
                            const labels = [String(clampedIndex + 1)];
                            this.renderPath(pathsLayer, startPos, endPos, renderIntermediates, scaleX, scaleY, key, 'ball', segmentProgress, labels, false);
                        }
                    } else {
                        // Show completed and current segments (progressive animation)
                        const totalProgress = animationProgress * this.animationPhaseCount;
                        const currentSegment = Math.floor(totalProgress);
                        const currentSegmentProgress = totalProgress - currentSegment;

                        for (let i = 0; i < chainPositions.length - 1; i++) {
                            startPos = chainPositions[i];
                            endPos = chainPositions[i + 1];
                            renderIntermediates = []; // Balls don't have intermediates

                            // Calculate if this segment should show progress
                            let thisSegmentProgress = null;
                            if (i < currentSegment) {
                                // Already completed segments - show full path
                                thisSegmentProgress = 1;
                            } else if (i === currentSegment) {
                                // Current segment - show progressive animation
                                thisSegmentProgress = currentSegmentProgress;
                            } else {
                                // Future segments - don't show
                                continue;
                            }

                            // Check if ball actually moved in this segment
                            if (Math.abs(startPos.x - endPos.x) >= 1 || Math.abs(startPos.y - endPos.y) >= 1) {
                                const labels = [String(i + 1)];
                                this.renderPath(pathsLayer, startPos, endPos, renderIntermediates, scaleX, scaleY, key, 'ball', thisSegmentProgress, labels, false);
                            }
                        }
                    }
                } else {
                    // Not animating - check if we should show all paths or just immediate parent
                    const key = `ball-${ball.id}`;

                    if (showAllAncestorPaths) {
                        // Show all paths from ancestry chain as separate paths
                        const boardChain = AppState.getBoardAncestryChain();
                        if (boardChain.length < 2) return;

                        // Render each board transition as a separate path
                        for (let i = 0; i < boardChain.length - 1; i++) {
                            const parentBoard = boardChain[i];
                            const childBoard = boardChain[i + 1];

                            // Get ball positions in parent and child boards
                            const ballInParent = (parentBoard.balls || []).find(b => b.id === ball.id);
                            const ballInChild = (childBoard.balls || []).find(b => b.id === ball.id);

                            if (!ballInParent || !ballInChild) continue;

                            const startPos = { x: ballInParent.x, y: ballInParent.y };
                            const endPos = { x: ballInChild.x, y: ballInChild.y };

                            // Check if ball moved
                            if (Math.abs(startPos.x - endPos.x) < 1 && Math.abs(startPos.y - endPos.y) < 1) {
                                continue; // Ball didn't move, don't show path
                            }

                            // Balls don't have intermediates
                            const label = [String(i + 1)];
                            this.renderPath(pathsLayer, startPos, endPos, [], scaleX, scaleY, key, 'ball', null, label, false);
                        }
                    } else {
                        // Show only immediate parent path
                        const startPos = AppState.parentBallPositions[ball.id];
                        if (!startPos) return; // No parent position
                        const endPos = { x: ball.x, y: ball.y };

                        // Check if ball moved
                        if (Math.abs(startPos.x - endPos.x) < 1 && Math.abs(startPos.y - endPos.y) < 1) {
                            return; // Ball didn't move, don't show path
                        }

                        // Calculate which segment number this is
                        const boardChain = AppState.getBoardAncestryChain();
                        const segmentNumber = boardChain.length - 1; // Last transition
                        const labels = [String(segmentNumber)];

                        // Ball paths are always straight - pass empty intermediates array
                        // Make ball paths selectable (true) so they can be clicked
                        this.renderPath(pathsLayer, startPos, endPos, [], scaleX, scaleY, key, 'ball', null, labels, true);
                    }
                }
            });
        }

        // Render intermediate ghost positions (skip if requested, e.g., during drag/rotate)
        if (!skipGhostRender) {
            this.renderIntermediateGhosts(animationProgress);
        }

        // Update progress bar to show current board's position in visible hierarchy
        // (only when not actively animating and not provided with explicit progress)
        // Skip if we have a paused animation in progress (pausedProgress between 0 and 1)
        // BUT: always update if we've navigated to a different board
        const hasPartialProgress = this.pausedProgress > 0 && this.pausedProgress < 1;
        const progressBoardChanged = this.lastProgressBoardId !== AppState.currentBoardId;

        if (!AppState.isAnimating && animationProgress === null && (!hasPartialProgress || progressBoardChanged)) {
            this.updateProgressBarForCurrentBoard();
            this.lastProgressBoardId = AppState.currentBoardId;
        }
    },

    // Render a single path (straight or curved)
    renderPath(pathsLayer, parentPos, currentObj, intermediates, scaleX, scaleY, key, type, animationProgress = null, labels = null, selectable = true) {
        // Guard against undefined/null objects
        if (!parentPos || !currentObj) {
            console.warn('renderPath called with invalid positions:', { parentPos, currentObj, key });
            return;
        }

        const fromX = parentPos.x * scaleX;
        const fromY = parentPos.y * scaleY;
        const toX = currentObj.x * scaleX;
        const toY = currentObj.y * scaleY;

        // Build all points for the path
        const allPoints = [
            { x: fromX, y: fromY },
            ...intermediates.map(p => ({ x: p.x * scaleX, y: p.y * scaleY })),
            { x: toX, y: toY }
        ];

        // If animating, calculate the endpoint based on progress
        let pathPoints = allPoints;
        if (animationProgress !== null && animationProgress < 1) {
            pathPoints = this.getPathPointsUpToProgress(allPoints, animationProgress);
        }

        // Shorten the path so the arrow is positioned back from the target
        if (pathPoints.length >= 2) {
            const lastPoint = pathPoints[pathPoints.length - 1];
            const secondLastPoint = pathPoints[pathPoints.length - 2];

            // Calculate direction vector
            const dx = lastPoint.x - secondLastPoint.x;
            const dy = lastPoint.y - secondLastPoint.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            // Shorten by different amounts based on type: players 150, balls 80 board units
            const shortenByBoardUnits = type === 'player' ? 150 : 100;
            const shortenBy = shortenByBoardUnits * scaleX;

            if (length > shortenBy) {
                // Normalize and shorten
                const ratio = (length - shortenBy) / length;
                pathPoints = [...pathPoints];
                pathPoints[pathPoints.length - 1] = {
                    x: secondLastPoint.x + dx * ratio,
                    y: secondLastPoint.y + dy * ratio
                };
            }
        }

        // Build path data
        let pathData;
        if (pathPoints.length === 0) {
            return; // No path to draw
        } else if (pathPoints.length === 1) {
            // Just a point, draw a small circle instead
            pathData = `M ${pathPoints[0].x} ${pathPoints[0].y} L ${pathPoints[0].x} ${pathPoints[0].y}`;
        } else {
            pathData = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
            for (let i = 1; i < pathPoints.length; i++) {
                pathData += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
            }
        }

        // Create invisible hit area path element (wider stroke with low opacity)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#000000'); // Use visible color
        path.setAttribute('stroke-width', '20'); // Wider hit area for better clicking
        path.setAttribute('opacity', '0.01'); // Nearly invisible via opacity attribute
        path.setAttribute('fill', 'none');
        path.classList.add('path-line');
        path.dataset.pathKey = key;
        // Enable pointer events for all selectable paths (players, balls, etc.)
        // Use 'all' to ensure all mouse/touch events are captured
        path.style.pointerEvents = selectable ? 'all' : 'none';
        path.style.cursor = selectable ? 'pointer' : 'default';

        // Visible path on top
        const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        visiblePath.setAttribute('d', pathData);
        visiblePath.setAttribute('stroke', AppState.pathColor);
        visiblePath.setAttribute('stroke-width', '2');
        visiblePath.setAttribute('stroke-dasharray', '5,5');
        visiblePath.setAttribute('stroke-opacity', AppState.pathOpacity); // Use stroke-opacity instead
        visiblePath.setAttribute('fill', 'none');
        // Show arrow except at the very start (progress = 0) where path hasn't been drawn yet
        const shouldShowArrow = animationProgress === null || animationProgress > 0;
        if (shouldShowArrow) {
            visiblePath.setAttribute('marker-end', 'url(#path-arrow)');
        }
        visiblePath.style.pointerEvents = 'none';
        visiblePath.classList.add('path-line-visible');
        visiblePath.dataset.pathKey = key;

        // Add selection class if this path is selected
        if (AppState.selectedPath === key) {
            visiblePath.classList.add('path-selected');
        }

        pathsLayer.appendChild(path);
        pathsLayer.appendChild(visiblePath);

        // Check if we should show labels based on animation state
        const shouldShowLabels = AppState.isAnimating ? AppState.animationShowPathLabelsAnimation : AppState.animationShowPathLabels;

        // Add labels to path segments if provided and labels are enabled
        if (shouldShowLabels && labels && labels.length > 0 && allPoints.length >= 2) {
            const labelPositions = [];
            // During animation use allPoints (full path) so labels stay at fixed positions.
            // For static display use pathPoints (the actual rendered path, shortened for the arrow)
            // so the label is centred on the visible line.
            const labelRefPoints = animationProgress !== null ? allPoints : pathPoints;
            this.collectLabelPositions(labelPositions, labelRefPoints, intermediates, labels, animationProgress);

            // Render labels
            for (const labelInfo of labelPositions) {
                this.renderPathLabel(pathsLayer, labelInfo.x, labelInfo.y, labelInfo.label);
            }
        }

        // Circle removed - we now use arrows to indicate path direction
    },

    // Collect label positions for a path
    collectLabelPositions(labelPositions, allPoints, intermediates, labels, animationProgress) {
        const letters = 'abcdefghijklmnopqrstuvwxyz';

        if (labels.length === 1 && intermediates.length === 0) {
            // Single board transition, no ghosts - just one label
            if (animationProgress === null || animationProgress >= 0.5) {
                const midX = (allPoints[0].x + allPoints[allPoints.length - 1].x) / 2;
                const midY = (allPoints[0].y + allPoints[allPoints.length - 1].y) / 2;
                labelPositions.push({ x: midX, y: midY, label: labels[0] });
            }
        } else if (labels.length === 1 && intermediates.length > 0) {
            // Single board transition with ghost intermediates
            for (let i = 0; i < allPoints.length - 1; i++) {
                const segmentCount = allPoints.length - 1;
                const segmentStart = i / segmentCount;
                const segmentEnd = (i + 1) / segmentCount;
                const segmentMid = (segmentStart + segmentEnd) / 2;

                if (animationProgress === null || animationProgress >= segmentMid) {
                    const start = allPoints[i];
                    const end = allPoints[i + 1];
                    const midX = (start.x + end.x) / 2;
                    const midY = (start.y + end.y) / 2;
                    const label = labels[0] + letters[i];
                    labelPositions.push({ x: midX, y: midY, label });
                }
            }
        } else {
            // Multiple board transitions
            const numBoardTransitions = labels.length;
            const numBoardIntermediates = numBoardTransitions - 1;
            const numGhostIntermediates = intermediates.length - numBoardIntermediates;
            const totalSegments = allPoints.length - 1;

            let segmentIndex = 0;
            for (let labelIndex = 0; labelIndex < numBoardTransitions; labelIndex++) {
                const baseLabel = labels[labelIndex];
                const isLastTransition = (labelIndex === numBoardTransitions - 1);
                const hasGhostsInThisSegment = isLastTransition && numGhostIntermediates > 0;

                if (hasGhostsInThisSegment) {
                    const numSubSegments = numGhostIntermediates + 1;
                    for (let subIdx = 0; subIdx < numSubSegments; subIdx++) {
                        const segmentStart = segmentIndex / totalSegments;
                        const segmentEnd = (segmentIndex + 1) / totalSegments;
                        const segmentMid = (segmentStart + segmentEnd) / 2;

                        if (animationProgress === null || animationProgress >= segmentMid) {
                            const start = allPoints[segmentIndex];
                            const end = allPoints[segmentIndex + 1];
                            const midX = (start.x + end.x) / 2;
                            const midY = (start.y + end.y) / 2;
                            const label = baseLabel + letters[subIdx];
                            labelPositions.push({ x: midX, y: midY, label });
                        }
                        segmentIndex++;
                    }
                } else {
                    const segmentStart = segmentIndex / totalSegments;
                    const segmentEnd = (segmentIndex + 1) / totalSegments;
                    const segmentMid = (segmentStart + segmentEnd) / 2;

                    if (animationProgress === null || animationProgress >= segmentMid) {
                        const start = allPoints[segmentIndex];
                        const end = allPoints[segmentIndex + 1];
                        const midX = (start.x + end.x) / 2;
                        const midY = (start.y + end.y) / 2;
                        labelPositions.push({ x: midX, y: midY, label: baseLabel });
                    }
                    segmentIndex++;
                }
            }
        }
    },

    // Render a label on the path with white circle background
    renderPathLabel(pathsLayer, x, y, label) {
        const fontSize = 12;
        const radius = 8; // Circle radius

        // Create white circle background with same opacity as path
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', 'white');
        circle.setAttribute('opacity', AppState.pathOpacity);
        circle.style.pointerEvents = 'none';
        pathsLayer.appendChild(circle);

        // Place text directly on the path
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', fontSize);
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', AppState.pathColor);
        text.setAttribute('opacity', AppState.pathOpacity);
        text.style.pointerEvents = 'none';
        text.textContent = label;
        pathsLayer.appendChild(text);
    },

    // Render intermediate ghost positions (only for players, not balls)
    renderIntermediateGhosts(animationProgress = null) {
        const playersLayer = document.getElementById('board-area');
        if (!playersLayer) return;

        // Clear all existing ghost elements first
        playersLayer.querySelectorAll('.ghost-player, .ghost-ball').forEach(el => el.remove());

        // Check which toggle to respect based on animation state
        if (AppState.isAnimating) {
            // During animation, check the "show ghosts during animation" toggle
            if (!AppState.animationShowGhostsAnimation) {
                return;
            }
        } else {
            // When not animating, check the "show ghosts on board" toggle
            if (!AppState.animationShowGhostsBoard) {
                return;
            }
        }

        // Use canvas internal size (same as Board.boardToScreen)
        const scaleX = AppState.canvas.width / AppState.boardWidth;
        const scaleY = AppState.canvas.height / AppState.boardHeight;

        // Calculate canvas rect ONCE for all ghosts to avoid reflow issues
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const displayScaleX = canvasRect.width / AppState.boardWidth;

        // Calculate current phase if animating or paused mid-animation
        let currentPhase = null;
        let progressInPhase = null;

        // Determine which progress to use: explicit parameter, paused progress, or none
        let effectiveProgress = null;
        if (animationProgress !== null) {
            // Always use explicit progress parameter if provided (regardless of animation state)
            effectiveProgress = animationProgress;
        } else if (!AppState.isAnimating && this.pausedProgress > 0 && this.pausedProgress < 1) {
            // When paused mid-animation, use pausedProgress to filter ghosts
            effectiveProgress = this.pausedProgress;
        }

        if (effectiveProgress !== null) {
            const phaseProgress = effectiveProgress * this.animationPhaseCount;
            currentPhase = Math.min(Math.floor(phaseProgress), this.animationPhaseCount - 1);
            progressInPhase = currentPhase === this.animationPhaseCount - 1
                ? Math.min(phaseProgress - currentPhase, 1)
                : phaseProgress - currentPhase;
        }

        // Determine which ghosts to show
        if (AppState.animationShowAllGhosts && AppState.isChildBoard()) {
            // Show all ghosts from ancestry chain
            const boardChain = AppState.getBoardAncestryChain();

            // First, render the starting positions from the root board as ghosts
            // Always show the root/start position ghost
            const rootBoard = boardChain[0];
            AppState.players.forEach(player => {
                const playerInRoot = (rootBoard.players || []).find(p => p.id === player.id);
                if (!playerInRoot) return;

                const startPos = {
                    x: playerInRoot.x,
                    y: playerInRoot.y,
                    rotation: playerInRoot.rotation || 0
                };

                // Create unique ghost ID for root position
                const ghostId = `ghost-root-player-${player.id}`;
                const element = this.createGhostPlayerSVG(player, startPos, scaleX, scaleY, ghostId, displayScaleX, false);
                playersLayer.appendChild(element);
            });

            // For each board transition in the chain, render ghosts
            for (let i = 0; i < boardChain.length - 1; i++) {
                const parentBoard = boardChain[i];
                const childBoard = boardChain[i + 1];
                const isCurrentFrame = (i === boardChain.length - 2); // Last transition is the current frame

                // Get pathIntermediates from the child board (they represent transition from parent to child)
                const pathIntermediates = childBoard.pathIntermediates || {};

                // Render intermediate waypoint ghosts
                Object.keys(pathIntermediates).forEach(key => {
                    const intermediates = pathIntermediates[key];
                    if (!intermediates || intermediates.length === 0) return;

                    const parts = key.split('-');
                    const type = parts[0]; // 'player' or 'ball'
                    const id = parts.slice(1).join('-');

                    // Only render ghosts for player paths
                    if (type === 'player') {
                        const player = AppState.getPlayer(id);
                        if (!player) return;

                        intermediates.forEach((pos, index) => {
                            // During animation, only show ghosts that have been reached
                            if (AppState.isAnimating && currentPhase !== null) {
                                if (i > currentPhase) {
                                    // Future phase - don't show ghost
                                    return;
                                }
                                if (i === currentPhase && progressInPhase < (index + 1) / (intermediates.length + 1)) {
                                    // Current phase but ghost not reached yet
                                    return;
                                }
                            }

                            // Create unique ghost ID including board transition index
                            const ghostId = `ghost-board${i}-${key}-${index}`;
                            // Only current frame ghosts are selectable
                            const element = this.createGhostPlayerSVG(player, pos, scaleX, scaleY, ghostId, displayScaleX, isCurrentFrame);
                            playersLayer.appendChild(element);
                        });
                    }
                });

                // Also render player end positions from parent frames as ghosts
                // (Don't render for current frame - real players are already visible there)
                if (!isCurrentFrame) {
                    // During animation, only show end position ghosts if that phase is complete
                    if (AppState.isAnimating && currentPhase !== null && i >= currentPhase) {
                        // Phase not complete yet - don't show end ghost
                        return;
                    }

                    AppState.players.forEach(player => {
                        const key = `player-${player.id}`;

                        // Get player position in the child board (end position of this transition)
                        const playerInChild = (childBoard.players || []).find(p => p.id === player.id);
                        if (!playerInChild) return;

                        const endPos = {
                            x: playerInChild.x,
                            y: playerInChild.y,
                            rotation: playerInChild.rotation || 0
                        };

                        // Create unique ghost ID for end position
                        const ghostId = `ghost-board${i}-${key}-end`;
                        const element = this.createGhostPlayerSVG(player, endPos, scaleX, scaleY, ghostId, displayScaleX, false);
                        playersLayer.appendChild(element);
                    });
                }
            }
        } else {
            // Show only current board's ghosts (immediate parent transition)
            // The current board's pathIntermediates represent the transition TO the current board,
            // which is the LAST phase of the animation sequence (animationPhaseCount - 1)
            const lastPhase = this.animationPhaseCount - 1;

            // During animation/paused, only show these intermediates if we're in the last phase
            if (currentPhase !== null && currentPhase < lastPhase) {
                // We haven't reached the last phase yet - don't show current board's ghosts
                return;
            }

            Object.keys(AppState.pathIntermediates).forEach(key => {
                const intermediates = AppState.pathIntermediates[key];
                if (!intermediates || intermediates.length === 0) return;

                const parts = key.split('-');
                const type = parts[0]; // 'player' or 'ball'
                const id = parts.slice(1).join('-');

                // Only render ghosts for player paths
                if (type === 'player') {
                    intermediates.forEach((pos, index) => {
                        const player = AppState.getPlayer(id);
                        if (!player) return;

                        // If we're in the last phase, check if this specific ghost has been reached
                        if (currentPhase !== null && currentPhase === lastPhase && progressInPhase !== null) {
                            if (progressInPhase < (index + 1) / (intermediates.length + 1)) {
                                // Ghost not reached yet within this phase
                                return;
                            }
                        }

                        // Create ghost player element - pass cached displayScaleX
                        const ghostId = `ghost-${key}-${index}`;
                        const element = this.createGhostPlayerSVG(player, pos, scaleX, scaleY, ghostId, displayScaleX, true);
                        playersLayer.appendChild(element);
                    });
                }
                // Ball paths don't support intermediates
            });
        }
    },

    // Create ghost player element at intermediate position (HTML div, not SVG)
    createGhostPlayerSVG(player, pos, scaleX, scaleY, ghostId, displayScaleX, selectable = true) {
        // Use cached displayScaleX to avoid reflow issues
        const playerSize = 100 * displayScaleX;
        const halfSize = playerSize / 2;

        // Position from Board.boardToScreen (canvas internal coordinates)
        const screenPos = Board.boardToScreen(pos.x, pos.y);

        // Extract path key from ghost ID
        const parts = ghostId.split('-');
        let pathKey;
        if (parts[1] && parts[1].startsWith('board')) {
            // Format: ghost-board0-player-{id}-{index} or ghost-root-player-{id}
            pathKey = `${parts[2]}-${parts.slice(3, -1).join('-')}`;
        } else if (parts[1] === 'root') {
            // Format: ghost-root-player-{id}
            pathKey = `${parts[2]}-${parts.slice(3).join('-')}`;
        } else {
            // Format: ghost-player-{id}-{index}
            pathKey = `${parts[1]}-${parts.slice(2, -1).join('-')}`;
        }

        // Create div element (same as real players)
        const div = document.createElement('div');
        div.className = 'ghost-player';
        if (AppState.selectedGhost === ghostId) {
            div.classList.add('ghost-selected');
        }
        div.id = ghostId;
        div.dataset.ghostKey = ghostId;
        div.dataset.pathKey = pathKey;

        // Get team color
        const team = AppState.getTeam(player.teamId);
        const color = team ? team.color : '#3498db';
        div.style.backgroundColor = color;

        // Size and position (match real players exactly)
        div.style.width = playerSize + 'px';
        div.style.height = playerSize + 'px';
        div.style.fontSize = (playerSize * 0.6) + 'px';
        div.style.position = 'absolute';
        div.style.left = (screenPos.x - halfSize) + 'px';
        div.style.top = (screenPos.y - halfSize) + 'px';
        div.style.borderRadius = '50%';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.fontWeight = 'bold';
        div.style.color = 'white';
        div.style.cursor = selectable ? 'move' : 'default';
        div.style.userSelect = 'none';
        div.style.pointerEvents = selectable ? 'all' : 'none';
        div.style.opacity = '0.5';
        div.style.zIndex = '6'; // Animation paths z-index

        // Add the ::before pseudo-element styling inline via a style element
        const beforeStyle = document.createElement('style');
        beforeStyle.textContent = `
            #${ghostId}::before {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background-color: inherit;
                border: 3px solid rgba(255,255,255,0.3);
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                z-index: 1;
            }
        `;
        document.head.appendChild(beforeStyle);

        // Get rotation from the position object passed in (not from current player)
        const rotation = pos.rotation !== undefined ? pos.rotation : 0;

        // Apply rotation
        if (rotation !== 0) {
            div.style.transform = `rotate(${rotation}deg)`;
        }

        // Create arms using the same function as real players
        if (typeof Players !== 'undefined') {
            const armsContainer = Players.createPlayerArms(playerSize, color);
            div.appendChild(armsContainer);
        }

        // Show player number
        const numberSpan = document.createElement('span');
        numberSpan.textContent = player.number || '?';
        numberSpan.className = 'player-number';
        numberSpan.style.color = Players.isBrightColor(color) ? '#000000' : '#ffffff';

        // Counter-rotate the number to keep it upright
        if (rotation !== 0) {
            numberSpan.style.transform = `rotate(${-rotation}deg)`;
            numberSpan.style.display = 'inline-block';
        }

        div.appendChild(numberSpan);

        // Add rotation handle (only show when selected)
        const isSelected = AppState.selectedGhost === ghostId;
        if (isSelected) {
            const handle = document.createElement('div');
            handle.className = 'ghost-rotation-handle';
            handle.style.position = 'absolute';
            handle.style.width = '8px';
            handle.style.height = '8px';
            handle.style.borderRadius = '50%';
            handle.style.backgroundColor = '#3498db';
            handle.style.border = '2px solid #fff';
            handle.style.cursor = 'pointer';
            handle.style.left = '50%';
            handle.style.top = '-15px';
            handle.style.transform = 'translateX(-50%)';
            handle.style.zIndex = '1000';
            handle.style.pointerEvents = 'all';
            div.appendChild(handle);
        }

        return div;
    },

    // Create ghost ball SVG at intermediate position
    createGhostBallSVG(ball, pos, scaleX, scaleY, ghostId) {
        const x = pos.x * scaleX;
        const y = pos.y * scaleY;
        const width = 60 * scaleX;
        const height = 60 * scaleY;

        // Extract path key from ghost ID
        const parts = ghostId.split('-');
        const pathKey = `${parts[1]}-${parts.slice(2, -1).join('-')}`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'ghost-ball');
        if (AppState.selectedPath === pathKey) {
            svg.classList.add('ghost-selected');
        }
        svg.setAttribute('id', ghostId);
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.position = 'absolute';
        svg.style.left = x + 'px';
        svg.style.top = y + 'px';
        svg.style.overflow = 'visible';
        svg.style.pointerEvents = 'all';
        svg.style.cursor = 'move';
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.style.transform = `translate(${-width/2}px, ${-height/2}px)`;
        svg.style.opacity = '0.2';
        svg.dataset.ghostKey = `${ghostId}`;

        // Create ball using Balls module SVG
        if (typeof Balls !== 'undefined') {
            svg.innerHTML = Balls.createBallSVG(ball.color || 'white');
        }

        return svg;
    },

    /**
     * Inject a Duration EBML element into a WebM blob's SegmentInfo block.
     *
     * MediaRecorder never writes the Duration field, so video players cannot
     * display the total length or seek accurately. This function parses the
     * binary EBML structure, locates SegmentInfo (ID 0x1549A966), and prepends
     * an 11-byte Duration element (ID 0x4489, Float64 value in ms).
     *
     * Returns the original blob unchanged if SegmentInfo is not found or if
     * Duration is already present.
     */
    async injectWebmDuration(blob, durationMs) {
        const buffer = await blob.arrayBuffer();
        const data = new Uint8Array(buffer);

        // Locate SegmentInfo element: ID 15 49 A9 66
        let siPos = -1;
        for (let i = 0; i < data.length - 4; i++) {
            if (data[i] === 0x15 && data[i+1] === 0x49 && data[i+2] === 0xA9 && data[i+3] === 0x66) {
                siPos = i;
                break;
            }
        }
        if (siPos < 0) return blob;

        // Read the VINT-encoded size that immediately follows the 4-byte ID.
        const sizePos = siPos + 4;
        const fb = data[sizePos];
        let vintLen, segSize;
        if (fb & 0x80)      { vintLen = 1; segSize = fb & 0x7F; }
        else if (fb & 0x40) { vintLen = 2; segSize = ((fb & 0x3F) << 8) | data[sizePos + 1]; }
        else if (fb & 0x20) { vintLen = 3; segSize = ((fb & 0x1F) << 16) | (data[sizePos+1] << 8) | data[sizePos+2]; }
        else return blob; // Unknown-size or unsupported VINT — skip

        const dataStart = sizePos + vintLen;

        // If Duration (ID 44 89) already exists, return unchanged.
        for (let i = dataStart; i < dataStart + segSize - 1; i++) {
            if (data[i] === 0x44 && data[i+1] === 0x89) return blob;
        }

        // Build the 11-byte Duration EBML element.
        //   ID (2 B): 44 89
        //   VINT size = 8 (1 B): 88
        //   Float64 big-endian (8 B): durationMs
        const dur = new Uint8Array(11);
        dur[0] = 0x44; dur[1] = 0x89;
        dur[2] = 0x88;
        new DataView(dur.buffer).setFloat64(3, durationMs, false);

        // Re-encode the SegmentInfo VINT size (old + 11).
        // Encodes as the minimum number of VINT bytes that fits the new value.
        const newSegSize = segSize + 11;
        let newVint;
        if (newSegSize < 0x7F)     { newVint = new Uint8Array([0x80 | newSegSize]); }
        else if (newSegSize < 0x3FFF) {
            newVint = new Uint8Array([0x40 | (newSegSize >> 8), newSegSize & 0xFF]);
        } else {
            newVint = new Uint8Array([
                0x20 | (newSegSize >> 16),
                (newSegSize >> 8) & 0xFF,
                newSegSize & 0xFF
            ]);
        }

        // Reconstruct: everything up to and including the SegmentInfo ID +
        // new VINT + Duration element + original SegmentInfo data + tail.
        const head = data.slice(0, siPos + 4); // includes the 4-byte SegmentInfo ID
        const tail = data.slice(dataStart);    // existing SegmentInfo data + everything after

        const out = new Uint8Array(head.length + newVint.length + dur.length + tail.length);
        let off = 0;
        out.set(head, off);    off += head.length;
        out.set(newVint, off); off += newVint.length;
        out.set(dur, off);     off += dur.length;
        out.set(tail, off);

        return new Blob([out], { type: blob.type });
    },
};
