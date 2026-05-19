const app = getApp()
const storage = require('../../utils/storage')
const util = require('../../utils/util')

const MAX_ATTEMPTS = 5
const LOCK_DURATION = 30 * 60 * 1000

Page({
  data: {
    password: '',
    errorMsg: '',
    remainingAttempts: MAX_ATTEMPTS,
    locked: false,
    lockEndTime: 0,
    loading: false,
    inputFocused: false
  },

  onLoad() {
    if (app.checkAuth()) {
      wx.switchTab({ url: '/pages/home/home' })
      return
    }

    this.checkLockStatus()
    this.loadRemainingAttempts()
  },

  loadRemainingAttempts() {
    const attempts = wx.getStorageSync('auth_attempts')
    const count = attempts ? parseInt(attempts) : MAX_ATTEMPTS
    this.setData({ remainingAttempts: count })
  },

  saveRemainingAttempts(count) {
    wx.setStorageSync('auth_attempts', count)
  },

  checkLockStatus() {
    const lockEnd = wx.getStorageSync('auth_lock_end')
    if (lockEnd && Date.now() < lockEnd) {
      const remaining = Math.ceil((lockEnd - Date.now()) / 60000)
      this.setData({
        locked: true,
        lockEndTime: lockEnd,
        errorMsg: `账户已锁定，请 ${remaining} 分钟后重试`
      })

      const timer = setInterval(() => {
        if (Date.now() >= this.data.lockEndTime) {
          this.setData({
            locked: false,
            errorMsg: '',
            remainingAttempts: MAX_ATTEMPTS
          })
          this.saveRemainingAttempts(MAX_ATTEMPTS)
          wx.removeStorageSync('auth_lock_end')
          clearInterval(timer)
        } else {
          const remaining = Math.ceil((this.data.lockEndTime - Date.now()) / 60000)
          this.setData({
            errorMsg: `账户已锁定，请 ${remaining} 分钟后重试`
          })
        }
      }, 30000)

      this._lockTimer = timer
    }
  },

  onUnload() {
    if (this._lockTimer) {
      clearInterval(this._lockTimer)
    }
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value,
      errorMsg: ''
    })
  },

  onInputFocus() {
    this.setData({ inputFocused: true })
  },

  onInputBlur() {
    this.setData({ inputFocused: false })
  },

  onLogin() {
    if (this.data.loading || this.data.locked) return

    const password = this.data.password.trim()
    if (!password) {
      this.setData({ errorMsg: '请输入访问密码' })
      this.shakeAnimation()
      return
    }

    this.setData({ loading: true, errorMsg: '' })

    setTimeout(() => {
      this.verifyPassword(password)
    }, 400)
  },

  verifyPassword(inputPassword) {
    const storedPassword = storage.getPassword() || app.globalData.defaultPassword

    if (inputPassword === storedPassword) {
      this.saveRemainingAttempts(MAX_ATTEMPTS)
      wx.removeStorageSync('auth_attempts')
      wx.removeStorageSync('auth_lock_end')

      app.setAuth(60)

      util.showSuccess('验证成功')
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/home' })
      }, 600)
    } else {
      this.handleFailedAttempt()
    }
  },

  handleFailedAttempt() {
    let attempts = this.data.remainingAttempts - 1
    if (attempts < 0) attempts = 0

    this.setData({
      remainingAttempts: attempts,
      loading: false,
      password: ''
    })

    this.saveRemainingAttempts(attempts)

    if (attempts <= 0) {
      const lockEnd = Date.now() + LOCK_DURATION
      wx.setStorageSync('auth_lock_end', lockEnd)
      this.setData({
        locked: true,
        lockEndTime: lockEnd,
        errorMsg: '尝试次数过多，账户已锁定30分钟'
      })
      this.checkLockStatus()
    } else {
      const msg = attempts <= 2
        ? `密码错误！仅剩 ${attempts} 次尝试机会`
        : '密码错误，请重试'
      this.setData({ errorMsg: msg })
    }

    this.shakeAnimation()
  },

  shakeAnimation() {
    wx.vibrateShort({ type: 'medium' })
  }
})