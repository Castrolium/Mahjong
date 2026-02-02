import { GameCore } from './core/game';
import { TileModel } from './core/tile';

export const game = new GameCore([]);

export const createGame = (tiles: TileModel[]): GameCore => new GameCore(tiles);
