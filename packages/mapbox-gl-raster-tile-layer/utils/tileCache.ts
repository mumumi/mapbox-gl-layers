import RasterTile from './rasterTile'

export default class TileCache {
  private data: { [key: string]: RasterTile }

  constructor() {
    this.data = {}
  }

  get(key: string): RasterTile {
    return this.data[key]
  }

  put(key: string, value: RasterTile) {
    this.data[key] = value
  }

  clear() {
    this.data = {}
  }

  key(level: number, column: number, row: number) {
    return level + '/' + column + '/' + row
  }
}
