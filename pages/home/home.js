const app = getApp()
const storage = require('../../utils/storage')
const util = require('../../utils/util')

Page({
  data: {
    greeting: '',
    stats: {
      characterCount: 0,
      contentCount: 0,
      favoriteCount: 0
    },
    characters: [],
    recentContents: [],
    currentPoster: 0
  },

  onShow() {
    if (!app.requireAuth()) return
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  loadData() {
    const characters = storage.getCharacters()
    const allContents = storage.getContents()
    const favorites = storage.getFavorites()

    const recentContents = allContents.slice(0, 10).map(content => {
      const character = characters.find(c => c.id === content.characterId)
      return {
        ...content,
        characterName: character ? character.name : '未知',
        characterAvatar: character ? character.avatar : '',
        formattedTime: util.formatTime(content.createdAt)
      }
    })

    const hour = new Date().getHours()
    let greeting = '早上好'
    if (hour >= 6 && hour < 12) greeting = '早上好 ☀️'
    else if (hour >= 12 && hour < 14) greeting = '中午好 🌤️'
    else if (hour >= 14 && hour < 18) greeting = '下午好 🌈'
    else if (hour >= 18 && hour < 22) greeting = '晚上好 🌙'
    else greeting = '夜深了 🌃'

    this.setData({
      greeting,
      stats: {
        characterCount: characters.length,
        contentCount: allContents.length,
        favoriteCount: favorites.length
      },
      characters,
      recentContents
    })
  },

  onSwiperChange(e) {
    this.setData({ currentPoster: e.detail.current })
  },

  onPosterDotTap(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ currentPoster: index })
  },

  onAddCharacter() {
    wx.navigateTo({ url: '/pages/character/edit/edit' })
  },

  onAddContent() {
    const characters = storage.getCharacters()
    if (characters.length === 0) {
      util.showConfirm(
        '提示',
        '请先添加一个人物，再记录语录',
        '去添加',
        '取消'
      ).then(() => {
        wx.navigateTo({ url: '/pages/character/edit/edit' })
      }).catch(() => {})
      return
    }
    wx.navigateTo({ url: '/pages/content/edit/edit' })
  },

  onSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  onGoFavorites() {
    wx.switchTab({ url: '/pages/favorites/favorites' })
  },

  onViewAllCharacters() {
    wx.switchTab({ url: '/pages/character/list/list' })
  },

  onViewAllContents() {
    wx.navigateTo({ url: '/pages/content/list/list' })
  },

  onCharacterTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/character/detail/detail?id=${id}` })
  },

  onContentTap(e) {
    const { id, characterId } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/content/edit/edit?id=${id}&characterId=${characterId}` })
  },

  onToggleFavorite(e) {
    const id = e.currentTarget.dataset.id
    const result = storage.toggleFavorite(id)
    if (result) {
      this.loadData()
    }
  },

  onPreviewImage(e) {
    const urls = e.currentTarget.dataset.urls
    const current = e.currentTarget.dataset.current
    wx.previewImage({ urls, current: urls[current] || urls[0] })
  },

  onShareContent(e) {
    const id = e.currentTarget.dataset.id
    const content = storage.getContentById(id)
    if (content) {
      wx.setClipboardData({
        data: content.text || '分享自集英社',
        success: () => {
          util.showSuccess('内容已复制，可粘贴分享')
        }
      })
    }
  },

  onShareAppMessage() {
    return {
      title: '集英社 - 记录好友精彩言论',
      path: '/pages/auth/auth',
      imageUrl: ''
    }
  },

  onQuickAdd() {
    wx.showActionSheet({
      itemList: ['添加人物', '记录语录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.onAddCharacter()
        } else {
          this.onAddContent()
        }
      }
    })
  }
})