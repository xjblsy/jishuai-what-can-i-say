var JYS = window.JYS = window.JYS || {};

JYS.Util = {
  debounce: function(fn, delay) {
    delay = delay || 300;
    var timer = null;
    return function() {
      var args = arguments;
      var ctx = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function() {
        timer = null;
        fn.apply(ctx, args);
      }, delay);
    };
  },

  throttle: function(fn, delay) {
    delay = delay || 300;
    var last = 0;
    var timer = null;
    return function() {
      var now = Date.now();
      var args = arguments;
      var ctx = this;
      var remaining = delay - (now - last);
      if (remaining <= 0) {
        if (timer) { clearTimeout(timer); timer = null; }
        last = now;
        fn.apply(ctx, args);
      } else if (!timer) {
        timer = setTimeout(function() {
          timer = null;
          last = Date.now();
          fn.apply(ctx, args);
        }, remaining);
      }
    };
  },

  escapeHtml: function(text) {
    if (!text && text !== 0) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  sanitizeInput: function(text) {
    if (!text) return '';
    return String(text).replace(/[<>]/g, '').trim();
  },

  truncate: function(text, maxLen, suffix) {
    maxLen = maxLen || 50;
    suffix = suffix || '...';
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - suffix.length) + suffix;
  },

  formatTimeAgo: function(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      var now = Date.now();
      var diff = now - d.getTime();
      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
      if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
      if (diff < 2592000000) return Math.floor(diff / 86400000) + ' 天前';

      var year = d.getFullYear();
      var month = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      if (year === new Date().getFullYear()) return month + '-' + day;
      return year + '-' + month + '-' + day;
    } catch (e) { return ''; }
  },

  showToast: function(msg, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    var existing = container.querySelectorAll('.toast-item');
    if (existing.length >= 3) {
      var oldest = existing[existing.length - 1];
      if (oldest && oldest.parentNode) oldest.parentNode.removeChild(oldest);
    }

    var icons = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };
    var el = document.createElement('div');
    el.className = 'toast-item toast-' + type;
    el.innerHTML = '<span class="toast-icon">' + (icons[type] || '') + '</span><span>' + JYS.Util.escapeHtml(msg) + '</span>';
    container.appendChild(el);

    setTimeout(function() { el.classList.add('toast-enter'); }, 10);

    setTimeout(function() {
      el.classList.add('toast-leave');
      setTimeout(function() {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
    }, 2500);
  },

  showConfirm: function(title, message, confirmText, cancelText) {
    return new Promise(function(resolve, reject) {
      try {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML =
          '<div class="modal-content confirm-modal">' +
          '<div class="modal-title">' + JYS.Util.escapeHtml(title) + '</div>' +
          '<div class="modal-body">' + JYS.Util.escapeHtml(message) + '</div>' +
          '<div class="modal-buttons">' +
          '<button class="modal-btn cancel">' + JYS.Util.escapeHtml(cancelText || '取消') + '</button>' +
          '<button class="modal-btn confirm">' + JYS.Util.escapeHtml(confirmText || '确定') + '</button>' +
          '</div></div>';

        var container = document.getElementById('modal-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'modal-container';
          document.body.appendChild(container);
        }

        var dismiss = function() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        };

        overlay.addEventListener('click', function(e) {
          if (e.target === overlay) {
            dismiss();
            reject(new Error('cancelled'));
          }
        });

        overlay.querySelector('.modal-btn.cancel').addEventListener('click', function() {
          dismiss();
          reject(new Error('cancelled'));
        });

        overlay.querySelector('.modal-btn.confirm').addEventListener('click', function() {
          dismiss();
          resolve();
        });

        container.appendChild(overlay);
      } catch (e) { reject(e); }
    });
  },

  copyToClipboard: function(text) {
    if (!text) return Promise.reject(new Error('无内容'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function() {
        return JYS.Util._fallbackCopy(text);
      });
    }
    return JYS.Util._fallbackCopy(text);
  },

  _fallbackCopy: function(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve();
    } catch (e) {
      document.body.removeChild(ta);
      return Promise.reject(new Error('复制失败'));
    }
  },

  lazyLoadImages: function(containerSelector) {
    var container = containerSelector
      ? document.querySelector(containerSelector)
      : document;

    if (!container) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var img = entry.target;
            var src = img.getAttribute('data-src');
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '50px' });

      container.querySelectorAll('img[data-src]').forEach(function(img) {
        observer.observe(img);
      });

      return observer;
    } else {
      container.querySelectorAll('img[data-src]').forEach(function(img) {
        var src = img.getAttribute('data-src');
        if (src) { img.src = src; img.removeAttribute('data-src'); }
      });
      return null;
    }
  },

  waitForElement: function(selector, timeout) {
    timeout = timeout || 5000;
    var start = Date.now();
    return new Promise(function(resolve, reject) {
      function check() {
        var el = document.querySelector(selector);
        if (el) { resolve(el); return; }
        if (Date.now() - start > timeout) {
          reject(new Error('元素未找到: ' + selector));
          return;
        }
        setTimeout(check, 50);
      }
      check();
    });
  }
};