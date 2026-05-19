const errorHandler = require('./utils/error-handler')

App({
  globalData: {
    isAuth: false,
    authExpireTime: 0,
    systemInfo: null,
    defaultPassword: '123456'
  },

  onLaunch() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res
      },
      fail: (err) => {
        errorHandler.log(errorHandler.LOG_LEVELS.WARN, 'App', 'getSystemInfo failed', err)
      }
    })

    const authExpire = wx.getStorageSync('auth_expire')
    if (authExpire && Date.now() < authExpire) {
      this.globalData.isAuth = true
      this.globalData.authExpireTime = authExpire
    }
  },

  onError(error) {
    errorHandler.handleError(error, 'App.onError')
  },

  onPageNotFound(res) {
    errorHandler.log(errorHandler.LOG_LEVELS.WARN, 'App', 'Page not found', res)
    wx.redirectTo({ url: '/pages/auth/auth' })
  },

  checkAuth() {
    const authExpire = wx.getStorageSync('auth_expire')
    if (authExpire && Date.now() < authExpire) {
      this.globalData.isAuth = true
      this.globalData.authExpireTime = authExpire
      return true
    }
    this.globalData.isAuth = false
    return false
  },

  setAuth(expireMinutes = 60) {
    const expireTime = Date.now() + expireMinutes * 60 * 1000
    this.globalData.isAuth = true
    this.globalData.authExpireTime = expireTime
    wx.setStorageSync('auth_expire', expireTime)
  },

  clearAuth() {
    this.globalData.isAuth = false
    this.globalData.authExpireTime = 0
    wx.removeStorageSync('auth_expire')
  },

  requireAuth() {
    if (!this.checkAuth()) {
      wx.redirectTo({ url: '/pages/auth/auth' })
      return false
    }
    return true
  }
})