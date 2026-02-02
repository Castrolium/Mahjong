import { Tile } from './tile';

export type MatchResultStatus =
  | 'selected'
  | 'deselected'
  | 'matched'
  | 'mismatch'
  | 'blocked';

export interface MatchResult {
  status: MatchResultStatus;
  removed?: { first: Tile; second: Tile };
  gameWon?: boolean;
  noMoves?: boolean;
}

export interface HintPair {
  first: Tile;
  second: Tile;
}

export class GameCore {
  readonly tiles: Tile[];
  selectedTile: Tile | null = null;
  stepBack = 0;
  hintLoopMain: Tile | null = null;
  hintLoopSecond: Tile | null = null;

  private tileIndex = new Map<number, number>();

  constructor(tiles: Tile[]) {
    this.tiles = tiles;
    this.linkTiles();
  }

  linkTiles(): void {
    this.tileIndex.clear();
    this.tiles.forEach((tile, index) => {
      this.tileIndex.set(tile.id, index);
      tile.next = this.tiles[index + 1] ?? null;
    });
  }

  getTile(x: number, y: number, z: number, exactPos: boolean, exactZ: boolean): Tile | null {
    if (exactPos) {
      if (exactZ) {
        return this.tiles.find((tile) => tile.x === x && tile.y === y && tile.z === z) ?? null;
      }

      for (let currentZ = z; currentZ >= 0; currentZ -= 1) {
        const tile = this.getTile(x, y, currentZ, true, true);
        if (tile) {
          return tile;
        }
      }

      return null;
    }

    for (let currentZ = z; currentZ >= 0; currentZ -= 1) {
      const positions: Array<[number, number]> = [
        [x, y],
        [x - 1, y],
        [x, y - 1],
        [x - 1, y - 1],
      ];

      for (const [posX, posY] of positions) {
        const tile = this.getTile(posX, posY, currentZ, true, true);
        if (tile) {
          return tile;
        }
      }
    }

    return null;
  }

  isTileFree(tile: Tile): boolean {
    let leftSide = false;
    let rightSide = false;
    let topSide = false;

    let testTile = this.getTile(tile.x - 1, tile.y, tile.z, false, true);
    if (testTile) {
      leftSide = testTile.visible;
    }

    if (!leftSide) {
      testTile = this.getTile(tile.x - 1, tile.y + 1, tile.z, false, true);
      if (testTile) {
        leftSide = testTile.visible;
      }
    }

    testTile = this.getTile(tile.x + 2, tile.y, tile.z, false, true);
    if (testTile) {
      rightSide = testTile.visible;
    }

    if (!rightSide) {
      testTile = this.getTile(tile.x + 2, tile.y + 1, tile.z, false, true);
      if (testTile) {
        rightSide = testTile.visible;
      }
    }

    if (leftSide && rightSide) {
      return false;
    }

    testTile = this.getTile(tile.x, tile.y, tile.z + 1, false, true);
    if (testTile) {
      topSide = testTile.visible;
    }

    if (!topSide) {
      testTile = this.getTile(tile.x + 1, tile.y, tile.z + 1, false, true);
      if (testTile) {
        topSide = testTile.visible;
      }
    }

    if (!topSide) {
      testTile = this.getTile(tile.x, tile.y + 1, tile.z + 1, false, true);
      if (testTile) {
        topSide = testTile.visible;
      }
    }

    if (!topSide) {
      testTile = this.getTile(tile.x + 1, tile.y + 1, tile.z + 1, false, true);
      if (testTile) {
        topSide = testTile.visible;
      }
    }

    return !topSide;
  }

  getNextHintTile(startingTile: Tile | null, type: number = -1): Tile | null {
    if (!startingTile) {
      return null;
    }

    const startIndex = this.tileIndex.get(startingTile.id) ?? -1;
    for (let index = startIndex; index < this.tiles.length; index += 1) {
      const tile = this.tiles[index];
      if (tile.visible && (type === -1 || tile.type === type) && this.isTileFree(tile)) {
        return tile;
      }
    }

    return null;
  }

