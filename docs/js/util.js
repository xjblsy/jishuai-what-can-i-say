const JYS = window.JYS = window.JYS || {};

JYS.Util = {
  formatTime: function(timestamp) {
    var now = Date.now();
    var diff = now - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

    var date = new Date(timestamp);
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var hour = String(date.getHours()).padStart(2, '0');
    var minute = String(date.getMinutes()).padStart(2, '0');
    if (year === new Date().getFullYear()) return month + '-' + day + ' ' + hour + ':' + minute;
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  },

  showToast: function(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast');
    if (!container) return;
    var icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || '') + '</span><span>' + JYS.Util.escapeHtml(message) + '</span>';
    container.appendChild(toast);
    setTimeout(function() {
      toast.classList.add('toast-show');
      setTimeout(function() {
        toast.classList.remove('toast-show');
        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
      }, 2000);
    }, 10);
  },

  showLoading: function(message) {
    JYS.Util.hideLoading();
    var el = document.createElement('div');
    el.className = 'global-loading';
    el.id = 'global-loading';
    el.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">' + JYS.Util.escapeHtml(message || '加载中...') + '</div>';
    document.body.appendChild(el);
  },

  hideLoading: function() {
    var el = document.getElementById('global-loading');
    if (el) el.parentNode.removeChild(el);
  },

  showConfirm: function(title, content, confirmText, cancelText) {
    return new Promise(function(resolve, reject) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML =
        '<div class="modal-content confirm-modal">' +
        '<div class="modal-title">' + JYS.Util.escapeHtml(title) + '</div>' +
        '<div class="modal-body">' + JYS.Util.escapeHtml(content).replace(/\n/g, '<br>') + '</div>' +
        '<div class="modal-buttons">' +
        '<button class="modal-btn cancel">' + (cancelText || '取消') + '</button>' +
        '<button class="modal-btn confirm">' + (confirmText || '确定') + '</button>' +
        '</div></div>';
      document.getElementById('modal-container').appendChild(overlay);

      overlay.querySelector('.modal-btn.cancel').onclick = function() {
        overlay.parentNode.removeChild(overlay);
        reject(false);
      };
      overlay.querySelector('.modal-btn.confirm').onclick = function() {
        overlay.parentNode.removeChild(overlay);
        resolve(true);
      };
    });
  },

  debounce: function(fn, delay) {
    delay = delay || 300;
    var timer = null;
    return function() {
      var ctx = this, args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(ctx, args); timer = null; }, delay);
    };
  },

  escapeHtml: function(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  getDefaultTags: function() {
    return ['经典语录', '搞笑段子', '人生感悟', '哲理名言', '日常吐槽', '金句', '毒鸡汤', '正能量', '骚话', '冷笑话', '辩论', '其他'];
  }
};