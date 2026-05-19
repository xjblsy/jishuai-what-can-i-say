const app = getApp()
const storage = require('../../../utils/storage')
const util = require('../../../utils/util')
const imageUtil = require('../../../utils/image')

Page({
  data: {
    character: null,
    characterId: '',
    contents: [],
    filteredContents: [],
    tags: [],
    activeTag: '',
    sortBy: 'time',
    sortOrder: 'desc',
    favoriteCount: 0,
    imageCount: 0
  },

  onLoad(options) {
    if (!app.requireAuth()) return
    this.setData({ characterId: options.id })
    this.loadData()
  },

  onShow() {
    if (this.data.characterId) {
      this.loadData()
    }
  },

  loadData() {
    const character = storage.getCharacterById(this.data.characterId)
    if (!character) {
      this.setData({ character: null })
      return
    }

    const contents = storage.getContents(this.data.characterId)

    const allTags = new Set()
    let favoriteCount = 0
    let imageCount = 0

    const formattedContents = contents.map(c => {
      if (c.isFavorite) favoriteCount++
      if (c.images && c.images.length > 0) imageCount += c.images.length
      if (c.tags && c.tags.length > 0) {
        c.tags.forEach(t => allTags.add(t))
      }
      return {
        ...c,
        formattedTime: util.formatTime(c.createdAt)
      }
    })

    this.setData({
      character,
      contents: formattedContents,
      tags: Array.from(allTags),
      favoriteCount,
      imageCount
    })

    this.applyFilterAndSort()
  },

  applyFilterAndSort() {
    let result = [...this.data.contents]
    const { activeTag, sortBy, sortOrder } = this.data

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

  onChangeAvatar() {
    imageUtil.chooseImage({ count: 1 }).then(async (paths) => {
      if (paths.length === 0) return
      const processed = await imageUtil.uploadImage(paths[0])
      storage.updateCharacter(this.data.characterId, { avatar: processed })
      this.loadData()
    })
  },

  onAddContent() {
    wx.navigateTo({
      url: `/pages/content/edit/edit?characterId=${this.data.characterId}`
    })
  },

  onEditCharacter() {
    wx.navigateTo({
      url: `/pages/character/edit/edit?id=${this.data.characterId}`
    })
  },

  onFilterTag(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({ activeTag: tag })
    this.applyFilterAndSort()
  },

  onSort(e) {
    const sort = e.currentTarget.dataset.sort
    const order = this.data.sortBy === sort && this.data.sortOrder === 'desc'
      ? 'asc'
      : 'desc'
    this.setData({ sortBy: sort, sortOrder: order })
    this.applyFilterAndSort()
  },

  onToggleFavorite(e) {
    const id = e.currentTarget.dataset.id
    storage.toggleFavorite(id)
    this.loadData()
  },

  onEditContent(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/content/edit/edit?id=${id}&characterId=${this.data.characterId}`
    })
  },

  onDeleteContent(e) {
    const id = e.currentTarget.dataset.id
    util.showConfirm(
      '确认删除',
      '确定要删除这条内容吗？',
      '确认删除',
      '取消'
    ).then(() => {
      storage.deleteContent(id)
      util.showSuccess('删除成功')
      this.loadData()
    }).catch(() => {})
  },

  onPreviewImage(e) {
    const urls = e.currentTarget.dataset.urls
    const current = e.currentTarget.dataset.current
    wx.previewImage({ urls, current: urls[current] || urls[0] })
  }
})