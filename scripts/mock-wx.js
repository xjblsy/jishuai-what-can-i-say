global.wx = global.wx || {}
const storageMap = new Map()

wx.getStorageSync = function(key) {
  return storageMap.has(key) ? storageMap.get(key) : ''
}

wx.setStorageSync = function(key, value) {
  storageMap.set(key, String(value))
}

wx.removeStorageSync = function(key) {
  storageMap.delete(key)
}

wx.getStorageInfoSync = function() {
  return { currentSize: storageMap.size * 10, keys: Array.from(storageMap.keys()) }
}

wx.getFileSystemManager = function() {
  return {
    copyFile: function({ srcPath, destPath, success, fail }) {
      storageMap.set(destPath, storageMap.get(srcPath) || srcPath)
      if (success) success()
    },
    unlink: function({ filePath, success, fail }) {
      storageMap.delete(filePath)
      if (success) success()
    },
    unlinkSync: function(filePath) {
      storageMap.delete(filePath)
    },
    readdirSync: function() {
      return Array.from(storageMap.keys())
    }
  }
}

wx.env = { USER_DATA_PATH: '/mock/user/data' }

wx.showToast = function() {}
wx.showLoading = function() {}
wx.hideLoading = function() {}
wx.showModal = function(opts) {
  if (opts.success) opts.success({ confirm: true })
}
wx.showActionSheet = function(opts) {
  if (opts.success) opts.success({ tapIndex: 0 })
}
wx.setClipboardData = function(opts) {
  if (opts.success) opts.success()
}
wx.getClipboardData = function(opts) {
  if (opts.success) opts.success({ data: '' })
}
wx.previewImage = function() {}
wx.chooseImage = function(opts) {
  if (opts.success) opts.success({ tempFilePaths: [] })
}
wx.compressImage = function(opts) {
  if (opts.success) opts.success({ tempFilePath: opts.src })
}
wx.getImageInfo = function(opts) {
  if (opts.success) opts.success({ width: 800, height: 600 })
}
wx.saveImageToPhotosAlbum = function(opts) {
  if (opts.success) opts.success()
}
wx.navigateTo = function() {}
wx.redirectTo = function() {}
wx.reLaunch = function() {}
wx.switchTab = function() {}
wx.navigateBack = function() {}
wx.stopPullDownRefresh = function() {}
wx.getSystemInfo = function(opts) {
  if (opts.success) opts.success({})
}
wx.vibrateShort = function() {}
wx.showShareMenu = function() {}
wx.setNavigationBarTitle = function() {}
wx.openSetting = function() {}

function getCurrentPages() {
  return []
}

global.getCurrentPages = getCurrentPages

console.log('Mock WeChat APIs loaded for testing')