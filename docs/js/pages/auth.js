var JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};

JYS.Pages.auth = function(params) {
  var App = JYS.App;
  var S = JYS.Storage;
  var C = JYS.Crypto;
  var U = JYS.Util;

  if (App.checkAuth()) {
    setTimeout(function() { App.navigateTo('/home'); }, 50);
    return { html: '' };
  }

  return renderAuth(App, S, C, U);
};

var UNIFIED_PASSWORD = 'jishuai@91';

function renderAuth(App, S, C, U) {
  var MAX_ATTEMPTS = 5;
  var LOCK_DURATION = 30 * 60 * 1000;
  var isLocked = false;
  var lockEndTime = 0;
  var errorMsg = '';
  var isLocal = App.globalData.backendMode !== 'supabase';
  var hasLocalAccount = false;
  var localHash = '';
  var localSalt = '';
  var localUsername = '';

  try {
    lockEndTime = parseInt(localStorage.getItem('jys_auth_lock_end') || '0');
    if (lockEndTime && Date.now() < lockEndTime) {
      isLocked = true;
      var remaining = Math.ceil((lockEndTime - Date.now()) / 60000);
      errorMsg = '账户已锁定，请 ' + remaining + ' 分钟后重试';
    } else if (lockEndTime && Date.now() >= lockEndTime) {
      try { localStorage.removeItem('jys_auth_lock_end'); } catch (ex) {}
      try { localStorage.removeItem('jys_auth_attempts'); } catch (ex) {}
    }
  } catch (e) {}

  if (isLocal) {
    try {
      localHash = localStorage.getItem('jys_password_hash');
      localSalt = localStorage.getItem('jys_password_salt');
      localUsername = localStorage.getItem('jys_username') || '';
      hasLocalAccount = !!(localHash && localSalt);
    } catch (e) {}
  }

  var INP_STYLE = 'width:100%!important;height:50px!important;padding:0 16px!important;font-size:16px!important;color:#333!important;border:1px solid #dcdcdc!important;border-radius:4px!important;outline:none!important;background:#fff!important;box-sizing:border-box!important;text-align:center!important';

  return {
    html:
      '<div class="auth-page">' +
      '<div class="auth-card">' +
      '<div class="auth-system-title">集英社</div>' +
      '<div class="auth-tab-heading">账号登录</div>' +
      '<div class="auth-form">' +
      '<input id="authUsername" type="text" style="' + INP_STYLE + '" placeholder="请输入用户名" autocomplete="username" tabindex="1" />' +
      '<input id="authPassword" type="password" style="' + INP_STYLE + '" placeholder="请输入密码" maxlength="128" autocomplete="current-password" tabindex="2" />' +
      '<button class="auth-btn' + (isLocked ? ' disabled' : '') + '" id="authBtn">' + (isLocked ? '账户已锁定' : '登 录') + '</button>' +
      '<div class="auth-error" id="authError"' + (errorMsg ? '' : ' style="display:none"') + '>' +
      (errorMsg ? '<span class="error-icon">!</span>' + U.escapeHtml(errorMsg) : '') +
      '</div>' +
      (isLocal && !hasLocalAccount ? '<div class="auth-hint" id="authHint">首次使用将自动创建账户</div>' : '') +
      '</div>' +
      '<div class="auth-footer"><span>集英社 v2.1 · 安全加密传输</span></div>' +
      '</div>' +
      '</div>',

    onRender: function() {
      if (isLocked) return;

      var usernameInput = document.getElementById('authUsername');
      var pwdInput = document.getElementById('authPassword');
      var authBtn = document.getElementById('authBtn');
      var authError = document.getElementById('authError');

      if (isLocal && hasLocalAccount && usernameInput) {
        usernameInput.value = localUsername || '';
      }

      if (usernameInput) {
        usernameInput.addEventListener('focus', function() {
          this.style.borderColor = '#144893';
          this.style.boxShadow = '0 0 0 3px rgba(20,72,147,0.1)';
        });
        usernameInput.addEventListener('blur', function() {
          this.style.borderColor = '';
          this.style.boxShadow = '';
        });
        usernameInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { pwdInput.focus(); }
        });
      }

      if (pwdInput) {
        pwdInput.addEventListener('focus', function() {
          this.style.borderColor = '#144893';
          this.style.boxShadow = '0 0 0 3px rgba(20,72,147,0.1)';
        });
        pwdInput.addEventListener('blur', function() {
          this.style.borderColor = '';
          this.style.boxShadow = '';
        });
        pwdInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { doLogin(); }
        });
      }

      authBtn.addEventListener('click', doLogin);

      function doLogin() {
        var username = (usernameInput.value || '').trim();
        var password = (pwdInput.value || '');

        if (!username) {
          showError('请输入用户名');
          usernameInput.focus();
          return;
        }
        if (username.length < 3) {
          showError('用户名至少3个字符');
          return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          showError('用户名仅支持字母、数字和下划线');
          return;
        }
        if (!password) {
          showError('请输入密码');
          return;
        }

        setBtnLoading(true);

        if (isLocal) {
          handleLocalLogin(username, password);
        } else {
          handleSupabaseLogin(username, password);
        }
      }

      function handleSupabaseLogin(username, password) {
        App.loginWithSupabase(username, password).then(function(result) {
          clearLockState();
          U.showToast('登录成功', 'success');
          setTimeout(function() { App.navigateTo('/home'); }, 400);
        }).catch(function(e) {
          setBtnLoading(false);
          handleFailed(e);
        });
      }

      function handleLocalLogin(username, password) {
        if (!hasLocalAccount) {
          var salt = C.generateSalt();
          C.hashPassword(password, salt).then(function(hash) {
            try {
              localStorage.setItem('jys_username', username);
              localStorage.setItem('jys_password_hash', hash);
              localStorage.setItem('jys_password_salt', salt);
              localStorage.setItem('jys_password_updated_at', new Date().toISOString());
              App.setAuth(App.SESSION_DURATION_MINUTES, username, username);
              U.showToast('账户创建成功', 'success');
              setTimeout(function() { App.navigateTo('/home'); }, 400);
            } catch (e) {
              showError('存储失败');
              setBtnLoading(false);
            }
          }).catch(function() {
            showError('密码加密失败');
            setBtnLoading(false);
          });
          return;
        }

        C.verifyPassword(password, localHash, localSalt).then(function(match) {
          if (match) {
            clearAttempts();
            App.setAuth(App.SESSION_DURATION_MINUTES, localUsername, localUsername);
            U.showToast('登录成功', 'success');
            setTimeout(function() { App.navigateTo('/home'); }, 400);
            if (C.isPasswordExpired(localStorage.getItem('jys_password_updated_at'))) {
              setTimeout(function() { U.showToast('密码已过期，建议及时更新', 'warn'); }, 1000);
            }
          } else {
            handleLocalFailed();
          }
        }).catch(function() {
          handleLocalFailed();
        });
      }

      function setBtnLoading(loading) {
        if (loading) {
          authBtn.classList.add('disabled');
          authBtn.textContent = '登录中...';
        } else {
          authBtn.classList.remove('disabled');
          authBtn.textContent = '登 录';
        }
      }

      function showError(msg) {
        authError.style.display = 'block';
        authError.innerHTML = '<span class="error-icon">!</span>' + U.escapeHtml(msg);
      }

      function handleFailed(e) {
        showError(e.message || '操作失败，请重试');
        var stored;
        try { stored = parseInt(localStorage.getItem('jys_auth_attempts') || '0'); } catch (ex) { stored = 0; }
        stored++;
        try { localStorage.setItem('jys_auth_attempts', stored); } catch (ex) {}
        if (stored >= MAX_ATTEMPTS) {
          var lockEnd = Date.now() + LOCK_DURATION;
          try { localStorage.setItem('jys_auth_lock_end', lockEnd); } catch (ex) {}
          JYS.Pages.auth();
        }
        if (navigator.vibrate) navigator.vibrate(100);
      }

      function handleLocalFailed() {
        setBtnLoading(false);
        var remainingAttempts;
        try { remainingAttempts = parseInt(localStorage.getItem('jys_auth_attempts') || '0'); } catch (e) { remainingAttempts = 0; }
        remainingAttempts = Math.max(0, remainingAttempts - 1);
        try { localStorage.setItem('jys_auth_attempts', remainingAttempts); } catch (e) {}
        pwdInput.value = '';
        if (remainingAttempts <= 0) {
          var lockEnd = Date.now() + LOCK_DURATION;
          try { localStorage.setItem('jys_auth_lock_end', lockEnd); } catch (ex) {}
          JYS.Pages.auth();
        } else {
          var msg = remainingAttempts <= 2 ? '密码错误！仅剩 ' + remainingAttempts + ' 次' : '密码错误，请重试';
          showError(msg);
        }
        if (navigator.vibrate) navigator.vibrate(100);
      }

      function clearLockState() {
        try { localStorage.removeItem('jys_auth_attempts'); localStorage.removeItem('jys_auth_lock_end'); } catch (e) {}
      }

      function clearAttempts() {
        try { localStorage.removeItem('jys_auth_attempts'); localStorage.removeItem('jys_auth_lock_end'); } catch (e) {}
      }
    }
  };
}