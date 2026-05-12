const app = getApp()
const storage = require('../../../utils/storage')
const util = require('../../../utils/util')

Page({
  data: {
    characters: [],
    contents: [],
    filteredContents: [],
    allTags: [],
    activeCharacter: '',
    activeTag: '',
    sortBy: 'time',
    sortOrder: 'desc'
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
    const contents = storage.getContents()

    const allTags = new Set()
    contents.forEach(c => {
      if (c.tags && c.tags.length > 0) {
        c.tags.forEach(t => allTags.add(t))
      }
    })

    const formattedContents = contents.map(content => {
      const character = characters.find(c => c.id === content.characterId)
      return {
        ...content,
        characterName: character ? character.name : '未知',
        characterAvatar: character ? character.avatar : '',
        formattedTime: util.formatTime(content.createdAt)
      }
    })

    this.setData({
      characters,
      contents: formattedContents,
      allTags: Array.from(allTags)
    })

    this.applyFilters()
  },

  applyFilters() {
    let result = [...this.data.contents]
    const { activeCharacter, activeTag, sortBy, sortOrder } = this.data

    if (activeCharacter) {
      result = result.filter(c => c.characterId === activeCharacter)
    }

    if (activeTag) {
      result = result.filter(c => c.tags && c.tags.includes(activeTag))
    }

    if (sortBy === 'time') {
      result.sort((a, b) => {
        return sortOrder === 'desc'
          ? b.createdAt - a.createdAt
          : a.createdAt - b.createdAt
      })
    }

    this.setData({ filteredContents: result })
  },

  onFilterCharacter(e) {
    this.setData({ activeCharacter: e.currentTarget.dataset.id })
    this.applyFilters()
  },

  onFilterTag(e) {
    this.setData({ activeTag: e.currentTarget.dataset.tag })
    this.applyFilters()
  },

  onSortChange(e) {
    const sort = e.currentTarget.dataset.sort
    const order = this.data.sortBy === sort && this.data.sortOrder === 'desc'
      ? 'asc'
      : 'desc'
    this.setData({ sortBy: sort, sortOrder: order })
    this.applyFilters()
  },

  onCharacterTap(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: `/pages/character/detail/detail?id=${id}` })
    }
  },

  onToggleFavorite(e) {
    const id = e.currentTarget.dataset.id
    storage.toggleFavorite(id)
    this.loadData()
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
  }
})