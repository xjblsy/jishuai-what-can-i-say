const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 144
const OUTPUT = path.join(__dirname, '..', 'images', 'icon.png')

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1))
    }
    table[n] = c
  }
  c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crcBuf])
}

function createPNG(pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rawData = Buffer.alloc(SIZE * (1 + SIZE * 3))
  for (let y = 0; y < SIZE; y++) {
    rawData[y * (1 + SIZE * 3)] = 0
    for (let x = 0; x < SIZE; x++) {
      const offset = y * (1 + SIZE * 3) + 1 + x * 3
      rawData[offset] = pixels[y][x][0]
      rawData[offset + 1] = pixels[y][x][1]
      rawData[offset + 2] = pixels[y][x][2]
    }
  }

  const compressed = zlib.deflateSync(rawData)
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t)
  ]
}

function blendColor(bg, fg, alpha) {
  return [
    Math.round(bg[0] * (1 - alpha) + fg[0] * alpha),
    Math.round(bg[1] * (1 - alpha) + fg[1] * alpha),
    Math.round(bg[2] * (1 - alpha) + fg[2] * alpha)
  ]
}

const COLORS = {
  bgTop: [26, 26, 46],
  bgBottom: [15, 52, 96],
  accent: [233, 69, 96],
  accentLight: [255, 100, 120],
  white: [255, 255, 255],
  glow: [255, 120, 140]
}

const FONT = {
  '9': [
    [0,1,1,1,1,1,0],
    [1,1,0,0,0,1,1],
    [1,1,0,0,0,1,1],
    [1,1,0,0,0,1,1],
    [0,1,1,1,1,1,1],
    [0,0,0,0,0,1,1],
    [0,0,0,0,0,1,1],
    [1,1,0,0,0,1,1],
    [0,1,1,1,1,1,0]
  ],
  '1': [
    [0,0,0,1,1,0,0],
    [0,0,1,1,1,0,0],
    [0,1,1,1,1,0,0],
    [0,0,0,1,1,0,0],
    [0,0,0,1,1,0,0],
    [0,0,0,1,1,0,0],
    [0,0,0,1,1,0,0],
    [0,0,0,1,1,0,0],
    [0,1,1,1,1,1,1]
  ]
}

function isDigitPixel(digit, row, col) {
  const pattern = FONT[digit]
  if (!pattern || row < 0 || row >= pattern.length || col < 0 || col >= pattern[0].length) return 0
  return pattern[row][col]
}

const DIGIT_W = 7
const DIGIT_H = 9
const SCALE = 9
const GAP = 3 * SCALE
const TOTAL_W = 2 * DIGIT_W * SCALE + GAP
const TOTAL_H = DIGIT_H * SCALE
const START_X = Math.floor((SIZE - TOTAL_W) / 2)
const START_Y = Math.floor((SIZE - TOTAL_H) / 2) - 4 * SCALE

function sampleDigit(digits, px, py) {
  const charWidth = DIGIT_W * SCALE
  const charHeight = DIGIT_H * SCALE

  for (let ci = 0; ci < digits.length; ci++) {
    const charStartX = START_X + ci * (charWidth + (ci > 0 ? GAP : 0))
    const charStartY = START_Y

    if (px >= charStartX && px < charStartX + charWidth &&
        py >= charStartY && py < charStartY + charHeight) {
      const lx = px - charStartX
      const ly = py - charStartY
      const col = Math.floor(lx / SCALE)
      const row = Math.floor(ly / SCALE)

      const edge = isDigitPixel(digits[ci], row, col)
      if (edge === 0) return 0

      const fx = (lx % SCALE) / SCALE
      const fy = (ly % SCALE) / SCALE
      const cx = col
      const cy = row

      let inner = 1
      if (cx === 0 && !isDigitPixel(digits[ci], cy, cx - 1)) inner = Math.min(inner, fx < 0.3 ? fx / 0.3 : 1)
      if (cx === DIGIT_W - 1 && !isDigitPixel(digits[ci], cy, cx + 1)) inner = Math.min(inner, fx > 0.7 ? (1 - fx) / 0.3 : 1)
      if (cy === 0 && !isDigitPixel(digits[ci], cy - 1, cx)) inner = Math.min(inner, fy < 0.3 ? fy / 0.3 : 1)
      if (cy === DIGIT_H - 1 && !isDigitPixel(digits[ci], cy + 1, cx)) inner = Math.min(inner, fy > 0.7 ? (1 - fy) / 0.3 : 1)

      return Math.max(0, Math.min(1, inner))
    }
  }
  return 0
}

function makeCornerRadius(dist, radius) {
  if (dist < radius) {
    const t = dist / radius
    return t < 0.2 ? 0 : 1
  }
  return 1
}

