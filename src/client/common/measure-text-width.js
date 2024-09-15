import _ from 'lodash'

let canvasCache = null

const memFontSize = _.memoize((fontSizeInPx, fontFamily) => {
  return `${fontSizeInPx}px ${fontFamily}`
})

// http://stackoverflow.com/questions/16478836/measuring-length-of-string-in-pixel-in-javascript
export default function measureTextWidth(str, fontSizeInPx = '12', fontFamily = 'sans-serif') {
  if (!canvasCache) {
    canvasCache = document.createElement('canvas')
  }
  let ctx = canvasCache.getContext('2d')
  ctx.font = memFontSize(fontSizeInPx, fontFamily)
  return ctx.measureText(str).width
}
