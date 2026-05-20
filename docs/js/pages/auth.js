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

  var INP_STYLE = 'width:100%;height:50px;padding:0 48px;font-size:15px;color:#333;border:1px solid #dcdcdc;border-radius:4px;outline:none;background:#fff;box-sizing:border-box;text-align:center;transition:border-color .3s';

  return {
    html:
      '<div class="auth-page">' +
      '<div class="auth-card">' +
      '<div class="auth-system-title">集英社</div>' +
      '<div class="auth-tab-heading">账号登录</div>' +
      '<div class="auth-form">' +
      '<div class="auth-input-wrap">' +
      '<span class="auth-input-icon">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="#999"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .66.54 1.2 1.2 1.2h16.8c.66 0 1.2-.54 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z"/></svg>' +
      '</span>' +
      '<input id="authUsername" type="text" style="' + INP_STYLE + '" placeholder="请输入用户名" autocomplete="username" tabindex="1" />' +
      '</div>' +
      '<div class="auth-input-wrap">' +
      '<span class="auth-input-icon">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="#999"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>' +
      '</span>' +
      '<input id="authPassword" type="password" style="' + INP_STYLE + '" placeholder="请输入密码" maxlength="128" autocomplete="current-password" tabindex="2" />' +
      '<button class="auth-pwd-toggle" id="pwdToggle" type="button" tabindex="-1">' +
      '<svg id="pwdEyeOff" viewBox="0 0 24 24" width="20" height="20" fill="#999"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>' +
      '<svg id="pwdEyeOn" viewBox="0 0 24 24" width="20" height="20" fill="#999" style="display:none"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>' +
      '</button>' +
      '</div>' +
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
      var pwdToggle = document.getElementById('pwdToggle');
      var eyeOff = document.getElementById('pwdEyeOff');
      var eyeOn = document.getElementById('pwdEyeOn');
      var authHint = document.getElementById('authHint');
      var isPwdVisible = false;

      if (isLocal && hasLocalAccount && usernameInput) {
        usernameInput.value = localUsername || '';
      }

      function setInputFocus(el) {
        el.style.borderColor = '#144893';
        el.style.boxShadow = '0 0 0 3px rgba(20,72,147,0.1)';
      }
      function clearInputFocus(el) {
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }

      if (usernameInput) {
        usernameInput.addEventListener('focus', function() { setInputFocus(usernameInput); });
        usernameInput.addEventListener('blur', function() { clearInputFocus(usernameInput); });
        usernameInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { pwdInput.focus(); }
        });
      }

      if (pwdInput) {
        pwdInput.addEventListener('focus', function() { setInputFocus(pwdInput); });
        pwdInput.addEventListener('blur', function() { clearInputFocus(pwdInput); });
        pwdInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { doLogin(); }
        });
      }

      if (pwdToggle) {
        pwdToggle.addEventListener('click', function(e) {
          e.preventDefault();
          isPwdVisible = !isPwdVisible;
          pwdInput.type = isPwdVisible ? 'text' : 'password';
          eyeOff.style.display = isPwdVisible ? 'none' : '';
          eyeOn.style.display = isPwdVisible ? '' : 'none';
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