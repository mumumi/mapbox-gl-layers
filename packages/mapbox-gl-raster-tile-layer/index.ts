import { createProgram } from './utils/webgl'
// @ts-ignore
import proj4 from 'proj4'
import TileCache from './utils/tileCache'
import RasterTile from './utils/rasterTile'
import mapboxgl from 'mapbox-gl'

export type NumberPair = [number, number]
export type NumberExtent = [number, number, number, number]

export type RasterTileLayerOption = {
  url: string
  projection: string
  resolutions: number[]
  origin: NumberPair
  tileWidth?: number
  tileHeight?: number
  tileSize?: NumberPair | number
  resampling?: 'linear' | 'nearest'
  opacity?: number
  arrugatorSteps?: number
  tolerance?: number
  wgs84Extent?: NumberExtent
  crossOrigin?: string
}

export default class RasterTileLayer implements mapboxgl.CustomLayerInterface {
  id: string
  type: 'custom'
  renderingMode?: '2d' | '3d' | undefined
  option: RasterTileLayerOption
  private _map: mapboxgl.Map | null
  private _program: WebGLProgram | null
  private _transparentTexture: WebGLTexture | null
  private _projection: proj4.InterfaceProjection
  private _tiles: { [key: string]: RasterTile }
  private _cache: TileCache = new TileCache()

  constructor(id: string, option: RasterTileLayerOption) {
    this.id = id
    this.type = 'custom'
    this.renderingMode = '2d'
    this.option = Object.assign(
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
      option
    )
    let tw = 256,
      th = 256
    if (typeof option.tileSize === 'number') {
      tw = th = option.tileSize
    } else if (option.tileSize instanceof Array && option.tileSize.length >= 1) {
      tw = option.tileSize[0]
      th = option.tileSize[1] || option.tileSize[0]
    }
    this.option.tileSize = [tw, th]
    this._projection = proj4(option.projection)

    this._map = null
    this._program = null
    this._transparentTexture = null
    this._tiles = {}
  }

  onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext) {
    this._map = map
    this._createTransparentTexture(gl)

    const vertexSource = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
            precision highp float;
        #else
            precision mediump float;
        #endif
        attribute vec2 a_pos;
        attribute vec2 a_uv;
        varying vec2 v_uv;
        void main(){
            v_uv = a_uv;
            gl_Position = vec4(a_pos, 0.0, 1.0);
        }`

    const fragmentSource = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
            precision highp float;
        #else
            precision mediump float;
        #endif
        varying vec2 v_uv;
        uniform sampler2D u_sampler;
        uniform float u_opacity;
        void main(){
            vec4 textureColor = texture2D(u_sampler, v_uv);
            gl_FragColor = textureColor * u_opacity;
        }`

    this._program = createProgram(gl, vertexSource, fragmentSource)
  }

  onRemove(map: mapboxgl.Map, gl: WebGLRenderingContext) {
    gl.deleteProgram(this._program)
    gl.deleteTexture(this._transparentTexture)
  }

  render(gl: WebGLRenderingContext, matrix: number[]): void {
    if (this._map && this._program) {
      gl.useProgram(this._program)

      // texture
      gl.uniform1i(gl.getUniformLocation(this._program, 'u_sampler'), 0)

      // opacity
      gl.uniform1f(gl.getUniformLocation(this._program, 'u_opacity'), this.option.opacity || 1)

      if (!this.option.opacity || this.option.opacity <= 0) {
        return
      }

      // blend
      gl.enable(gl.BLEND)
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

      const zoom = this._map.getZoom()
      const { level, resolution } = this._selectResolution(this.option.resolutions, zoom)
      const projector = proj4('EPSG:4326', this._projection).forward
      const wgs84Bounds = this._map.getBounds()
      const sw = projector([
        // @ts-ignore
        Math.max(wgs84Bounds._sw.lng, this.option.wgs84Extent[0] ?? -180),
        // @ts-ignore
        Math.max(wgs84Bounds._sw.lat, this.option.wgs84Extent[1] ?? -90),
      ])
      const ne = projector([
        // @ts-ignore
        Math.min(wgs84Bounds._ne.lng, this.option.wgs84Extent[2] ?? 180),
        // @ts-ignore
        Math.min(wgs84Bounds._ne.lat, this.option.wgs84Extent[3] ?? 90),
      ])
      const swTile = this._getTileCR(
        sw,
        resolution,
        this.option.origin,
        this.option.tileSize as NumberPair
      )
      const neTile = this._getTileCR(
        ne,
        resolution,
        this.option.origin,
        this.option.tileSize as NumberPair
      )
      const startX = swTile[0],
        endX = neTile[0],
        startY = neTile[1],
        endY = swTile[1]

      const newTiles: { [key: string]: RasterTile } = {}
      let i, j, key, tile

      for (j = endY; j >= startY; j--) {
        for (i = startX; i <= endX; i++) {
          key = this._cache.key(level, i, j)

          if (this._tiles[key]) {
            newTiles[key] = this._tiles[key]
            delete this._tiles[key]
          } else {
            tile = this._cache.get(key)
            if (tile) {
              newTiles[key] = tile
            } else {
              newTiles[key] = new RasterTile(level, i, j, resolution, gl, this)
            }
          }
        }
      }

      for (key in this._tiles) {
        tile = this._tiles[key]
        if (tile.request?.cancel) {
          tile.request.cancel()
        }
      }

      this._tiles = newTiles

      let aPosBuffer, aUVBuffer, aIndexBuffer, attrLoc

      for (key in this._tiles) {
        tile = this._tiles[key]
        tile.calcExtent(matrix)

        if (!tile.loaded) {
          continue
        }

        if (tile.arrugado) {
          aPosBuffer = gl.createBuffer()
          attrLoc = gl.getAttribLocation(this._program, 'a_pos')
          gl.bindBuffer(gl.ARRAY_BUFFER, aPosBuffer)
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tile.arrugado.mat), gl.STATIC_DRAW)
          gl.enableVertexAttribArray(attrLoc)
          gl.vertexAttribPointer(attrLoc, 2, gl.FLOAT, false, 0, 0)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)

          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, tile.texture || this._transparentTexture)
          if (tile.arrugado.trigs) {
            aUVBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, aUVBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tile.arrugado.uv), gl.STATIC_DRAW)
            attrLoc = gl.getAttribLocation(this._program, 'a_uv')
            gl.enableVertexAttribArray(attrLoc)
            gl.vertexAttribPointer(attrLoc, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)

            aIndexBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, aIndexBuffer)
            gl.bufferData(
              gl.ELEMENT_ARRAY_BUFFER,
              new Uint16Array(tile.arrugado.trigs),
              gl.STATIC_DRAW
            )
            gl.drawElements(gl.TRIANGLES, tile.arrugado.trigs.length, gl.UNSIGNED_SHORT, 0)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
          } else {
            gl.drawArrays(gl.TRIANGLES, 0, 6)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
          }
        }
      }
    }
  }

  repaint() {
    this._map?.triggerRepaint()
  }

  private _getTileCR(
    point: NumberPair,
    resolution: number,
    origin: NumberPair,
    tileSize: NumberPair
  ): NumberPair {
    const col = Math.floor((point[0] - origin[0]) / resolution / tileSize[0])
    const row = Math.floor((origin[1] - point[1]) / resolution / tileSize[1])
    return [col, row]
  }

  private _selectResolution(
    resolutions: number[],
    zoom: number
  ): { level: number; resolution: number } {
    const sample = this._getResolutionByZoom(zoom)
    let level = 0,
      resolution = 0
    for (let i = 0; i < resolutions.length; i++) {
      level = i
      resolution = resolutions[i]
      if (resolution <= sample) {
        break
      }
    }
    return { level, resolution }
  }

  private _getResolutionByZoom(zoom: number): number {
    const resInMeter = 156543.03392800014 / Math.pow(2, zoom)
    const oProj = this._projection.oProj
    return oProj?.units == 'degrees'
      ? resInMeter / (((oProj.a || 6378137) * Math.PI) / 180)
      : resInMeter
  }

  private _createTransparentTexture(gl: WebGLRenderingContext) {
    const canvas = document.createElement('canvas')
    const ts = this.option.tileSize as NumberPair
    canvas.width = ts[0]
    canvas.height = ts[1]
    const context = canvas.getContext('2d')
    if (context) {
      context.fillStyle = 'rgba(0,0,0,0)'
      context.fillRect(0, 0, ts[0], ts[1])
    }
    this._transparentTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this._transparentTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }
}
