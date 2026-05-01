// Storage and save/load functionality
const Storage = {
    workbookNameCallback: null,
    boardNameCallback: null,
    contextMenuBoardId: null,
    expandedBoards: new Set(), // Track which boards are expanded
    hasInitiallyRendered: false, // Track if initial render has happened

    /** Wires up all import/export buttons, board context menu, and workbook/board name modals. */
    init() {
        this.setupEventListeners();
        this.updateWorkbookNameDisplay();
        this.updateBoardNameDisplay();
        this.renderBoardsList();
        // Initialize breadcrumb trail from the current board's ancestry
        AppState.breadcrumbTrail = AppState.getBoardAncestryChain().map(b => b.id);
        Breadcrumb.render();
    },

    // Setup event listeners
    setupEventListeners() {
        // File menu button
        document.getElementById('btn-file-menu').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFileMenu(e);
        });

        // Add board button
        document.getElementById('btn-add-board').addEventListener('click', () => this.addBoard());

        // File input handlers
        document.getElementById('import-board-input').addEventListener('change', (e) => this.handleBoardImport(e));
        document.getElementById('import-workbook-input').addEventListener('change', (e) => this.handleWorkbookImport(e));

        // Workbook name modal
        document.getElementById('btn-cancel-workbook-name').addEventListener('click', () => this.hideWorkbookNameModal());
        document.getElementById('btn-confirm-workbook-name').addEventListener('click', () => this.confirmWorkbookName());

        // Board name modal
        document.getElementById('btn-cancel-board-name').addEventListener('click', () => this.hideBoardNameModal());
        document.getElementById('btn-confirm-board-name').addEventListener('click', () => this.confirmBoardName());

        // Workbook name click in header
        document.getElementById('workbook-name').addEventListener('click', () => this.showRenameWorkbookModal());

        // Board name click in header
        document.getElementById('board-name').addEventListener('click', () => this.showRenameBoardModal());

        // Enter key in workbook name modal
        document.getElementById('workbook-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmWorkbookName();
            }
        });

        // Enter key in board name modal
        document.getElementById('board-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmBoardName();
            }
        });

        // Confirm new workbook modal buttons
        document.getElementById('btn-cancel-new-workbook').addEventListener('click', () => this.hideConfirmNewWorkbookModal());
        document.getElementById('btn-confirm-new-workbook').addEventListener('click', () => this.confirmNewWorkbook());

        // Board context menu - hide when clicking/tapping outside
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('board-context-menu');
            if (!menu || menu.classList.contains('hidden')) return;

            // Don't close if menu was just opened (prevents double-tap from immediately closing it)
            const timeSinceOpen = Date.now() - (this.boardMenuOpenTime || 0);
            if (timeSinceOpen < 300) {
                return;
            }

            // Only hide if not clicking on the menu itself
            if (!menu.contains(e.target)) {
                menu.classList.add('hidden');
                this.contextMenuBoardId = null;
            }
        });

        // Board context menu - hide on mouseup (for touch compatibility)
        document.addEventListener('mouseup', (e) => {
            const menu = document.getElementById('board-context-menu');
            if (!menu || menu.classList.contains('hidden')) return;

            // Don't close menu if it was just opened
            const timeSinceOpen = Date.now() - (this.boardMenuOpenTime || 0);
            if (timeSinceOpen < 300) {
                return;
            }

            // Only hide if not clicking on the menu itself
            if (!menu.contains(e.target)) {
                menu.classList.add('hidden');
                this.contextMenuBoardId = null;
            }
        });

        // Board context menu - hide when window loses focus
        window.addEventListener('blur', () => {
            const menu = document.getElementById('board-context-menu');
            if (!menu) return;
            menu.classList.add('hidden');
            this.contextMenuBoardId = null;
        });

        // File menu - hide when clicking outside or on other buttons
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('file-menu');
            const fileBtn = document.getElementById('btn-file-menu');
            if (!menu || menu.classList.contains('hidden')) return;

            // Don't hide if clicking the file button itself (handled by toggleFileMenu)
            if (fileBtn && fileBtn.contains(e.target)) return;

            // Don't hide if clicking inside the menu
            if (menu.contains(e.target)) return;

            // Hide for any other click
            this.hideFileMenu();
        }, true); // Use capture phase to ensure we catch clicks before stopPropagation

        // File menu - hide when window loses focus
        window.addEventListener('blur', () => {
            this.hideFileMenu();
        });
    },

    // Toggle File menu
    toggleFileMenu(event) {
        const menu = document.getElementById('file-menu');
        if (!menu) return;

        if (menu.classList.contains('hidden')) {
            this.showFileMenu(event);
        } else {
            this.hideFileMenu();
        }
    },

    // Show File menu
    showFileMenu(event) {
        const menu = document.getElementById('file-menu');
        const fileBtn = document.getElementById('btn-file-menu');
        if (!menu || !fileBtn) return;

        // Position menu below the File button
        const rect = fileBtn.getBoundingClientRect();
        menu.classList.remove('hidden');
        menu.style.display = 'block';

        // Get menu dimensions after making it visible
        const menuRect = menu.getBoundingClientRect();

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

        menu.style.left = left + 'px';
        menu.style.top = top + 'px';

        // Remove old click listener
        const oldClickHandler = menu._clickHandler;
        if (oldClickHandler) {
            menu.removeEventListener('click', oldClickHandler);
        }

        // Add click handler for menu items
        const clickHandler = (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item) return;

            // Hide menu
            this.hideFileMenu();

            // Handle action
            const action = item.dataset.action;
            switch (action) {
                case 'new-board':
                    this.createNewBoardInWorkbook();
                    break;
                case 'new-workbook':
                    this.showConfirmNewWorkbookModal();
                    break;
                case 'open':
                    this.importWorkbook();
                    break;
                case 'save':
                    this.exportWorkbook(false);
                    break;
                case 'save-as':
                    this.exportWorkbook(true);
                    break;
                case 'export-board':
                    this.exportCurrentBoard();
                    break;
                case 'import-board':
                    this.importBoard();
                    break;
                case 'export-workbook':
                    this.exportWorkbook(false);
                    break;
                case 'import-workbook':
                    this.importWorkbook();
                    break;
            }
        };

        menu._clickHandler = clickHandler;
        menu.addEventListener('click', clickHandler);
    },

    // Hide File menu
    hideFileMenu() {
        const menu = document.getElementById('file-menu');
        if (!menu) return;
        menu.classList.add('hidden');
        menu.style.display = 'none';
    },

    // Show workbook name modal for new workbook
    showNewWorkbookModal() {
        document.getElementById('workbook-modal-title').textContent = 'New Workbook';
        document.getElementById('workbook-name-input').value = 'My Futsal-Boards';
        Utils.openModal('workbook-name-modal');
        document.getElementById('workbook-name-input').focus();
        document.getElementById('workbook-name-input').select();

        this.workbookNameCallback = (name) => {
            // Reset entire workbook
            AppState.resetWorkbook();
            AppState.workbookName = name;
            AppState.currentFileHandle = null; // Clear file handle for new workbook
            AppState.saveToLocalStorage();

            // Reset expanded boards tracking
            this.expandedBoards.clear();
            this.hasInitiallyRendered = false;

            this.updateWorkbookNameDisplay();
            this.updateBoardNameDisplay();
            this.renderBoardsList();
            Breadcrumb.update();

            // Re-render all components
            try {
                Teams.render();
                Shapes.render();
                Plates.render();
                Elements.render();
                Balls.render();
                Players.render();
                Drawings.render();
            } catch (e) {
                console.error('Error rendering after reset:', e);
            }
        };
    },

    // Show workbook name modal for renaming
    showRenameWorkbookModal() {
        document.getElementById('workbook-modal-title').textContent = 'Rename Workbook';
        document.getElementById('workbook-name-input').value = AppState.workbookName;
        Utils.openModal('workbook-name-modal');
        document.getElementById('workbook-name-input').focus();
        document.getElementById('workbook-name-input').select();

        this.workbookNameCallback = (name) => {
            AppState.workbookName = name;
            AppState.saveToLocalStorage();
            this.updateWorkbookNameDisplay();
        };
    },

    // Hide workbook name modal
    hideWorkbookNameModal() {
        document.getElementById('workbook-name-modal').classList.add('hidden');
        this.workbookNameCallback = null;
    },

    // Confirm workbook name
    confirmWorkbookName() {
        const name = document.getElementById('workbook-name-input').value.trim();

        if (!name) {
            Utils.showMessage('Please enter a workbook name', 'Name Required');
            return;
        }

        if (this.workbookNameCallback) {
            this.workbookNameCallback(name);
        }

        this.hideWorkbookNameModal();
    },

    // Update workbook name display in header
    updateWorkbookNameDisplay() {
        const nameElement = document.getElementById('workbook-name');
        if (nameElement) {
            nameElement.textContent = AppState.workbookName;
        }
    },

    // Update board name display in header
    updateBoardNameDisplay() {
        const nameElement = document.getElementById('board-name');
        if (nameElement) {
            nameElement.textContent = AppState.getCurrentBoardName();
        }
    },

    // Render boards list
    renderBoardsList() {
        const container = document.getElementById('boards-list');
        if (!container) return;

        // Auto-expand all boards with children only on very first render
        if (!this.hasInitiallyRendered) {
            this.hasInitiallyRendered = true;
            AppState.boards.forEach(board => {
                if (board.children && board.children.length > 0) {
                    this.expandedBoards.add(board.id);
                }
            });
        }

        const tree = document.createElement('ul');
        tree.className = 'board-tree';

        // Only render root boards (boards without parents)
        const rootBoards = AppState.boards.filter(b => !b.parentId);
        rootBoards.forEach(board => {
            const treeItem = this.createBoardTreeItem(board);
            tree.appendChild(treeItem);
        });

        container.innerHTML = '';
        container.appendChild(tree);
    },

    // Create a board tree item
    createBoardTreeItem(board, level = 0) {
        const li = document.createElement('li');
        li.className = 'board-tree-item';

        const item = document.createElement('div');
        item.className = 'board-item';
        item.dataset.boardId = board.id;

        if (board.id === AppState.currentBoardId) {
            item.classList.add('active');
        }

        const hasChildren = board.children && board.children.length > 0;
        const isExpanded = this.expandedBoards.has(board.id);

        // Expand/collapse icon (only if has children)
        if (hasChildren) {
            const expandIcon = document.createElement('div');
            expandIcon.className = 'board-expand-icon';
            if (isExpanded) {
                expandIcon.classList.add('expanded');
            }
            expandIcon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;

            // Click expand icon to toggle
            expandIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleBoardExpand(board.id);
            });

            item.appendChild(expandIcon);
        } else {
            // Placeholder to maintain alignment
            const spacer = document.createElement('div');
            spacer.className = 'board-expand-spacer';
            item.appendChild(spacer);
        }

        // Icon
        const icon = document.createElement('div');
        icon.className = 'board-item-icon';
        if (hasChildren) {
            // Folder icon for boards with children
            icon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
            `;
        } else {
            // Board/document icon for leaf boards
            icon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                </svg>
            `;
        }

        // Name
        const name = document.createElement('div');
        name.className = 'board-item-name';
        name.textContent = board.name;

        item.appendChild(icon);
        item.appendChild(name);

        // Click to switch board
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this.switchBoard(board.id);
        });

        // Double-click for context menu
        item.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showBoardContextMenu(e.clientX, e.clientY, board.id);
        });

        // Right-click for context menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showBoardContextMenu(e.clientX, e.clientY, board.id);
        });

        li.appendChild(item);

        // Render children (only if expanded)
        if (hasChildren && isExpanded) {
            const childrenUl = document.createElement('ul');
            childrenUl.className = 'board-tree-children';
            const childItems = [];
            board.children.forEach(childId => {
                const childBoard = AppState.boards.find(b => b.id === childId);
                if (childBoard) {
                    childItems.push(this.createBoardTreeItem(childBoard, level + 1));
                }
            });
            childItems.forEach((childItem, index) => {
                if (index === childItems.length - 1) {
                    childItem.classList.add('last-child');
                }
                childrenUl.appendChild(childItem);
            });
            li.appendChild(childrenUl);
        }

        return li;
    },

    // Toggle board expand/collapse
    toggleBoardExpand(boardId) {
        if (this.expandedBoards.has(boardId)) {
            this.expandedBoards.delete(boardId);
        } else {
            this.expandedBoards.add(boardId);
        }
        this.renderBoardsList();
    },

    // Switch to a different board
    switchBoard(boardId) {
        if (boardId !== AppState.currentBoardId) {
            // Save current board state first
            AppState.saveCurrentBoard();

            AppState.loadBoard(boardId);

            // Re-render everything
            Teams.render();
            Shapes.render();
            Plates.render();
            Elements.render();
            Balls.render();
            Players.render();
            Drawings.render();
            if (typeof Animations !== 'undefined') {
                Animations.updateFrameSpeedUI();
                Animations.renderParentPaths();
            }

            this.updateBoardNameDisplay();
            this.renderBoardsList();
            Breadcrumb.update();
        }
    },

    // Add a new board
    async addBoard() {
        const name = await Utils.showPrompt('Enter board name:', 'New Board', `Board ${AppState.boards.length + 1}`);
        if (name && name.trim()) {
            // Save current board state first
            AppState.saveCurrentBoard();

            AppState.createBoard(name.trim());

            // Re-render everything
            Teams.render();
            Shapes.render();
            Plates.render();
            Elements.render();
            Balls.render();
            Players.render();
            Drawings.render();

            this.updateBoardNameDisplay();
            this.renderBoardsList();
            Breadcrumb.update();
        }
    },

    // Show board context menu
    showBoardContextMenu(x, y, boardId) {
        this.contextMenuBoardId = boardId;
        this.boardMenuOpenTime = Date.now(); // Track when menu was opened
        const menu = document.getElementById('board-context-menu');

        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');

        // Remove old listeners and add new one
        const newMenu = menu.cloneNode(true);
        menu.parentNode.replaceChild(newMenu, menu);

        // Setup menu click handler
        const handleMenuClick = (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item || !this.contextMenuBoardId) return;

            // Always hide menu first, even if item is disabled
            newMenu.classList.add('hidden');
            const boardId = this.contextMenuBoardId;
            this.contextMenuBoardId = null;

            // Don't execute if item is disabled
            if (item.classList.contains('disabled')) {
                return;
            }

            const action = item.dataset.action;

            switch (action) {
                case 'rename':
                    this.showRenameBoardModal(boardId);
                    break;
                case 'add-child':
                    this.addChildBoard(boardId);
                    break;
                case 'duplicate':
                    this.duplicateBoard(boardId);
                    break;
                case 'remove':
                    this.removeBoard(boardId);
                    break;
            }
        };

        newMenu.addEventListener('click', handleMenuClick);
    },

    // Show rename board modal
    showRenameBoardModal(boardId) {
        const currentBoardId = boardId || AppState.currentBoardId;
        document.getElementById('board-name-input').value = AppState.boards.find(b => b.id === currentBoardId)?.name || '';
        Utils.openModal('board-name-modal');
        document.getElementById('board-name-input').focus();
        document.getElementById('board-name-input').select();

        this.boardNameCallback = (name) => {
            AppState.renameBoard(currentBoardId, name);
            this.updateBoardNameDisplay();
            this.renderBoardsList();
            Breadcrumb.render();
        };
    },

    // Hide board name modal
    hideBoardNameModal() {
        document.getElementById('board-name-modal').classList.add('hidden');
        this.boardNameCallback = null;
    },

    // Confirm board name
    confirmBoardName() {
        const name = document.getElementById('board-name-input').value.trim();

        if (!name) {
            Utils.showMessage('Please enter a board name', 'Name Required');
            return;
        }

        if (this.boardNameCallback) {
            this.boardNameCallback(name);
        }

        this.hideBoardNameModal();
    },

    // Add child board
    addChildBoard(boardId) {
        // Save current board state first
        AppState.saveCurrentBoard();

        const childId = AppState.createChildBoard(boardId);
        if (childId) {
            // Auto-expand the parent
            this.expandedBoards.add(boardId);

            // Switch to the new child board
            AppState.loadBoard(childId);

            // Re-render everything
            Teams.render();
            Shapes.render();
            Plates.render();
            Elements.render();
            Balls.render();
            Players.render();
            Drawings.render();
            if (typeof Animations !== 'undefined') {
                Animations.updateFrameSpeedUI();
            }

            this.updateBoardNameDisplay();
            this.renderBoardsList();
            Breadcrumb.update();
        }
    },

    // Duplicate board
    duplicateBoard(boardId) {
        AppState.duplicateBoard(boardId);
        this.renderBoardsList();
    },

    // Remove board
    async removeBoard(boardId) {
        const confirmed = await Utils.showConfirm('Remove this board? This action cannot be undone.', 'Remove Board');
        if (confirmed) {
            if (AppState.removeBoard(boardId)) {
                // Re-render everything if current board was removed
                Teams.render();
                Shapes.render();
                Plates.render();
                Elements.render();
                Balls.render();
                Players.render();
                Drawings.render();

                this.updateBoardNameDisplay();
                this.renderBoardsList();
                Breadcrumb.update();
            }
        }
    },

    // Create new board in current workbook
    createNewBoardInWorkbook() {
        this.addBoard();

        // Switch to Workbook tab
        const workbookTab = document.querySelector('.sidebar-tab[data-tab="workbook"]');
        if (workbookTab) {
            workbookTab.click();
        }
    },

    // Show confirm new workbook modal
    showConfirmNewWorkbookModal() {
        Utils.openModal('confirm-new-workbook-modal');
        document.getElementById('btn-confirm-new-workbook').focus();
    },

    // Hide confirm new workbook modal
    hideConfirmNewWorkbookModal() {
        document.getElementById('confirm-new-workbook-modal').classList.add('hidden');
    },

    // Confirm new workbook creation
    confirmNewWorkbook() {
        this.hideConfirmNewWorkbookModal();
        this.showNewWorkbookModal();
    },

    // Export current board as JSON
    exportCurrentBoard() {
        const board = AppState.boards.find(b => b.id === AppState.currentBoardId);
        if (!board) {
            Utils.showMessage('No board to export', 'Cannot Export');
            return;
        }

        const exportData = {
            type: 'futsal-board',
            version: '1.0',
            board: board
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${board.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Exports the full workbook (all boards, teams, settings) as a downloadable JSON file.
     * Saves the current board state first to ensure the export is up-to-date.
     * If a file handle exists, writes to that file. Otherwise prompts for save location.
     */
    async exportWorkbook(saveAs = false) {
        // Save current board state first
        AppState.saveCurrentBoard();

        const exportData = {
            type: 'futsal-workbook',
            version: '1.0',
            workbookName: AppState.workbookName,
            boards: AppState.boards,
            currentBoardId: AppState.currentBoardId,
            showBoardBreadcrumb: AppState.showBoardBreadcrumb,
        };

        const json = JSON.stringify(exportData, null, 2);

        // Check if File System Access API is available and we have a file handle
        if ('showSaveFilePicker' in window && AppState.currentFileHandle && !saveAs) {
            try {
                // Write to existing file
                const writable = await AppState.currentFileHandle.createWritable();
                await writable.write(json);
                await writable.close();
                Utils.showToast(`Saved to ${AppState.currentFileHandle.name}`, 'success');
                return;
            } catch (err) {
                if (err.name === 'NotAllowedError') {
                    // Permission denied, fall through to save dialog
                } else {
                    console.error('Save error:', err);
                    Utils.showMessage('Failed to save: ' + err.message, 'Save Error');
                    return;
                }
            }
        }

        // Prompt for new file location (File System Access API)
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: `${AppState.workbookName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`,
                    types: [{
                        description: 'Futsal Workbook',
                        accept: { 'application/json': ['.json'] }
                    }]
                });

                const writable = await fileHandle.createWritable();
                await writable.write(json);
                await writable.close();

                // Store file handle for future saves
                AppState.currentFileHandle = fileHandle;
                Utils.showToast(`Saved to ${fileHandle.name}`, 'success');
            } catch (err) {
                // User cancelled or error occurred
                if (err.name !== 'AbortError') {
                    console.error('Save error:', err);
                }
            }
        } else {
            // Fallback to traditional download
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${AppState.workbookName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    },

    /** Opens the file picker to import a single board JSON file into the current workbook. */
    importBoard() {
        const input = document.getElementById('import-board-input');
        input.value = ''; // Reset
        input.click();
    },

    /**
     * Opens the file picker to import a workbook JSON file.
     * Replaces the entire current workbook with the imported data after schema validation.
     * Uses File System Access API if available to enable auto-save.
     */
    async importWorkbook() {
        // Check if File System Access API is available
        if ('showOpenFilePicker' in window) {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Futsal Workbook',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false
                });

                const file = await fileHandle.getFile();
                const text = await file.text();

                try {
                    const data = JSON.parse(text);

                    if (data.type !== 'futsal-workbook') {
                        Utils.showMessage('Invalid workbook file format', 'Import Error');
                        return;
                    }

                    if (!Array.isArray(data.boards) || data.boards.length === 0) {
                        Utils.showMessage('Invalid workbook: no boards found', 'Import Error');
                        return;
                    }

                    if (data.boards.some(b => !b || typeof b !== 'object' || !b.id)) {
                        Utils.showMessage('Invalid workbook: one or more boards are malformed', 'Import Error');
                        return;
                    }

                    // Store file handle for auto-save
                    AppState.currentFileHandle = fileHandle;

                    // Replace current workbook
                    AppState.workbookName = data.workbookName || 'Imported Workbook';
                    AppState.boards = data.boards || [];
                    AppState.nextBoardId = Math.max(...AppState.boards.map(b => parseInt(b.id.split('-')[1]) || 0)) + 1;
                    if (data.showBoardBreadcrumb !== undefined) {
                        AppState.showBoardBreadcrumb = data.showBoardBreadcrumb;
                        const cb = document.getElementById('show-board-breadcrumb');
                        if (cb) cb.checked = data.showBoardBreadcrumb;
                    }

                    // Load the first board or the current one from the export
                    const boardToLoad = data.currentBoardId && AppState.boards.find(b => b.id === data.currentBoardId)
                        ? data.currentBoardId
                        : (AppState.boards.length > 0 ? AppState.boards[0].id : null);

                    if (boardToLoad) {
                        AppState.loadBoard(boardToLoad);
                    } else {
                        // No boards, create a default one
                        AppState.createBoard('Board 1');
                    }

                    // Save to localStorage
                    AppState.saveToLocalStorage();

                    // Re-render everything
                    Teams.render();
                    Shapes.render();
                    Plates.render();
                    Elements.render();
                    Balls.render();
                    Players.render();
                    Drawings.render();
                    if (typeof Animations !== 'undefined') {
                        Animations.updateFrameSpeedUI();
                    }

                    this.updateWorkbookNameDisplay();
                    this.updateBoardNameDisplay();
                    this.renderBoardsList();
                    Breadcrumb.update();

                    Utils.showToast(`Loaded ${fileHandle.name}`, 'success');
                } catch (err) {
                    console.error('Import error:', err);
                    Utils.showMessage('Failed to import workbook: ' + err.message, 'Import Error');
                }
            } catch (err) {
                // User cancelled or error occurred
                if (err.name !== 'AbortError') {
                    console.error('File picker error:', err);
                }
            }
        } else {
            // Fallback to traditional file input
            const input = document.getElementById('import-workbook-input');
            input.value = ''; // Reset
            input.click();
        }
    },

    // Handle board import
    handleBoardImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.type !== 'futsal-board') {
                    Utils.showMessage('Invalid board file format', 'Import Error');
                    return;
                }

                const board = data.board;
                if (!board || typeof board !== 'object') {
                    Utils.showMessage('Invalid board data: missing board object', 'Import Error');
                    return;
                }

                if (!board.id || !Array.isArray(board.players)) {
                    Utils.showMessage('Invalid board data: missing required fields', 'Import Error');
                    return;
                }

                // Create new board with imported data
                const newBoard = {
                    ...board,
                    id: `board-${AppState.nextBoardId++}`,
                    name: board.name + ' (Imported)'
                };

                AppState.boards.push(newBoard);
                AppState.loadBoard(newBoard.id);

                // Re-render everything
                Teams.render();
                Shapes.render();
                Plates.render();
                Elements.render();
                Balls.render();
                Players.render();
                Drawings.render();
                if (typeof Animations !== 'undefined') {
                    Animations.updateFrameSpeedUI();
                }

                this.updateBoardNameDisplay();
                this.renderBoardsList();
                Breadcrumb.update();

                Utils.showToast('Board imported successfully!', 'success');
            } catch (err) {
                console.error('Import error:', err);
                Utils.showMessage('Failed to import board: ' + err.message, 'Import Error');
            }
        };
        reader.readAsText(file);
    },

    // Handle workbook import (fallback for browsers without File System Access API)
    handleWorkbookImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.type !== 'futsal-workbook') {
                    Utils.showMessage('Invalid workbook file format', 'Import Error');
                    return;
                }

                if (!Array.isArray(data.boards) || data.boards.length === 0) {
                    Utils.showMessage('Invalid workbook: no boards found', 'Import Error');
                    return;
                }

                if (data.boards.some(b => !b || typeof b !== 'object' || !b.id)) {
                    Utils.showMessage('Invalid workbook: one or more boards are malformed', 'Import Error');
                    return;
                }

                // Clear file handle since this is fallback method
                AppState.currentFileHandle = null;

                // Replace current workbook
                AppState.workbookName = data.workbookName || 'Imported Workbook';
                AppState.boards = data.boards || [];
                AppState.nextBoardId = Math.max(...AppState.boards.map(b => parseInt(b.id.split('-')[1]) || 0)) + 1;
                if (data.showBoardBreadcrumb !== undefined) {
                    AppState.showBoardBreadcrumb = data.showBoardBreadcrumb;
                    const cb = document.getElementById('show-board-breadcrumb');
                    if (cb) cb.checked = data.showBoardBreadcrumb;
                }

                // Load the first board or the current one from the export
                const boardToLoad = data.currentBoardId && AppState.boards.find(b => b.id === data.currentBoardId)
                    ? data.currentBoardId
                    : (AppState.boards.length > 0 ? AppState.boards[0].id : null);

                if (boardToLoad) {
                    AppState.loadBoard(boardToLoad);
                } else {
                    // No boards, create a default one
                    AppState.createBoard('Board 1');
                }

                // Save to localStorage
                AppState.saveToLocalStorage();

                // Re-render everything
                Teams.render();
                Shapes.render();
                Plates.render();
                Elements.render();
                Balls.render();
                Players.render();
                Drawings.render();
                if (typeof Animations !== 'undefined') {
                    Animations.updateFrameSpeedUI();
                }

                this.updateWorkbookNameDisplay();
                this.updateBoardNameDisplay();
                this.renderBoardsList();
                Breadcrumb.update();

                Utils.showToast('Workbook imported successfully!', 'success');
            } catch (err) {
                console.error('Import error:', err);
                Utils.showMessage('Failed to import workbook: ' + err.message, 'Import Error');
            }
        };
        reader.readAsText(file);
    },

    // Export as image
    exportAsImage() {
        // Create a temporary canvas with board + drawings + players
        const canvas = document.createElement('canvas');
        canvas.width = AppState.canvas.width;
        canvas.height = AppState.canvas.height;
        const ctx = canvas.getContext('2d');

        // Draw board
        ctx.drawImage(AppState.canvas, 0, 0);

        // TODO: Draw SVG drawings and players
        // This would require converting SVG to canvas

        // Download
        const link = document.createElement('a');
        link.download = 'futsal-board.png';
        link.href = canvas.toDataURL();
        link.click();
    }
};
