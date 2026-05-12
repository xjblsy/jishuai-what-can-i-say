const app = getApp()
const storage = require('../../../utils/storage')
const util = require('../../../utils/util')

Page({
  data: {
    characters: [],
    filteredCharacters: [],
    searchKeyword: '',
    viewMode: 'grid'
  },

  onShow() {
    if (!app.requireAuth()) return
    this.loadCharacters()
  },

  onLoad() {
    const viewMode = wx.getStorageSync('char_view_mode') || 'grid'
    this.setData({ viewMode })
    this._debouncedSearch = util.debounce(this.applyFilter.bind(this), 300)
  },

  onUnload() {
    if (this._debouncedSearch) {
      this._debouncedSearch = null
    }
  },

  onPullDownRefresh() {
    this.loadCharacters()
    wx.stopPullDownRefresh()
  },

  loadCharacters() {
    const characters = storage.getCharacters()
    this.setData({ characters })
    this.applyFilter()
  },

  applyFilter() {
    const keyword = this.data.searchKeyword.trim().toLowerCase()
    let filtered = this.data.characters

    if (keyword) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(keyword) ||
        (c.nickname && c.nickname.toLowerCase().includes(keyword))
      )
    }

    this.setData({ filteredCharacters: filtered })
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    if (this._debouncedSearch) {
      this._debouncedSearch()
    }
  },

  onToggleView(e) {
    const mode = e.currentTarget.dataset.mode
    wx.setStorageSync('char_view_mode', mode)
    this.setData({ viewMode: mode })
  },

  onCharacterTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/character/detail/detail?id=${id}` })
  },

  onCharacterLongPress(e) {
    const id = e.currentTarget.dataset.id
    const character = storage.getCharacterById(id)
    if (!character) return

    wx.showActionSheet({
      itemList: ['编辑信息', '删除人物'],
      itemColor: '#333',
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({ url: `/pages/character/edit/edit?id=${id}` })
        } else if (res.tapIndex === 1) {
          util.showConfirm(
            '确认删除',
            `确定要删除「${character.name}」及其所有内容吗？此操作不可恢复。`,
            '确认删除',
            '取消'
          ).then(() => {
            storage.deleteCharacter(id)
            util.showSuccess('删除成功')
            this.loadCharacters()
          }).catch(() => {})
        }
      }
    })
  },

  onAddCharacter() {
    wx.navigateTo({ url: '/pages/character/edit/edit' })
  }
})