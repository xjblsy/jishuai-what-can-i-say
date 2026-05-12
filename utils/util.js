function formatTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'

  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  if (year === new Date().getFullYear()) {
    return `${month}-${day} ${hour}:${minute}`
  }
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration })
}

function showSuccess(title = '操作成功') {
  showToast(title, 'success')
}

function showError(title = '操作失败') {
  showToast(title, 'error')
}

function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

function showConfirm(title, content, confirmText = '确定', cancelText = '取消') {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title,
      content,
      confirmText,
      cancelText,
      confirmColor: '#e94560',
      success(res) {
        if (res.confirm) {
          resolve(true)
        } else {
          reject(false)
        }
      },
      fail: reject
    })
  })
}

function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

function getContentPreview(text, maxLength = 80) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function getCharCount(text) {
  if (!text) return 0
  return text.replace(/\s/g, '').length
}

const DEFAULT_TAGS = [
  '经典语录', '搞笑段子', '人生感悟', '哲理名言',
  '日常吐槽', '金句', '毒鸡汤', '正能量',
  '骚话', '冷笑话', '辩论', '其他'
]

function getDefaultTags() {
  return [...DEFAULT_TAGS]
}

module.exports = {
  formatTime,
  formatDate,
  showToast,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  showConfirm,
  debounce,
  getContentPreview,
  getCharCount,
  getDefaultTags
}