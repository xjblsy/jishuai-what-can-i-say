const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const imagesDir = path.join(__dirname, '..', 'images', 'tab')
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true })
}

function createPNG(width, height, r, g, b) {
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
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(typeAndData), 0)
    return Buffer.concat([length, typeAndData, crc])
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rawData = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 3)] = 0
    for (let x = 0; x < width; x++) {
      const offset = y * (1 + width * 3) + 1 + x * 3
      rawData[offset] = r
      rawData[offset + 1] = g
      rawData[offset + 2] = b
    }
  }

  const compressed = zlib.deflateSync(rawData)

  const iendData = Buffer.alloc(0)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iendData)
  ])
}

const icons = [
  { name: 'home', color: [140, 140, 140] },
  { name: 'home-active', color: [233, 69, 96] },
  { name: 'user', color: [140, 140, 140] },
  { name: 'user-active', color: [233, 69, 96] },
  { name: 'star', color: [140, 140, 140] },
  { name: 'star-active', color: [233, 69, 96] },
  { name: 'settings', color: [140, 140, 140] },
  { name: 'settings-active', color: [233, 69, 96] }
]

icons.forEach(icon => {
  const png = createPNG(81, 81, ...icon.color)
  const filePath = path.join(imagesDir, `${icon.name}.png`)
  fs.writeFileSync(filePath, png)
  console.log(`Created: ${icon.name}.png (${png.length} bytes)`)
})

console.log('\n所有图标已生成！')
console.log('注意：这些是纯色占位图标，建议替换为实际设计的图标。')