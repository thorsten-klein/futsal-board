// Application state management
const AppState = {
    // Canvas and board (matches court.svg viewBox)
    canvas: null,
    ctx: null,
    boardWidth: 4500,  // Matches court.svg viewBox width
    boardHeight: 2500, // Matches court.svg viewBox height
    pitchOffsetX: 250, // Pitch offset in court.svg
    pitchOffsetY: 250, // Pitch offset in court.svg

    // Current tool
    currentTool: 'select',

    // Players
    players: [],
    selectedPlayer: null,
    draggedPlayer: null,
    dragOffset: { x: 0, y: 0 },

    // Teams
    teams: [],
    nextPlayerId: 1,
    teamPlayerNumbers: {}, // Track used numbers per team

    // Undo/Redo
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,
    isUndoRedoAction: false, // Flag to prevent history recording during undo/redo

    // Delta-based history: keys tracked per snapshot
    _histKeys: ['players', 'drawings', 'elements', 'balls', 'plates', 'shapes', 'teams', 'teamPlayerNumbers', 'pathIntermediates',
        'animationDuration', 'animationFPS', 'animationShowPaths', 'animationShowAllPaths', 'animationShowAllGhosts',
        'animationShowPathsAnimation', 'animationShowGhostsBoard', 'animationShowGhostsAnimation',
        'animationShowPathLabels', 'animationShowPathLabelsAnimation', 'animationRemovePathAfterFrame',
        'animationRepeat', 'animationCropVideo', 'showOnlyChangedObjects'],
    _histSnap: null, // { [key]: string } — JSON serializations for change detection

    // Drawings (arrows and lines)
    drawings: [],
    currentDrawing: null,
    drawingStart: null,

    // Elements (cone, flag, goal, ladder)
    elements: [],
    nextElementId: 1,
    selectedElement: null,
    draggedElement: null,

    // Balls (separate from elements, always draggable)
    balls: [],
    nextBallId: 1,
    selectedBall: null,
    draggedBall: null,

    // Plates (training plates, always draggable)
    plates: [],
    nextPlateId: 1,
    selectedPlate: null,
    draggedPlate: null,

    // Shapes (drawable shapes: line, arrow, rectangle, circle, ellipse)
    shapes: [],
    nextShapeId: 1,
    selectedShape: null,
    draggedShape: null,

    // Current object being displayed in position display
    currentDisplayObject: null,
    currentDisplayType: null, // 'element', 'ball', 'plate', 'player', 'shape'

    // Animation
    isAnimating: false,
    animationDuration: 2000, // Duration per frame in milliseconds
    animationFrame: null,
    playerStartPositions: [],
    ballStartPositions: [],
    animationShowPaths: true,
    animationShowAllPaths: false,
    animationShowAllGhosts: false,
    animationShowPathsAnimation: true,
    animationShowGhostsBoard: true,
    animationShowGhostsAnimation: false,
    animationShowPathLabels: true,
    animationShowPathLabelsAnimation: true,
    animationRemovePathAfterFrame: true,
    animationRepeat: false,
    animationCropVideo: true,
    animationFPS: 15, // Frames per second for video export
    playbackSpeed: 1.0, // Current board's playback speed multiplier (0.4 - 2.0)
    showOnlyChangedObjects: false,
    showBoardBreadcrumb: true,
    breadcrumbTrail: [], // Transient: list of board IDs root→deepest-visited; not persisted

    // Parent positions for showing paths on child boards
    parentPlayerPositions: {}, // Map of player ID to parent position
    parentBallPositions: {}, // Map of ball ID to parent position
    parentShapePositions: {}, // Map of shape ID to parent position
    pathColor: '#000000', // Color for parent position paths
    pathOpacity: 0.3, // Opacity for parent position paths (0-1)
    pathIntermediates: {}, // Map of 'player-{id}' or 'ball-{id}' to array of {x, y} intermediate positions
    selectedPath: null, // Currently selected path (key format: 'player-{id}' or 'ball-{id}')
    selectedGhost: null, // Currently selected ghost (ghostId format: 'ghost-player-{id}-{index}')

    // Storage
    formations: [],

    // Workbook with multiple boards
    workbookName: 'My Futsal-Boards',
    boards: [],
    currentBoardId: null,
    nextBoardId: 1,
    currentFileHandle: null, // File System Access API handle for auto-save

    // Initialize state
    init() {
        this.loadFromLocalStorage();

        // Initialize default teams if none exist
        if (this.teams.length === 0) {
            this.teams = [
                { id: 'team-1', color: '#3498db', name: 'Blue' },
                { id: 'team-2', color: '#e74c3c', name: 'Red' }
            ];
        }

        // Initialize team player numbers tracking if needed
        if (!this.teamPlayerNumbers || typeof this.teamPlayerNumbers !== 'object') {
            this.teamPlayerNumbers = {};
        }

        // Rebuild number tracking from existing players
        this.teams.forEach(team => {
            if (!this.teamPlayerNumbers[team.id]) {
                this.teamPlayerNumbers[team.id] = [];
            }
        });

        this.players.forEach(player => {
            if (player.number && player.teamId) {
                if (!this.teamPlayerNumbers[player.teamId]) {
                    this.teamPlayerNumbers[player.teamId] = [];
                }
                if (!this.teamPlayerNumbers[player.teamId].includes(player.number)) {
                    this.teamPlayerNumbers[player.teamId].push(player.number);
                }
            }
        });
    },


    // Get player by ID
    getPlayer(id) {
        return this.players.find(p => p.id === id);
    },

    // Get team by ID
    getTeam(id) {
        return this.teams.find(t => t.id === id);
    },

    // Get element by ID
    getElement(id) {
        return this.elements.find(e => e.id === id);
    },

    // Get ball by ID
    getBall(id) {
        return this.balls.find(b => b.id === id);
    },

    // Get plate by ID
    getPlate(id) {
        return this.plates.find(p => p.id === id);
    },

    // Add a team
    addTeam() {
        const colors = ['#FFD700', '#2ecc71', '#FFFFFF', '#9b59b6', '#FF69B4', '#FF6B35'];
        const names = ['Yellow', 'Green', 'White', 'Lila', 'Pink', 'Orange'];
        const index = this.teams.length - 2; // -2 because we start with 2 teams
        const color = colors[index % colors.length];
        const name = names[index % names.length];

        const newTeam = {
            id: `team-${Date.now()}`,
            color: color,
            name: name
        };

        this.teams.push(newTeam);
        this.teamPlayerNumbers[newTeam.id] = [];
        this.saveToLocalStorage();
        return newTeam;
    },

    // Remove a team
    removeTeam(teamId) {
        // Remove all players from this team
        this.players = this.players.filter(p => p.teamId !== teamId);

        // Remove the team
        this.teams = this.teams.filter(t => t.id !== teamId);

        // Remove number tracking for this team
        delete this.teamPlayerNumbers[teamId];

        this.saveToLocalStorage();
    },

    // Get next available number for a team
    getNextPlayerNumber(teamId) {
        if (!this.teamPlayerNumbers[teamId]) {
            this.teamPlayerNumbers[teamId] = [];
        }

        const usedNumbers = this.teamPlayerNumbers[teamId];

        // Find the smallest available number starting from 1
        let number = 1;
        while (usedNumbers.includes(number)) {
            number++;
        }

        return number;
    },

    // Add player to court
    addPlayer(teamId, x, y, rotation = 0) {
        const team = this.getTeam(teamId);
        if (!team) return null;

        // Get next available number
        const number = this.getNextPlayerNumber(teamId);

        const playerId = `player-${this.nextPlayerId++}`;
        const player = {
            id: playerId,
            teamId: teamId,
            number: number,
            x: x,
            y: y,
            rotation: rotation, // rotation angle in degrees
            visible: true
        };

        // Mark number as used
        if (!this.teamPlayerNumbers[teamId]) {
            this.teamPlayerNumbers[teamId] = [];
        }
        this.teamPlayerNumbers[teamId].push(number);

        if (this.isChildBoard()) {
            player._explicitlySet = true;
        }

        this.players.push(player);
        this.saveToLocalStorage();
        return player;
    },

    // Remove player
    removePlayer(playerId) {
        const player = this.getPlayer(playerId);
        if (player) {
            // Return the number to available pool
            if (this.teamPlayerNumbers[player.teamId]) {
                const index = this.teamPlayerNumbers[player.teamId].indexOf(player.number);
                if (index > -1) {
                    this.teamPlayerNumbers[player.teamId].splice(index, 1);
                }
            }
        }

        this.players = this.players.filter(p => p.id !== playerId);
        this.saveToLocalStorage();
    },

    // Add element to board
    addElement(type, x, y, color = null, rotation = 0) {
        const elementId = `element-${this.nextElementId++}`;
        const element = {
            id: elementId,
            type: type,
            x: x,
            y: y,
            color: color, // null means use default color
            rotation: rotation, // rotation angle in degrees
            visible: true
        };

        this.elements.push(element);
        this.saveToLocalStorage();
        return element;
    },

    // Remove element
    removeElement(elementId) {
        this.elements = this.elements.filter(e => e.id !== elementId);
        this.saveToLocalStorage();
    },

    // Add ball to board
    addBall(color, x, y) {
        const ballId = `ball-${this.nextBallId++}`;
        const ball = {
            id: ballId,
            color: color,
            x: x,
            y: y,
            visible: true
        };

        if (this.isChildBoard()) {
            ball._explicitlySet = true;
        }

        this.balls.push(ball);
        this.saveToLocalStorage();
        return ball;
    },

    // Remove ball
    removeBall(ballId) {
        this.balls = this.balls.filter(b => b.id !== ballId);
        this.saveToLocalStorage();
    },

    // Add plate to board
    addPlate(color, x, y) {
        const plateId = `plate-${this.nextPlateId++}`;
        const plate = {
            id: plateId,
            color: color,
            x: x,
            y: y,
            visible: true
        };

        this.plates.push(plate);
        this.saveToLocalStorage();
        return plate;
    },

    // Remove plate
    removePlate(plateId) {
        this.plates = this.plates.filter(p => p.id !== plateId);
        this.saveToLocalStorage();
    },

    // Get shape by ID
    getShape(id) {
        return this.shapes.find(s => s.id === id);
    },

    // Remove shape
    removeShape(shapeId) {
        this.shapes = this.shapes.filter(s => s.id !== shapeId);
        this.saveToLocalStorage();
    },

    /**
     * Persists the full workbook state to localStorage.
     * Called automatically after every mutation via saveToLocalStorage().
     * Shows a user-visible error message if the write fails (e.g. quota exceeded).
     */
    saveToLocalStorage() {
        try {
            // Save current board state
            this.saveCurrentBoard();

            const data = {
                workbookName: this.workbookName,
                boards: this.boards,
                currentBoardId: this.currentBoardId,
                nextBoardId: this.nextBoardId,
                formations: this.formations,
                animationDuration: this.animationDuration,
                animationFPS: this.animationFPS,
                animationShowPaths: this.animationShowPaths,
                animationShowAllPaths: this.animationShowAllPaths,
                animationShowAllGhosts: this.animationShowAllGhosts,
                animationShowPathsAnimation: this.animationShowPathsAnimation,
                animationShowGhostsBoard: this.animationShowGhostsBoard,
                animationShowGhostsAnimation: this.animationShowGhostsAnimation,
                animationShowPathLabels: this.animationShowPathLabels,
                animationShowPathLabelsAnimation: this.animationShowPathLabelsAnimation,
                animationRemovePathAfterFrame: this.animationRemovePathAfterFrame,
                animationRepeat: this.animationRepeat,
                animationCropVideo: this.animationCropVideo,
                showOnlyChangedObjects: this.showOnlyChangedObjects,
                showBoardBreadcrumb: this.showBoardBreadcrumb,
            };
            localStorage.setItem('futsalBoard', JSON.stringify(data));

            // Save to history (unless it's an undo/redo action)
            if (!this.isUndoRedoAction) {
                this.saveToHistory();
            }
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                Utils.showMessage('Auto-save failed: storage quota exceeded. Try exporting your workbook to free up space.', 'Save Failed');
            } else {
                Utils.showMessage('Auto-save failed. Your changes may not be preserved.', 'Save Failed');
            }
        }
    },

    // Save current board state to boards array
    saveCurrentBoard() {
        if (this.currentBoardId) {
            const boardIndex = this.boards.findIndex(b => b.id === this.currentBoardId);
            if (boardIndex >= 0) {
                const existingBoard = this.boards[boardIndex];

                // Filter out inherited items before saving
                const elementsToSave = this.elements.filter(el => !el.inherited);
                const platesToSave = this.plates.filter(pl => !pl.inherited);
                const shapesToSave = this.shapes.filter(s => !s.inherited);

                let playersToSave, ballsToSave, drawingsToSave;

                // If this is a child board, only save objects that were explicitly set in this board
                if (existingBoard.parentId) {
                    // Only save players that have been explicitly modified in this board
                    playersToSave = this.players.filter(player => player._explicitlySet === true);

                    // Only save balls that have been explicitly modified in this board
                    ballsToSave = this.balls.filter(ball => ball._explicitlySet === true);

                    // Only save drawings added in this board — exclude drawings from any ancestor.
                    // Ancestor drawing IDs are read from boards[] (saved data, no inherited flags there).
                    const ancestorDrawingIds = new Set();
                    let ancestorId = existingBoard.parentId;
                    while (ancestorId) {
                        const ancestor = this.boards.find(b => b.id === ancestorId);
                        if (!ancestor) break;
                        (ancestor.drawings || []).forEach(d => ancestorDrawingIds.add(d.id));
                        ancestorId = ancestor.parentId;
                    }
                    drawingsToSave = this.drawings.filter(d => !ancestorDrawingIds.has(d.id));
                } else {
                    // Root board, save all
                    playersToSave = this.players;
                    ballsToSave = this.balls;
                    drawingsToSave = this.drawings;
                }

                // Clean up internal flags before saving
                const cleanPlayers = playersToSave.map(p => {
                    const cleaned = { ...p };
                    delete cleaned._explicitlySet;
                    return cleaned;
                });
                const cleanBalls = ballsToSave.map(b => {
                    const cleaned = { ...b };
                    delete cleaned._explicitlySet;
                    return cleaned;
                });

                // On child boards, preserve existing players/balls if none are marked to save
                // This prevents temporary state changes (like "go to start") from erasing saved data
                const playersToStore = (existingBoard.parentId && cleanPlayers.length === 0)
                    ? existingBoard.players
                    : structuredClone(cleanPlayers);
                const ballsToStore = (existingBoard.parentId && cleanBalls.length === 0)
                    ? existingBoard.balls
                    : structuredClone(cleanBalls);

                this.boards[boardIndex] = {
                    id: this.currentBoardId,
                    name: existingBoard.name,
                    parentId: existingBoard.parentId,
                    children: existingBoard.children || [],
                    players: playersToStore,
                    drawings: structuredClone(drawingsToSave),
                    elements: structuredClone(elementsToSave),
                    balls: ballsToStore,
                    plates: structuredClone(platesToSave),
                    shapes: structuredClone(shapesToSave),
                    teams: structuredClone(this.teams),
                    nextPlayerId: this.nextPlayerId,
                    nextElementId: this.nextElementId,
                    nextBallId: this.nextBallId,
                    nextPlateId: this.nextPlateId,
                    nextShapeId: this.nextShapeId,
                    teamPlayerNumbers: structuredClone(this.teamPlayerNumbers),
                    pathIntermediates: structuredClone(this.pathIntermediates),
                    playbackSpeed: this.playbackSpeed !== undefined ? this.playbackSpeed : 1.0
                };
            }
        }
    },

    /**
     * Merges inherited and child-specific items for elements, plates, or shapes.
     * - Items in parentItems not overridden by child are marked inherited=true.
     * - Items in childItems whose ID matches a parent item replace the parent version.
     * - Items in childItems with no parent match are kept as child-only items.
     * @param {Array} parentItems - Saved items from the parent board.
     * @param {Array} childItems  - Saved items from the child board (no inherited flags).
     * @returns {Array}
     */
    _mergeInheritedItems(parentItems, childItems) {
        const inherited = structuredClone(parentItems);
        inherited.forEach(item => { item.inherited = true; });

        const parentIds = new Set(inherited.map(item => item.id));
        const childOwn = childItems.filter(item => !item.inherited);
        const overriding = childOwn.filter(item => parentIds.has(item.id));
        const newInChild = childOwn.filter(item => !parentIds.has(item.id));
        const finalInherited = inherited.filter(item => !overriding.find(o => o.id === item.id));

        return [...finalInherited, ...newInChild, ...overriding];
    },

    // Check if current board is a child board
    isChildBoard() {
        const board = this.boards.find(b => b.id === this.currentBoardId);
        return board && board.parentId != null;
    },

    // Get the full ancestry chain from root to current board
    getBoardAncestryChain() {
        const chain = [];
        let currentBoard = this.boards.find(b => b.id === this.currentBoardId);

        if (!currentBoard) return chain;

        // Build chain backwards from current to root
        while (currentBoard) {
            chain.unshift(currentBoard); // Add to beginning
            if (currentBoard.parentId) {
                currentBoard = this.boards.find(b => b.id === currentBoard.parentId);
            } else {
                currentBoard = null; // Reached root
            }
        }

        return chain;
    },

    // Find a free position on the board that doesn't overlap with existing elements
    findFreePosition(minDistance = 100) {
        // Default starting position in pitch coordinates (2000|1000)
        // Convert to board coordinates by adding pitch offset
        const startX = 2000 + this.pitchOffsetX;
        const startY = 1000 + this.pitchOffsetY;

        // Bounds for valid positions in pitch coordinates (0|0 to 4000|2000)
        // Convert to board coordinates by adding pitch offset
        const minX = 0 + this.pitchOffsetX;
        const minY = 0 + this.pitchOffsetY;
        const maxX = 4000 + this.pitchOffsetX;
        const maxY = 2000 + this.pitchOffsetY;

        // Helper to clamp value within bounds
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        // Get all occupied positions
        const occupiedPositions = [];

        // Add players
        this.players.forEach(player => {
            occupiedPositions.push({ x: player.x, y: player.y });
        });

        // Add balls
        this.balls.forEach(ball => {
            occupiedPositions.push({ x: ball.x, y: ball.y });
        });

        // Add plates
        this.plates.forEach(plate => {
            occupiedPositions.push({ x: plate.x, y: plate.y });
        });

        // Add elements
        this.elements.forEach(element => {
            occupiedPositions.push({ x: element.x, y: element.y });
        });

        // Add shapes (use center position)
        this.shapes.forEach(shape => {
            occupiedPositions.push({ x: shape.x, y: shape.y });
        });

        // Helper function to check if a position is free
        const isPositionFree = (x, y) => {
            // Ensure position is within bounds
            if (x < minX || x > maxX || y < minY || y > maxY) {
                return false;
            }

            for (let pos of occupiedPositions) {
                const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
                if (distance < minDistance) {
                    return false;
                }
            }
            return true;
        };

        // Try the default position first
        if (isPositionFree(startX, startY)) {
            return { x: startX, y: startY };
        }

        // Search in a spiral pattern outward from default position
        const step = minDistance;
        let radius = step;
        const maxRadius = Math.max(maxX - minX, maxY - minY);

        while (radius < maxRadius) {
            // Try positions in a circle at this radius
            const circumference = 2 * Math.PI * radius;
            const numPoints = Math.max(8, Math.floor(circumference / step));

            for (let i = 0; i < numPoints; i++) {
                const angle = (2 * Math.PI * i) / numPoints;
                const x = startX + radius * Math.cos(angle);
                const y = startY + radius * Math.sin(angle);

                if (isPositionFree(x, y)) {
                    return { x: Math.round(x), y: Math.round(y) };
                }
            }

            radius += step;
        }

        // If no free position found, return default position clamped to bounds (fallback)
        return {
            x: clamp(startX, minX, maxX),
            y: clamp(startY, minY, maxY)
        };
    },

    // Load from localStorage
    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('futsalBoard');
            if (data) {
                const parsed = JSON.parse(data);

                // Check if old format (migrate to new format)
                if (parsed.players && !parsed.boards) {
                    // Migrate old format to new format
                    this.workbookName = parsed.workbookName || 'Untitled Workbook';
                    this.boards = [{
                        id: 'board-1',
                        name: 'Board 1',
                        parentId: null,
                        children: [],
                        players: parsed.players || [],
                        drawings: parsed.drawings || [],
                        elements: parsed.elements || [],
                        balls: parsed.balls || [],
                        plates: parsed.plates || [],
                        teams: parsed.teams || [],
                        nextPlayerId: parsed.nextPlayerId || 1,
                        nextElementId: parsed.nextElementId || 1,
                        nextBallId: parsed.nextBallId || 1,
                        nextPlateId: parsed.nextPlateId || 1,
                        teamPlayerNumbers: parsed.teamPlayerNumbers || {}
                    }];
                    this.currentBoardId = 'board-1';
                    this.nextBoardId = 2;
                    this.formations = parsed.formations || [];

                    // Load the first board
                    this.loadBoard('board-1');
                } else {
                    // New format
                    this.workbookName = parsed.workbookName || 'Untitled Workbook';
                    this.boards = parsed.boards || [];
                    this.currentBoardId = parsed.currentBoardId || null;
                    this.nextBoardId = parsed.nextBoardId || 1;
                    this.formations = parsed.formations || [];

                    // Ensure all boards have parentId and children properties
                    this.boards.forEach(board => {
                        if (board.parentId === undefined) {
                            board.parentId = null;
                        }
                        if (!board.children) {
                            board.children = [];
                        }
                    });

                    // If no boards exist, create a default one
                    if (this.boards.length === 0) {
                        this.createBoard('Board 1');
                    } else if (this.currentBoardId) {
                        // Load the current board
                        this.loadBoard(this.currentBoardId);
                    } else {
                        // Load the first board if no current board set
                        this.loadBoard(this.boards[0].id);
                    }
                }

                // Restore animation settings (present in new format; absent in migrated old format).
                if (parsed.animationDuration !== undefined) this.animationDuration = parsed.animationDuration;
                if (parsed.animationFPS !== undefined) this.animationFPS = parsed.animationFPS;
                if (parsed.animationShowPaths !== undefined) this.animationShowPaths = parsed.animationShowPaths;
                if (parsed.animationShowAllPaths !== undefined) this.animationShowAllPaths = parsed.animationShowAllPaths;
                if (parsed.animationShowAllGhosts !== undefined) this.animationShowAllGhosts = parsed.animationShowAllGhosts;
                if (parsed.animationShowPathsAnimation !== undefined) this.animationShowPathsAnimation = parsed.animationShowPathsAnimation;
                if (parsed.animationShowGhostsBoard !== undefined) this.animationShowGhostsBoard = parsed.animationShowGhostsBoard;
                if (parsed.animationShowGhostsAnimation !== undefined) this.animationShowGhostsAnimation = parsed.animationShowGhostsAnimation;
                if (parsed.animationShowPathLabels !== undefined) this.animationShowPathLabels = parsed.animationShowPathLabels;
                if (parsed.animationShowPathLabelsAnimation !== undefined) this.animationShowPathLabelsAnimation = parsed.animationShowPathLabelsAnimation;
                if (parsed.animationRemovePathAfterFrame !== undefined) this.animationRemovePathAfterFrame = parsed.animationRemovePathAfterFrame;
                if (parsed.animationRepeat !== undefined) this.animationRepeat = parsed.animationRepeat;
                if (parsed.animationCropVideo !== undefined) this.animationCropVideo = parsed.animationCropVideo;
                if (parsed.showOnlyChangedObjects !== undefined) this.showOnlyChangedObjects = parsed.showOnlyChangedObjects;
                if (parsed.showBoardBreadcrumb !== undefined) this.showBoardBreadcrumb = parsed.showBoardBreadcrumb;
            } else {
                // No data, create initial board
                this.createBoard('Board 1');
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
        }
    },

    // Load a specific board
    /**
     * Loads a board by ID, applying parent/child inheritance if applicable.
     * For child boards, inherited player/ball positions come from the parent chain;
     * positions that have been explicitly moved in this board are preserved.
     * @param {string} boardId - The ID of the board to load.
     */
    loadBoard(boardId) {
        const board = this.boards.find(b => b.id === boardId);
        if (board) {
            this.currentBoardId = boardId;
            this.teams = structuredClone(board.teams || []);
            this.nextPlayerId = board.nextPlayerId || 1;
            this.nextElementId = board.nextElementId || 1;
            this.nextBallId = board.nextBallId || 1;
            this.nextPlateId = board.nextPlateId || 1;
            this.nextShapeId = board.nextShapeId || 1;
            this.teamPlayerNumbers = structuredClone(board.teamPlayerNumbers || {});
            this.pathIntermediates = structuredClone(board.pathIntermediates || {});
            this.playbackSpeed = board.playbackSpeed !== undefined ? board.playbackSpeed : 1.0;

            // Reset parent positions
            this.parentPlayerPositions = {};
            this.parentBallPositions = {};
            this.parentShapePositions = {};

            // If this is a child board, inherit from entire ancestry chain
            if (board.parentId) {
                // Get the full ancestry chain
                const ancestryChain = this.getBoardAncestryChain();

                // Build up state by merging from root to current
                let mergedPlayers = [];
                let mergedBalls = [];
                let mergedDrawings = [];
                let mergedElements = [];
                let mergedPlates = [];
                let mergedShapes = [];

                // Start from root and work down to current board
                ancestryChain.forEach((ancestorBoard, index) => {
                    const isCurrentBoard = (ancestorBoard.id === boardId);
                    const isImmediateParent = (index === ancestryChain.length - 2);

                    // Merge players
                    const boardPlayers = structuredClone(ancestorBoard.players || []);
                    boardPlayers.forEach(player => {
                        const existingIndex = mergedPlayers.findIndex(p => p.id === player.id);
                        if (existingIndex >= 0) {
                            // Player already exists in merged list
                            const existing = mergedPlayers[existingIndex];

                            // If this is the current board, allow overriding everything including name
                            if (isCurrentBoard) {
                                existing.x = player.x;
                                existing.y = player.y;
                                existing.rotation = player.rotation;
                                if (player.color !== undefined) {
                                    existing.color = player.color;
                                }
                                // Allow child boards to override name (but it's optional)
                                if (player.name !== undefined) {
                                    existing.name = player.name;
                                }
                                // Number can't be changed in child boards (greyed out), so inherit from parent
                                existing._explicitlySet = true;
                            } else {
                                // From ancestor board: update everything
                                // But don't overwrite if already set by a more recent ancestor
                                existing.x = player.x;
                                existing.y = player.y;
                                existing.rotation = player.rotation;
                                if (player.color !== undefined) {
                                    existing.color = player.color;
                                }
                                if (player.name !== undefined) {
                                    existing.name = player.name;
                                }
                                if (player.number !== undefined) {
                                    existing.number = player.number;
                                }
                            }
                        } else {
                            // Add new player
                            // Mark as explicitly set only if it's from the current board
                            if (isCurrentBoard) {
                                player._explicitlySet = true;
                            }
                            mergedPlayers.push(player);
                        }
                    });

                    // Merge balls
                    const boardBalls = structuredClone(ancestorBoard.balls || []);
                    boardBalls.forEach(ball => {
                        const existingIndex = mergedBalls.findIndex(b => b.id === ball.id);
                        if (existingIndex >= 0) {
                            // Ball already exists in merged list
                            const existing = mergedBalls[existingIndex];

                            // If this is the current board, only update position
                            // Keep color from parent (it propagates from ancestors)
                            if (isCurrentBoard) {
                                existing.x = ball.x;
                                existing.y = ball.y;
                                existing._explicitlySet = true;
                            } else {
                                // From ancestor board: update everything including color
                                // Color propagates down the chain
                                existing.x = ball.x;
                                existing.y = ball.y;
                                if (ball.color !== undefined) {
                                    existing.color = ball.color;
                                }
                            }
                        } else {
                            // Add new ball
                            // Mark as explicitly set only if it's from the current board
                            if (isCurrentBoard) {
                                ball._explicitlySet = true;
                            }
                            mergedBalls.push(ball);
                        }
                    });

                    // Merge drawings (just concatenate)
                    const boardDrawings = structuredClone(ancestorBoard.drawings || []);
                    mergedDrawings = [...mergedDrawings, ...boardDrawings];

                    // Merge elements, plates, and shapes from entire ancestry chain
                    const boardElements = structuredClone(ancestorBoard.elements || []);
                    boardElements.forEach(element => {
                        // Clear inherited flag - items from ancestry chain are normal objects, not ghosts
                        delete element.inherited;

                        const existingIndex = mergedElements.findIndex(e => e.id === element.id);
                        if (existingIndex >= 0) {
                            // Element already exists - update position/rotation from this board
                            const existing = mergedElements[existingIndex];
                            existing.x = element.x;
                            existing.y = element.y;
                            existing.rotation = element.rotation;
                            if (isCurrentBoard) {
                                existing._explicitlySet = true;
                            }
                        } else {
                            // Add new element
                            if (isCurrentBoard) {
                                element._explicitlySet = true;
                            }
                            mergedElements.push(element);
                        }
                    });

                    const boardPlates = structuredClone(ancestorBoard.plates || []);
                    boardPlates.forEach(plate => {
                        // Clear inherited flag - items from ancestry chain are normal objects, not ghosts
                        delete plate.inherited;

                        const existingIndex = mergedPlates.findIndex(p => p.id === plate.id);
                        if (existingIndex >= 0) {
                            // Plate already exists - update from this board
                            const existing = mergedPlates[existingIndex];
                            existing.x = plate.x;
                            existing.y = plate.y;
                            if (isCurrentBoard) {
                                existing._explicitlySet = true;
                            }
                        } else {
                            // Add new plate
                            if (isCurrentBoard) {
                                plate._explicitlySet = true;
                            }
                            mergedPlates.push(plate);
                        }
                    });

                    const boardShapes = structuredClone(ancestorBoard.shapes || []);
                    boardShapes.forEach(shape => {
                        // Clear inherited flag - items from ancestry chain are normal objects, not ghosts
                        delete shape.inherited;

                        const existingIndex = mergedShapes.findIndex(s => s.id === shape.id);
                        if (existingIndex >= 0) {
                            // Shape already exists - update from this board
                            const existing = mergedShapes[existingIndex];
                            existing.x = shape.x;
                            existing.y = shape.y;
                            existing.rotation = shape.rotation;
                            existing.width = shape.width;
                            existing.height = shape.height;
                            if (shape.text !== undefined) {
                                existing.text = shape.text;
                            }
                            if (isCurrentBoard) {
                                existing._explicitlySet = true;
                            }
                        } else {
                            // Add new shape
                            if (isCurrentBoard) {
                                shape._explicitlySet = true;
                            }
                            mergedShapes.push(shape);
                        }
                    });

                    // Store parent positions for immediate parent
                    if (isImmediateParent) {
                        // Store the MERGED state up to the parent
                        mergedPlayers.forEach(p => {
                            this.parentPlayerPositions[p.id] = { x: p.x, y: p.y, rotation: p.rotation || 0 };
                        });
                        mergedBalls.forEach(b => {
                            this.parentBallPositions[b.id] = { x: b.x, y: b.y };
                        });
                        mergedShapes.forEach(s => {
                            this.parentShapePositions[s.id] = {
                                x: s.x,
                                y: s.y,
                                width: s.width,
                                height: s.height,
                                rotation: s.rotation || 0,
                                color: s.color,
                                fillColor: s.fillColor,
                                text: s.text,
                                fontSize: s.fontSize
                            };
                        });
                    }
                });

                this.players = mergedPlayers;
                this.balls = mergedBalls;
                this.drawings = mergedDrawings;
                this.elements = mergedElements;
                this.plates = mergedPlates;
                this.shapes = mergedShapes;

                // Mark items from parent boards as inherited (not explicitly set in this board)
                this.elements.forEach(el => { if (!el._explicitlySet) el.inherited = true; });
                this.plates.forEach(pl => { if (!pl._explicitlySet) pl.inherited = true; });
                this.shapes.forEach(sh => {
                    if (!sh._explicitlySet) sh.inherited = true;
                });
            } else {
                // Root board, load normally
                this.players = structuredClone(board.players || []);
                this.balls = structuredClone(board.balls || []);
                this.drawings = structuredClone(board.drawings || []);
                this.elements = structuredClone(board.elements || []);
                this.plates = structuredClone(board.plates || []);
                this.shapes = structuredClone(board.shapes || []);
            }

            // Initialize rotation for existing elements and players if not present
            this.elements.forEach(element => {
                if (element.rotation === undefined) {
                    element.rotation = 0;
                }
            });
            this.players.forEach(player => {
                if (player.rotation === undefined) {
                    player.rotation = 0;
                }
            });

            // Clear history and start fresh for this board
            this.history = [];
            this.historyIndex = -1;
            this._histSnap = null;
            this.saveToHistory();

            // Reset "show only changed objects" toggle when switching boards
            this.showOnlyChangedObjects = false;
            const toggleCheckbox = document.getElementById('show-only-changed-objects');
            if (toggleCheckbox) {
                toggleCheckbox.checked = false;
            }

            // Update UI
            if (typeof Storage !== 'undefined') {
                Storage.updateBoardNameDisplay();
            }
        }
    },

    // Create a new board
    createBoard(name, parentId = null) {
        // Save current board state first (if there is one)
        if (this.currentBoardId) {
            this.saveCurrentBoard();
        }

        // Create default goals for root boards
        const defaultElements = [];
        if (parentId === null) {
            // Left goal: at x=250 (0 in pitch coords), y=1250 (1000 in pitch coords), rotation=0
            defaultElements.push({
                id: 'element-1',
                type: 'goal',
                x: 250,
                y: 1250,
                color: null,
                rotation: 0,
                visible: true
            });
            // Right goal: at x=4250 (4000 in pitch coords), y=1250 (1000 in pitch coords), rotation=180
            defaultElements.push({
                id: 'element-2',
                type: 'goal',
                x: 4250,
                y: 1250,
                color: null,
                rotation: 180,
                visible: true
            });
        }

        const newBoard = {
            id: `board-${this.nextBoardId++}`,
            name: name || `Board ${this.boards.length + 1}`,
            parentId: parentId,
            children: [],
            players: [],
            drawings: [],
            elements: defaultElements,
            balls: [],
            plates: [],
            teams: [
                { id: 'team-1', color: '#3498db', name: 'Blue' },
                { id: 'team-2', color: '#e74c3c', name: 'Red' }
            ],
            nextPlayerId: 1,
            nextElementId: defaultElements.length > 0 ? 3 : 1,
            nextBallId: 1,
            nextPlateId: 1,
            teamPlayerNumbers: {},
            playbackSpeed: 1.0
        };
        this.boards.push(newBoard);

        // Update parent's children array
        if (parentId) {
            const parent = this.boards.find(b => b.id === parentId);
            if (parent) {
                if (!parent.children) {
                    parent.children = [];
                }
                parent.children.push(newBoard.id);
            }
        }

        this.loadBoard(newBoard.id);
        this.saveToLocalStorage();
        return newBoard.id;
    },

    // Create a child board (duplicate of parent)
    createChildBoard(parentId) {
        const parent = this.boards.find(b => b.id === parentId);
        if (!parent) return null;

        // Create a minimal child board that only stores what's different from parent
        const newBoard = {
            id: `board-${this.nextBoardId++}`,
            name: `Child ${(parent.children?.length || 0) + 1}`,
            parentId: parentId,
            children: [],
            // Child boards start empty - they inherit from parent by default
            // Only store objects that are new or have been explicitly moved
            players: [],
            drawings: [],
            elements: [],
            balls: [],
            plates: [],
            shapes: [],
            teams: structuredClone(parent.teams || []), // Teams are always copied
            nextPlayerId: parent.nextPlayerId || 1,
            nextElementId: parent.nextElementId || 1,
            nextBallId: parent.nextBallId || 1,
            nextPlateId: parent.nextPlateId || 1,
            nextShapeId: parent.nextShapeId || 1,
            teamPlayerNumbers: structuredClone(parent.teamPlayerNumbers || {}),
            pathIntermediates: {}, // Ghosts for the transition FROM parent TO this child
            playbackSpeed: parent.playbackSpeed !== undefined ? parent.playbackSpeed : 1.0 // Inherit playback speed from parent
        };

        this.boards.push(newBoard);

        // Update parent's children array
        if (!parent.children) {
            parent.children = [];
        }
        parent.children.push(newBoard.id);

        this.saveToLocalStorage();
        return newBoard.id;
    },

    // Get current board name
    getCurrentBoardName() {
        const board = this.boards.find(b => b.id === this.currentBoardId);
        return board ? board.name : 'Untitled Board';
    },

    // Rename current board
    renameCurrentBoard(newName) {
        const board = this.boards.find(b => b.id === this.currentBoardId);
        if (board) {
            board.name = newName;
            this.saveToLocalStorage();
        }
    },

    // Rename a specific board
    renameBoard(boardId, newName) {
        const board = this.boards.find(b => b.id === boardId);
        if (board) {
            board.name = newName;
            this.saveToLocalStorage();
        }
    },

    // Duplicate a board
    duplicateBoard(boardId) {
        const board = this.boards.find(b => b.id === boardId);
        if (board) {
            const newBoard = structuredClone(board);
            newBoard.id = `board-${this.nextBoardId++}`;
            newBoard.name = `${board.name} (Copy)`;
            this.boards.push(newBoard);
            this.saveToLocalStorage();
            return newBoard.id;
        }
        return null;
    },

    // Remove a board
    removeBoard(boardId) {
        const board = this.boards.find(b => b.id === boardId);
        if (!board) return false;

        // Count total boards (including all nested children)
        const countBoards = (boards) => {
            let count = 0;
            boards.forEach(b => {
                count++;
                if (b.children && b.children.length > 0) {
                    const children = boards.filter(child => b.children.includes(child.id));
                    count += countBoards(children);
                }
            });
            return count;
        };

        if (countBoards(this.boards) <= 1) {
            Utils.showMessage('Cannot remove the last board', 'Cannot Remove Board');
            return false;
        }

        // Remove this board and all its children recursively
        const removeRecursive = (id) => {
            const b = this.boards.find(board => board.id === id);
            if (b && b.children) {
                b.children.forEach(childId => removeRecursive(childId));
            }
            const idx = this.boards.findIndex(board => board.id === id);
            if (idx >= 0) {
                this.boards.splice(idx, 1);
            }
        };

        // Remove from parent's children array
        if (board.parentId) {
            const parent = this.boards.find(b => b.id === board.parentId);
            if (parent && parent.children) {
                parent.children = parent.children.filter(id => id !== boardId);
            }
        }

        removeRecursive(boardId);

        // If we removed the current board, switch to another
        if (this.currentBoardId === boardId) {
            // Try to find a root board (no parent)
            const rootBoard = this.boards.find(b => !b.parentId);
            if (rootBoard) {
                this.loadBoard(rootBoard.id);
            } else if (this.boards.length > 0) {
                this.loadBoard(this.boards[0].id);
            }
        }

        this.saveToLocalStorage();
        return true;
    },

    // Reset board
    reset() {
        this.players = [];
        this.drawings = [];
        this.elements = [];
        this.balls = [];
        this.plates = [];
        this.selectedPlayer = null;
        this.draggedPlayer = null;
        this.selectedElement = null;
        this.draggedElement = null;
        this.draggedBall = null;
        this.draggedPlate = null;

        // Reset player numbers for all existing teams (keep the teams)
        this.teamPlayerNumbers = {};
        this.teams.forEach(team => {
            this.teamPlayerNumbers[team.id] = [];
        });

        // Clear history and start fresh
        this.history = [];
        this.historyIndex = -1;
        this._histSnap = null;

        this.saveToLocalStorage();

        // Save initial state to history
        this.saveToHistory();
    },

    // Reset entire workbook (for new workbook)
    resetWorkbook() {
        // Reset all board data
        this.players = [];
        this.drawings = [];
        this.elements = [];
        this.balls = [];
        this.plates = [];
        this.selectedPlayer = null;
        this.draggedPlayer = null;
        this.selectedElement = null;
        this.draggedElement = null;
        this.draggedBall = null;
        this.draggedPlate = null;

        // Reset teams to default
        this.teams = [
            { id: 'team-1', color: '#3498db', name: 'Blue' },
            { id: 'team-2', color: '#e74c3c', name: 'Red' }
        ];
        this.teamPlayerNumbers = {
            'team-1': [],
            'team-2': []
        };

        // Reset boards completely
        this.boards = [];
        this.currentBoardId = null;
        this.nextBoardId = 1;

        // Create initial empty board
        this.createBoard('Board 1');

        // Clear history and start fresh
        this.history = [];
        this.historyIndex = -1;
        this._histSnap = null;

        this.saveToLocalStorage();

        // Save initial state to history
        this.saveToHistory();
    },

    // Save current state
    saveCurrentPositions() {
        this.playerStartPositions = this.players.map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            rotation: p.rotation || 0
        }));
        this.ballStartPositions = this.balls.map(b => ({
            id: b.id,
            x: b.x,
            y: b.y
        }));
    },

    // Restore saved positions - restores to the merged end positions of the current board
    restorePositions() {
        // Build merged end positions from the full board ancestry
        const boardChain = this.getBoardAncestryChain();
        if (boardChain.length === 0) return;

        // Build merged state by applying each board's changes in sequence
        const mergedPlayers = {};
        const mergedBalls = {};

        boardChain.forEach(board => {
            // Merge players from this board
            if (board.players) {
                board.players.forEach(player => {
                    mergedPlayers[player.id] = {
                        x: player.x,
                        y: player.y,
                        rotation: player.rotation !== undefined ? player.rotation : 0
                    };
                });
            }

            // Merge balls from this board
            if (board.balls) {
                board.balls.forEach(ball => {
                    mergedBalls[ball.id] = {
                        x: ball.x,
                        y: ball.y
                    };
                });
            }
        });

        // Apply the merged positions to current players and balls
        Object.keys(mergedPlayers).forEach(playerId => {
            const player = this.getPlayer(playerId);
            if (player) {
                player.x = mergedPlayers[playerId].x;
                player.y = mergedPlayers[playerId].y;
                player.rotation = mergedPlayers[playerId].rotation;
            }
        });

        Object.keys(mergedBalls).forEach(ballId => {
            const ball = this.getBall(ballId);
            if (ball) {
                ball.x = mergedBalls[ballId].x;
                ball.y = mergedBalls[ballId].y;
            }
        });
    },

    // Save current state to history
    /**
     * Saves a delta entry to the undo history containing only the top-level properties
     * that changed since the last save. Each entry stores { before, after } for changed
     * keys only, so a player move stores ~1/9 of the memory of a full snapshot.
     * Caps history at maxHistorySize entries. Skipped when isUndoRedoAction is true.
     */
    saveToHistory() {
        const keys = this._histKeys;

        // First call after a reset: establish the baseline entry.
        if (this._histSnap === null) {
            const snap = {};
            const after = {};
            for (const k of keys) {
                snap[k] = JSON.stringify(this[k]);
                after[k] = structuredClone(this[k]);
            }
            this.history = [{ before: {}, after }];
            this.historyIndex = 0;
            this._histSnap = snap;
            this.updateUndoRedoButtons();
            return;
        }

        // Compute delta: only include keys whose serialization changed.
        const snap = {};
        const before = {};
        const after = {};
        let changed = false;
        for (const k of keys) {
            snap[k] = JSON.stringify(this[k]);
            if (snap[k] !== this._histSnap[k]) {
                before[k] = JSON.parse(this._histSnap[k]); // reuse cached string
                after[k] = structuredClone(this[k]);
                changed = true;
            }
        }

        if (!changed) return; // state identical to last save — no-op

        // Discard any redo branch then push delta.
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push({ before, after });

        // Cap history size. After shift() the new entry stays at the same index.
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

        this._histSnap = snap;
        this.updateUndoRedoButtons();
    },

    /** Reverts the board to the state before the last mutation. No-op at oldest entry. */
    undo() {
        if (this.historyIndex <= 0) return;
        const entry = this.history[this.historyIndex];
        for (const [k, v] of Object.entries(entry.before)) {
            this[k] = structuredClone(v);
        }
        this.historyIndex--;
        this._applyUndoRedoResult();
    },

    /** Re-applies the next mutation after an undo. No-op at newest entry. */
    redo() {
        if (this.historyIndex >= this.history.length - 1) return;
        this.historyIndex++;
        const entry = this.history[this.historyIndex];
        for (const [k, v] of Object.entries(entry.after)) {
            this[k] = structuredClone(v);
        }
        this._applyUndoRedoResult();
    },

    /**
     * Shared post-step for undo/redo: syncs _histSnap, persists to localStorage,
     * updates buttons, and triggers a full re-render of all modules.
     */
    _applyUndoRedoResult() {
        // Sync change-detection snapshot to current AppState.
        const snap = {};
        for (const k of this._histKeys) {
            snap[k] = JSON.stringify(this[k]);
        }
        this._histSnap = snap;

        // Persist directly to localStorage (same as old restoreFromHistory).
        const data = {
            players: this.players,
            drawings: this.drawings,
            elements: this.elements,
            balls: this.balls,
            plates: this.plates,
            shapes: this.shapes,
            teams: this.teams,
            nextPlayerId: this.nextPlayerId,
            nextElementId: this.nextElementId,
            nextBallId: this.nextBallId,
            nextPlateId: this.nextPlateId,
            nextShapeId: this.nextShapeId,
            teamPlayerNumbers: this.teamPlayerNumbers,
            formations: this.formations,
            workbookName: this.workbookName,
            animationDuration: this.animationDuration,
            animationFPS: this.animationFPS,
            animationShowPaths: this.animationShowPaths,
            animationShowAllPaths: this.animationShowAllPaths,
            animationShowAllGhosts: this.animationShowAllGhosts,
            animationShowPathsAnimation: this.animationShowPathsAnimation,
            animationShowGhostsBoard: this.animationShowGhostsBoard,
            animationShowGhostsAnimation: this.animationShowGhostsAnimation,
            animationShowPathLabels: this.animationShowPathLabels,
            animationShowPathLabelsAnimation: this.animationShowPathLabelsAnimation,
            animationRemovePathAfterFrame: this.animationRemovePathAfterFrame,
            animationRepeat: this.animationRepeat,
            animationCropVideo: this.animationCropVideo,
            showOnlyChangedObjects: this.showOnlyChangedObjects,
        };
        try {
            localStorage.setItem('futsalBoard', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to persist undo/redo state:', e);
        }

        this.updateUndoRedoButtons();

        if (typeof Teams !== 'undefined') { Teams.render(); }
        if (typeof Shapes !== 'undefined') { Shapes.render(); }
        if (typeof Plates !== 'undefined') { Plates.render(); }
        if (typeof Elements !== 'undefined') { Elements.render(); }
        if (typeof Balls !== 'undefined') { Balls.render(); }
        if (typeof Players !== 'undefined') { Players.render(); }
        if (typeof Drawings !== 'undefined') { Drawings.render(); }
    },

    // Update undo/redo button states
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');

        const canUndo = this.historyIndex > 0;
        const canRedo = this.historyIndex < this.history.length - 1;

        if (undoBtn) {
            undoBtn.disabled = !canUndo;
        }

        if (redoBtn) {
            redoBtn.disabled = !canRedo;
        }
    },

    // Update position display
    updatePositionDisplay(x, y, obj, type) {
        const display = document.getElementById('position-display');
        if (display) {
            // Convert board coordinates to pitch coordinates
            const pitchX = Math.round(x - this.pitchOffsetX);
            const pitchY = Math.round(y - this.pitchOffsetY);
            display.textContent = `X: ${pitchX} | Y: ${pitchY}`;
            display.classList.remove('hidden');

            // Store current object for position dialog
            this.currentDisplayObject = obj;
            this.currentDisplayType = type;
        }
    },

    // Hide position display
    hidePositionDisplay() {
        const display = document.getElementById('position-display');
        if (display) {
            display.classList.add('hidden');
            this.currentDisplayObject = null;
            this.currentDisplayType = null;
        }
    }
};
