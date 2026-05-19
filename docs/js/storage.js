var JYS = window.JYS = window.JYS || {};

JYS.Storage = {
  _supabase: null,
  _userId: null,
  _localEnabled: true,
  _retryCount: 3,
  _retryDelay: 1000,
  _useCache: true,
  _cache: {},

  STORAGE_PREFIX: 'jys_',
  MAX_CHARACTERS: 200,
  MAX_CONTENTS: 10000,
  MAX_CONTENT_LENGTH: 20000,
  MAX_TAG_LENGTH: 15,
  MAX_TAGS_PER_CONTENT: 20,
  MAX_IMAGES: 18,

  init: function(supabase) {
    if (supabase) {
      this._supabase = supabase;
      this._localEnabled = false;
    } else {
      this._localEnabled = true;
    }
  },

  setUserId: function(id) {
    this._userId = id;
    try {
      localStorage.setItem('jys_user_id', String(id));
    } catch (e) {}
  },

  isAsync: function() {
    return !this._localEnabled && this._supabase !== null;
  },

  _invalidateCache: function(key) {
    if (key) {
      delete this._cache[key];
    } else {
      this._cache = {};
    }
  },

  _retryOperation: function(operation) {
    var self = this;
    var attempts = 0;

    function attempt() {
      attempts++;
      return operation().catch(function(err) {
        if (attempts >= self._retryCount) throw err;
        return new Promise(function(resolve) {
          setTimeout(function() { resolve(attempt()); }, self._retryDelay * attempts);
        });
      });
    }

    return attempt();
  },

  _readLocal: function(key) {
    try {
      var raw = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[Storage] 本地读取失败:', key, e.message);
      return null;
    }
  },

  _writeLocal: function(key, data) {
    try {
      var serialized = JSON.stringify(data);
      localStorage.setItem(this.STORAGE_PREFIX + key, serialized);
      return true;
    } catch (e) {
      console.error('[Storage] 本地写入失败:', key, e.message);
      if (e.name === 'QuotaExceededError') {
        this._cleanupOldData();
        try {
          localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(data));
          return true;
        } catch (e2) {
          throw new Error('存储空间不足，请清理数据后重试');
        }
      }
      throw e;
    }
  },

  _cleanupOldData: function() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('jys_cache_') === 0) {
          keys.push(key);
        }
      }
      keys.forEach(function(k) { localStorage.removeItem(k); });
    } catch (e) {}
  },

  _generateLocalId: function() {
    return 'local_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  _handleError: function(op, original) {
    var self = this;
    return function(err) {
      console.warn('[Storage] 操作失败:', op, err.message);

      if (self.isAsync() && self._localEnabled === false) {
        console.log('[Storage] 云端不可用，降级到本地存储');
        self._localEnabled = true;
      }
      throw err;
    };
  },

  getCharacters: function() {
    if (this._cache._chars) return Promise.resolve(this._cache._chars);

    var self = this;
    if (this.isAsync()) {
      var op = function() {
        return self._supabase
          .from('characters').select('*')
          .order('created_at', { ascending: false })
          .then(function(r) {
            if (r.error) throw new Error(r.error.message);
            var chars = (r.data || []).map(self.normalizeCharacter);
            self._cache._chars = chars;
            return chars;
          });
      };
      return this._retryOperation(op).catch(this._handleError('getCharacters'));
    }

    return Promise.resolve(this._readLocal('characters') || []);
  },

  getCharacterById: function(id) {
    var self = this;
    if (this.isAsync()) {
      var op = function() {
        return self._supabase
          .from('characters').select('*')
          .eq('id', id).maybeSingle()
          .then(function(r) {
            if (r.error) throw new Error(r.error.message);
            return r.data ? self.normalizeCharacter(r.data) : null;
          });
      };
      return this._retryOperation(op).catch(this._handleError('getCharacterById'));
    }

    var chars = this._readLocal('characters') || [];
    for (var i = 0; i < chars.length; i++) {
      if (chars[i].id === id) return Promise.resolve(chars[i]);
    }
    return Promise.resolve(null);
  },

  addCharacter: function(character) {
    if (!character || !character.name) return Promise.reject(new Error('请输入名称'));

    character.name = String(character.name).trim();
    if (!character.name) return Promise.reject(new Error('名称不能为空'));

    var self = this;
    this._invalidateCache('_chars');

    if (this.isAsync()) {
      var op = function() {
        return self._supabase
          .from('characters').insert({
            name: character.name,
            name_pinyin: character.namePinyin || '',
            avatar: character.avatar || '',
            description: character.description || '',
            category: character.category || '',
            extra_1: character.extra1 || '',
            extra_2: character.extra2 || '',
            extra_3: character.extra3 || '',
            birth_date: character.birthDate || null,
            created_at: new Date().toISOString()
          }).select().single()
          .then(function(r) {
            if (r.error) throw new Error(r.error.message);
            return self.normalizeCharacter(r.data);
          });
      };
      return this._retryOperation(op);
    }

    var chars = this._readLocal('characters') || [];
    if (chars.length >= this.MAX_CHARACTERS) {
      return Promise.reject(new Error('人物数量已达上限'));
    }

    var newChar = {
      id: this._generateLocalId(),
      name: character.name,
      namePinyin: character.namePinyin || '',
      avatar: character.avatar || '',
      description: character.description || '',
      category: character.category || '',
      extra1: character.extra1 || '',
      extra2: character.extra2 || '',
      extra3: character.extra3 || '',
      birthDate: character.birthDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    chars.unshift(newChar);
    this._writeLocal('characters', chars);
    return Promise.resolve(newChar);
  },

  updateCharacter: function(id, updates) {
    if (!id || !updates) return Promise.reject(new Error('参数错误'));

    var self = this;
    this._invalidateCache('_chars');

    if (this.isAsync()) {
      var op = function() {
        var supabaseUpdates = {
          name: updates.name,
          name_pinyin: updates.namePinyin || '',
          avatar: updates.avatar || '',
          description: updates.description || '',
          category: updates.category || '',
          extra_1: updates.extra1 || '',
          extra_2: updates.extra2 || '',
          extra_3: updates.extra3 || '',
          birth_date: updates.birthDate || null,
          updated_at: new Date().toISOString()
        };
        Object.keys(supabaseUpdates).forEach(function(k) {
          if (supabaseUpdates[k] === undefined) delete supabaseUpdates[k];
        });
        return self._supabase.from('characters').update(supabaseUpdates).eq('id', id).select().single()
          .then(function(r) {
            if (r.error) throw new Error(r.error.message);
            return self.normalizeCharacter(r.data);
          });
      };
      return this._retryOperation(op);
    }

    var chars = this._readLocal('characters') || [];
    for (var i = 0; i < chars.length; i++) {
      if (chars[i].id === id) {
        Object.keys(updates).forEach(function(k) { chars[i][k] = updates[k]; });
        chars[i].updatedAt = new Date().toISOString();
        this._writeLocal('characters', chars);
        return Promise.resolve(chars[i]);
      }
    }
    return Promise.reject(new Error('人物不存在'));
  },

  deleteCharacter: function(id) {
    if (!id) return Promise.reject(new Error('参数错误'));
    var self = this;
    this._invalidateCache();

    if (this.isAsync()) {
      var op = function() {
        return self._supabase.from('characters').delete().eq('id', id).then(function(r) {
          if (r.error) throw new Error(r.error.message);
        });
      };
      return this._retryOperation(op);
    }

    var chars = this._readLocal('characters') || [];
    var filtered = chars.filter(function(c) { return c.id !== id; });
    this._writeLocal('characters', filtered);
    return Promise.resolve();
  },

  getContents: function(filters) {
    var self = this;
    filters = filters || {};
    var cacheKey = '_contents_' + JSON.stringify(filters);
    if (this._cache[cacheKey]) return Promise.resolve(this._cache[cacheKey]);

    if (this.isAsync()) {
      var op = function() {
        var query = self._supabase.from('contents').select('*');
        if (filters.characterId) query = query.eq('character_id', filters.characterId);
        if (filters.search) query = query.ilike('text', '%' + filters.search + '%');
        if (filters.favorite) query = query.eq('is_favorite', true);
        if (filters.orderBy === 'date') query = query.order('created_at', { ascending: false });
        else if (filters.orderBy === 'title') query = query.order('text', { ascending: true });
        else query = query.order('created_at', { ascending: false });
        if (filters.limit) query = query.limit(filters.limit);
        return query.then(function(r) {
          if (r.error) throw new Error(r.error.message);
          var contents = (r.data || []).map(self.normalizeContent);
          self._cache[cacheKey] = contents;
          return contents;
        });
      };
      return this._retryOperation(op).catch(this._handleError('getContents'));
    }

    var contents = this._readLocal('contents') || [];
    if (filters.characterId) contents = contents.filter(function(c) { return c.characterId === filters.characterId; });
    if (filters.favorite) contents = contents.filter(function(c) { return c.isFavorite; });
    if (filters.search) {
      var q = filters.search.toLowerCase();
      contents = contents.filter(function(c) { return (c.text || '').toLowerCase().indexOf(q) >= 0; });
    }
    contents.sort(function(a, b) {
      if (filters.orderBy === 'title') return (a.text || '').localeCompare(b.text || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    if (filters.limit) contents = contents.slice(0, filters.limit);
    return Promise.resolve(contents);
  },

  getContentById: function(id) {
    var self = this;
    if (this.isAsync()) {
      var op = function() {
        return self._supabase.from('contents').select('*').eq('id', id).maybeSingle()
          .then(function(r) {
            if (r.error) throw new Error(r.error.message);
            return r.data ? self.normalizeContent(r.data) : null;
          });
      };
      return this._retryOperation(op);
    }

    var contents = this._readLocal('contents') || [];
    for (var i = 0; i < contents.length; i++) {
      if (contents[i].id === id) return Promise.resolve(contents[i]);
    }
    return Promise.resolve(null);
  },

  addContent: function(content) {
    if (!content || !content.text) return Promise.reject(new Error('请输入语录内容'));

    content.text = String(content.text).trim();
    if (!content.text) return Promise.reject(new Error('内容不能为空'));
    if (content.text.length > this.MAX_CONTENT_LENGTH) {
      return Promise.reject(new Error('内容过长（限制' + this.MAX_CONTENT_LENGTH + '字）'));
    }

    var self = this;
    this._invalidateCache();

    if (this.isAsync()) {
      var op = function() {
        return self._supabase.from('contents').insert({
          character_id: content.characterId || null,
          text: content.text,
          source: content.source || '',
          date: content.date || new Date().toISOString(),
          tags: (content.tags || []).slice(0, self.MAX_TAGS_PER_CONTENT),
          location: content.location || '',
          is_favorite: !!content.isFavorite,
          created_at: new Date().toISOString()
        }).select().single()
          .then(function(r) {
            if (r.error) throw new Error(r.error.message);
            return self.normalizeContent(r.data);
          });
      };
      return this._retryOperation(op);
    }

    var contents = this._readLocal('contents') || [];
    if (contents.length >= this.MAX_CONTENTS) {
      return Promise.reject(new Error('语录数量已达上限'));
    }

    var newContent = {
      id: this._generateLocalId(),
      characterId: content.characterId || null,
      text: content.text,
      source: content.source || '',
      date: content.date || new Date().toISOString(),
      tags: (content.tags || []).slice(0, this.MAX_TAGS_PER_CONTENT),
      location: content.location || '',
      isFavorite: !!content.isFavorite,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    contents.unshift(newContent);
    this._writeLocal('contents', contents);
    return Promise.resolve(newContent);
  },

  updateContent: function(id, updates) {
    if (!id || !updates) return Promise.reject(new Error('参数错误'));

    var self = this;
    this._invalidateCache();

    if (this.isAsync()) {
      var op = function() {
        var supabaseUpdates = {
          character_id: updates.characterId,
          text: updates.text,
          source: updates.source || '',
          date: updates.date,
          tags: (updates.tags || []).slice(0, self.MAX_TAGS_PER_CONTENT),
          location: updates.location || '',
          is_favorite: updates.isFavorite,
          updated_at: new Date().toISOString()
        };
        Object.keys(supabaseUpdates).forEach(function(k) {
          if (supabaseUpdates[k] === undefined) delete supabaseUpdates[k];
        });
        return self._supabase.from('contents').update(supabaseUpdates).eq('id', id).select().single()
          .then(function(r) {
            if (r.error) throw new Error(r.error.message);
            return self.normalizeContent(r.data);
          });
      };
      return this._retryOperation(op);
    }

    var contents = this._readLocal('contents') || [];
    for (var i = 0; i < contents.length; i++) {
      if (contents[i].id === id) {
        Object.keys(updates).forEach(function(k) { contents[i][k] = updates[k]; });
        contents[i].updatedAt = new Date().toISOString();
        this._writeLocal('contents', contents);
        return Promise.resolve(contents[i]);
      }
    }
    return Promise.reject(new Error('语录不存在'));
  },

  deleteContent: function(id) {
    if (!id) return Promise.reject(new Error('参数错误'));
    var self = this;
    this._invalidateCache();

    if (this.isAsync()) {
      var op = function() {
        return self._supabase.from('contents').delete().eq('id', id).then(function(r) {
          if (r.error) throw new Error(r.error.message);
        });
      };
      return this._retryOperation(op);
    }

    var contents = this._readLocal('contents') || [];
    var filtered = contents.filter(function(c) { return c.id !== id; });
    this._writeLocal('contents', filtered);
    return Promise.resolve();
  },

  toggleFavorite: function(id) {
    if (!id) return Promise.reject(new Error('参数错误'));

    var self = this;
    if (this.isAsync()) {
      var op = function() {
        return self._supabase.from('contents').select('is_favorite').eq('id', id).maybeSingle().then(function(r) {
          if (r.error) throw new Error(r.error.message);
          if (!r.data) return null;
          var newVal = !r.data.is_favorite;
          return self._supabase.from('contents').update({ is_favorite: newVal }).eq('id', id).select().single().then(function(r2) {
            if (r2.error) throw new Error(r2.error.message);
            return self.normalizeContent(r2.data);
          });
        });
      };
      return this._retryOperation(op);
    }

    var contents = this._readLocal('contents') || [];
    for (var i = 0; i < contents.length; i++) {
      if (contents[i].id === id) {
        contents[i].isFavorite = !contents[i].isFavorite;
        this._writeLocal('contents', contents);
        return Promise.resolve(contents[i]);
      }
    }
    return Promise.reject(new Error('语录不存在'));
  },

  getFavorites: function() {
    return this.getContents({ favorite: true });
  },

  getTags: function() {
    var self = this;
    if (this.isAsync()) {
      return this.getContents().then(function(contents) {
        var tagsSet = {};
        contents.forEach(function(c) {
          (c.tags || []).forEach(function(t) { tagsSet[t] = true; });
        });
        return Object.keys(tagsSet);
      });
    }

    var contents = this._readLocal('contents') || [];
    var tagsSet = {};
    contents.forEach(function(c) {
      (c.tags || []).forEach(function(t) { tagsSet[t] = true; });
    });
    return Promise.resolve(Object.keys(tagsSet));
  },

  getStats: function() {
    var self = this;
    if (this.isAsync()) {
      var op = function() {
        return Promise.all([
          self._supabase.from('characters').select('id', { count: 'exact', head: true }),
          self._supabase.from('contents').select('id', { count: 'exact', head: true }),
          self._supabase.from('contents').select('id', { count: 'exact', head: true }).eq('is_favorite', true)
        ]).then(function(results) {
          return {
            characterCount: (results[0] && results[0].count) || 0,
            contentCount: (results[1] && results[1].count) || 0,
            favoriteCount: (results[2] && results[2].count) || 0,
            tagCount: 0
          };
        });
      };
      return this._retryOperation(op).catch(function() {
        return { characterCount: 0, contentCount: 0, favoriteCount: 0, tagCount: 0 };
      });
    }

    var chars = this._readLocal('characters') || [];
    var contents = this._readLocal('contents') || [];
    var favs = contents.filter(function(c) { return c.isFavorite; });
    return Promise.resolve({
      characterCount: chars.length,
      contentCount: contents.length,
      favoriteCount: favs.length,
      tagCount: 0
    });
  },

  logActivity: function(type, data) {
    data = data || {};
    var entry = { type: type, data: data, timestamp: new Date().toISOString() };

    if (this.isAsync()) {
      var self = this;
      return this._supabase.from('activity_logs').insert({
        type: type,
        details: data,
        created_at: new Date().toISOString()
      }).then(function(r) {}).catch(function() {});
    }

    try {
      var logs = [];
      var raw = localStorage.getItem('jys_activity_logs');
      if (raw) logs = JSON.parse(raw);
      logs.push(entry);
      if (logs.length > 500) logs = logs.slice(-500);
      localStorage.setItem('jys_activity_logs', JSON.stringify(logs));
    } catch (e) {}
  },

  exportAllData: function() {
    var self = this;
    if (this.isAsync()) {
      return Promise.all([
        this.getCharacters(),
        this.getContents()
      ]).then(function(results) {
        var data = {
          version: 'v2',
          exportedAt: new Date().toISOString(),
          characters: results[0],
          contents: results[1]
        };
        return JSON.stringify(data, null, 2);
      });
    }

    var data = {
      version: 'v2',
      exportedAt: new Date().toISOString(),
      characters: this._readLocal('characters') || [],
      contents: this._readLocal('contents') || []
    };
    return JSON.stringify(data, null, 2);
  },

  importData: function(jsonStr) {
    if (!jsonStr) return Promise.reject(new Error('无数据可导入'));
    var self = this;
    this._invalidateCache();

    try {
      var data = JSON.parse(jsonStr);
    } catch (e) {
      return Promise.reject(new Error('数据格式无效，请检查后重试'));
    }

    if (!data || !data.characters || !data.contents) {
      return Promise.reject(new Error('数据格式不完整，缺少必要字段'));
    }

    if (this.isAsync()) {
      var chars = (data.characters || []).map(function(c) {
        return {
          name: c.name,
          name_pinyin: c.namePinyin || '',
          avatar: c.avatar || '',
          description: c.description || '',
          category: c.category || '',
          extra_1: c.extra1 || '',
          extra_2: c.extra2 || '',
          extra_3: c.extra3 || '',
          birth_date: c.birthDate || null,
          created_at: new Date().toISOString()
        };
      });

      var contents = (data.contents || []).map(function(c) {
        return {
          character_id: c.characterId || null,
          text: c.text,
          source: c.source || '',
          date: c.date || new Date().toISOString(),
          tags: c.tags || [],
          location: c.location || '',
          is_favorite: !!c.isFavorite,
          created_at: new Date().toISOString()
        };
      });

      var op = function() {
        var promises = [];
        if (chars.length > 0) {
          promises.push(self._supabase.from('characters').insert(chars).then(function(r) {
            if (r.error) console.warn('[Storage] 导入人物部分失败:', r.error.message);
          }));
        }
        if (contents.length > 0) {
          promises.push(self._supabase.from('contents').insert(contents).then(function(r) {
            if (r.error) console.warn('[Storage] 导入语录部分失败:', r.error.message);
          }));
        }
        return Promise.all(promises);
      };
      return this._retryOperation(op);
    }

    var existingChars = this._readLocal('characters') || [];
    var existingContents = this._readLocal('contents') || [];
    var total = existingChars.length + (data.characters || []).length;

    if (total > this.MAX_CHARACTERS) {
      return Promise.reject(new Error('导入后人物数量超过上限（' + this.MAX_CHARACTERS + '）'));
    }

    (data.characters || []).forEach(function(c) {
      if (!c.id) c.id = self._generateLocalId();
      existingChars.push(c);
    });

    (data.contents || []).forEach(function(c) {
      if (!c.id) c.id = self._generateLocalId();
      existingContents.push(c);
    });

    this._writeLocal('characters', existingChars);
    this._writeLocal('contents', existingContents);
    return Promise.resolve();
  },

  normalizeCharacter: function(c) {
    if (!c) return c;
    return {
      id: c.id,
      name: c.name || '',
      namePinyin: c.name_pinyin || c.namePinyin || '',
      avatar: c.avatar || '',
      description: c.description || '',
      category: c.category || '',
      extra1: c.extra_1 || c.extra1 || '',
      extra2: c.extra_2 || c.extra2 || '',
      extra3: c.extra_3 || c.extra3 || '',
      birthDate: c.birth_date || c.birthDate || null,
      createdAt: c.created_at || c.createdAt || new Date().toISOString(),
      updatedAt: c.updated_at || c.updatedAt || new Date().toISOString()
    };
  },

  normalizeContent: function(c) {
    if (!c) return c;
    return {
      id: c.id,
      characterId: c.character_id || c.characterId || null,
      text: c.text || '',
      source: c.source || '',
      date: c.date || null,
      tags: c.tags || [],
      location: c.location || '',
      isFavorite: !!c.is_favorite || !!c.isFavorite || false,
      createdAt: c.created_at || c.createdAt || new Date().toISOString(),
      updatedAt: c.updated_at || c.updatedAt || new Date().toISOString()
    };
  }
};