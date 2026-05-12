const app = getApp()
const storage = require('../../utils/storage')
const util = require('../../utils/util')

Page({
  data: {
    stats: null,
    showPasswordModal: false,
    passwordModalType: 'change',
    passwordModalTitle: '修改访问密码',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  },

  onShow() {
    if (!app.requireAuth()) return
    this.loadStats()
  },

  loadStats() {
    const characters = storage.getCharacters()
    const contents = storage.getContents()
    const favorites = storage.getFavorites()

    const currentPassword = storage.getPassword() || app.globalData.defaultPassword
    const isDefaultPassword = currentPassword === app.globalData.defaultPassword

    try {
      const info = wx.getStorageInfoSync()
      const sizeKB = Math.round(info.currentSize)
      let sizeStr = ''
      if (sizeKB < 1024) {
        sizeStr = sizeKB + 'KB'
      } else {
        sizeStr = (sizeKB / 1024).toFixed(1) + 'MB'
      }

      this.setData({
        stats: {
          characterCount: characters.length,
          contentCount: contents.length,
          favoriteCount: favorites.length,
          storageSize: sizeStr,
          isDefaultPassword
        }
      })
    } catch (e) {
      this.setData({
        stats: {
          characterCount: characters.length,
          contentCount: contents.length,
          favoriteCount: favorites.length,
          storageSize: '--',
          isDefaultPassword: false
        }
      })
    }
  },

  onChangePassword() {
    this.setData({
      showPasswordModal: true,
      passwordModalType: 'change',
      passwordModalTitle: '修改访问密码',
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  },

  onClosePasswordModal() {
    this.setData({
      showPasswordModal: false,
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  },

  onOldPasswordInput(e) {
    this.setData({ oldPassword: e.detail.value })
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value })
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value })
  },

  onConfirmPasswordChange() {
    const { oldPassword, newPassword, confirmPassword, passwordModalType } = this.data

    if (!newPassword.trim()) {
      util.showToast('请输入新密码')
      return
    }

    if (newPassword.length < 4) {
      util.showToast('密码至少需要4位')
      return
    }

    if (newPassword !== confirmPassword) {
      util.showToast('两次输入的密码不一致')
      return
    }

    if (passwordModalType === 'change') {
      const currentPassword = storage.getPassword() || app.globalData.defaultPassword
      if (oldPassword !== currentPassword) {
        util.showToast('当前密码错误')
        return
      }
    }

    storage.savePassword(newPassword.trim())
    util.showSuccess('密码修改成功')
    this.onClosePasswordModal()
  },

  onLockNow() {
    app.clearAuth()
    util.showToast('已锁定')
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/auth/auth' })
    }, 800)
  },

  onExportData() {
    util.showConfirm(
      '导出数据',
      '将导出所有人物、语录、收藏和标签数据到剪贴板，请妥善保管。',
      '确认导出',
      '取消'
    ).then(() => {
      const data = storage.exportAllData()
      wx.setClipboardData({
        data,
        success: () => {
          util.showSuccess('已复制到剪贴板，请粘贴到安全位置保存')
        },
        fail: () => {
          util.showError('复制失败，请重试')
        }
      })
    }).catch(() => {})
  },

  onImportData() {
    util.showConfirm(
      '导入数据',
      '将从剪贴板读取备份数据并导入。注意：导入将覆盖现有数据，请确认已备份。',
      '确认导入',
      '取消'
    ).then(() => {
      wx.getClipboardData({
        success: (res) => {
          if (!res.data) {
            util.showError('剪贴板为空')
            return
          }
          const success = storage.importData(res.data)
          if (success) {
            util.showSuccess('导入成功')
            this.loadStats()
          } else {
            util.showError('导入失败，数据格式不正确')
          }
        },
        fail: () => {
          util.showError('无法读取剪贴板')
        }
      })
    }).catch(() => {})
  },

  onClearCache() {
    util.showConfirm(
      '清理缓存',
      '将清理本地图片缓存文件，不影响文本数据。',
      '确认清理',
      '取消'
    ).then(() => {
      util.showLoading('清理中...')
      const fs = wx.getFileSystemManager()
      try {
        const files = fs.readdirSync(wx.env.USER_DATA_PATH)
        let cleanedCount = 0
        files.forEach(file => {
          try {
            fs.unlinkSync(`${wx.env.USER_DATA_PATH}/${file}`)
            cleanedCount++
          } catch (e) {}
        })
        util.hideLoading()
        util.showSuccess(`已清理 ${cleanedCount} 个缓存文件`)
        this.loadStats()
      } catch (e) {
        util.hideLoading()
        util.showToast('清理完成')
        this.loadStats()
      }
    }).catch(() => {})
  },

  onAbout() {
    wx.showModal({
      title: '关于集英社',
      content: '集英社 v1.0.0\n\n一款专注于记录好友精彩言论的小程序。\n\n功能介绍：\n· 添加管理好友人物\n· 记录文字和照片语录\n· 标签分类管理\n· 收藏和导出功能\n· 密码保护隐私\n\n所有数据存储在本地，请定期备份。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#e94560'
    })
  },

  onLogout() {
    app.clearAuth()
    util.showToast('已退出')
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/auth/auth' })
    }, 800)
  }
})