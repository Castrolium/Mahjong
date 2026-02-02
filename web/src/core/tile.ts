export interface Tile {
  id: number;
  next: Tile | null;

  x: number;
  y: number;
  z: number;

  type: number;
  graph: number;
  step: number;
  hint: number;
  debug: number;

  selected: boolean;
  visible: boolean;
  wireframe: boolean;
}

export class TileModel implements Tile {
  id: number;
  next: Tile | null = null;

  x: number;
  y: number;
  z: number;

  type = -1;
  graph = -1;
  step = -1;
  hint = -1;
  debug = 0;

  selected = false;
  visible = false;
  wireframe = false;

  constructor(id: number, x: number, y: number, z: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.z = z;
  }
}
