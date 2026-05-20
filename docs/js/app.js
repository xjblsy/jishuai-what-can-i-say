var JYS = window.JYS = window.JYS || {}; // v2.1-fix

JYS.App = {
  globalData: {
    isAuth: false,
    authExpireTime: 0,
    isMobile: window.innerWidth < 768,
    backendMode: 'local',
    supabaseReady: false,
    sessionToken: null,
    userEmail: null,
    username: null,
    passwordUpdatedAt: null
  },

  _supabase: null,
  _currentPage: null,
  _currentCleanup: null,
  _authListener: null,
  _pageCache: {},

  SUPABASE_URL: 'https://wxiiojiahzvigkpwcnoz.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4aWlvamlhaHp2aWdrcHdjbm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjE1MTgsImV4cCI6MjA5NDczNzUxOH0.slmxtNQBgCOeNOOMYzhGIZJPd90ZH3pXRx4Jn-7CVa4',

  SESSION_DURATION_MINUTES: 1440,
  MAX_RETRY_COUNT: 3,
  RETRY_DELAY_MS: 1000,

  init: function() {
    var self = this;

    window.addEventListener('error', function(e) {
      if (e.target === window || e.target === document) {
        console.error('[集英社] 未捕获错误:', e.message, e.filename, e.lineno);
      }
    });

    window.addEventListener('unhandledrejection', function(e) {
      console.error('[集英社] 未处理的Promise拒绝:', e.reason);
    });

    if (window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1') {
      console.warn('[集英社] 建议使用 HTTPS 协议以确保数据传输安全');
    }

    this.checkScreenSize();
    var debouncedResize = JYS.Util && JYS.Util.debounce && JYS.Util.debounce(function() { self.checkScreenSize(); }, 150);
    window.addEventListener('resize', debouncedResize || function() { self.checkScreenSize(); });

    this._tryInitSupabase().then(function() {
      self._restoreSession().then(function() {
        window.addEventListener('hashchange', function() { self.route(); });
        self.route();
      });
    }).catch(function() {
      self.globalData.backendMode = 'local';
      self._restoreLocalSession();
      window.addEventListener('hashchange', function() { self.route(); });
      self.route();
    });
  },

  _tryInitSupabase: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      if (!self.SUPABASE_URL || self.SUPABASE_URL.indexOf('xxxxxxxxxxxx') !== -1) {
        console.log('[集英社] 未配置 Supabase，使用本地存储模式');
        reject(new Error('未配置Supabase'));
        return;
      }

      if (typeof window.supabase === 'undefined') {
        console.log('[集英社] Supabase SDK 未加载，使用本地存储模式');
        reject(new Error('SDK未加载'));
        return;
      }

      try {
        var client = window.supabase.createClient(self.SUPABASE_URL, self.SUPABASE_ANON_KEY, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            storageKey: 'jys_supabase_auth'
          }
        });

        self._supabase = client;
        JYS.Storage.init(client);
        self.globalData.backendMode = 'supabase';
        self.globalData.supabaseReady = true;
        console.log('[集英社] Supabase 连接成功');
        resolve();
      } catch (e) {
        console.warn('[集英社] Supabase 初始化失败:', e.message);
        reject(e);
      }
    });
  },

  getSupabase: function() {
    return this._supabase || null;
  },

  _restoreSession: function() {
    var self = this;

    if (!this._supabase) {
      return Promise.resolve();
    }

    return this._supabase.auth.getSession().then(function(result) {
      var session = result.data && result.data.session;

      if (session && session.user) {
        self.globalData.isAuth = true;
        self.globalData.sessionToken = session.access_token;
        self.globalData.authExpireTime = session.expires_at
          ? new Date(session.expires_at * 1000).getTime()
          : Date.now() + self.SESSION_DURATION_MINUTES * 60 * 1000;
        self.globalData.userEmail = session.user.email || '';
        self.globalData.username = (session.user.user_metadata && session.user.user_metadata.username) || '';
        JYS.Storage.setUserId(session.user.id);

        if (self._authListener) {
          self._authListener.subscription.unsubscribe();
        }

        self._authListener = self._supabase.auth.onAuthStateChange(function(event, changedSession) {
          if (event === 'SIGNED_OUT') {
            self._cleanupCurrentPage();
            self.globalData.isAuth = false;
            self.globalData.sessionToken = null;
            self.globalData.username = null;
            window.location.hash = '#/auth';
          } else if (event === 'TOKEN_REFRESHED' && changedSession) {
            self.globalData.sessionToken = changedSession.access_token;
            self.globalData.authExpireTime = changedSession.expires_at
              ? new Date(changedSession.expires_at * 1000).getTime()
              : Date.now() + self.SESSION_DURATION_MINUTES * 60 * 1000;
          }
        });
      } else {
        self._restoreLocalSessionFallback();
      }
    }).catch(function() {
      self._restoreLocalSessionFallback();
    });
  },

  _restoreLocalSession: function() {
    try {
      var token = localStorage.getItem('jys_session');
      var expire = localStorage.getItem('jys_session_expire');
      if (token && expire && Date.now() < parseInt(expire)) {
        this.globalData.isAuth = true;
        this.globalData.sessionToken = token;
        this.globalData.authExpireTime = parseInt(expire);
      } else if (token) {
        localStorage.removeItem('jys_session');
        localStorage.removeItem('jys_session_expire');
        this.globalData.isAuth = false;
        this.globalData.sessionToken = null;
      }
    } catch (e) {}
  },

  _restoreLocalSessionFallback: function() {
    this._restoreLocalSession();
  },

  _cleanupCurrentPage: function() {
    try {
      if (typeof this._currentCleanup === 'function') {
        this._currentCleanup();
      }
      if (JYS.Pages._homeTimer) {
        clearInterval(JYS.Pages._homeTimer);
        JYS.Pages._homeTimer = null;
      }
    } catch (e) {}

    this._currentCleanup = null;
    this._currentPage = null;
  },

  _safeHTML: function(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  _sanitizeHTML: function(html) {
    if (!html) return '';
    var result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
               .replace(/onerror\s*=\s*"[^"]*"/gi, '')
               .replace(/onerror\s*=\s*'[^']*'/gi, '')
               .replace(/javascript\s*:/gi, '')
               .replace(/<embed\b[^>]*>/gi, '')
               .replace(/<object\b[^>]*>/gi, '');
    result = result.replace(/(<[^>]+)\s+style\s*=\s*"([^"]*)"/gi, function(match, tag, value) {
      var clean = value.replace(/\s*javascript\s*:\s*/gi, ' x-javascript-blocked:').replace(/expression\s*\(/gi, ' x-expression-blocked(').replace(/url\s*\(\s*["']?\s*javascript:/gi, ' url(x-javascript-blocked:');
      return tag + ' style="' + clean + '"';
    });
    return result;
  },

  checkScreenSize: function() {
    this.globalData.isMobile = window.innerWidth < 768;
    if (document.body) {
      document.body.classList.remove('mobile', 'desktop');
      document.body.classList.add(this.globalData.isMobile ? 'mobile' : 'desktop');
    }
  },

  requireAuth: function() {
    if (!this.checkAuth()) {
      window.location.hash = '#/auth';
      return false;
    }
    return true;
  },

  checkAuth: function() {
    if (this.globalData.isAuth) {
      if (this.globalData.backendMode === 'supabase') {
        if (this.globalData.sessionToken) return true;
        this.globalData.isAuth = false;
        return false;
      }

      try {
        var expire = localStorage.getItem('jys_session_expire');
        if (expire && Date.now() < parseInt(expire)) return true;
      } catch (e) {}
      this.globalData.isAuth = false;
    }
    return false;
  },

  setAuth: function(expireMinutes, userId, email) {
    expireMinutes = expireMinutes || this.SESSION_DURATION_MINUTES;
    var expireTime = Date.now() + expireMinutes * 60 * 1000;
    var token = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2);

    this.globalData.isAuth = true;
    this.globalData.authExpireTime = expireTime;
    this.globalData.sessionToken = token;
    if (email) this.globalData.userEmail = email;

    try {
      localStorage.setItem('jys_session', token);
      localStorage.setItem('jys_session_expire', expireTime);
      if (userId) {
        localStorage.setItem('jys_user_id', userId);
        JYS.Storage.setUserId(userId);
      }
      if (email) localStorage.setItem('jys_user_email', email);
    } catch (e) {}
  },

  loginWithSupabase: function(username, password) {
    var self = this;
    if (!this._supabase) return Promise.reject(new Error('数据库未连接'));

    var cleanUsername = String(username || '').trim();
    var email = cleanUsername;
    if (!cleanUsername.includes('@')) {
      email = cleanUsername + '@jishuai.local';
    }

    return this._supabase.auth.signInWithPassword({
      email: email,
      password: password
    }).then(function(result) {
      if (result.error) {
        var errMsg = result.error.message || '登录失败';
        if (result.error.message && result.error.message.indexOf('Invalid login') >= 0) {
          errMsg = '用户名或密码错误';
        }
        throw new Error(errMsg);
      }

      var session = result.data.session;
      var user = result.data.user;

      self.globalData.isAuth = true;
      self.globalData.sessionToken = session.access_token;
      self.globalData.authExpireTime = session.expires_at
        ? new Date(session.expires_at * 1000).getTime()
        : Date.now() + self.SESSION_DURATION_MINUTES * 60 * 1000;
      self.globalData.userEmail = user.email;
      self.globalData.username = (user.user_metadata && user.user_metadata.username) || cleanUsername;
      JYS.Storage.setUserId(user.id);

      JYS.Storage.logActivity('login', { method: 'supabase_auth', username: cleanUsername });

      return { user: user, session: session };
    }).catch(function(e) {
      JYS.Storage.logActivity('login_failed', { method: 'supabase_auth', username: cleanUsername, error: (e.message || '') });
      throw e;
    });
  },

  registerWithSupabase: function(email, password, username) {
    var self = this;
    if (!this._supabase) return Promise.reject(new Error('数据库未连接'));

    return this._supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { username: username }
      }
    }).then(function(result) {
      if (result.error) throw new Error(result.error.message);

      var user = result.data.user;
      var session = result.data.session;

      if (user) {
        JYS.Storage.setUserId(user.id);
        self.globalData.isAuth = true;
        self.globalData.username = username;
        self.globalData.userEmail = user.email;

        if (session) {
          self.globalData.sessionToken = session.access_token;
          self.globalData.authExpireTime = session.expires_at
            ? new Date(session.expires_at * 1000).getTime()
            : Date.now() + self.SESSION_DURATION_MINUTES * 60 * 1000;
        }

        JYS.Storage.logActivity('register', { email: user.email, username: username });
      }

      return result;
    });
  },

  signOutFromSupabase: function() {
    var self = this;
    if (!this._supabase) return Promise.resolve();
    return this._supabase.auth.signOut().then(function() {
      self.clearAuth();
    }).catch(function() {
      self.clearAuth();
    });
  },

  clearAuth: function() {
    this.globalData.isAuth = false;
    this.globalData.sessionToken = null;
    this.globalData.authExpireTime = 0;
    this.globalData.userEmail = null;
    this.globalData.username = null;
    try {
      localStorage.removeItem('jys_session');
      localStorage.removeItem('jys_session_expire');
      localStorage.removeItem('jys_user_id');
      localStorage.removeItem('jys_user_email');
    } catch (e) {}
  },

  route: function() {
    var hash = window.location.hash || '#/home';
    var path = hash.replace('#', '');

    if (!this.checkAuth() && path !== '/auth') {
      window.location.hash = '#/auth';
      return;
    }

    if (this.checkAuth() && path === '/auth') {
      window.location.hash = '#/home';
      return;
    }

    this._cleanupCurrentPage();

    var page = this.parsePath(path);
    this._currentPage = page.name;
    this.renderPage(page.name, page.params);
  },

  parsePath: function(path) {
    var parts = path.split('?');
    var name = parts[0];
    var params = {};
    if (parts[1]) {
      parts[1].split('&').forEach(function(pair) {
        var kv = pair.split('=');
        if (kv[0]) {
          params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        }
      });
    }

    var routeMap = {
      '/auth': 'auth',
      '/home': 'home',
      '/characters': 'characterList',
      '/character/detail': 'characterDetail',
      '/character/edit': 'characterEdit',
      '/contents': 'contentList',
      '/content/edit': 'contentEdit',
      '/favorites': 'favorites',
      '/search': 'search',
      '/settings': 'settings'
    };

    return { name: routeMap[name] || 'home', params: params };
  },

  renderPage: function(pageName, params) {
    var appEl = document.getElementById('app');
    if (!appEl) return;

    var renderer = JYS.Pages && JYS.Pages[pageName];
    if (!renderer) {
      appEl.innerHTML = '<div class="empty-state"><div class="empty-icon">🔧</div><div class="empty-text">页面未找到</div><div class="empty-sub">' + this._safeHTML(pageName) + '</div></div>';
      return;
    }

    var self = this;
    var result;

    try {
      result = renderer(params);
    } catch (e) {
      console.error('[集英社] 页面渲染异常:', pageName, e.message);
      appEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">页面加载异常</div><div class="empty-sub">请刷新页面后重试</div></div>';
      return;
    }

    if (result && typeof result.then === 'function') {
      appEl.innerHTML = '<div class="global-loading"><div class="loading-spinner"></div><div class="loading-text">加载中...</div></div>';
      result.then(function(resolved) {
        if (self._currentPage !== pageName) return;
        self._renderHTML(appEl, resolved, pageName, params);
      }).catch(function(e) {
        if (self._currentPage !== pageName) return;
        console.error('[集英社] 异步加载失败:', pageName, e.message);
        appEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">加载失败</div><div class="empty-sub">请检查网络后刷新重试</div><button class="empty-btn" onclick="location.reload()">刷新页面</button></div>';
      });
    } else if (result) {
      this._renderHTML(appEl, result, pageName, params);
    } else {
      appEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">无内容</div></div>';
    }
  },

  _renderHTML: function(appEl, result, pageName, params) {
    if (!result || !result.html) return;

    if (pageName === 'auth') {
      document.body.classList.add('auth-body');
    } else {
      document.body.classList.remove('auth-body');
    }

    appEl.innerHTML = this._sanitizeHTML(result.html);

    if (result.onCleanup) {
      this._currentCleanup = result.onCleanup;
    }

    if (result.onRender) {
      var self = this;
      setTimeout(function() {
        try { result.onRender(params); } catch (e) {
          console.error('[集英社] onRender 异常:', pageName, e.message);
        }
      }, 0);
    }

    if (pageName !== 'auth' && pageName !== 'home') {
      this.renderBackButton(appEl, pageName);
    }
  },

  renderBackButton: function(appEl, pageName) {
    var existingBack = appEl.querySelector('.app-back-btn');
    if (existingBack) return;

    var pagesWithBack = {
      'characterDetail': '/characters',
      'characterEdit': '/characters',
      'contentList': '/home',
      'contentEdit': '/contents',
      'search': '/home'
    };

    var backTo = pagesWithBack[pageName];
    if (!backTo) return;

    var backBtn = document.createElement('div');
    backBtn.className = 'app-back-btn';
    backBtn.innerHTML = '&lsaquo;';
    backBtn.setAttribute('title', '返回');
    backBtn.addEventListener('click', function() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = '#' + backTo;
      }
    });
    appEl.insertBefore(backBtn, appEl.firstChild);
  },

  navigateTo: function(path) {
    window.location.hash = '#' + path;
  }
};

document.addEventListener('DOMContentLoaded', function() {
  JYS.App.init();
});