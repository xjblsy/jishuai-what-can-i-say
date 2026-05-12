const app = getApp()
const storage = require('../../utils/storage')
const util = require('../../utils/util')

Page({
  data: {
    favorites: []
  },

  onShow() {
    if (!app.requireAuth()) return
    this.loadFavorites()
  },

  onPullDownRefresh() {
    this.loadFavorites()
    wx.stopPullDownRefresh()
  },

  loadFavorites() {
    const contents = storage.getFavorites()
    const characters = storage.getCharacters()

    const formatted = contents.map(content => {
      const character = characters.find(c => c.id === content.characterId)
      return {
        ...content,
        characterName: character ? character.name : '未知',
        characterAvatar: character ? character.avatar : '',
        formattedTime: util.formatTime(content.createdAt)
      }
    })

    this.setData({ favorites: formatted })
  },

  onUnfavorite(e) {
    const id = e.currentTarget.dataset.id
    storage.toggleFavorite(id)
    util.showSuccess('已取消收藏')
    this.loadFavorites()
  },

  onCharacterTap(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: `/pages/character/detail/detail?id=${id}` })
    }
  },

  onEditContent(e) {
    const { id, characterId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/content/edit/edit?id=${id}&characterId=${characterId}`
    })
  },

  onPreviewImage(e) {
    const urls = e.currentTarget.dataset.urls
    const current = e.currentTarget.dataset.current
    wx.previewImage({ urls, current: urls[current] || urls[0] })
  },

  onExportFavorites() {
    const favorites = this.data.favorites
    let text = '【集英社 - 收藏内容】\n\n'
    favorites.forEach((item, index) => {
      text += `${index + 1}. [${item.characterName}] ${item.text || '(图片内容)'}\n`
      text += `   时间: ${util.formatTime(item.createdAt)}\n`
      if (item.tags && item.tags.length > 0) {
        text += `   标签: ${item.tags.join('、')}\n`
      }
      text += '\n'
    })

    wx.setClipboardData({
      data: text,
      success: () => {
        util.showSuccess('已复制到剪贴板')
      }
    })
  }
})