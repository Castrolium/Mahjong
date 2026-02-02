export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TileManifest {
  tileSize: number;
  columns: number;
  rows: number;
  frames: Record<string, SpriteFrame>;
  image: string;
}

export interface UiAssets {
  tilesImage: HTMLImageElement;
  tileManifest: TileManifest;
  uiImages: {
    logo: HTMLImageElement;
  };
}

const resolveBaseUrl = (): string => {
  const basePath = import.meta.env.BASE_URL || '/';
  if (typeof window === 'undefined') {
    return basePath;
  }
  return new URL(basePath, window.location.origin).toString();
};

const BASE_URL = resolveBaseUrl();
const TILE_SPRITE_URL = new URL('assets/tiles/tiles.png', BASE_URL).toString();
const TILE_MANIFEST_URL = new URL('assets/tiles/tiles.json', BASE_URL).toString();
const UI_MANIFEST_URL = new URL('assets/ui/ui.json', BASE_URL).toString();

interface UiManifest {
  images: {
    logo: string;
  };
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

const resolveAssetUrl = (path: string): string => new URL(path, BASE_URL).toString();

const loadManifest = async (): Promise<TileManifest> => {
  const response = await fetch(TILE_MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to load tile manifest: ${response.statusText}`);
  }
  return response.json() as Promise<TileManifest>;
};

export const loadAssets = async (): Promise<UiAssets> => {
  const [tileManifest, uiManifest] = await Promise.all([
    loadManifest(),
    fetch(UI_MANIFEST_URL).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load UI manifest: ${response.statusText}`);
      }
      return response.json() as Promise<UiManifest>;
    }),
  ]);

  const [tilesImage, logo] = await Promise.all([
    loadImage(tileManifest.image ? resolveAssetUrl(tileManifest.image) : TILE_SPRITE_URL),
    loadImage(
      uiManifest.images.logo.startsWith('data:')
        ? uiManifest.images.logo
        : resolveAssetUrl(`assets/ui/${uiManifest.images.logo}`),
    ),
  ]);

  return {
    tileManifest,
    tilesImage,
    uiImages: {
      logo,
    },
  };
};
