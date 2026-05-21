var JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};
JYS.Pages.auth = function(params) {
  var App = JYS.App;
  var U = JYS.Util;
  if (App.checkAuth()) {
    setTimeout(function() { App.navigateTo('/home'); }, 50);
    return { html: '' };
  }
  return renderSimpleAuth(App, U);
};
function renderSimpleAuth(App, U) {
  var DEFAULT_PASSWORD = 'jishuai@91';
  var MAX_ATTEMPTS = 5;
  var LOCK_DURATION = 30 * 60 * 1000;
  var remainingAttempts = MAX_ATTEMPTS;
  var locked = false;
  var lockEnd = 0;
  try {
    var storedAttempts = localStorage.getItem('jys_auth_attempts');
    if (storedAttempts !== null) remainingAttempts = parseInt(storedAttempts);
    lockEnd = parseInt(localStorage.getItem('jys_auth_lock_end') || '0');
    locked = Date.now() < lockEnd;
  } catch (e) {}
  var errorMsg = '';
  if (locked) {
    var remainMin = Math.ceil((lockEnd - Date.now()) / 60000);
    errorMsg = '账户已锁定，请 ' + remainMin + ' 分钟后重试';
  }
  return {
    html:
      '<div class="auth-page">' +
      '<div class="auth-bg-decoration">' +
      '<div class="auth-orb auth-orb-1"></div>' +
      '<div class="auth-orb auth-orb-2"></div>' +
      '<div class="auth-orb auth-orb-3"></div>' +
      '</div>' +
      '<div class="auth-card">' +
      '<div class="auth-system-title">集英社</div>' +
      '<div class="auth-tab-heading">请输入访问密码</div>' +
      '<div class="auth-form">' +
      '<div class="input-group">' +
      '<label class="input-label">访问密码</label>' +
      '<div class="password-input-wrapper">' +
      '<input id="authPassword" class="auth-input" type="password" placeholder="输入访问密码" maxlength="128" autocomplete="current-password" tabindex="1" />' +
      '<span class="password-toggle" id="pwdToggle">👁</span>' +
      '</div>' +
      '</div>' +
      '<div class="auth-btn' + (locked ? ' disabled' : '') + '" id="authBtn">' + (locked ? '账户已锁定' : '进入') + '</div>' +
      '<div class="auth-error" id="authError"' + (errorMsg ? '' : ' style="display:none"') + '>' +
      (errorMsg ? '<span class="error-icon">⚠️</span>' + U.escapeHtml(errorMsg) : '') +
      '</div>' +
      '<div class="attempt-hint" id="attemptHint"' + (remainingAttempts >= MAX_ATTEMPTS || locked ? ' style="display:none"' : '') + '>' +
      '剩余尝试次数: ' + remainingAttempts + ' 次' +
      '</div>' +
      '</div>' +
      '<div class="auth-footer"><span>集英社 v2.1.1 · 安全访问</span></div>' +
      '</div>' +
      '</div>',
    onRender: function() {
      if (locked) return;
      var pwdInput = document.getElementById('authPassword');
      var authBtn = document.getElementById('authBtn');
      var authError = document.getElementById('authError');
      var attemptHint = document.getElementById('attemptHint');
      var pwdToggle = document.getElementById('pwdToggle');
      if (pwdInput) {
        pwdInput.addEventListener('focus', function() { this.style.borderColor = 'rgba(20,72,147,0.6)'; this.style.background = '#f0f5ff'; });
        pwdInput.addEventListener('blur', function() { this.style.borderColor = '#ddd'; this.style.background = '#f7f7f7'; });
        setTimeout(function() { pwdInput.focus(); }, 100);
      }
      if (pwdToggle) {
        pwdToggle.addEventListener('click', function() {
          if (pwdInput.type === 'password') {
            pwdInput.type = 'text';
            pwdToggle.textContent = '🙈';
          } else {
            pwdInput.type = 'password';
            pwdToggle.textContent = '👁';
          }
        });
      }
      authBtn.addEventListener('click', function() { doAction(); });
      pwdInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doAction(); });
      function doAction() {
        if (locked) return;
        var password = (pwdInput.value || '');
        if (!password) { showError('请输入访问密码'); return; }
        if (password === DEFAULT_PASSWORD) {
          clearLockState();
          U.showToast('登录成功', 'success');
          App.setAuth();
          App.navigateTo('/home');
        } else {
          remainingAttempts--;
          try { localStorage.setItem('jys_auth_attempts', remainingAttempts); } catch (ex) {}
          if (remainingAttempts <= 0) {
            var lockEndTime = Date.now() + LOCK_DURATION;
            try { localStorage.setItem('jys_auth_lock_end', lockEndTime); } catch (ex) {}
            U.showToast('账户已锁定30分钟', 'warn');
            JYS.Pages.auth();
          } else {
            if (attemptHint) { attemptHint.style.display = 'block'; attemptHint.textContent = '剩余尝试次数: ' + remainingAttempts + ' 次'; }
            showError('密码错误');
          }
          if (navigator.vibrate) navigator.vibrate(100);
        }
      }
      function showError(msg) {
        if (authError) { authError.style.display = 'flex'; authError.innerHTML = '<span class="error-icon">⚠️</span>' + U.escapeHtml(msg); }
      }
      function clearLockState() {
        try { localStorage.removeItem('jys_auth_attempts'); localStorage.removeItem('jys_auth_lock_end'); } catch (e) {}
        remainingAttempts = MAX_ATTEMPTS;
        if (attemptHint) attemptHint.style.display = 'none';
      }
    }
  };
}
