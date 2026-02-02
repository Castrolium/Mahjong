import {
  HALFTILESIZE_100,
  HALFTILESIZE_125,
  HALFTILESIZE_150,
  HALFTILESIZE_200,
  TILESIZE_100,
  TILESIZE_125,
  TILESIZE_150,
  TILESIZE_200,
  TILEXOFFSET_100,
  TILEXOFFSET_125,
  TILEXOFFSET_150,
  TILEXOFFSET_200,
  TILEYOFFSET_100,
  TILEYOFFSET_125,
  TILEYOFFSET_150,
  TILEYOFFSET_200,
} from '../core/constants';
import { GameCore } from '../core/game';
import { Tile } from '../core/tile';
import { SpriteFrame, UiAssets } from './assets';

export type ZoomLevel = 100 | 125 | 150 | 200;

export interface ZoomSettings {
  level: ZoomLevel;
  tileSize: number;
  halfTileSize: number;
  tileXOffset: number;
  tileYOffset: number;
}

export interface RendererOptions {
  zoom?: ZoomLevel;
  origin?: { x: number; y: number };
  background?: string;
  assets?: UiAssets;
}

const ZOOM_SETTINGS: Record<ZoomLevel, ZoomSettings> = {
  100: {
    level: 100,
    tileSize: TILESIZE_100,
    halfTileSize: HALFTILESIZE_100,
    tileXOffset: TILEXOFFSET_100,
    tileYOffset: TILEYOFFSET_100,
  },
  125: {
    level: 125,
    tileSize: TILESIZE_125,
    halfTileSize: HALFTILESIZE_125,
    tileXOffset: TILEXOFFSET_125,
    tileYOffset: TILEYOFFSET_125,
  },
  150: {
    level: 150,
    tileSize: TILESIZE_150,
    halfTileSize: HALFTILESIZE_150,
    tileXOffset: TILEXOFFSET_150,
    tileYOffset: TILEYOFFSET_150,
  },
  200: {
    level: 200,
    tileSize: TILESIZE_200,
    halfTileSize: HALFTILESIZE_200,
    tileXOffset: TILEXOFFSET_200,
    tileYOffset: TILEYOFFSET_200,
  },
};

