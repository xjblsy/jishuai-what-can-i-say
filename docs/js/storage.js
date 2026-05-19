var JYS = window.JYS = window.JYS || {};

(function() {
  var _supabase = null;
  var _userId = null;
  var _maxCharacters = 200;
  var _maxContents = 10000;
  var _maxTextLength = 20000;
  var _maxNameLength = 20;
  var _maxTagLength = 15;
  var _maxTagsPerContent = 20;
  var _maxImages = 18;

  function init(supabaseClient) {
    _supabase = supabaseClient;
  }

  function setUserId(userId) {
    _userId = userId;
  }

  function getUserId() {
    return _userId;
  }

  function isAsync() {
    return !!_supabase;
  }

  function _query(table) {
    if (!_supabase) throw new Error('数据库未连接');
    return _supabase.from(table);
  }

  function _readLocal(key) {
    try {
      var raw = localStorage.getItem('jys_' + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function _writeLocal(key, value) {
    try { localStorage.setItem('jys_' + key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function _uuid() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, function() {
      return Math.floor(Math.random() * 16).toString(16);
    }) + '-' + Date.now().toString(36);
  }

  function _generateLocalId() {
    return 'loc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function normalizeCharacter(row) {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      nickname: row.nickname || '',
      remark: row.remark || '',
      avatar: row.avatar || '',
      contentCount: row.content_count || row.contentCount || 0,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }

  function normalizeContent(row) {
    return {
      id: row.id,
      user_id: row.user_id,
      characterId: row.character_id || row.characterId,
      text: row.text || '',
      images: row.images || [],
      tags: row.tags || [],
      isFavorite: row.is_favorite !== undefined ? row.is_favorite : (row.isFavorite || false),
      createdAt: typeof row.created_at === 'string' ? new Date(row.created_at).getTime() : (row.createdAt || row.created_at || Date.now()),
      updatedAt: typeof row.updated_at === 'string' ? new Date(row.updated_at).getTime() : (row.updatedAt || row.updated_at || Date.now())
    };
  }

  function validateCharacter(data) {
    var errors = [];
    if (!data.name || !data.name.trim()) errors.push('姓名不能为空');
    if (data.name && data.name.length > _maxNameLength) errors.push('姓名不能超过' + _maxNameLength + '个字符');
    if (data.nickname && data.nickname.length > _maxNameLength) errors.push('昵称不能超过' + _maxNameLength + '个字符');
    if (data.remark && data.remark.length > 200) errors.push('备注不能超过200个字符');
    return { valid: errors.length === 0, errors: errors };
  }

  function validateContent(data) {
    var errors = [];
    if (!data.characterId) errors.push('人物ID不能为空');
    if (data.text && data.text.length > _maxTextLength) errors.push('文字内容不能超过' + _maxTextLength + '个字符');
    if (data.tags && data.tags.length > _maxTagsPerContent) errors.push('标签不能超过' + _maxTagsPerContent + '个');
    return { valid: errors.length === 0, errors: errors };
  }

  JYS.Storage = {
    init: init,
    setUserId: setUserId,
    getUserId: getUserId,
    isAsync: isAsync,

    getCharacters: function() {
      if (!_supabase) {
        var chars = _readLocal('characters') || [];
        return Promise.resolve(chars.map(normalizeCharacter).sort(function(a, b) {
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        }));
      }
      return _query('characters').select('*').order('updated_at', { ascending: false }).then(function(r) {
        if (r.error) throw new Error(r.error.message);
        return (r.data || []).map(normalizeCharacter);
      });
    },

    getCharacterById: function(id) {
      if (!id) return Promise.resolve(null);

      if (!_supabase) {
        var chars = _readLocal('characters') || [];
        var found = chars.filter(function(c) { return c.id === id || c.id === id; });
        return Promise.resolve(found.length > 0 ? normalizeCharacter(found[0]) : null);
      }

      return _query('characters').select('*').eq('id', id).single().then(function(r) {
        return r.data ? normalizeCharacter(r.data) : null;
      });
    },

    addCharacter: function(character) {
      var v = validateCharacter(character);
      if (!v.valid) return Promise.reject(new Error(v.errors[0]));

      if (!_supabase) {
        var chars = _readLocal('characters') || [];
        if (chars.length >= _maxCharacters) return Promise.reject(new Error('最多添加' + _maxCharacters + '个人物'));

        var newChar = normalizeCharacter({
          id: _generateLocalId(),
          name: character.name.trim(),
          nickname: (character.nickname || '').trim(),
          remark: (character.remark || '').trim(),
          avatar: character.avatar || '',
          contentCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        chars.push(newChar);
        _writeLocal('characters', chars);
        return Promise.resolve(newChar);
      }

      var self = this;
      return _query('characters').select('id', { count: 'exact', head: true }).then(function(r) {
        if (r.count >= _maxCharacters) throw new Error('最多添加' + _maxCharacters + '个人物');

        return _query('characters').insert({
          user_id: _userId,
          name: character.name.trim(),
          nickname: (character.nickname || '').trim(),
          remark: (character.remark || '').trim(),
          avatar: character.avatar || '',
          content_count: 0
        }).select().single();
      }).then(function(r) {
        if (r.error) throw new Error(r.error.message);
        return normalizeCharacter(r.data);
      });
    },

    updateCharacter: function(id, data) {
      if (!id) return Promise.reject(new Error('人物ID不能为空'));

      if (!_supabase) {
        var chars = _readLocal('characters') || [];
        var idx = -1;
        for (var i = 0; i < chars.length; i++) {
          if (chars[i].id === id) { idx = i; break; }
        }
        if (idx === -1) return Promise.reject(new Error('人物不存在'));

        var existing = chars[idx];
        var merged = {
          name: data.name !== undefined ? data.name.trim() : existing.name,
          nickname: data.nickname !== undefined ? data.nickname.trim() : existing.nickname || '',
          remark: data.remark !== undefined ? data.remark.trim() : existing.remark || '',
          avatar: data.avatar !== undefined ? data.avatar : existing.avatar || ''
        };
        var v = validateCharacter(merged);
        if (!v.valid) return Promise.reject(new Error(v.errors[0]));

        for (var k in merged) { chars[idx][k] = merged[k]; }
        chars[idx].updatedAt = Date.now();
        _writeLocal('characters', chars);
        return Promise.resolve(normalizeCharacter(chars[idx]));
      }

      var self = this;
      return this.getCharacterById(id).then(function(existing) {
        if (!existing) throw new Error('人物不存在');

        var merged = {
          name: data.name !== undefined ? data.name.trim() : existing.name,
          nickname: data.nickname !== undefined ? data.nickname.trim() : existing.nickname,
          remark: data.remark !== undefined ? data.remark.trim() : existing.remark,
          avatar: data.avatar !== undefined ? data.avatar : existing.avatar
        };

        var v = validateCharacter(merged);
        if (!v.valid) throw new Error(v.errors[0]);

        return _query('characters').update(merged).eq('id', id).select().single();
      }).then(function(r) {
        if (r.error) throw new Error(r.error.message);
        return normalizeCharacter(r.data);
      });
    },

    deleteCharacter: function(id) {
      if (!id) return Promise.resolve(false);

      if (!_supabase) {
        var chars = _readLocal('characters') || [];
        var newChars = chars.filter(function(c) { return c.id !== id; });
        _writeLocal('characters', newChars);

        var contents = _readLocal('contents') || [];
        var newContents = contents.filter(function(c) { return c.characterId !== id; });
        _writeLocal('contents', newContents);

        return Promise.resolve(true);
      }

      return _query('contents').delete().eq('character_id', id).then(function() {
        return _query('characters').delete().eq('id', id);
      }).then(function(r) {
        return !r.error;
      });
    },

    getContents: function(characterId) {
      if (!_supabase) {
        var contents = _readLocal('contents') || [];
        if (characterId) {
          contents = contents.filter(function(c) { return c.characterId === characterId; });
        }
        return Promise.resolve(contents.map(normalizeContent).sort(function(a, b) {
          return b.createdAt - a.createdAt;
        }));
      }

      var query = _query('contents').select('*').order('created_at', { ascending: false });
      if (characterId) query = query.eq('character_id', characterId);
      return query.then(function(r) {
        if (r.error) throw new Error(r.error.message);
        return (r.data || []).map(normalizeContent);
      });
    },

    getContentById: function(id) {
      if (!id) return Promise.resolve(null);

      if (!_supabase) {
        var contents = _readLocal('contents') || [];
        var found = contents.filter(function(c) { return c.id === id; });
        return Promise.resolve(found.length > 0 ? normalizeContent(found[0]) : null);
      }

      return _query('contents').select('*').eq('id', id).single().then(function(r) {
        return r.data ? normalizeContent(r.data) : null;
      });
    },

    addContent: function(content) {
      var v = validateContent(content);
      if (!v.valid) return Promise.reject(new Error(v.errors[0]));

      if ((content.images || []).length > _maxImages) {
        return Promise.reject(new Error('最多上传' + _maxImages + '张图片'));
      }

      if (!_supabase) {
        var contents = _readLocal('contents') || [];
        if (contents.length >= _maxContents) return Promise.reject(new Error('最多记录' + _maxContents + '条语录'));

        var newContent = normalizeContent({
          id: _generateLocalId(),
          characterId: content.characterId,
          text: (content.text || '').trim(),
          images: content.images || [],
          tags: content.tags || [],
          isFavorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        contents.push(newContent);
        _writeLocal('contents', contents);

        var chars = _readLocal('characters') || [];
        for (var i = 0; i < chars.length; i++) {
          if (chars[i].id === content.characterId) {
            chars[i].contentCount = (chars[i].contentCount || 0) + 1;
            break;
          }
        }
        _writeLocal('characters', chars);

        return Promise.resolve(newContent);
      }

      return _query('contents').select('id', { count: 'exact', head: true }).then(function(r) {
        if (r.count >= _maxContents) throw new Error('最多记录' + _maxContents + '条语录');

        return _query('contents').insert({
          user_id: _userId,
          character_id: content.characterId,
          text: (content.text || '').trim(),
          images: content.images || [],
          tags: content.tags || [],
          is_favorite: false
        }).select().single();
      }).then(function(r) {
        if (r.error) throw new Error(r.error.message);
        return normalizeContent(r.data);
      });
    },

    updateContent: function(id, data) {
      if (!id) return Promise.reject(new Error('内容ID不能为空'));

      if (!_supabase) {
        var contents = _readLocal('contents') || [];
        var idx = -1;
        for (var i = 0; i < contents.length; i++) {
          if (contents[i].id === id) { idx = i; break; }
        }
        if (idx === -1) return Promise.reject(new Error('内容不存在'));

        if (data.text !== undefined) contents[idx].text = data.text.trim();
        if (data.images !== undefined) contents[idx].images = data.images;
        if (data.tags !== undefined) contents[idx].tags = data.tags;
        if (data.isFavorite !== undefined) contents[idx].isFavorite = data.isFavorite;
        contents[idx].updatedAt = Date.now();
        _writeLocal('contents', contents);

        return Promise.resolve(normalizeContent(contents[idx]));
      }

      var self = this;
      return this.getContentById(id).then(function(existing) {
        if (!existing) throw new Error('内容不存在');

        var updates = {};
        if (data.text !== undefined) updates.text = data.text.trim();
        if (data.images !== undefined) updates.images = data.images;
        if (data.tags !== undefined) updates.tags = data.tags;
        if (data.isFavorite !== undefined) updates.is_favorite = data.isFavorite;

        return _query('contents').update(updates).eq('id', id).select().single();
      }).then(function(r) {
        if (r.error) throw new Error(r.error.message);
        return normalizeContent(r.data);
      });
    },

    deleteContent: function(id) {
      if (!id) return Promise.resolve(false);

      if (!_supabase) {
        var contents = _readLocal('contents') || [];
        _writeLocal('contents', contents.filter(function(c) { return c.id !== id; }));
        return Promise.resolve(true);
      }

      return _query('contents').delete().eq('id', id).then(function(r) {
        return !r.error;
      });
    },

    toggleFavorite: function(id) {
      var self = this;
      return this.getContentById(id).then(function(content) {
        if (!content) throw new Error('内容不存在');
        return self.updateContent(id, { isFavorite: !content.isFavorite });
      });
    },

    getFavorites: function() {
      if (!_supabase) {
        var contents = _readLocal('contents') || [];
        return Promise.resolve(contents.filter(function(c) { return c.isFavorite; }).map(normalizeContent));
      }

      return _query('contents').select('*').eq('is_favorite', true).order('updated_at', { ascending: false }).then(function(r) {
        if (r.error) throw new Error(r.error.message);
        return (r.data || []).map(normalizeContent);
      });
    },

    getTags: function() {
      if (!_supabase) {
        var contents = _readLocal('contents') || [];
        var allTags = [];
        var seen = {};
        contents.forEach(function(row) {
          (row.tags || []).forEach(function(t) {
            if (!seen[t]) { seen[t] = true; allTags.push(t); }
          });
        });
        return Promise.resolve(allTags);
      }

      return _query('contents').select('tags').then(function(r) {
        if (r.error) return [];
        var allTags = [];
        var seen = {};
        (r.data || []).forEach(function(row) {
          (row.tags || []).forEach(function(t) {
            if (!seen[t]) { seen[t] = true; allTags.push(t); }
          });
        });
        return allTags;
      });
    },

    savePassword: function(passwordHash, salt) {
      if (!passwordHash || !salt) return Promise.reject(new Error('密码数据无效'));

      if (!_supabase) {
        _writeLocal('password_hash', passwordHash);
        _writeLocal('password_salt', salt);
        localStorage.setItem('jys_password_updated_at', new Date().toISOString());
        return Promise.resolve(true);
      }

      return _query('app_settings').select('user_id').single().then(function(r) {
        if (r.data) {
          return _query('app_settings').update({
            password_hash: passwordHash,
            password_salt: salt,
            password_updated_at: new Date().toISOString()
          }).eq('user_id', _userId);
        } else {
          return _query('app_settings').insert({
            user_id: _userId,
            password_hash: passwordHash,
            password_salt: salt
          });
        }
      }).then(function(r) {
        if (r.error) throw new Error(r.error.message);
        return true;
      });
    },

    getLoginState: function() {
      if (!_supabase) {
        return Promise.resolve({ attempts: 0, lockUntil: null });
      }

      return _query('app_settings').select('login_attempts,lock_until').single().then(function(r) {
        if (r.error || !r.data) return { attempts: 0, lockUntil: null };
        return { attempts: r.data.login_attempts || 0, lockUntil: r.data.lock_until };
      });
    },

    updateLoginState: function(attempts, lockUntil) {
      if (!_supabase) return Promise.resolve(true);

      var data = { login_attempts: attempts };
      if (lockUntil !== undefined) data.lock_until = lockUntil;

      return _query('app_settings').select('user_id').single().then(function(r) {
        if (r.data) {
          return _query('app_settings').update(data).eq('user_id', _userId);
        } else {
          data.user_id = _userId;
          data.password_hash = '';
          data.password_salt = '';
          return _query('app_settings').insert(data);
        }
      }).then(function(r) {
        return !r.error;
      });
    },

    exportAllData: function() {
      var self = this;
      return Promise.all([
        self.getCharacters(),
        self.getContents(),
        self.getTags()
      ]).then(function(results) {
        return JSON.stringify({
          exportTime: new Date().toISOString(),
          version: '2.0.0',
          appName: '集英社',
          backend: isAsync() ? 'supabase' : 'localStorage',
          characters: results[0],
          contents: results[1],
          tags: results[2]
        });
      });
    },

    importData: function(jsonStr) {
      if (!jsonStr || typeof jsonStr !== 'string') return Promise.reject(new Error('数据格式无效'));

      var data;
      try { data = JSON.parse(jsonStr); } catch (e) { return Promise.reject(new Error('无法解析数据')); }

      if (!data || (!data.characters && !data.contents)) {
        return Promise.reject(new Error('数据格式不正确'));
      }

      var self = this;
      var charMap = {};

      function importNextChar(i) {
        if (i >= (data.characters || []).length) return importNextContent(0);
        var c = data.characters[i];
        return self.addCharacter({
          name: c.name || '',
          nickname: c.nickname || '',
          remark: c.remark || '',
          avatar: c.avatar || ''
        }).then(function(newChar) {
          charMap[c.id] = newChar.id;
          return importNextChar(i + 1);
        }).catch(function() {
          return importNextChar(i + 1);
        });
      }

      function importNextContent(i) {
        if (i >= (data.contents || []).length) return Promise.resolve(true);
        var c = data.contents[i];
        var charId = charMap[c.characterId] || c.character_id || c.characterId;
        if (!charId) return importNextContent(i + 1);

        return self.addContent({
          characterId: charId,
          text: c.text || '',
          images: c.images || [],
          tags: c.tags || []
        }).then(function() {
          return importNextContent(i + 1);
        }).catch(function() {
          return importNextContent(i + 1);
        });
      }

      return importNextChar(0).then(function() { return true; });
    },

    clearAllData: function() {
      if (!_supabase) {
        _writeLocal('characters', []);
        _writeLocal('contents', []);
        return Promise.resolve(true);
      }

      return _query('contents').delete().neq('id', '00000000-0000-0000-0000-000000000000').then(function() {
        return _query('characters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }).then(function(r) {
        return !r.error;
      });
    },

    getStats: function() {
      if (!_supabase) {
        var chars = _readLocal('characters') || [];
        var contents = _readLocal('contents') || [];
        var favs = contents.filter(function(c) { return c.isFavorite; });
        return Promise.resolve({
          characterCount: chars.length,
          contentCount: contents.length,
          favoriteCount: favs.length,
          tagCount: 0
        });
      }

      return Promise.all([
        _query('characters').select('id', { count: 'exact', head: true }),
        _query('contents').select('id', { count: 'exact', head: true }),
        _query('contents').select('id', { count: 'exact', head: true }).eq('is_favorite', true)
      ]).then(function(results) {
        return {
          characterCount: results[0].count || 0,
          contentCount: results[1].count || 0,
          favoriteCount: results[2].count || 0,
          tagCount: 0
        };
      });
    },

    logActivity: function(action, details) {
      if (!_supabase) {
        return Promise.resolve();
      }

      return _query('activity_log').insert({
        user_id: _userId,
        action: action,
        details: details || {},
        user_agent: navigator.userAgent || ''
      }).then(function() {});
    }
  };
})();