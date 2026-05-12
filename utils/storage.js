const STORAGE_PREFIX = 'jys_'

const KEYS = {
  CHARACTERS: 'characters',
  CONTENTS: 'contents',
  PASSWORD: 'password',
  FAVORITES: 'favorites',
  TAGS: 'tags',
  SETTINGS: 'settings'
}

const MAX_CHARACTERS = 200
const MAX_CONTENTS = 10000
const MAX_TEXT_LENGTH = 20000
const MAX_NAME_LENGTH = 20
const MAX_TAG_LENGTH = 15
const MAX_TAGS_PER_CONTENT = 20

let _cache = {
  characters: null,
  charactersTimestamp: 0,
  contents: null,
  contentsTimestamp: 0,
  tags: null,
  tagsTimestamp: 0
}

const CACHE_TTL = 2000

function log(level, message, data) {
  const prefix = `[Storage]`
  if (level === 'error') {
    console.error(`${prefix} ${message}`, data || '')
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`, data || '')
  }
}

function getKey(key) {
  return STORAGE_PREFIX + key
}

function safeJsonParse(str, fallback = null) {
  if (!str || str === '') return fallback
  try {
    return JSON.parse(str)
  } catch (e) {
    log('error', 'JSON parse failed', { str: str.substring(0, 100), error: e.message })
    return fallback
  }
}

function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj)
  } catch (e) {
    log('error', 'JSON stringify failed', e.message)
    return JSON.stringify({})
  }
}

function getStorage(key) {
  try {
    const data = wx.getStorageSync(getKey(key))
    return safeJsonParse(data, null)
  } catch (e) {
    log('error', `getStorage failed: ${key}`, e.message)
    return null
  }
}

function setStorage(key, data) {
  try {
    wx.setStorageSync(getKey(key), safeJsonStringify(data))
    return true
  } catch (e) {
    log('error', `setStorage failed: ${key}`, e.message)

    try {
      wx.clearStorageSync()
      wx.setStorageSync(getKey(key), safeJsonStringify(data))
      log('warn', 'Storage cleared and retry succeeded')
      return true
    } catch (e2) {
      log('error', 'Storage write failed after clear', e2.message)
      return false
    }
  }
}

function removeStorage(key) {
  try {
    wx.removeStorageSync(getKey(key))
    return true
  } catch (e) {
    log('error', `removeStorage failed: ${key}`, e.message)
    return false
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function invalidateCache(key) {
  if (key === 'characters') {
    _cache.characters = null
    _cache.charactersTimestamp = 0
  } else if (key === 'contents') {
    _cache.contents = null
    _cache.contentsTimestamp = 0
  } else if (key === 'tags') {
    _cache.tags = null
    _cache.tagsTimestamp = 0
  }
}

function getFromCache(key, loader) {
  const now = Date.now()
  if (key === 'characters' && _cache.characters && (now - _cache.charactersTimestamp) < CACHE_TTL) {
    return _cache.characters
  }
  if (key === 'contents' && _cache.contents && (now - _cache.contentsTimestamp) < CACHE_TTL) {
    return _cache.contents
  }
  if (key === 'tags' && _cache.tags && (now - _cache.tagsTimestamp) < CACHE_TTL) {
    return _cache.tags
  }

  const data = loader()
  if (key === 'characters') {
    _cache.characters = data
    _cache.charactersTimestamp = now
  } else if (key === 'contents') {
    _cache.contents = data
    _cache.contentsTimestamp = now
  } else if (key === 'tags') {
    _cache.tags = data
    _cache.tagsTimestamp = now
  }

  return data
}

function validateCharacter(data) {
  const errors = []
  if (!data.name || !data.name.trim()) errors.push('姓名不能为空')
  if (data.name && data.name.length > MAX_NAME_LENGTH) errors.push(`姓名不能超过${MAX_NAME_LENGTH}个字符`)
  if (data.nickname && data.nickname.length > MAX_NAME_LENGTH) errors.push(`昵称不能超过${MAX_NAME_LENGTH}个字符`)
  if (data.remark && data.remark.length > 200) errors.push('备注不能超过200个字符')
  return { valid: errors.length === 0, errors }
}

function validateContent(data) {
  const errors = []
  if (!data.characterId) errors.push('人物ID不能为空')
  if (data.text && data.text.length > MAX_TEXT_LENGTH) errors.push(`文字内容不能超过${MAX_TEXT_LENGTH}个字符`)
  if (data.tags && data.tags.length > MAX_TAGS_PER_CONTENT) errors.push(`标签不能超过${MAX_TAGS_PER_CONTENT}个`)
  if (data.images && !Array.isArray(data.images)) errors.push('图片数据格式不正确')
  return { valid: errors.length === 0, errors }
}

function getCharacters() {
  return getFromCache('characters', () => {
    return getStorage(KEYS.CHARACTERS) || []
  })
}

function saveCharacters(characters) {
  invalidateCache('characters')
  return setStorage(KEYS.CHARACTERS, characters)
}

function getCharacterById(id) {
  if (!id) return null
  const characters = getCharacters()
  return characters.find(c => c.id === id) || null
}

function addCharacter(character) {
  const { valid, errors } = validateCharacter(character)
  if (!valid) {
    log('warn', 'Character validation failed', errors)
    throw new Error(errors[0])
  }

  const characters = getCharacters()
  if (characters.length >= MAX_CHARACTERS) {
    throw new Error(`最多添加${MAX_CHARACTERS}个人物`)
  }

  const newCharacter = {
    ...character,
    id: generateId(),
    name: character.name.trim(),
    nickname: (character.nickname || '').trim(),
    remark: (character.remark || '').trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    contentCount: 0
  }
  characters.unshift(newCharacter)
  saveCharacters(characters)
  return newCharacter
}

function updateCharacter(id, data) {
  if (!id) throw new Error('人物ID不能为空')

  const characters = getCharacters()
  const index = characters.findIndex(c => c.id === id)
  if (index === -1) throw new Error('人物不存在')

  const merged = { ...characters[index], ...data, name: data.name !== undefined ? data.name : characters[index].name }
  const { valid, errors } = validateCharacter(merged)
  if (!valid) {
    log('warn', 'Character validation failed', errors)
    throw new Error(errors[0])
  }

  characters[index] = {
    ...merged,
    name: data.name !== undefined ? data.name.trim() : characters[index].name,
    nickname: data.nickname !== undefined ? data.nickname.trim() : characters[index].nickname,
    remark: data.remark !== undefined ? data.remark.trim() : characters[index].remark,
    updatedAt: Date.now()
  }
  saveCharacters(characters)
  return characters[index]
}

function deleteCharacter(id) {
  if (!id) return false

  const characters = getCharacters()
  saveCharacters(characters.filter(c => c.id !== id))
  invalidateCache('characters')

  const contents = getContents()
  saveContents(contents.filter(c => c.characterId !== id))
  invalidateCache('contents')

  return true
}

function getContents(characterId) {
  const allContents = getFromCache('contents', () => {
    return getStorage(KEYS.CONTENTS) || []
  })
  if (characterId) {
    return allContents.filter(c => c.characterId === characterId)
  }
  return allContents
}

function saveContents(contents) {
  invalidateCache('contents')
  return setStorage(KEYS.CONTENTS, contents)
}

function getContentById(id) {
  if (!id) return null
  const contents = getContents()
  return contents.find(c => c.id === id) || null
}

function addContent(content) {
  const { valid, errors } = validateContent(content)
  if (!valid) {
    log('warn', 'Content validation failed', errors)
    throw new Error(errors[0])
  }

  const contents = getContents()
  if (contents.length >= MAX_CONTENTS) {
    throw new Error(`最多记录${MAX_CONTENTS}条语录`)
  }

  const newContent = {
    ...content,
    id: generateId(),
    text: (content.text || '').trim(),
    images: content.images || [],
    tags: content.tags || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false
  }
  contents.unshift(newContent)
  saveContents(contents)

  const characters = getCharacters()
  const charIndex = characters.findIndex(c => c.id === content.characterId)
  if (charIndex !== -1) {
    characters[charIndex].contentCount = (characters[charIndex].contentCount || 0) + 1
    characters[charIndex].updatedAt = Date.now()
    saveCharacters(characters)
  }

  return newContent
}

function updateContent(id, data) {
  if (!id) throw new Error('内容ID不能为空')

  const contents = getContents()
  const index = contents.findIndex(c => c.id === id)
  if (index === -1) throw new Error('内容不存在')

  const merged = { ...contents[index], ...data, characterId: data.characterId !== undefined ? data.characterId : contents[index].characterId }
  const { valid, errors } = validateContent(merged)
  if (!valid) {
    log('warn', 'Content validation failed', errors)
    throw new Error(errors[0])
  }

  contents[index] = {
    ...merged,
    text: data.text !== undefined ? data.text.trim() : contents[index].text,
    updatedAt: Date.now()
  }
  saveContents(contents)
  return contents[index]
}

function deleteContent(id) {
  if (!id) return false

  const contents = getContents()
  const content = contents.find(c => c.id === id)
  if (!content) return false

  saveContents(contents.filter(c => c.id !== id))
  invalidateCache('contents')

  const characters = getCharacters()
  const charIndex = characters.findIndex(c => c.id === content.characterId)
  if (charIndex !== -1) {
    characters[charIndex].contentCount = Math.max(0, (characters[charIndex].contentCount || 0) - 1)
    saveCharacters(characters)
  }

  return true
}

function toggleFavorite(id) {
  const content = getContentById(id)
  if (!content) return null
  const newStatus = !content.isFavorite
  return updateContent(id, { isFavorite: newStatus })
}

function getFavorites() {
  const contents = getContents()
  return contents.filter(c => c.isFavorite)
}

function getPassword() {
  return getStorage(KEYS.PASSWORD)
}

function savePassword(password) {
  if (!password || typeof password !== 'string' || password.length < 4) {
    throw new Error('密码至少需要4位')
  }
  return setStorage(KEYS.PASSWORD, password.trim())
}

function getTags() {
  return getFromCache('tags', () => {
    return getStorage(KEYS.TAGS) || []
  })
}

function saveTags(tags) {
  invalidateCache('tags')
  return setStorage(KEYS.TAGS, tags)
}

function addTag(tag) {
  if (!tag || tag.length > MAX_TAG_LENGTH) return getTags()
  const tags = getTags()
  if (tags.includes(tag)) return tags
  tags.push(tag)
  saveTags(tags)
  return tags
}

function exportAllData() {
  const data = {
    exportTime: new Date().toISOString(),
    version: '1.0.0',
    appName: '集英社',
    characters: getCharacters(),
    contents: getContents(),
    favorites: getFavorites(),
    tags: getTags()
  }
  return safeJsonStringify(data)
}

function importData(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') {
    throw new Error('数据格式无效')
  }

  const data = safeJsonParse(jsonStr)
  if (!data || typeof data !== 'object') {
    throw new Error('无法解析数据')
  }

  if (data.version && data.characters && data.contents) {
    invalidateCache('characters')
    invalidateCache('contents')
    invalidateCache('tags')

    if (Array.isArray(data.characters)) saveCharacters(data.characters)
    if (Array.isArray(data.contents)) saveContents(data.contents)
    if (Array.isArray(data.tags)) saveTags(data.tags)

    return true
  }

  throw new Error('数据格式不正确，缺少必要字段')
}

function clearAllData() {
  Object.values(KEYS).forEach(key => removeStorage(key))
  _cache = { characters: null, charactersTimestamp: 0, contents: null, contentsTimestamp: 0, tags: null, tagsTimestamp: 0 }
  return true
}

function getStats() {
  const characters = getCharacters()
  const contents = getContents()
  return {
    characterCount: characters.length,
    contentCount: contents.length,
    favoriteCount: getFavorites().length,
    tagCount: getTags().length
  }
}

module.exports = {
  generateId,
  getCharacters,
  getCharacterById,
  addCharacter,
  updateCharacter,
  deleteCharacter,
  getContents,
  getContentById,
  addContent,
  updateContent,
  deleteContent,
  toggleFavorite,
  getFavorites,
  getPassword,
  savePassword,
  getTags,
  saveTags,
  addTag,
  exportAllData,
  importData,
  clearAllData,
  getStats
}