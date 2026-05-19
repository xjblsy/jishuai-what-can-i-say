var JYS = window.JYS = window.JYS || {};

JYS.App = {
  globalData: {
    isAuth: false,
    authExpireTime: 0,
    isMobile: window.innerWidth < 768,
    backendMode: 'local',
    supabaseReady: false,
    sessionToken: null,
    userEmail: null,
    passwordUpdatedAt: null
  },

  SUPABASE_URL: 'https://wxiiojiahzvigkpwcnoz.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4aWlvamlhaHp2aWdrcHdjbm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjE1MTgsImV4cCI6MjA5NDczNzUxOH0.slmxtNQBgCOeNOOMYzhGIZJPd90ZH3pXRx4Jn-7CVa4',

  DEFAULT_PASSWORD: '',
  SESSION_DURATION_MINUTES: 1440,

  init: function() {
    var self = this;

    if (window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1') {
      console.warn('[集英社] 建议使用 HTTPS 协议以确保数据传输安全');
    }

    this.checkScreenSize();
    window.addEventListener('resize', function() { self.checkScreenSize(); });

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
        JYS.Storage.setUserId(session.user.id);

        self._supabase.auth.onAuthStateChange(function(event, changedSession) {
          if (event === 'SIGNED_OUT') {
            self.globalData.isAuth = false;
            self.globalData.sessionToken = null;
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
      }
    } catch (e) {}
  },

  _restoreLocalSessionFallback: function() {
    try {
      var token = localStorage.getItem('jys_session');
      var expire = localStorage.getItem('jys_session_expire');
      if (token && expire && Date.now() < parseInt(expire)) {
        this.globalData.isAuth = true;
        this.globalData.sessionToken = token;
        this.globalData.authExpireTime = parseInt(expire);
      }
    } catch (e) {}
  },

  checkScreenSize: function() {
    this.globalData.isMobile = window.innerWidth < 768;
    if (document.body) {
      document.body.className = this.globalData.isMobile ? 'mobile' : 'desktop';
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

  loginWithSupabase: function(email, password) {
    var self = this;
    if (!this._supabase) return Promise.reject(new Error('数据库未连接'));

    return this._supabase.auth.signInWithPassword({
      email: email,
      password: password
    }).then(function(result) {
      if (result.error) throw new Error(result.error.message);

      var session = result.data.session;
      var user = result.data.user;

      self.globalData.isAuth = true;
      self.globalData.sessionToken = session.access_token;
      self.globalData.authExpireTime = session.expires_at
        ? new Date(session.expires_at * 1000).getTime()
        : Date.now() + self.SESSION_DURATION_MINUTES * 60 * 1000;
      self.globalData.userEmail = user.email;
      JYS.Storage.setUserId(user.id);

      JYS.Storage.logActivity('login', { method: 'supabase_auth', email: user.email });

      return { user: user, session: session };
    }).catch(function(e) {
      JYS.Storage.logActivity('login_failed', { method: 'supabase_auth', email: email, error: e.message });
      throw e;
    });
  },

  registerWithSupabase: function(email, password) {
    var self = this;
    if (!this._supabase) return Promise.reject(new Error('数据库未连接'));

    return this._supabase.auth.signUp({
      email: email,
      password: password
    }).then(function(result) {
      if (result.error) throw new Error(result.error.message);

      var user = result.data.user;
      if (user) {
        JYS.Storage.setUserId(user.id);
        JYS.Storage.logActivity('register', { email: user.email });
      }

      return result;
    });
  },

  signOutFromSupabase: function() {
    if (!this._supabase) return Promise.resolve();
    var self = this;
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

    var page = this.parsePath(path);
    this.renderPage(page.name, page.params);
  },

  parsePath: function(path) {
    var parts = path.split('?');
    var name = parts[0];
    var params = {};
    if (parts[1]) {
      parts[1].split('&').forEach(function(pair) {
        var kv = pair.split('=');
        params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
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
      appEl.innerHTML = '<div class="empty-state"><div class="empty-icon">🔧</div><div class="empty-text">页面未找到</div></div>';
      return;
    }

    var result = renderer(params);

    if (result && typeof result.then === 'function') {
      appEl.innerHTML = '<div class="global-loading"><div class="loading-spinner"></div><div class="loading-text">加载中...</div></div>';
      var self = this;
      result.then(function(resolved) {
        self._renderHTML(appEl, resolved, pageName, params);
      }).catch(function(e) {
        appEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">加载失败: ' + JYS.Util.escapeHtml(e.message || '') + '</div></div>';
      });
    } else {
      this._renderHTML(appEl, result, pageName, params);
    }
  },

  _renderHTML: function(appEl, result, pageName, params) {
    appEl.innerHTML = result.html || '';
    if (result.onRender) {
      setTimeout(function() { result.onRender(params); }, 0);
    }
    if (pageName !== 'auth' && pageName !== 'home') {
      this.renderBackButton(appEl, pageName);
    }
    if (pageName === 'auth') {
      document.body.classList.add('auth-body');
    } else {
      document.body.classList.remove('auth-body');
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
    backBtn.innerHTML = '‹';
    backBtn.title = '返回';
    backBtn.onclick = function() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = '#' + backTo;
      }
    };
    appEl.insertBefore(backBtn, appEl.firstChild);
  },

  navigateTo: function(path) {
    window.location.hash = '#' + path;
  }
};

document.addEventListener('DOMContentLoaded', function() {
  JYS.App.init();
});