import { GameCore } from './core/game';
import { TileModel } from './core/tile';
import { loadAssets } from './ui/assets';
import { CanvasRenderer } from './ui/renderer';
import { setupControls } from './ui/controls';

const createTilePairs = (positions: Array<[number, number, number]>): TileModel[] => {
  const tiles: TileModel[] = positions.map((pos, index) => new TileModel(index, ...pos));
  const types: number[] = [];

  const pairCount = Math.floor(tiles.length / 2);
  for (let i = 0; i < pairCount; i += 1) {
    types.push(i, i);
  }

  while (types.length < tiles.length) {
    types.push(types[types.length % pairCount]);
  }

  const shuffledTypes = types.sort(() => Math.random() - 0.5);

  tiles.forEach((tile, index) => {
    tile.type = shuffledTypes[index];
    tile.graph = tile.type;
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

const createGame = (): GameCore => new GameCore(buildDemoTiles());

const initializeUi = async (): Promise<void> => {
  const canvas = document.getElementById('board-canvas') as HTMLCanvasElement | null;
  const board = document.getElementById('board');
  const newGameButton = document.getElementById('new-game') as HTMLButtonElement | null;
  const hintButton = document.getElementById('hint') as HTMLButtonElement | null;
  const undoButton = document.getElementById('undo') as HTMLButtonElement | null;
  const zoomSelect = document.getElementById('zoom') as HTMLSelectElement | null;
  const statusLabel = document.getElementById('status');

  if (
    !canvas ||
    !board ||
    !newGameButton ||
    !hintButton ||
    !undoButton ||
    !zoomSelect ||
    !statusLabel
  ) {
    return;
  }

  const game = createGame();
  let assets = undefined;
  try {
    assets = await loadAssets();
  } catch (error) {
    console.warn('Failed to load assets, falling back to vector tiles.', error);
  }

  const renderer = new CanvasRenderer(canvas, game, { zoom: 100, assets });

  const state = {
    game,
    renderer,
  };

  setupControls(
    state,
    {
      newGameButton,
      hintButton,
      undoButton,
      zoomSelect,
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
