const JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};

JYS.Pages.auth = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;
  var MAX_ATTEMPTS = 5;
  var LOCK_DURATION = 30 * 60 * 1000;

  var remainingAttempts = MAX_ATTEMPTS;
  var stored = localStorage.getItem('auth_attempts');
  if (stored) remainingAttempts = parseInt(stored);

  var lockEnd = localStorage.getItem('auth_lock_end');
  var locked = lockEnd && Date.now() < parseInt(lockEnd);

  if (JYS.App.checkAuth()) {
    setTimeout(function() { JYS.App.navigateTo('/home'); }, 50);
    return { html: '' };
  }

  var errorMsg = '';
  if (locked) {
    var remaining = Math.ceil((parseInt(lockEnd) - Date.now()) / 60000);
    errorMsg = '账户已锁定，请 ' + remaining + ' 分钟后重试';
  }

  return {
    html:
      '<div class="auth-page">' +
      '<div class="auth-header">' +
      '<div class="auth-logo"><span class="logo-icon">英</span></div>' +
      '<div class="auth-title">集英社</div>' +
      '<div class="auth-subtitle">记录每一个精彩瞬间</div>' +
      '</div>' +
      '<div class="auth-form">' +
      '<div class="password-input-wrapper" id="pwdWrapper">' +
      '<span class="input-icon">🔒</span>' +
      '<input class="password-input" id="authPassword" type="password" placeholder="请输入访问密码" maxlength="20" />' +
      '</div>' +
      '<div class="auth-btn' + (locked ? ' disabled' : '') + '" id="authBtn">' + (locked ? '账户已锁定' : '进入小程序') + '</div>' +
      '<div class="auth-error" id="authError"' + (errorMsg ? '' : ' style="display:none"') + '>' +
      (errorMsg ? '<span class="error-icon">⚠️</span>' + U.escapeHtml(errorMsg) : '') +
      '</div>' +
      '<div class="attempt-hint" id="attemptHint"' + (remainingAttempts >= 5 || locked ? ' style="display:none"' : '') + '>' +
      '剩余尝试次数: ' + remainingAttempts + ' 次' +
      '</div>' +
      '</div>' +
      '<div class="auth-footer"><span>集英社 v1.0.0 · 隐私保护</span></div>',

    onRender: function() {
      var pwdInput = document.getElementById('authPassword');
      var authBtn = document.getElementById('authBtn');
      var authError = document.getElementById('authError');
      var attemptHint = document.getElementById('attemptHint');
      var pwdWrapper = document.getElementById('pwdWrapper');

      if (locked) return;

      pwdInput.addEventListener('focus', function() { pwdWrapper.classList.add('focused'); });
      pwdInput.addEventListener('blur', function() { pwdWrapper.classList.remove('focused'); });

      function doLogin() {
        if (locked) return;
        var password = pwdInput.value.trim();
        if (!password) {
          authError.style.display = 'block';
          authError.innerHTML = '<span class="error-icon">⚠️</span>请输入访问密码';
          return;
        }

        authBtn.classList.add('disabled');
        authBtn.textContent = '验证中...';

        setTimeout(function() {
          var storedPassword = S.getPassword() || JYS.App.globalData.defaultPassword;
          if (password === storedPassword) {
            localStorage.removeItem('auth_attempts');
            localStorage.removeItem('auth_lock_end');
            JYS.App.setAuth(60);
            U.showToast('验证成功', 'success');
            setTimeout(function() { JYS.App.navigateTo('/home'); }, 400);
          } else {
            handleFailed();
          }
        }, 300);
      }

      function handleFailed() {
        remainingAttempts--;
        if (remainingAttempts < 0) remainingAttempts = 0;
        localStorage.setItem('auth_attempts', remainingAttempts);
        pwdInput.value = '';
        authBtn.classList.remove('disabled');
        authBtn.textContent = '进入小程序';

        if (remainingAttempts <= 0) {
          var lockEndTime = Date.now() + LOCK_DURATION;
          localStorage.setItem('auth_lock_end', lockEndTime);
          locked = true;
          authBtn.classList.add('disabled');
          authBtn.textContent = '账户已锁定';
          authError.style.display = 'block';
          authError.innerHTML = '<span class="error-icon">⚠️</span>尝试次数过多，账户已锁定30分钟';
          attemptHint.style.display = 'none';

          var timer = setInterval(function() {
            if (Date.now() >= lockEndTime) {
              locked = false;
              remainingAttempts = MAX_ATTEMPTS;
              localStorage.removeItem('auth_lock_end');
              localStorage.removeItem('auth_attempts');
              authBtn.classList.remove('disabled');
              authBtn.textContent = '进入小程序';
              authError.style.display = 'none';
              attemptHint.style.display = 'none';
              clearInterval(timer);
            } else {
              var min = Math.ceil((lockEndTime - Date.now()) / 60000);
              authError.innerHTML = '<span class="error-icon">⚠️</span>账户已锁定，请 ' + min + ' 分钟后重试';
            }
          }, 30000);
        } else {
          var msg = remainingAttempts <= 2 ? '密码错误！仅剩 ' + remainingAttempts + ' 次尝试机会' : '密码错误，请重试';
          authError.style.display = 'block';
          authError.innerHTML = '<span class="error-icon">⚠️</span>' + msg;
          if (remainingAttempts < 5) {
            attemptHint.style.display = 'block';
            attemptHint.textContent = '剩余尝试次数: ' + remainingAttempts + ' 次';
          }
        }
        if (navigator.vibrate) navigator.vibrate(100);
      }

      authBtn.addEventListener('click', doLogin);
      pwdInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
    }
  };
};