// Teams management
const Teams = {
    draggedTemplate: null,
    playerTemplateSize: 40, // Default size, will be updated

    /** Wires up team UI controls, colour pickers, and board management buttons. */
    init() {
        this.render();
        this.setupEventListeners();
        this.updatePlayerTemplatesSizes();
    },

    // Update player template sizes to match board scale
    updatePlayerTemplatesSizes() {
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;

        // Player is 100cm (same as on board)
        this.playerTemplateSize = Math.max(100 * scaleX, 30); // minimum 30px for visibility

        // Re-render to apply new sizes
        this.render();
    },

    // Setup event listeners
    setupEventListeners() {
        document.getElementById('btn-add-team').addEventListener('click', () => {
            AppState.addTeam();
            this.render();
        });
    },

    /** Renders team panels, player templates, and colour pickers in the sidebar. */
    render() {
        const container = document.getElementById('teams-container');
        container.innerHTML = '';

        AppState.teams.forEach((team, index) => {
            const teamRow = this.createTeamRow(team, index);
            container.appendChild(teamRow);
        });

        // Disable/enable "Add Team" button based on child board status
        const addTeamBtn = document.getElementById('btn-add-team');
        if (addTeamBtn) {
            const isChildBoard = AppState.isChildBoard();
            addTeamBtn.disabled = isChildBoard;
            if (isChildBoard) {
                addTeamBtn.classList.add('disabled');
                addTeamBtn.title = 'Cannot add teams in child boards';
            } else {
                addTeamBtn.classList.remove('disabled');
                addTeamBtn.title = '';
            }
        }
    },

    // Create team row element
    createTeamRow(team, index) {
        const row = document.createElement('div');
        row.className = 'team-row';
        row.dataset.teamId = team.id;

        // Color picker
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.className = 'team-color-picker';
        colorPicker.value = team.color;
        colorPicker.title = team.name;

        // Make color picker size scale with player template
        const pickerSize = Math.max(this.playerTemplateSize * 0.5, 20);
        colorPicker.style.width = pickerSize + 'px';
        colorPicker.style.height = pickerSize + 'px';

        // Disable color picker in child boards
        const isChildBoard = AppState.isChildBoard();
        if (isChildBoard) {
            colorPicker.disabled = true;
            colorPicker.style.opacity = '0.5';
            colorPicker.style.cursor = 'not-allowed';
            colorPicker.title = team.name + ' (color locked in child board)';
        }

        colorPicker.addEventListener('change', (e) => {
            // Can't change team color in child boards
            if (AppState.isChildBoard()) return;

            team.color = e.target.value;
            AppState.saveToLocalStorage();
            Players.render();
            this.render();
        });

        // Player template (draggable)
        const playerTemplate = document.createElement('div');
        playerTemplate.className = 'team-player-template';
        playerTemplate.style.backgroundColor = team.color;
        playerTemplate.dataset.teamId = team.id;
        playerTemplate.draggable = true;

        // Apply calculated size
        const playerSize = this.playerTemplateSize;
        playerTemplate.style.width = playerSize + 'px';
        playerTemplate.style.height = playerSize + 'px';
        playerTemplate.style.fontSize = (playerSize * 0.6) + 'px';

        // Create arms using reusable function from Players module
        const armsContainer = Players.createPlayerArms(playerSize, team.color);

        // Show next available number
        const nextNumber = AppState.getNextPlayerNumber(team.id);
        const numberSpan = document.createElement('span');
        numberSpan.textContent = nextNumber;
        numberSpan.className = 'player-number';

        // Set text color based on background brightness
        if (Players && Players.isBrightColor) {
            numberSpan.style.color = Players.isBrightColor(team.color) ? '#000000' : '#ffffff';
        }

        // Add arms first (so they render behind), then number
        playerTemplate.appendChild(armsContainer);
        playerTemplate.appendChild(numberSpan);

        // Transparent overlay covering the full arm+body area so dragging from
        // the arm regions (which extend outside the circle element) also works.
        // Arms extend ~60% of playerSize on each side via CSS left/right: -60%.
        const overlay = document.createElement('div');
        overlay.className = 'player-drag-overlay';
        const armOverhang = Math.round(playerSize * 0.65); // slightly > 60% for safety
        overlay.style.position = 'absolute';
        overlay.style.left = (-armOverhang) + 'px';
        overlay.style.right = (-armOverhang) + 'px';
        overlay.style.top = (-armOverhang * 0.5) + 'px';
        overlay.style.bottom = (-armOverhang * 0.5) + 'px';
        overlay.style.background = 'transparent';
        overlay.style.zIndex = '20';
        overlay.style.cursor = 'grab';
        overlay.draggable = true;
        playerTemplate.appendChild(overlay);

        // Track if dragging is happening
        let isDragging = false;

        // Shared drag start logic used by both template and overlay
        const startDrag = (e) => {
            isDragging = true;
            this.draggedTemplate = team.id;
            e.dataTransfer.effectAllowed = 'copy';
            // Build a sized container that accommodates both the player circle and
            // its arms, so the drag ghost shows the full player.
            // Arms extend playerSize*0.6 to each side (CSS left/right: -60%).
            const armExt = Math.round(playerSize * 0.6);
            const totalW = playerSize + 2 * armExt;
            const container = document.createElement('div');
            container.style.cssText = [
                'position:fixed', 'top:-9999px', 'left:-9999px',
                `width:${totalW}px`, `height:${playerSize}px`,
                'pointer-events:none', 'overflow:visible',
            ].join(';');
            const clone = playerTemplate.cloneNode(true);
            // Remove only the transparent overlay (not the arms)
            clone.querySelector('.player-drag-overlay')?.remove();
            clone.style.position = 'absolute';
            clone.style.left = armExt + 'px';
            clone.style.top = '0';
            clone.style.opacity = '1';
            container.appendChild(clone);
            document.body.appendChild(container);
            // Hotspot: center of the player circle within the container
            e.dataTransfer.setDragImage(container, armExt + playerSize / 2, playerSize / 2);
            setTimeout(() => document.body.removeChild(container), 0);
            playerTemplate.style.opacity = '0.5';
        };
        const endDrag = () => {
            this.draggedTemplate = null;
            playerTemplate.style.opacity = '1';
            setTimeout(() => { isDragging = false; }, 100);
        };

        // Drag events for template body
        playerTemplate.addEventListener('dragstart', startDrag);
        playerTemplate.addEventListener('dragend', endDrag);

        // Drag events for overlay (covers arm area outside the circle)
        overlay.addEventListener('dragstart', startDrag);
        overlay.addEventListener('dragend', endDrag);
        // Forward clicks on overlay to the template's click logic
        overlay.addEventListener('click', (e) => {
            if (isDragging) return;
            if (e.detail === 0) return;
            // Can't add players in child boards
            if (AppState.isChildBoard()) {
                Utils.showMessage('Players can only be added on parent boards. Only shapes/draws can be added on child boards.', 'Cannot Add Player');
                return;
            }
            const freePos = AppState.findFreePosition(250);
            AppState.addPlayer(team.id, freePos.x, freePos.y, 0);
            Players.render();
        });

        // Remove button (only show if more than 1 team)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'team-remove-btn';
        removeBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        `;
        removeBtn.addEventListener('click', async () => {
            // Can't remove teams in child boards
            if (AppState.isChildBoard()) {
                Utils.showMessage('Cannot remove teams in child boards.', 'Cannot Remove Team');
                return;
            }

            if (AppState.teams.length > 1) {
                const confirmed = await Utils.showConfirm(`Remove ${team.name} team? All players from this team will be removed.`, 'Remove Team');
                if (confirmed) {
                    AppState.removeTeam(team.id);
                    this.render();
                    Players.render();
                }
            } else {
                Utils.showMessage('You must have at least one team.', 'Cannot Remove Team');
            }
        });

        row.appendChild(colorPicker);
        row.appendChild(playerTemplate);

        if (AppState.teams.length > 1) {
            row.appendChild(removeBtn);
        }

        return row;
    }
};
