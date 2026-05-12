var JYS = window.JYS = window.JYS || {};

JYS.App = {
  globalData: {
    isAuth: false,
    authExpireTime: 0,
    defaultPassword: '123456',
    isMobile: window.innerWidth < 768
  },

  init: function() {
    var self = this;
    this.checkScreenSize();
    window.addEventListener('resize', function() { self.checkScreenSize(); });

    try {
      var authExpire = localStorage.getItem('auth_expire');
      if (authExpire && Date.now() < parseInt(authExpire)) {
        this.globalData.isAuth = true;
        this.globalData.authExpireTime = parseInt(authExpire);
      }
    } catch (e) {}

    window.addEventListener('hashchange', function() { self.route(); });
    this.route();
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
    try {
      var authExpire = localStorage.getItem('auth_expire');
      if (authExpire && Date.now() < parseInt(authExpire)) {
        this.globalData.isAuth = true;
        this.globalData.authExpireTime = parseInt(authExpire);
        return true;
      }
    } catch (e) {}
    this.globalData.isAuth = false;
    return false;
  },

  setAuth: function(expireMinutes) {
    expireMinutes = expireMinutes || 60;
    var expireTime = Date.now() + expireMinutes * 60 * 1000;
    this.globalData.isAuth = true;
    this.globalData.authExpireTime = expireTime;
    try { localStorage.setItem('auth_expire', expireTime); } catch (e) {}
  },

  clearAuth: function() {
    this.globalData.isAuth = false;
    this.globalData.authExpireTime = 0;
    try { localStorage.removeItem('auth_expire'); } catch (e) {}
  },

  route: function() {
    var hash = window.location.hash || '#/home';
    var path = hash.replace('#', '');

    if (!this.checkAuth() && path !== '/auth') {
      window.location.hash = '#/auth';
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
      appEl.innerHTML = '<div class="error-page">页面未找到</div>';
      return;
    }

    var result = renderer(params);
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