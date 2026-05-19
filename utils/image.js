const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const COMPRESS_QUALITY = 85
const MAX_WIDTH = 1440
const MAX_HEIGHT = 2560
const THUMB_WIDTH = 400

function chooseImage(options = {}) {
  const {
    count = 1,
    sourceType = ['album', 'camera'],
    sizeType = ['compressed']
  } = options

  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count,
      sourceType,
      sizeType,
      success(res) {
        resolve(res.tempFilePaths)
      },
      fail(err) {
        if (err.errMsg.includes('cancel')) {
          resolve([])
        } else {
          reject(err)
        }
      }
    })
  })
}

function compressImage(filePath, options = {}) {
  const {
    quality = COMPRESS_QUALITY,
    maxWidth = MAX_WIDTH,
    maxHeight = MAX_HEIGHT
  } = options

  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: filePath,
      quality,
      maxWidth,
      maxHeight,
      success(res) {
        resolve(res.tempFilePath)
      },
      fail(err) {
        console.warn('图片压缩失败，使用原图:', err)
        resolve(filePath)
      }
    })
  })
}

function getImageInfo(filePath) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: filePath,
      success(res) {
        resolve(res)
      },
      fail: reject
    })
  })
}

async function processImage(filePath) {
  try {
    const info = await getImageInfo(filePath)

    const targetRatio = Math.min(
      MAX_WIDTH / info.width,
      MAX_HEIGHT / info.height,
      1
    )

    if (targetRatio < 0.95) {
      return await compressImage(filePath, {
        quality: COMPRESS_QUALITY,
        maxWidth: Math.round(info.width * targetRatio),
        maxHeight: Math.round(info.height * targetRatio)
      })
    }

    if (info.width * info.height > 2 * 1024 * 1024) {
      return await compressImage(filePath, { quality: COMPRESS_QUALITY })
    }

    return filePath
  } catch (e) {
    console.warn('图片处理失败，使用原图:', e)
    return filePath
  }
}

function saveImageToLocal(filePath) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const savedPath = `${wx.env.USER_DATA_PATH}/img_${Date.now()}_${Math.random().toString(36).substr(2, 8)}.jpg`

    fs.copyFile({
      srcPath: filePath,
      destPath: savedPath,
      success() {
        resolve(savedPath)
      },
      fail(err) {
        console.warn('保存图片到本地失败:', err)
        resolve(filePath)
      }
    })
  })
}

function deleteLocalImage(filePath) {
  return new Promise((resolve) => {
    if (!filePath || !filePath.startsWith(wx.env.USER_DATA_PATH)) {
      resolve(false)
      return
    }
    const fs = wx.getFileSystemManager()
    fs.unlink({
      filePath,
      success() { resolve(true) },
      fail() { resolve(false) }
    })
  })
}

function previewImages(urls, current = 0) {
  if (!urls || urls.length === 0) return
  wx.previewImage({
    urls,
    current: urls[current] || urls[0]
  })
}

function saveImageToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success() {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
        resolve(true)
      },
      fail(err) {
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '提示',
            content: '需要授权保存图片到相册',
            success(res) {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'error' })
        }
        reject(err)
      }
    })
  })
}

async function uploadImage(filePath) {
  try {
    const processed = await processImage(filePath)
    const savedPath = await saveImageToLocal(processed)
    return savedPath
  } catch (e) {
    console.error('图片上传处理失败:', e)
    return filePath
  }
}

function cleanupOldImages(keepPaths) {
  try {
    const fs = wx.getFileSystemManager()
    const files = fs.readdirSync(wx.env.USER_DATA_PATH)
    let cleaned = 0
    files.forEach(file => {
      const fullPath = `${wx.env.USER_DATA_PATH}/${file}`
      if (!keepPaths.includes(fullPath)) {
        try {
          fs.unlinkSync(fullPath)
          cleaned++
        } catch (e) {}
      }
    })
    return cleaned
  } catch (e) {
    return 0
  }
}

module.exports = {
  chooseImage,
  compressImage,
  getImageInfo,
  processImage,
  saveImageToLocal,
  deleteLocalImage,
  previewImages,
  saveImageToAlbum,
  uploadImage,
  cleanupOldImages,
  MAX_IMAGE_SIZE,
  COMPRESS_QUALITY
}