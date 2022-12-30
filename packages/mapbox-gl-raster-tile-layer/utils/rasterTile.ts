import { ImageRequest, loadImage } from './image'
import { initArrugator } from './arrugator'
import type { ArrugadoFlat } from './arrugator'
import RasterTileLayer from '..'
import { NumberPair, NumberExtent } from '..'
import TileCache from './tileCache'

export type RasterTileOption = {
  url: string
  projection: string
  tileWidth?: number
  tileHeight?: number
  tileSize?: NumberPair | number
  origin: NumberPair
  arrugatorSteps: number
  resampling?: 'linear' | 'nearest'
  opacity?: number
  crossOrigin?: string
  wgs84Extent: NumberExtent
}

export default class RasterTile {
  loaded: boolean
  texture: WebGLTexture | null
  request?: ImageRequest | null
  arrugado: ArrugadoFlat | null
  private _gl: WebGLRenderingContext
  private _option: RasterTileOption
  private _extent: NumberExtent
  private _level: number
  private _column: number
  private _row: number
  private _resolution: number
  private _repaint: () => void
  private _cache: TileCache

  constructor(
    level: number,
    column: number,
    row: number,
    resolution: number,
    gl: WebGLRenderingContext,
    layer: RasterTileLayer
  ) {
    this._option = Object.assign(
      {
        arrugatorSteps: 0,
        opacity: 1,
        resampling: 'linear',
        minZoom: 3,
        maxZoom: 22,
        wgs84Extent: [-180, -90, 180, 90],
        tolerance: 1.2,
        projection: 'EPSG:3857',
        origin: [-20037508.342789244, 20037508.342789244],
      },
      layer.option
    )
    let tw = 256,
      th = 256
    if (typeof layer.option.tileSize === 'number') {
      tw = th = layer.option.tileSize
    } else if (layer.option.tileSize instanceof Array && layer.option.tileSize.length >= 1) {
      tw = layer.option.tileSize[0]
      th = layer.option.tileSize[1] || layer.option.tileSize[0]
    }
    this._option.tileSize = [tw, th]
    this._level = level
    this._column = column
    this._row = row
    this._resolution = resolution
    this.loaded = false
    this.arrugado = null
    this.texture = null
    this._extent = [0, 0, 0, 0]
    this.request = null
    this._gl = gl
    this._repaint = () => layer.repaint()
    this._cache = new TileCache()
    this._load()
  }

  calcExtent(matrix: number[]) {
    if (!this.arrugado) {
      return
    }
    for (let i = 0; i < this.arrugado.pos.length / 2; i++) {
      const arr = this._transformMat4(
        [this.arrugado.pos[i * 2], this.arrugado.pos[i * 2 + 1]],
        matrix
      )
      this.arrugado.mat[i * 2] = arr[0]
      this.arrugado.mat[i * 2 + 1] = arr[1]
    }
  }

  private _getTileExtent(
    tile: NumberPair,
    resolution: number,
    origin: NumberPair,
    tileSize: NumberPair
  ): NumberExtent {
    const minX = origin[0] + tile[0] * tileSize[0] * resolution
    const minY = origin[1] - (tile[1] + 1) * tileSize[1] * resolution
    const maxX = origin[0] + (tile[0] + 1) * tileSize[0] * resolution
    const maxY = origin[1] - tile[1] * tileSize[1] * resolution
    return [minX, Math.min(minY, maxY), maxX, Math.max(minY, maxY)]
  }

  private _transformMat4(point: NumberPair, matrix: number[]): number[] {
    const x = point[0],
      y = point[1],
      z = 0
    let w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15]
    w = w || 1.0
    const out: number[] = []
    out[0] = (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w
    out[1] = (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w
    //out[2] = (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w
    return out
  }

  private _load() {
    const gl = this._gl
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this
    this._extent = this._getTileExtent(
      [this._column, this._row],
      this._resolution,
      this._option.origin,
      this._option.tileSize as NumberPair
    )
    this.arrugado = initArrugator(
      this._option.projection,
      this._extent,
      this._option.arrugatorSteps
    )

    const url = this._option.url
      .replace('{TileCol}', this._column.toString())
      .replace('{TileRow}', this._row.toString())
      .replace('{TileMatrix}', this._level.toString())
      .replace('{x}', this._column.toString())
      .replace('{y}', this._row.toString())
      .replace('{z}', this._level.toString())

    this.request = loadImage(
      url,
      (img) => {
        if (_this.request?.cancel) {
          _this.request.cancel()
        }
        delete _this.request
        if (_this._gl) {
          _this.texture = gl.createTexture()
          gl.bindTexture(gl.TEXTURE_2D, _this.texture)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
          const textureFilter = this._option.resampling === 'nearest' ? gl.NEAREST : gl.LINEAR
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilter)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureFilter)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
          gl.bindTexture(gl.TEXTURE_2D, null)
          this._cache.put(this._cache.key(this._level, this._column, this._row), _this)
          _this.loaded = true
          _this._repaint()
        }
      },
      this._option.crossOrigin
    )
  }
}
