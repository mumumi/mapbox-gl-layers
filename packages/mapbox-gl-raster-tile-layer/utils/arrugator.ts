import { NumberExtent, NumberPair } from '..'
// @ts-ignore
import Arrugator from 'arrugator'
// @ts-ignore
import proj4 from 'proj4'

export type ArrugadoFlat = {
  pos: number[]
  uv: number[]
  mat: number[]
  trigs?: number[]
}

export function initArrugator(fromProj: string, extent: NumberExtent, steps: number): ArrugadoFlat {
  // 墨卡托投影的左上角坐标，对应 mapbox 左上角起始坐标 [0,0]
  const origin = [-20037508.342789244, 20037508.342789244]
  // 坐标转换为 Arrugator 坐标 bottom-left, top-left, bottom-right, top-right)
  const bl = [extent[0], extent[1]],
    tl = [extent[0], extent[3]],
    br = [extent[2], extent[1]],
    tr = [extent[2], extent[3]]
  // 改写坐标转换函数，因为 mapbox 的墨卡托坐标是 0-1，并且对应地理范围与标准 3857 不同
  function forward(coors: NumberPair) {
    const coor_3857 = proj4(fromProj, 'EPSG:3857', coors)
    // 墨卡托坐标转换到 0-1 区间，origin 对应 mapbox 0 0点
    const mapbox_coor1 = Math.abs((coor_3857[0] - origin[0]) / (origin[0] * 2))
    const mapbox_coor2 = Math.abs((coor_3857[1] - origin[1]) / (origin[1] * 2))
    return [mapbox_coor1, mapbox_coor2]
  }

  if (steps <= 0) {
    return {
      pos: [bl, br, tl, br, tl, tr].map((c) => forward(c as NumberPair)).flat(), // mapbox 墨卡托坐标
      uv: [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1], // uv 纹理
      mat: [],
    }
  }

  const verts = [bl, tl, br, tr]
  // 纹理uv坐标
  const sourceUV = [
    [0, 0], // top-left
    [0, 1], // bottom-left
    [1, 0], // top-right
    [1, 1], // bottom-right
  ]
  const arrugator = new Arrugator(forward, verts, sourceUV, [
    [0, 1, 3],
    [0, 3, 2],
  ])

  for (let i = 0; i < steps; i++) {
    arrugator.step()
  }
  //arrugator.lowerEpsilon(0.0000000001);

  const arrugado = arrugator.output()

  return {
    pos: arrugado.projected.flat(), // mapbox 墨卡托坐标
    uv: arrugado.uv.flat(), // uv 纹理
    mat: [],
    trigs: arrugado.trigs.flat(), // 三角形索引
  }
}
