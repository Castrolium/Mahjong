import { GameCore } from './core/game';
import { TileModel } from './core/tile';
import {
  getDifficulty,
  getMessagesVisible,
  getOptionToggles,
  getZoomFactor,
} from './platform/settings';
import { loadAssets } from './ui/assets';
import { CanvasRenderer } from './ui/renderer';
import { setupControls } from './ui/controls';

const createTilePairs = (positions: Array<[number, number, number]>): TileModel[] => {
  const tiles: TileModel[] = positions.map((pos, index) => new TileModel(index, ...pos));

  tiles.forEach((tile) => {
    tile.visible = true;
    tile.selected = false;
  });

  const game = new GameCore(tiles);
  let pairIndex = 0;
  let safety = tiles.length * 4;

  while (tiles.some((tile) => tile.visible) && safety > 0) {
    const freeTiles = tiles.filter((tile) => tile.visible && game.isTileFree(tile));
    if (freeTiles.length < 2) {
      break;
    }

    const firstIndex = Math.floor(Math.random() * freeTiles.length);
    const first = freeTiles.splice(firstIndex, 1)[0];
    const second = freeTiles[Math.floor(Math.random() * freeTiles.length)];

    first.type = pairIndex;
    second.type = pairIndex;
    first.graph = pairIndex;
    second.graph = pairIndex;
    pairIndex += 1;

    first.visible = false;
    second.visible = false;
    safety -= 1;
  }

  const unassigned = tiles.filter((tile) => tile.type < 0);
  if (unassigned.length > 0) {
    const fallbackTypes: number[] = [];
    const pairCount = Math.floor(unassigned.length / 2);
    for (let i = 0; i < pairCount; i += 1) {
      fallbackTypes.push(pairIndex + i, pairIndex + i);
    }
    while (fallbackTypes.length < unassigned.length) {
      fallbackTypes.push(pairIndex + pairCount - 1);
    }
    const shuffledTypes = fallbackTypes.sort(() => Math.random() - 0.5);
    unassigned.forEach((tile, index) => {
      tile.type = shuffledTypes[index];
      tile.graph = tile.type;
    });
  }

  tiles.forEach((tile) => {
    tile.visible = true;
    tile.selected = false;
  });

  return tiles;
};

const buildDemoTiles = (): TileModel[] => {
  const positions: Array<[number, number, number]> = [];
  for (let y = 0; y <= 6; y += 2) {
    for (let x = 0; x <= 10; x += 2) {
      positions.push([x, y, 0]);
    }
  }

  positions.push([4, 2, 1]);
  positions.push([6, 2, 1]);
  positions.push([4, 4, 1]);
  positions.push([6, 4, 1]);

  return createTilePairs(positions);
};

const hasFreeMatch = (game: GameCore): boolean => {
  for (const tile of game.tiles) {
    if (!tile.visible || !game.isTileFree(tile)) {
      continue;
    }
    for (const other of game.tiles) {
      if (
        other.visible &&
        other.id !== tile.id &&
        other.type === tile.type &&
        game.isTileFree(other)
      ) {
        return true;
      }
    }
  }
  return false;
};

const createGame = (): GameCore => {
  let attempt = 0;
  let game: GameCore;

  do {
    game = new GameCore(buildDemoTiles());
    attempt += 1;
  } while (attempt < 50 && !hasFreeMatch(game));

  return game;
};

const initializeUi = async (): Promise<void> => {
  const canvas = document.getElementById('board-canvas') as HTMLCanvasElement | null;
  const board = document.getElementById('board');
  const newGameButton = document.getElementById('new-game') as HTMLButtonElement | null;
  const hintButton = document.getElementById('hint') as HTMLButtonElement | null;
  const undoButton = document.getElementById('undo') as HTMLButtonElement | null;
  const zoomSelect = document.getElementById('zoom') as HTMLSelectElement | null;
  const messagesToggle = document.getElementById('messages-visible') as HTMLInputElement | null;
  const difficultySelect = document.getElementById('difficulty') as HTMLSelectElement | null;
  const watchBuildsToggle = document.getElementById('watch-builds') as HTMLInputElement | null;
  const peekToggle = document.getElementById('peek-mode') as HTMLInputElement | null;
  const statusLabel = document.getElementById('status');

  if (
    !canvas ||
    !board ||
    !newGameButton ||
    !hintButton ||
    !undoButton ||
    !zoomSelect ||
    !messagesToggle ||
    !difficultySelect ||
    !watchBuildsToggle ||
    !peekToggle ||
    !statusLabel
  ) {
    return;
  }

  const zoomFactor = getZoomFactor();
  const messagesVisible = getMessagesVisible();
  const difficulty = getDifficulty();
  const optionToggles = getOptionToggles();

  zoomSelect.value = String(zoomFactor);
  messagesToggle.checked = messagesVisible;
  difficultySelect.value = difficulty;
  watchBuildsToggle.checked = optionToggles.watchBuilds;
  peekToggle.checked = optionToggles.peek;
  statusLabel.style.display = messagesVisible ? 'flex' : 'none';

  const game = createGame();
  let assets = undefined;
  try {
    assets = await loadAssets();
  } catch (error) {
    console.warn('Failed to load assets, falling back to vector tiles.', error);
  }

  const renderer = new CanvasRenderer(canvas, game, { zoom: zoomFactor, assets });

  const state = {
    game,
    renderer,
  };

  if (import.meta.env.DEV) {
    (
      window as Window & {
        mahjongState?: typeof state;
      }
    ).mahjongState = state;
  }

  setupControls(
    state,
    {
      newGameButton,
      hintButton,
      undoButton,
      zoomSelect,
      messagesToggle,
      difficultySelect,
      watchBuildsToggle,
      peekToggle,
      statusLabel,
    },
    {
      onNewGame: createGame,
    },
  );

  const resizeObserver = new ResizeObserver(() => {
    renderer.resizeToContainer();
    renderer.render();
  });

  resizeObserver.observe(board);
  renderer.render();
};

initializeUi();
