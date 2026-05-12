const app = getApp()
const storage = require('../../../utils/storage')
const util = require('../../../utils/util')
const imageUtil = require('../../../utils/image')

Page({
  data: {
    isEdit: false,
    characterId: '',
    name: '',
    nickname: '',
    remark: '',
    avatar: '',
    saving: false
  },

  onLoad(options) {
    if (!app.requireAuth()) return

    if (options.id) {
      this.setData({ isEdit: true, characterId: options.id })
      const character = storage.getCharacterById(options.id)
      if (character) {
        this.setData({
          name: character.name || '',
          nickname: character.nickname || '',
          remark: character.remark || '',
          avatar: character.avatar || ''
        })
        wx.setNavigationBarTitle({ title: `编辑 - ${character.name}` })
      }
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  onChooseAvatar() {
    imageUtil.chooseImage({ count: 1 }).then(async (paths) => {
      if (paths.length === 0) return
      util.showLoading('处理中...')
      try {
        const processed = await imageUtil.uploadImage(paths[0])
        this.setData({ avatar: processed })
      } catch (e) {
        util.showError('图片处理失败')
      }
      util.hideLoading()
    }).catch(() => {
      util.hideLoading()
    })
  },

  onSave() {
    if (this.data.saving) return

    const { name, nickname, remark, avatar } = this.data

    if (!name.trim()) {
      util.showToast('请输入姓名')
      return
    }

    this.setData({ saving: true })
    util.showLoading('保存中...')

    const data = {
      name: name.trim(),
      nickname: nickname.trim(),
      remark: remark.trim(),
      avatar
    }

    setTimeout(() => {
      try {
        if (this.data.isEdit) {
          storage.updateCharacter(this.data.characterId, data)
        } else {
          storage.addCharacter(data)
        }

        util.hideLoading()
        this.setData({ saving: false })
        util.showSuccess(this.data.isEdit ? '更新成功' : '添加成功')

        setTimeout(() => {
          wx.navigateBack()
        }, 800)
      } catch (e) {
        util.hideLoading()
        this.setData({ saving: false })
        util.showError(e.message || '保存失败')
      }
    }, 100)
  },

  onCancel() {
    wx.navigateBack()
  },

  onDelete() {
    const character = storage.getCharacterById(this.data.characterId)
    if (!character) return

    util.showConfirm(
      '确认删除',
      `确定要删除「${character.name}」及其所有相关内容吗？此操作不可撤销。`,
      '确认删除',
      '取消'
    ).then(() => {
      storage.deleteCharacter(this.data.characterId)
      util.showSuccess('已删除')
      setTimeout(() => {
        wx.navigateBack({ delta: 2 })
      }, 800)
    }).catch(() => {})
  }
})