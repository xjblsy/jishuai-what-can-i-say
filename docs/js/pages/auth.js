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
  var mode = App.globalData.backendMode;
  if (mode === 'supabase') {
    return renderSupabaseAuth(App, S, C, U);
  }
  return renderLocalAuth(App, S, C, U);
};
function renderSupabaseAuth(App, S, C, U) {
  var isRegister = false;
  var errorMsg = '';
  var isLocked = false;
  var lockEndTime = 0;
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
  var INP_STYLE = 'width:100%;height:52px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:14px;padding:0 18px;font-size:16px;color:#fff;outline:none;box-sizing:border-box;caret-color:#fff;cursor:text;user-select:text;-webkit-user-select:text;position:relative;z-index:100';
  function buildForm() {
    var btnText = isRegister ? '注册账户' : '登录';
    var switchText = isRegister ? '已有账户？去登录' : '没有账户？去注册';
    var titleText = isRegister ? '创建账户' : '欢迎回来';
    return {
      html:
        '<div class="auth-page">' +
        '<div class="auth-bg-decoration">' +
        '<div class="auth-orb auth-orb-1"></div>' +
        '<div class="auth-orb auth-orb-2"></div>' +
        '<div class="auth-orb auth-orb-3"></div>' +
        '</div>' +
        '<div class="auth-header">' +
        '<div class="auth-logo"><span class="logo-icon">英</span></div>' +
        '<div class="auth-title">集英社</div>' +
        '<div class="auth-subtitle">' + U.escapeHtml(titleText) + '</div>' +
        '</div>' +
        '<div class="auth-form">' +
        '<div class="input-group" id="usernameGroup">' +
        '<label class="input-label">用户名</label>' +
        '<input id="authUsername" type="text" style="' + INP_STYLE + '" placeholder="' + (isRegister ? '设置您的用户名' : '输入用户名') + '" autocomplete="username" tabindex="1" />' +
        (isRegister ? '<div class="input-hint">用于登录，可包含字母、数字、下划线</div>' : '') +
        '</div>' +
        '<div class="input-group" id="pwdGroup">' +
        '<label class="input-label">密码</label>' +
        '<input id="authPassword" type="password" style="' + INP_STYLE + '" placeholder="' + (isRegister ? '设置登录密码' : '输入密码') + '" maxlength="128" autocomplete="current-password" tabindex="2" />' +
        '</div>' +
        (isRegister ? '<div class="input-group" id="pwdStrengthGroup">' +
        '<div class="password-strength-info">' +
        '<div class="strength-bar" id="strengthBar"></div>' +
        '<span class="strength-label" id="strengthLabel"></span>' +
        '</div>' +
        '</div>' : '') +
        (isRegister ? '<div class="input-group" id="confirmGroup">' +
        '<label class="input-label">确认密码</label>' +
        '<input id="authConfirm" type="password" style="' + INP_STYLE + '" placeholder="再次输入密码" maxlength="128" autocomplete="new-password" tabindex="3" />' +
        '</div>' : '') +
        '<div class="auth-btn' + (isLocked ? ' disabled' : '') + '" id="authBtn">' + (isLocked ? '账户已锁定' : btnText) + '</div>' +
        '<div class="auth-error" id="authError"' + (errorMsg ? '' : ' style="display:none"') + '>' +
        (errorMsg ? '<span class="error-icon">⚠️</span>' + U.escapeHtml(errorMsg) : '') +
        '</div>' +
        '<div class="auth-switch" id="authSwitch">' + U.escapeHtml(switchText) + '</div>' +
        '</div>' +
        '<div class="auth-footer"><span>集英社 v2.1 · 安全加密传输</span></div>' +
        '</div>',
      onRender: function() {
        if (isLocked) return;
        var usernameInput = document.getElementById('authUsername');
        var pwdInput = document.getElementById('authPassword');
        var authBtn = document.getElementById('authBtn');
        var authError = document.getElementById('authError');
        var authSwitch = document.getElementById('authSwitch');
        if (usernameInput) {
          usernameInput.addEventListener('focus', function() { this.style.borderColor = 'rgba(233,69,96,0.6)'; this.style.background = 'rgba(255,255,255,0.15)'; this.style.boxShadow = '0 0 0 4px rgba(233,69,96,0.1)'; });
          usernameInput.addEventListener('blur', function() { this.style.borderColor = ''; this.style.background = ''; this.style.boxShadow = ''; });
        }
        if (pwdInput) {
          pwdInput.addEventListener('focus', function() { this.style.borderColor = 'rgba(233,69,96,0.6)'; this.style.background = 'rgba(255,255,255,0.15)'; this.style.boxShadow = '0 0 0 4px rgba(233,69,96,0.1)'; });
          pwdInput.addEventListener('blur', function() { this.style.borderColor = ''; this.style.background = ''; this.style.boxShadow = ''; });
        }
        var confirmInput = document.getElementById('authConfirm');
        if (confirmInput) {
          confirmInput.addEventListener('focus', function() { this.style.borderColor = 'rgba(233,69,96,0.6)'; this.style.background = 'rgba(255,255,255,0.15)'; this.style.boxShadow = '0 0 0 4px rgba(233,69,96,0.1)'; });
          confirmInput.addEventListener('blur', function() { this.style.borderColor = ''; this.style.background = ''; this.style.boxShadow = ''; });
        }
        if (isRegister && usernameInput) {
          usernameInput.addEventListener('input', function() {
            validateUsername(usernameInput.value);
          });
        }
        if (isRegister && pwdInput) {
          pwdInput.addEventListener('input', function() {
            updateStrength(pwdInput.value);
          });
        }
        authBtn.addEventListener('click', function() { doAction(); });
        if (usernameInput) {
          usernameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') pwdInput.focus();
          });
        }
        pwdInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') doAction();
        });
        authSwitch.addEventListener('click', function() {
          isRegister = !isRegister;
          JYS.Pages.auth();
        });
        function validateUsername(username) {
          var group = document.getElementById('usernameGroup');
          if (!group) return;
          var hint = group.querySelector('.input-hint');
          if (!hint) return;
          if (username.length === 0) {
            hint.textContent = '用于登录，可包含字母、数字、下划线';
            hint.style.color = 'rgba(255,255,255,0.4)';
            return;
          }
          if (username.length < 3) {
            hint.textContent = '用户名至少3个字符';
            hint.style.color = '#ff6b6b';
            return;
          }
          if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            hint.textContent = '仅支持字母、数字和下划线';
            hint.style.color = '#ff6b6b';
            return;
          }
          hint.textContent = '✓ 用户名可用';
          hint.style.color = '#4caf50';
        }
        function doAction() {
          if (isLocked) return;
          if (isRegister) {
            var username = (document.getElementById('authUsername').value || '').trim();
            var password = (document.getElementById('authPassword').value || '');
            var confirm = (document.getElementById('authConfirm').value || '');
            if (!username) { showError('请输入用户名'); return; }
            if (username.length < 3) { showError('用户名至少3个字符'); return; }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) { showError('用户名仅支持字母、数字和下划线'); return; }
            if (!password) { showError('请输入密码'); return; }
            if (password !== confirm) { showError('两次输入的密码不一致'); return; }
            if (password.length < 6) { showError('密码至少6位'); return; }
            authBtn.classList.add('disabled');
            authBtn.textContent = '创建中...';
            var defaultEmail = username + '@jishuai.local';
            App.registerWithSupabase(defaultEmail, password, username).then(function(result) {
              clearLockState();
              U.showToast('账户创建成功', 'success');
              setTimeout(function() { App.navigateTo('/home'); }, 400);
            }).catch(function(e) {
              authBtn.classList.remove('disabled');
              authBtn.textContent = '注册账户';
              handleFailed(e);
            });
          } else {
            var username = (document.getElementById('authUsername').value || '').trim();
            var password = (document.getElementById('authPassword').value || '');
            if (!username) { showError('请输入用户名'); return; }
            if (!password) { showError('请输入密码'); return; }
            authBtn.classList.add('disabled');
            authBtn.textContent = '登录中...';
            App.loginWithSupabase(username, password).then(function(result) {
              clearLockState();
              U.showToast('登录成功', 'success');
              setTimeout(function() { App.navigateTo('/home'); }, 400);
            }).catch(function(e) {
              authBtn.classList.remove('disabled');
              authBtn.textContent = '登录';
              handleFailed(e);
            });
          }
        }
      }
    };
  }
  function showError(msg) {
    var el = document.getElementById('authError');
    if (el) {
      el.style.display = 'block';
      el.innerHTML = '<span class="error-icon">⚠️</span>' + U.escapeHtml(msg);
    }
  }
  function handleFailed(e) {
    showError(e.message || '操作失败，请重试');
    var stored;
    try { stored = parseInt(localStorage.getItem('jys_auth_attempts') || '0'); } catch (ex) { stored = 0; }
    stored++;
    try { localStorage.setItem('jys_auth_attempts', stored); } catch (ex) {}
    if (stored >= 5) {
      var lockEnd = Date.now() + 30 * 60 * 1000;
      try { localStorage.setItem('jys_auth_lock_end', lockEnd); } catch (ex) {}
      JYS.Pages.auth();
    }
    if (navigator.vibrate) navigator.vibrate(100);
  }
  function clearLockState() {
    try {
      localStorage.removeItem('jys_auth_attempts');
      localStorage.removeItem('jys_auth_lock_end');
    } catch (e) {}
  }
  function updateStrength(pwd) {
    var bar = document.getElementById('strengthBar');
    var label = document.getElementById('strengthLabel');
    if (!bar || !label) return;
    var result = C.getPasswordStrengthLabel(pwd);
    var score = result.score;
    var maxScore = 6;
    var percent = Math.min(100, (score / maxScore) * 100);
    bar.style.width = percent + '%';
    bar.style.backgroundColor = result.color;
    label.textContent = result.label;
    label.style.color = result.color;
  }
  var form = buildForm();
  return form;
}
function renderLocalAuth(App, S, C, U) {
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
  var hasAccount = false;
  var storedHash = '';
  var storedSalt = '';
  var storedUsername = '';
  try {
    storedHash = localStorage.getItem('jys_password_hash');
    storedSalt = localStorage.getItem('jys_password_salt');
    storedUsername = localStorage.getItem('jys_username') || '';
    hasAccount = !!(storedHash && storedSalt);
  } catch (e) {}
  var isRegister = !hasAccount;
  var titleText = hasAccount ? '欢迎回来' : '创建账户';
  var btnText = hasAccount ? '登录' : '创建账户';
  var INP_STYLE = 'width:100%;height:52px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:14px;padding:0 18px;font-size:16px;color:#fff;outline:none;box-sizing:border-box;caret-color:#fff;cursor:text;user-select:text;-webkit-user-select:text;position:relative;z-index:100';
  return {
    html:
      '<div class="auth-page">' +
      '<div class="auth-bg-decoration">' +
      '<div class="auth-orb auth-orb-1"></div>' +
      '<div class="auth-orb auth-orb-2"></div>' +
      '<div class="auth-orb auth-orb-3"></div>' +
      '</div>' +
      '<div class="auth-header">' +
      '<div class="auth-logo"><span class="logo-icon">英</span></div>' +
      '<div class="auth-title">集英社</div>' +
      '<div class="auth-subtitle">' + U.escapeHtml(titleText) + '</div>' +
      '</div>' +
      '<div class="auth-form">' +
      '<div class="input-group">' +
      '<label class="input-label">用户名</label>' +
      '<input id="authUsername" type="text" style="' + INP_STYLE + '" placeholder="' + (hasAccount ? '输入用户名' : '设置用户名') + '" autocomplete="username" tabindex="1" />' +
      '</div>' +
      '<div class="input-group">' +
      '<label class="input-label">密码</label>' +
      '<input id="authPassword" type="password" style="' + INP_STYLE + '" placeholder="' + (hasAccount ? '输入密码' : '设置密码（默认：jishuai@91）') + '" maxlength="128" autocomplete="current-password" tabindex="2" />' +
      '</div>' +
      (!hasAccount ? '<div class="input-group" id="pwdStrengthGroup">' +
      '<div class="password-strength-info">' +
      '<div class="strength-bar" id="strengthBar"></div>' +
      '<span class="strength-label" id="strengthLabel"></span>' +
      '</div>' +
      '</div>' +
      '<div class="input-group">' +
      '<label class="input-label">确认密码</label>' +
      '<input id="authConfirm" type="password" style="' + INP_STYLE + '" placeholder="再次输入密码" maxlength="128" autocomplete="new-password" tabindex="3" />' +
      '</div>' : '') +
      '<div class="auth-btn' + (locked ? ' disabled' : '') + '" id="authBtn">' + (locked ? '账户已锁定' : btnText) + '</div>' +
      '<div class="auth-error" id="authError"' + (errorMsg ? '' : ' style="display:none"') + '>' +
      (errorMsg ? '<span class="error-icon">⚠️</span>' + U.escapeHtml(errorMsg) : '') +
      '</div>' +
      '<div class="attempt-hint" id="attemptHint"' + (remainingAttempts >= MAX_ATTEMPTS || locked ? ' style="display:none"' : '') + '>' +
      '剩余尝试次数: ' + remainingAttempts + ' 次' +
      '</div>' +
      '</div>' +
      '<div class="auth-footer"><span>集英社 v2.1 · 本地加密存储</span></div>',
    onRender: function() {
      if (locked) return;
      var usernameInput = document.getElementById('authUsername');
      var pwdInput = document.getElementById('authPassword');
      var authBtn = document.getElementById('authBtn');
      var authError = document.getElementById('authError');
      var attemptHint = document.getElementById('attemptHint');
      if (usernameInput) {
        usernameInput.addEventListener('focus', function() { this.style.borderColor = 'rgba(233,69,96,0.6)'; this.style.background = 'rgba(255,255,255,0.15)'; this.style.boxShadow = '0 0 0 4px rgba(233,69,96,0.1)'; });
        usernameInput.addEventListener('blur', function() { this.style.borderColor = ''; this.style.background = ''; this.style.boxShadow = ''; });
      }
      if (pwdInput) {
        pwdInput.addEventListener('focus', function() { this.style.borderColor = 'rgba(233,69,96,0.6)'; this.style.background = 'rgba(255,255,255,0.15)'; this.style.boxShadow = '0 0 0 4px rgba(233,69,96,0.1)'; });
        pwdInput.addEventListener('blur', function() { this.style.borderColor = ''; this.style.background = ''; this.style.boxShadow = ''; });
      }
      var confirmInput = document.getElementById('authConfirm');
      if (confirmInput) {
        confirmInput.addEventListener('focus', function() { this.style.borderColor = 'rgba(233,69,96,0.6)'; this.style.background = 'rgba(255,255,255,0.15)'; this.style.boxShadow = '0 0 0 4px rgba(233,69,96,0.1)'; });
        confirmInput.addEventListener('blur', function() { this.style.borderColor = ''; this.style.background = ''; this.style.boxShadow = ''; });
      }
      if (!hasAccount && pwdInput) {
        pwdInput.addEventListener('input', function() { updateStrength(pwdInput.value); });
      }
      authBtn.addEventListener('click', function() { doAction(); });
      if (usernameInput) {
        usernameInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') pwdInput.focus();
        });
      }
      pwdInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doAction();
      });
      function updateStrength(pwd) {
        var bar = document.getElementById('strengthBar');
        var label = document.getElementById('strengthLabel');
        if (!bar || !label) return;
        var result = C.getPasswordStrengthLabel(pwd);
        var score = result.score;
        var maxScore = 6;
        var percent = Math.min(100, (score / maxScore) * 100);
        bar.style.width = percent + '%';
        bar.style.backgroundColor = result.color;
        label.textContent = result.label;
        label.style.color = result.color;
      }
      function doAction() {
        if (locked) return;
        var username = (usernameInput.value || '').trim();
        var password = (pwdInput.value || '');
        if (!username) { showError('请输入用户名'); return; }
        if (!password) { showError('请输入密码'); return; }
        if (hasAccount) {
          var hash = C.hashPassword(password, storedSalt);
          if (hash === storedHash) {
            clearLockState();
            U.showToast('登录成功', 'success');
            App.setAuth(username);
            App.navigateTo('/home');
          } else {
            remainingAttempts--;
            try { localStorage.setItem('jys_auth_attempts', remainingAttempts); } catch (ex) {}
            if (attemptHint) {
              if (remainingAttempts <= 0) {
                var lockEnd = Date.now() + LOCK_DURATION;
                try { localStorage.setItem('jys_auth_lock_end', lockEnd); } catch (ex) {}
                U.showToast('账户已锁定30分钟', 'warn');
                JYS.Pages.auth();
              } else {
                attemptHint.style.display = 'block';
                attemptHint.textContent = '剩余尝试次数: ' + remainingAttempts + ' 次';
                showError('密码错误');
              }
            }
            if (navigator.vibrate) navigator.vibrate(100);
          }
        } else {
          var confirm = (document.getElementById('authConfirm').value || '');
          if (password !== confirm) { showError('两次输入的密码不一致'); return; }
          if (password.length < 6) { showError('密码至少6位'); return; }
          authBtn.classList.add('disabled');
          authBtn.textContent = '创建中...';
          var salt = C.generateSalt();
          var hash = C.hashPassword(password, salt);
          try {
            localStorage.setItem('jys_password_hash', hash);
            localStorage.setItem('jys_password_salt', salt);
            localStorage.setItem('jys_username', username);
            localStorage.removeItem('jys_auth_attempts');
            localStorage.removeItem('jys_auth_lock_end');
          } catch (e) {}
          U.showToast('账户创建成功', 'success');
          App.setAuth(username);
          App.navigateTo('/home');
        }
      }
      function showError(msg) {
        if (authError) {
          authError.style.display = 'block';
          authError.innerHTML = '<span class="error-icon">⚠️</span>' + U.escapeHtml(msg);
        }
      }
      function clearLockState() {
        try {
          localStorage.removeItem('jys_auth_attempts');
          localStorage.removeItem('jys_auth_lock_end');
        } catch (e) {}
        remainingAttempts = MAX_ATTEMPTS;
        if (attemptHint) attemptHint.style.display = 'none';
      }
    }
  };
}
