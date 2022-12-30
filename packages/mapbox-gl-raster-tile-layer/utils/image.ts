export type ImageRequest = {
  url?: string
  callback?: (img: HTMLImageElement) => void
  canceled?: boolean
  cancel?: () => void
}

/**
 * load image
 * @param src
 * @param crossOrigin
 * @returns
 */
export function loadImage(
  src: string,
  callback: (img: HTMLImageElement) => void,
  crossOrigin?: string
): ImageRequest {
  const MAX_REQUEST_NUM = 16
  let requestNum = 0
  const requestQueue: ImageRequest[] = []
  if (requestNum > MAX_REQUEST_NUM) {
    const request = {
      url: src,
      callback: callback,
      canceled: false,
      cancel: function () {
        this.canceled = true
      },
    }
    requestQueue.push(request)
    return request
  }

  let advanced = false
  const advanceImageRequestQueue = function () {
    if (advanced) {
      return
    }
    advanced = true
    requestNum--
    while (requestQueue.length && requestNum < MAX_REQUEST_NUM) {
      // eslint-disable-line
      const request = requestQueue.shift()
      if (request) {
        const url = request.url
        const callback = request.callback
        const canceled = request.canceled
        if (callback && !canceled) {
          request.cancel = loadImage(src, callback, crossOrigin).cancel
        }
      }
    }
  }

  const get = function get(
    src: string,
    callback: (error: boolean, res: any) => void,
    async?: boolean
  ) {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', src, async === false ? false : true)
    xhr.responseType = 'arraybuffer'
    xhr.timeout = 5000
    xhr.onabort = function (event) {
      callback(true, null)
    }
    xhr.ontimeout = function (event) {
      callback(true, null)
    }
    xhr.onload = function (event) {
      if (!xhr.status || (xhr.status >= 200 && xhr.status < 300)) {
        let source = xhr.response
        if (source) {
          try {
            source = eval('(' + source + ')')
            // eslint-disable-next-line no-empty
          } catch (e) {}
        }
        if (source) {
          callback(false, source)
        } else {
          callback(false, null)
        }
      }
    }
    xhr.onerror = function (e) {
      callback(true, null)
    }
    xhr.send(null)
    return xhr
  }

  requestNum++
  const req = get(src, (error: boolean, data: any) => {
    advanceImageRequestQueue()
    if (!error) {
      const URL = window.URL || window.webkitURL
      const blob = new Blob([data], { type: 'image/png' })
      const blobUrl = URL.createObjectURL(blob)
      const image = new Image()
      image.src = blobUrl
      image.crossOrigin = crossOrigin ?? ''
      image.onload = function () {
        callback(image)
        URL.revokeObjectURL(image.src)
      }
      const transparentPngUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII='
      image.src = data.byteLength ? URL.createObjectURL(blob) : transparentPngUrl
    }
  })

  return { cancel: () => req.abort() }
}