  getHintPair(): HintPair | null {
    if (!this.hintLoopMain) {
      this.hintLoopMain = this.getNextHintTile(this.tiles[0] ?? null);
      if (this.hintLoopMain) {
        this.hintLoopSecond = this.getNextHintTile(this.hintLoopMain.next, this.hintLoopMain.type);
      }
    }

    let startingTile = this.hintLoopMain;
    let followingTile = this.hintLoopSecond;
    let tryNext = false;
    let loopCmp = 0;
    let foundPair: HintPair | null = null;

    if (!startingTile) {
      return null;
    }

    do {
      loopCmp += 1;
      if (followingTile) {
        foundPair = { first: startingTile, second: followingTile };
        followingTile = this.getNextHintTile(followingTile.next, startingTile.type);
        tryNext = false;
      } else {
        startingTile = this.getNextHintTile(startingTile.next);
        tryNext = Boolean(startingTile);
        if (startingTile) {
          followingTile = this.getNextHintTile(startingTile.next, startingTile.type);
        }
      }
    } while (tryNext && loopCmp <= 72 && !foundPair);

    this.hintLoopMain = startingTile;
    this.hintLoopSecond = followingTile;

    return foundPair;
  }

  getAutoPlayPair(): HintPair | null {
    let minHint = 72;
    let floorHint = 0;
    let maxLoop = 72;

    let selected: Tile | null = null;
    let match: Tile | null = null;

    do {
      selected = null;
      match = null;

      for (const tile of this.tiles) {
        if (tile.visible && tile.hint <= minHint && tile.hint > floorHint && this.isTileFree(tile)) {
          minHint = tile.hint;
          selected = tile;
        }
      }

      if (!selected) {
        break;
      }

      for (const tile of this.tiles) {
        if (
          tile.visible &&
          tile.hint === minHint &&
          tile.id !== selected.id &&
          this.isTileFree(tile)
        ) {
          match = tile;
          break;
        }
      }

      if (!match) {
        for (const tile of this.tiles) {
          if (
            tile.visible &&
            tile.hint !== minHint &&
            tile.type === selected.type &&
            this.isTileFree(tile)
          ) {
            match = tile;
            break;
          }
        }
      }

      if (!match) {
        floorHint = minHint;
        minHint = 72;
        maxLoop -= 1;
      }
    } while (maxLoop > 0 && !match);

    if (selected && match) {
      return { first: selected, second: match };
    }

    return null;
  }

  autoPlayStep(): MatchResult {
    const pair = this.getAutoPlayPair();
    if (!pair) {
      return { status: 'blocked' };
    }

    return this.removePair(pair.first, pair.second, true);
  }

  selectTile(tile: Tile): MatchResult {
    if (!tile.visible || !this.isTileFree(tile)) {
      return { status: 'blocked' };
    }

    if (!this.selectedTile) {
      tile.selected = true;
      this.selectedTile = tile;
      return { status: 'selected' };
    }

    if (this.selectedTile.id === tile.id) {
      tile.selected = false;
      this.selectedTile = null;
      return { status: 'deselected' };
    }

    if (tile.type === this.selectedTile.type) {
      return this.removePair(tile, this.selectedTile, false);
    }

    return { status: 'mismatch' };
  }

  removePair(first: Tile, second: Tile, autoPlay: boolean): MatchResult {
    first.visible = false;
    first.selected = false;
    first.step = this.stepBack;

    second.visible = false;
    second.selected = false;
    second.step = this.stepBack;

    this.selectedTile = null;
    this.stepBack += 1;
    this.hintLoopMain = null;
    this.hintLoopSecond = null;

    const gameWon = !this.tiles.some((tile) => tile.visible);
    if (gameWon) {
      return { status: 'matched', removed: { first, second }, gameWon: true };
    }

    const noMoves = !this.hasAnyFreeMatches();
    return {
      status: 'matched',
      removed: { first, second },
      gameWon: false,
      noMoves: autoPlay ? noMoves : noMoves,
    };
  }

  private hasAnyFreeMatches(): boolean {
    for (const tile of this.tiles) {
      if (tile.visible && this.isTileFree(tile)) {
        for (const otherTile of this.tiles) {
          if (
            otherTile.visible &&
            otherTile.id !== tile.id &&
            this.isTileFree(otherTile) &&
            otherTile.type === tile.type
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
