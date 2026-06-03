// Breadcrumb navigation bar — shows the ancestry path of the current board
// and a grayed-out forward trail when navigating up the hierarchy.
const Breadcrumb = {
    /**
     * Called after every board switch. Updates breadcrumbTrail using the rule:
     *   - new ancestry is a prefix of existing trail → navigated up, keep trail
     *   - existing trail is a prefix of new ancestry → navigated deeper, extend trail
     *   - neither → different branch, reset trail
     */
    update() {
        const newAncestry = AppState.getBoardAncestryChain().map(b => b.id);
        const trail = AppState.breadcrumbTrail;

        const isPrefix = (short, long) =>
            short.length <= long.length && short.every((id, i) => id === long[i]);

        if (!isPrefix(newAncestry, trail) && !isPrefix(trail, newAncestry)) {
            // Different branch — reset
            AppState.breadcrumbTrail = newAncestry;
        } else if (isPrefix(trail, newAncestry)) {
            // Navigated deeper — extend trail
            AppState.breadcrumbTrail = newAncestry;
        }
        // else: navigated up — keep existing trail as-is

        this.render();
    },

    render() {
        const bar = document.getElementById('board-breadcrumb');
        if (!bar) return;

        // Hand off from the inline <head> class to the runtime .hidden class.
        document.documentElement.classList.remove('breadcrumb-hidden');

        if (!AppState.showBoardBreadcrumb) {
            bar.classList.add('hidden');
            return;
        }
        bar.classList.remove('hidden');
        bar.innerHTML = '';

        const trail = AppState.breadcrumbTrail;
        if (!trail.length) return;

        const currentIndex = trail.indexOf(AppState.currentBoardId);

        trail.forEach((boardId, i) => {
            if (i > 0) {
                const sep = document.createElement('span');
                sep.className = 'breadcrumb-sep';
                sep.textContent = '›';
                bar.appendChild(sep);
            }

            const board = AppState.boards.find(b => b.id === boardId);
            if (!board) return;

            const item = document.createElement('span');
            item.className = 'breadcrumb-item';
            item.textContent = board.name || boardId;

            if (i === currentIndex) {
                item.classList.add('current');
            } else if (i > currentIndex) {
                item.classList.add('grayed');
                item.addEventListener('click', () => Storage.switchBoard(boardId));
            } else {
                item.addEventListener('click', () => Storage.switchBoard(boardId));
            }

            bar.appendChild(item);
        });
    },

    setVisible(visible) {
        AppState.showBoardBreadcrumb = visible;
        this.render();
        AppState.saveToLocalStorage();
    },
};
