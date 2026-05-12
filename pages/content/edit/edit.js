const app = getApp()
const storage = require('../../../utils/storage')
const util = require('../../../utils/util')
const imageUtil = require('../../../utils/image')

const MAX_TEXT_LENGTH = 20000
const MAX_IMAGES = 18
const MAX_TAG_LENGTH = 15

Page({
  data: {
    isEdit: false,
    contentId: '',
    characters: [],
    selectedCharacter: {},
    text: '',
    images: [],
    selectedTags: [],
    defaultTags: [],
    customTags: [],
    customTagInput: '',
    showCharacterPicker: false,
    showPreview: false,
    saving: false,
    maxTextLength: MAX_TEXT_LENGTH,
    maxImages: MAX_IMAGES
  },

  onLoad(options) {
    if (!app.requireAuth()) return

    this.setData({
      defaultTags: util.getDefaultTags(),
      customTags: storage.getTags()
    })

    const characters = storage.getCharacters()
    this.setData({ characters })

    if (options.id) {
      this.setData({ isEdit: true, contentId: options.id })
      const content = storage.getContentById(options.id)
      if (content) {
        const character = storage.getCharacterById(content.characterId)
        this.setData({
          selectedCharacter: character || {},
          text: content.text || '',
          images: content.images || [],
          selectedTags: content.tags || []
        })
        if (character) {
          wx.setNavigationBarTitle({ title: `编辑 - ${character.name}` })
        }
      }
    } else if (options.characterId) {
      const character = storage.getCharacterById(options.characterId)
      if (character) {
        this.setData({ selectedCharacter: character })
        wx.setNavigationBarTitle({ title: `记录 - ${character.name}` })
      }
    }
  },

  onTextInput(e) {
    const value = e.detail.value
    if (value.length > MAX_TEXT_LENGTH) {
      this.setData({ text: value.substring(0, MAX_TEXT_LENGTH) })
      util.showToast(`最多输入${MAX_TEXT_LENGTH}字`)
      return
    }
    this.setData({ text: value })
  },

  onAddImage() {
    const remaining = MAX_IMAGES - this.data.images.length
    if (remaining <= 0) {
      util.showToast(`最多上传${MAX_IMAGES}张照片`)
      return
    }

    const selectCount = Math.min(remaining, 9)

    imageUtil.chooseImage({ count: selectCount }).then(async (paths) => {
      if (paths.length === 0) return
      util.showLoading('处理图片中...')

      const processed = []
      for (const path of paths) {
        const result = await imageUtil.uploadImage(path)
        processed.push(result)
      }

      this.setData({
        images: [...this.data.images, ...processed]
      })
      util.hideLoading()
    }).catch(() => {
      util.hideLoading()
    })
  },

  onRemoveImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    const removed = images.splice(index, 1)[0]

    if (removed && removed.startsWith(wx.env.USER_DATA_PATH)) {
      imageUtil.deleteLocalImage(removed)
    }

    this.setData({ images })
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({ urls: [url] })
  },

  onToggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    let selectedTags = [...this.data.selectedTags]
    const index = selectedTags.indexOf(tag)

    if (index > -1) {
      selectedTags.splice(index, 1)
    } else {
      selectedTags.push(tag)
    }

    this.setData({ selectedTags })
  },

  onCustomTagInput(e) {
    this.setData({ customTagInput: e.detail.value })
  },

  onAddCustomTag() {
    const tag = this.data.customTagInput.trim()
    if (!tag) return

    if (tag.length > MAX_TAG_LENGTH) {
      util.showToast(`标签最多${MAX_TAG_LENGTH}个字`)
      return
    }

    if (this.data.selectedTags.includes(tag)) {
      util.showToast('标签已存在')
      this.setData({ customTagInput: '' })
      return
    }

    let customTags = [...this.data.customTags]
    if (!customTags.includes(tag)) {
      customTags.push(tag)
      storage.saveTags(customTags)
    }

    this.setData({
      selectedTags: [...this.data.selectedTags, tag],
      customTags,
      customTagInput: ''
    })
  },

  onShowCharacterPicker() {
    if (this.data.isEdit) return
    this.setData({ showCharacterPicker: true })
  },

  onCloseCharacterPicker() {
    this.setData({ showCharacterPicker: false })
  },

  onSelectCharacter(e) {
    const character = e.currentTarget.dataset.character
    wx.setNavigationBarTitle({ title: `记录 - ${character.name}` })
    this.setData({
      selectedCharacter: character,
      showCharacterPicker: false
    })
  },

  onPreview() {
    if (!this.validate()) return
    this.setData({ showPreview: true })
  },

  onClosePreview() {
    this.setData({ showPreview: false })
  },

  onConfirmSubmit() {
    this.setData({ showPreview: false })
    this.doSubmit()
  },

  onSubmit() {
    if (!this.validate()) return
    this.doSubmit()
  },

  validate() {
    if (!this.data.isEdit && !this.data.selectedCharacter.id) {
      util.showToast('请选择人物')
      return false
    }
    return true
  },

  doSubmit() {
    if (this.data.saving) return
    this.setData({ saving: true })

    const { isEdit, contentId, selectedCharacter, text, images, selectedTags } = this.data

    if (!text.trim() && images.length === 0) {
      util.showToast('请输入内容或添加照片')
      this.setData({ saving: false })
      return
    }

    util.showLoading('保存中...')

    const data = {
      characterId: selectedCharacter.id,
      text: text.trim(),
      images,
      tags: selectedTags
    }

    try {
      if (isEdit) {
        storage.updateContent(contentId, data)
      } else {
        storage.addContent(data)
      }
      util.hideLoading()
      this.setData({ saving: false })
      util.showSuccess(isEdit ? '更新成功' : '记录成功')

      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    } catch (e) {
      util.hideLoading()
      this.setData({ saving: false })
      util.showError(e.message || '保存失败，请重试')
      console.error('Submit error:', e)
    }
  },

  onCreateCharacter() {
    wx.navigateTo({ url: '/pages/character/edit/edit' })
  },

  noop() {}
})