const RADIUS = 28
const PADDING = 12

function isInsideRoundedRect(x, y) {
  const left = PADDING
  const top = PADDING
  const right = SIZE - PADDING
  const bottom = SIZE - PADDING

  if (x < left || x >= right || y < top || y >= bottom) return false

  const corners = [
    { cx: left + RADIUS, cy: top + RADIUS },
    { cx: right - RADIUS, cy: top + RADIUS },
    { cx: left + RADIUS, cy: bottom - RADIUS },
    { cx: right - RADIUS, cy: bottom - RADIUS }
  ]

  for (const corner of corners) {
    const dx = x - corner.cx
    const dy = y - corner.cy
    if (dx < 0 && dy < 0) {
      if (dx * dx + dy * dy > RADIUS * RADIUS) return false
    }
    if (dx >= 0 && dy < 0) {
      if ((x - (right - RADIUS)) > 0 && dy < 0) continue
    }
  }

  for (const corner of corners) {
    const dx = x - corner.cx
    const dy = y - corner.cy

    const inCornerZone =
      (corner.cx === left + RADIUS && x < corner.cx) ||
      (corner.cx === right - RADIUS && x >= corner.cx) ||
      (corner.cy === top + RADIUS && y < corner.cy) ||
      (corner.cy === bottom - RADIUS && y >= corner.cy)

    if (inCornerZone) {
      const cx = (corner.cx === left + RADIUS) ? corner.cx : corner.cx
      const cy = (corner.cy === top + RADIUS) ? corner.cy : corner.cy
      const rx = x < cx ? x : x
      const ry = y < cy ? y : y
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > RADIUS * RADIUS) return false
    }
  }

  return true
}

function isInCornerRegion(x, y) {
  const left = PADDING
  const top = PADDING
  const right = SIZE - PADDING
  const bottom = SIZE - PADDING

  const corners = [
    { cx: left + RADIUS, cy: top + RADIUS, type: 'tl' },
    { cx: right - RADIUS, cy: top + RADIUS, type: 'tr' },
    { cx: left + RADIUS, cy: bottom - RADIUS, type: 'bl' },
    { cx: right - RADIUS, cy: bottom - RADIUS, type: 'br' }
  ]

  for (const c of corners) {
    const inX = c.type.endsWith('l') ? (x < c.cx) : (x >= c.cx)
    const inY = c.type.startsWith('t') ? (y < c.cy) : (y >= c.cy)
    if (inX && inY) return { cx: c.cx, cy: c.cy }
  }
  return null
}

console.log(`Generating ${SIZE}x${SIZE} icon with "91"...`)

const pixels = new Array(SIZE)
for (let y = 0; y < SIZE; y++) {
  pixels[y] = new Array(SIZE)
  for (let x = 0; x < SIZE; x++) {
    const t = y / SIZE
    const bg = lerpColor(COLORS.bgTop, COLORS.bgBottom, t)

    const cornerInfo = isInCornerRegion(x, y)
    let cornerAlpha = 1
    if (cornerInfo) {
      const dx = x - cornerInfo.cx
      const dy = y - cornerInfo.cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > RADIUS) {
        pixels[y][x] = [0, 0, 0, 0]
        continue
      }
      cornerAlpha = dist / RADIUS > 0.85 ? 1 : (dist / RADIUS < 0.7 ? 0 : (dist / RADIUS - 0.7) / 0.15)
    }

    let digitAlpha = sampleDigit('91', x, y)

    let pixelColor = bg

    if (digitAlpha > 0) {
      const glowDist = digitAlpha
      const digitColor = lerpColor(COLORS.accent, COLORS.accentLight, (y - START_Y) / TOTAL_H)
      pixelColor = blendColor(bg, digitColor, digitAlpha * 0.95)

      if (digitAlpha > 0.3 && digitAlpha < 0.9) {
        const glowColor = blendColor(bg, COLORS.glow, digitAlpha * 0.3)
        pixelColor = [
          Math.min(255, pixelColor[0] + Math.round(glowColor[0] * 0.2)),
          Math.min(255, pixelColor[1] + Math.round(glowColor[1] * 0.15)),
          Math.min(255, pixelColor[2] + Math.round(glowColor[2] * 0.15))
        ]
      }
    }

    if (cornerAlpha < 1) {
      pixelColor = [
        Math.round(pixelColor[0] * cornerAlpha),
        Math.round(pixelColor[1] * cornerAlpha),
        Math.round(pixelColor[2] * cornerAlpha)
      ]
    }

    pixels[y][x] = pixelColor
  }
}

const png = createPNG(pixels)
fs.writeFileSync(OUTPUT, png)
console.log(`Icon created: ${OUTPUT} (${png.length} bytes)`)
console.log('Done!')