const DEFAULT_ORIGIN = { x: 8, y: 6 };

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private zoom: ZoomSettings;
  private origin: { x: number; y: number };
  private background: string;
  private assets?: UiAssets;
  private lastSize: { width: number; height: number } | null = null;

  hoveredTile: Tile | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private game: GameCore,
    options: RendererOptions = {},
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context not available.');
    }

    this.ctx = context;
    this.zoom = ZOOM_SETTINGS[options.zoom ?? 100];
    this.origin = options.origin ?? DEFAULT_ORIGIN;
    this.background = options.background ?? '#0f1115';
    this.assets = options.assets;
    this.resizeToContainer();
  }

  setGame(game: GameCore): void {
    this.game = game;
  }

  setZoom(level: ZoomLevel): void {
    this.zoom = ZOOM_SETTINGS[level];
  }

  resizeToContainer(): void {
    const parent = this.canvas.parentElement;
    const targetWidth = parent?.clientWidth ?? 960;
    const targetHeight = parent?.clientHeight ?? 640;
    const pixelRatio = window.devicePixelRatio || 1;

    if (
      this.lastSize &&
      this.lastSize.width === targetWidth &&
      this.lastSize.height === targetHeight
    ) {
      return;
    }

    this.lastSize = { width: targetWidth, height: targetHeight };

    this.canvas.width = targetWidth * pixelRatio;
    this.canvas.height = targetHeight * pixelRatio;
    this.canvas.style.width = `${targetWidth}px`;
    this.canvas.style.height = `${targetHeight}px`;

    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  render(): void {
    this.clear();

    const tiles = [...this.game.tiles]
      .filter((tile) => tile.visible)
      .sort((a, b) => {
        if (a.z !== b.z) return a.z - b.z;
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });

    for (const tile of tiles) {
      this.drawTile(tile);
    }
  }

  hitTest(canvasX: number, canvasY: number): Tile | null {
    const tiles = [...this.game.tiles]
      .filter((tile) => tile.visible)
      .sort((a, b) => {
        if (a.z !== b.z) return b.z - a.z;
        if (a.y !== b.y) return b.y - a.y;
        return b.x - a.x;
      });

    for (const tile of tiles) {
      const hit = this.isPointInTile(canvasX, canvasY, tile);
      if (hit) {
        return tile;
      }
    }

    return null;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getZoom(): ZoomSettings {
    return this.zoom;
  }

  private clear(): void {
    this.ctx.fillStyle = this.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawTile(tile: Tile): void {
    const { x, y } = this.getTileScreenPosition(tile);
    const { tileSize, tileXOffset, tileYOffset } = this.zoom;

    const baseColor = this.getTileColor(tile.type);
    const topColor = tile.selected ? '#fef3c7' : baseColor;

    const leftSide = [
      { x, y },
      { x, y: y + tileSize },
      { x: x - tileXOffset, y: y + tileYOffset + tileSize },
      { x: x - tileXOffset, y: y + tileYOffset },
    ];

    const lowerSide = [
      { x, y: y + tileSize },
      { x: x + tileSize, y: y + tileSize },
      { x: x - tileXOffset + tileSize, y: y + tileYOffset + tileSize },
      { x: x - tileXOffset, y: y + tileYOffset + tileSize },
    ];

    this.drawPolygon(leftSide, this.shadeColor(baseColor, -20));
    this.drawPolygon(lowerSide, this.shadeColor(baseColor, -30));

    const spriteFrame = this.getSpriteFrame(tile.type);
    if (spriteFrame && this.assets) {
      this.ctx.drawImage(
        this.assets.tilesImage,
        spriteFrame.x,
        spriteFrame.y,
        spriteFrame.width,
        spriteFrame.height,
        x,
        y,
        tileSize,
        tileSize,
      );
      if (tile.selected) {
        this.ctx.fillStyle = 'rgba(254, 243, 199, 0.35)';
        this.ctx.fillRect(x, y, tileSize, tileSize);
      }
    } else {
      this.ctx.fillStyle = topColor;
      this.ctx.fillRect(x, y, tileSize, tileSize);
    }

    this.ctx.strokeStyle = tile.selected ? '#f59e0b' : '#111827';
    this.ctx.lineWidth = tile.selected ? 2 : 1;
    this.ctx.strokeRect(x, y, tileSize, tileSize);

    if (this.hoveredTile?.id === tile.id) {
      this.ctx.strokeStyle = '#38bdf8';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x - 1, y - 1, tileSize + 2, tileSize + 2);
    }

    if (!spriteFrame) {
      this.ctx.fillStyle = '#111827';
      this.ctx.font = `${Math.max(10, tileSize / 3)}px sans-serif`;
      this.ctx.fillText(`${tile.type}`, x + tileSize / 3, y + tileSize / 1.6);
    }
  }

  private drawPolygon(points: Array<{ x: number; y: number }>, fill: string): void {
    this.ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        this.ctx.moveTo(point.x, point.y);
      } else {
        this.ctx.lineTo(point.x, point.y);
      }
    });
    this.ctx.closePath();
    this.ctx.fillStyle = fill;
    this.ctx.strokeStyle = '#0f172a';
    this.ctx.lineWidth = 1;
    this.ctx.fill();
    this.ctx.stroke();
  }

  private getTileScreenPosition(tile: Tile): { x: number; y: number } {
    const { halfTileSize, tileXOffset, tileYOffset } = this.zoom;
    const x = tile.x * halfTileSize + this.origin.x + tile.z * tileXOffset;
    const y = tile.y * halfTileSize + this.origin.y - tile.z * tileYOffset;
    return { x, y };
  }

  private isPointInTile(canvasX: number, canvasY: number, tile: Tile): boolean {
    const { x, y } = this.getTileScreenPosition(tile);
    const { tileSize, tileXOffset, tileYOffset } = this.zoom;

    const topRect = {
      left: x,
      right: x + tileSize,
      top: y,
      bottom: y + tileSize,
    };

    if (
      canvasX >= topRect.left &&
      canvasX <= topRect.right &&
      canvasY >= topRect.top &&
      canvasY <= topRect.bottom
    ) {
      return true;
    }

    const leftSide = [
      { x, y },
      { x, y: y + tileSize },
      { x: x - tileXOffset, y: y + tileYOffset + tileSize },
      { x: x - tileXOffset, y: y + tileYOffset },
    ];

    const lowerSide = [
      { x, y: y + tileSize },
      { x: x + tileSize, y: y + tileSize },
      { x: x - tileXOffset + tileSize, y: y + tileYOffset + tileSize },
      { x: x - tileXOffset, y: y + tileYOffset + tileSize },
    ];

    return (
      this.pointInPolygon({ x: canvasX, y: canvasY }, leftSide) ||
      this.pointInPolygon({ x: canvasX, y: canvasY }, lowerSide)
    );
  }

  private pointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  private getTileColor(type: number): string {
    const hue = (type * 47) % 360;
    return `hsl(${hue}, 65%, 72%)`;
  }

  private shadeColor(color: string, amount: number): string {
    const match = /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/.exec(color);
    if (!match) {
      return color;
    }

    const hue = Number(match[1]);
    const saturation = Number(match[2]);
    const lightness = Math.min(90, Math.max(10, Number(match[3]) + amount));
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  private getSpriteFrame(tileType: number): SpriteFrame | null {
    const manifest = this.assets?.tileManifest;
    if (!manifest) {
      return null;
    }

    const frameKeys = Object.keys(manifest.frames);
    if (frameKeys.length === 0) {
      return null;
    }

    const normalized = ((tileType % frameKeys.length) + frameKeys.length) % frameKeys.length;
    return manifest.frames[String(normalized)] ?? null;
  }
}
