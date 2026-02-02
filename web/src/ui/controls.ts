import { GameCore, MatchResult } from '../core/game';
import { Tile } from '../core/tile';
import {
  Difficulty,
  getOptionToggles,
  setDifficulty,
  setMessagesVisible,
  setOptionToggles,
  setZoomFactor,
} from '../platform/settings';
import { CanvasRenderer, ZoomLevel } from './renderer';

export interface ControlElements {
  newGameButton: HTMLButtonElement;
  hintButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  zoomSelect: HTMLSelectElement;
  messagesToggle: HTMLInputElement;
  difficultySelect: HTMLSelectElement;
  watchBuildsToggle: HTMLInputElement;
  peekToggle: HTMLInputElement;
  statusLabel: HTMLElement;
}

export interface ControlOptions {
  onNewGame: () => GameCore;
}

interface ControlState {
  game: GameCore;
  renderer: CanvasRenderer;
  hintTimeout?: number;
}

export const setupControls = (
  state: ControlState,
  elements: ControlElements,
  options: ControlOptions,
): void => {
  let messagesVisible = elements.messagesToggle.checked;

  const applyMessagesVisibility = (visible: boolean): void => {
    messagesVisible = visible;
    elements.statusLabel.style.display = visible ? 'flex' : 'none';
    if (!visible) {
      elements.statusLabel.textContent = '';
    }
  };

  const updateStatus = (message: string): void => {
    if (!messagesVisible) {
      return;
    }
    elements.statusLabel.textContent = message;
  };

  applyMessagesVisibility(messagesVisible);

  const setGame = (game: GameCore): void => {
    state.game = game;
    state.renderer.setGame(game);
    state.renderer.render();
  };

  const clearHintTimer = (): void => {
    if (state.hintTimeout) {
      window.clearTimeout(state.hintTimeout);
      state.hintTimeout = undefined;
    }
  };

  const showHint = (pair: { first: Tile; second: Tile } | null): void => {
    clearHintTimer();

    if (!pair) {
      updateStatus('No hints available.');
      return;
    }

    pair.first.selected = true;
    pair.second.selected = true;
    state.renderer.render();
    updateStatus('Hint: matching pair highlighted.');

    state.hintTimeout = window.setTimeout(() => {
      pair.first.selected = false;
      pair.second.selected = false;
      state.renderer.render();
    }, 800);
  };

  const undoMove = (): void => {
    if (state.game.stepBack <= 0) {
      updateStatus('Nothing to undo.');
      return;
    }

    state.game.stepBack -= 1;
    for (const tile of state.game.tiles) {
      if (tile.step === state.game.stepBack) {
        tile.step = -1;
        tile.visible = true;
        tile.selected = false;
      }
    }
    state.game.selectedTile = null;
    state.renderer.render();
    updateStatus('Move undone.');
  };

  const handleMatchResult = (result: MatchResult): void => {
    switch (result.status) {
      case 'selected':
        updateStatus('Tile selected.');
        break;
      case 'deselected':
        updateStatus('Selection cleared.');
        break;
      case 'matched':
        if (result.gameWon) {
          updateStatus('You cleared the board!');
        } else if (result.noMoves) {
          updateStatus('Tiles matched. No more moves available.');
        } else {
          updateStatus('Tiles matched.');
        }
        break;
      case 'mismatch':
        updateStatus('Tiles do not match.');
        break;
      case 'blocked':
        updateStatus('Tile is blocked.');
        break;
      default:
        updateStatus('');
    }
  };

  elements.newGameButton.addEventListener('click', () => {
    clearHintTimer();
    const game = options.onNewGame();
    setGame(game);
    updateStatus('New game started.');
  });

  elements.hintButton.addEventListener('click', () => {
    clearHintTimer();
    const pair = state.game.getHintPair();
    showHint(pair);
  });

  elements.undoButton.addEventListener('click', () => {
    clearHintTimer();
    undoMove();
  });

  elements.zoomSelect.addEventListener('change', () => {
    const level = Number(elements.zoomSelect.value) as ZoomLevel;
    state.renderer.setZoom(level);
    state.renderer.render();
    setZoomFactor(level);
    updateStatus(`Zoom set to ${level}%.`);
  });

  elements.messagesToggle.addEventListener('change', () => {
    const visible = elements.messagesToggle.checked;
    applyMessagesVisibility(visible);
    setMessagesVisible(visible);
    if (visible) {
      updateStatus('Messages enabled.');
    }
  });

  elements.difficultySelect.addEventListener('change', () => {
    const difficulty = elements.difficultySelect.value as Difficulty;
    setDifficulty(difficulty);
    updateStatus(`Difficulty set to ${difficulty}.`);
  });

  const updateOptionToggle = (updates: Partial<ReturnType<typeof getOptionToggles>>): void => {
    const current = getOptionToggles();
    setOptionToggles({ ...current, ...updates });
  };

  elements.watchBuildsToggle.addEventListener('change', () => {
    updateOptionToggle({ watchBuilds: elements.watchBuildsToggle.checked });
    updateStatus(
      elements.watchBuildsToggle.checked ? 'Build animation enabled.' : 'Build animation disabled.',
    );
  });

  elements.peekToggle.addEventListener('change', () => {
    updateOptionToggle({ peek: elements.peekToggle.checked });
    updateStatus(elements.peekToggle.checked ? 'Peek mode enabled.' : 'Peek mode disabled.');
  });

  const canvas = state.renderer.getCanvas();

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hovered = state.renderer.hitTest(x, y);

    if (hovered?.id !== state.renderer.hoveredTile?.id) {
      state.renderer.hoveredTile = hovered;
      state.renderer.render();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    state.renderer.hoveredTile = null;
    state.renderer.render();
  });

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const target = state.renderer.hitTest(x, y);

    if (!target) {
      updateStatus('No tile selected.');
      return;
    }

    const result = state.game.selectTile(target);
    handleMatchResult(result);
    state.renderer.render();
  });
};
