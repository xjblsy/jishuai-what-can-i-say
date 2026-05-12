var JYS = window.JYS = window.JYS || {};

(function() {
  const STORAGE_PREFIX = 'jys_';
  const MAX_CHARACTERS = 200;
  const MAX_CONTENTS = 10000;
  const MAX_TEXT_LENGTH = 20000;
  const MAX_NAME_LENGTH = 20;
  const MAX_TAG_LENGTH = 15;
  const MAX_TAGS_PER_CONTENT = 20;

  let _cache = {
    characters: null,
    charactersTimestamp: 0,
    contents: null,
    contentsTimestamp: 0,
    tags: null,
    tagsTimestamp: 0
  };
  const CACHE_TTL = 2000;

  function getKey(key) { return STORAGE_PREFIX + key; }

  function safeJsonParse(str, fallback) {
    fallback = fallback !== undefined ? fallback : null;
    if (!str || str === '') return fallback;
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }

  function safeJsonStringify(obj) {
    try { return JSON.stringify(obj); } catch (e) { return '{}'; }
  }

  function getStorage(key) {
    try { return safeJsonParse(localStorage.getItem(getKey(key)), null); } catch (e) { return null; }
  }

  function setStorage(key, data) {
    try {
      localStorage.setItem(getKey(key), safeJsonStringify(data));
      return true;
    } catch (e) {
      try {
        localStorage.clear();
        localStorage.setItem(getKey(key), safeJsonStringify(data));
        return true;
      } catch (e2) { return false; }
    }
  }

  function removeStorage(key) {
    try { localStorage.removeItem(getKey(key)); return true; } catch (e) { return false; }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function invalidateCache(key) {
    if (key === 'characters') { _cache.characters = null; _cache.charactersTimestamp = 0; }
    else if (key === 'contents') { _cache.contents = null; _cache.contentsTimestamp = 0; }
    else if (key === 'tags') { _cache.tags = null; _cache.tagsTimestamp = 0; }
  }

  function getFromCache(key, loader) {
    var now = Date.now();
    if (key === 'characters' && _cache.characters && (now - _cache.charactersTimestamp) < CACHE_TTL) return _cache.characters;
    if (key === 'contents' && _cache.contents && (now - _cache.contentsTimestamp) < CACHE_TTL) return _cache.contents;
    if (key === 'tags' && _cache.tags && (now - _cache.tagsTimestamp) < CACHE_TTL) return _cache.tags;

    var data = loader();
    if (key === 'characters') { _cache.characters = data; _cache.charactersTimestamp = now; }
    else if (key === 'contents') { _cache.contents = data; _cache.contentsTimestamp = now; }
    else if (key === 'tags') { _cache.tags = data; _cache.tagsTimestamp = now; }
    return data;
  }

  function validateCharacter(data) {
    var errors = [];
    if (!data.name || !data.name.trim()) errors.push('姓名不能为空');
    if (data.name && data.name.length > MAX_NAME_LENGTH) errors.push('姓名不能超过' + MAX_NAME_LENGTH + '个字符');
    if (data.nickname && data.nickname.length > MAX_NAME_LENGTH) errors.push('昵称不能超过' + MAX_NAME_LENGTH + '个字符');
    if (data.remark && data.remark.length > 200) errors.push('备注不能超过200个字符');
    return { valid: errors.length === 0, errors: errors };
  }

  function validateContent(data) {
    var errors = [];
    if (!data.characterId) errors.push('人物ID不能为空');
    if (data.text && data.text.length > MAX_TEXT_LENGTH) errors.push('文字内容不能超过' + MAX_TEXT_LENGTH + '个字符');
    if (data.tags && data.tags.length > MAX_TAGS_PER_CONTENT) errors.push('标签不能超过' + MAX_TAGS_PER_CONTENT + '个');
    if (data.images && !Array.isArray(data.images)) errors.push('图片数据格式不正确');
    return { valid: errors.length === 0, errors: errors };
  }

  JYS.Storage = {
    getCharacters: function() {
      return getFromCache('characters', function() { return getStorage('characters') || []; });
    },
    getCharacterById: function(id) {
      if (!id) return null;
      return this.getCharacters().find(function(c) { return c.id === id; }) || null;
    },
    addCharacter: function(character) {
      var v = validateCharacter(character);
      if (!v.valid) throw new Error(v.errors[0]);

      var characters = this.getCharacters();
      if (characters.length >= MAX_CHARACTERS) throw new Error('最多添加' + MAX_CHARACTERS + '个人物');

      var newChar = {
        id: generateId(),
        name: character.name.trim(),
        nickname: (character.nickname || '').trim(),
        remark: (character.remark || '').trim(),
        avatar: character.avatar || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        contentCount: 0
      };
      characters.unshift(newChar);
      invalidateCache('characters');
      setStorage('characters', characters);
      return newChar;
    },
    updateCharacter: function(id, data) {
      if (!id) throw new Error('人物ID不能为空');
      var characters = this.getCharacters();
      var index = characters.findIndex(function(c) { return c.id === id; });
      if (index === -1) throw new Error('人物不存在');

      var merged = Object.assign({}, characters[index], data, { name: data.name !== undefined ? data.name : characters[index].name });
      var v = validateCharacter(merged);
      if (!v.valid) throw new Error(v.errors[0]);

      var updated = Object.assign(characters[index], {
        name: data.name !== undefined ? data.name.trim() : characters[index].name,
        nickname: data.nickname !== undefined ? data.nickname.trim() : characters[index].nickname,
        remark: data.remark !== undefined ? data.remark.trim() : characters[index].remark,
        avatar: data.avatar !== undefined ? data.avatar : characters[index].avatar,
        updatedAt: Date.now()
      });
      invalidateCache('characters');
      setStorage('characters', characters);
      return updated;
    },
    deleteCharacter: function(id) {
      if (!id) return false;
      var characters = this.getCharacters();
      invalidateCache('characters');
      setStorage('characters', characters.filter(function(c) { return c.id !== id; }));

      var contents = this.getContents();
      invalidateCache('contents');
      setStorage('contents', contents.filter(function(c) { return c.characterId !== id; }));
      return true;
    },
    getContents: function(characterId) {
      var all = getFromCache('contents', function() { return getStorage('contents') || []; });
      if (characterId) return all.filter(function(c) { return c.characterId === characterId; });
      return all;
    },
    getContentById: function(id) {
      if (!id) return null;
      return this.getContents().find(function(c) { return c.id === id; }) || null;
    },
    addContent: function(content) {
      var v = validateContent(content);
      if (!v.valid) throw new Error(v.errors[0]);

      var contents = this.getContents();
      if (contents.length >= MAX_CONTENTS) throw new Error('最多记录' + MAX_CONTENTS + '条语录');

      var newContent = {
        id: generateId(),
        characterId: content.characterId,
        text: (content.text || '').trim(),
        images: content.images || [],
        tags: content.tags || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false
      };
      contents.unshift(newContent);
      invalidateCache('contents');
      setStorage('contents', contents);

      var characters = this.getCharacters();
      var charIndex = characters.findIndex(function(c) { return c.id === content.characterId; });
      if (charIndex !== -1) {
        characters[charIndex].contentCount = (characters[charIndex].contentCount || 0) + 1;
        characters[charIndex].updatedAt = Date.now();
        invalidateCache('characters');
        setStorage('characters', characters);
      }
      return newContent;
    },
    updateContent: function(id, data) {
      if (!id) throw new Error('内容ID不能为空');
      var contents = this.getContents();
      var index = contents.findIndex(function(c) { return c.id === id; });
      if (index === -1) throw new Error('内容不存在');

      var merged = Object.assign({}, contents[index], data, { characterId: data.characterId !== undefined ? data.characterId : contents[index].characterId });
      var v = validateContent(merged);
      if (!v.valid) throw new Error(v.errors[0]);

      var updated = Object.assign(contents[index], {
        text: data.text !== undefined ? data.text.trim() : contents[index].text,
        images: data.images !== undefined ? data.images : contents[index].images,
        tags: data.tags !== undefined ? data.tags : contents[index].tags,
        isFavorite: data.isFavorite !== undefined ? data.isFavorite : contents[index].isFavorite,
        updatedAt: Date.now()
      });
      invalidateCache('contents');
      setStorage('contents', contents);
      return updated;
    },
    deleteContent: function(id) {
      if (!id) return false;
      var contents = this.getContents();
      var content = contents.find(function(c) { return c.id === id; });
      if (!content) return false;

      invalidateCache('contents');
      setStorage('contents', contents.filter(function(c) { return c.id !== id; }));

      var characters = this.getCharacters();
      var charIndex = characters.findIndex(function(c) { return c.id === content.characterId; });
      if (charIndex !== -1) {
        characters[charIndex].contentCount = Math.max(0, (characters[charIndex].contentCount || 0) - 1);
        invalidateCache('characters');
        setStorage('characters', characters);
      }
      return true;
    },
    toggleFavorite: function(id) {
      var content = this.getContentById(id);
      if (!content) return null;
      return this.updateContent(id, { isFavorite: !content.isFavorite });
    },
    getFavorites: function() {
      return this.getContents().filter(function(c) { return c.isFavorite; });
    },
    getPassword: function() { return getStorage('password'); },
    savePassword: function(password) {
      if (!password || typeof password !== 'string' || password.length < 4) throw new Error('密码至少需要4位');
      return setStorage('password', password.trim());
    },
    getTags: function() {
      return getFromCache('tags', function() { return getStorage('tags') || []; });
    },
    saveTags: function(tags) {
      invalidateCache('tags');
      return setStorage('tags', tags);
    },
    addTag: function(tag) {
      if (!tag || tag.length > MAX_TAG_LENGTH) return this.getTags();
      var tags = this.getTags();
      if (tags.indexOf(tag) !== -1) return tags;
      tags.push(tag);
      this.saveTags(tags);
      return tags;
    },
    exportAllData: function() {
      return safeJsonStringify({
        exportTime: new Date().toISOString(),
        version: '1.0.0',
        appName: '集英社',
        characters: this.getCharacters(),
        contents: this.getContents(),
        tags: this.getTags()
      });
    },
    importData: function(jsonStr) {
      if (!jsonStr || typeof jsonStr !== 'string') throw new Error('数据格式无效');
      var data = safeJsonParse(jsonStr);
      if (!data || typeof data !== 'object') throw new Error('无法解析数据');
      if (data.version && data.characters && data.contents) {
        invalidateCache('characters');
        invalidateCache('contents');
        invalidateCache('tags');
        if (Array.isArray(data.characters)) setStorage('characters', data.characters);
        if (Array.isArray(data.contents)) setStorage('contents', data.contents);
        if (Array.isArray(data.tags)) setStorage('tags', data.tags);
        return true;
      }
      throw new Error('数据格式不正确');
    },
    clearAllData: function() {
      var keys = ['characters', 'contents', 'password', 'tags', 'settings'];
      keys.forEach(function(k) { removeStorage(k); });
      _cache = { characters: null, charactersTimestamp: 0, contents: null, contentsTimestamp: 0, tags: null, tagsTimestamp: 0 };
      return true;
    },
    getStats: function() {
      return {
        characterCount: this.getCharacters().length,
        contentCount: this.getContents().length,
        favoriteCount: this.getFavorites().length,
        tagCount: this.getTags().length
      };
    }
  };
})();