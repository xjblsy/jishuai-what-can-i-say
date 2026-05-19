const app = getApp()
const storage = require('../../utils/storage')
const util = require('../../utils/util')

Page({
  data: {
    keyword: '',
    hasSearched: false,
    characterResults: [],
    contentResults: [],
    hotTags: ['经典语录', '搞笑段子', '人生感悟', '金句', '毒鸡汤']
  },

  onLoad() {
    if (!app.requireAuth()) return
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
    if (!e.detail.value.trim()) {
      this.setData({ hasSearched: false })
    }
  },

  onSearchConfirm() {
    this.doSearch()
  },

  onClear() {
    this.setData({
      keyword: '',
      hasSearched: false,
      characterResults: [],
      contentResults: []
    })
  },

  onHotTagTap(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({ keyword: tag })
    this.doSearch()
  },

  doSearch() {
    const keyword = this.data.keyword.trim().toLowerCase()
    if (!keyword) {
      util.showToast('请输入搜索关键词')
      return
    }

    const characters = storage.getCharacters()
    const contents = storage.getContents()

    const characterResults = characters.filter(c =>
      c.name.toLowerCase().includes(keyword) ||
      (c.nickname && c.nickname.toLowerCase().includes(keyword))
    ).map(c => ({
      ...c,
      nameSegments: this.splitHighlight(c.name, keyword)
    }))

    const contentResults = contents.filter(c =>
      (c.text && c.text.toLowerCase().includes(keyword)) ||
      (c.tags && c.tags.some(t => t.includes(keyword)))
    ).map(c => {
      const character = characters.find(ch => ch.id === c.characterId)
      return {
        ...c,
        characterName: character ? character.name : '未知',
        characterAvatar: character ? character.avatar : '',
        formattedTime: util.formatTime(c.createdAt),
        textSegments: c.text ? this.splitHighlight(c.text, keyword) : []
      }
    })

    this.setData({
      hasSearched: true,
      characterResults,
      contentResults
    })
  },

  splitHighlight(text, keyword) {
    if (!text || !keyword) return [{ text: text || '', highlight: false }]

    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    const segments = []

    parts.forEach(part => {
      if (part.length === 0) return
      segments.push({
        text: part,
        highlight: part.toLowerCase() === keyword.toLowerCase()
      })
    })

    return segments.length > 0 ? segments : [{ text, highlight: false }]
  },

  onCharacterTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/character/detail/detail?id=${id}` })
  },

  onContentTap(e) {
    const { id, characterId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/content/edit/edit?id=${id}&characterId=${characterId}`
    })
  },

  onPreviewImage(e) {
    const urls = e.currentTarget.dataset.urls
    const current = e.currentTarget.dataset.current
    wx.previewImage({ urls, current: urls[current] || urls[0] })
  }
})