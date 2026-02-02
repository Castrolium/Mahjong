import { GameCore, MatchResult } from '../core/game';
import { Tile } from '../core/tile';
import { CanvasRenderer, ZoomLevel } from './renderer';

export interface ControlElements {
  newGameButton: HTMLButtonElement;
  hintButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  zoomSelect: HTMLSelectElement;
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
  const updateStatus = (message: string): void => {
    elements.statusLabel.textContent = message;
  };

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
        updateStatus(result.gameWon ? 'You cleared the board!' : 'Tiles matched.');
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
    updateStatus(`Zoom set to ${level}%.`);
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
