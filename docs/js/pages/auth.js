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
    }
  } catch (e) {}

  function buildForm() {
    var btnText = isRegister ? '注册账户' : '登录';
    var switchText = isRegister ? '已有账户？去登录' : '没有账户？去注册';
    var titleText = isRegister ? '注册账户' : '欢迎回来';

    return {
      html:
        '<div class="auth-page">' +
        '<div class="auth-header">' +
        '<div class="auth-logo"><span class="logo-icon">英</span></div>' +
        '<div class="auth-title">集英社</div>' +
        '<div class="auth-subtitle">' + U.escapeHtml(titleText) + '</div>' +
        '</div>' +
        '<div class="auth-form">' +
        '<div class="input-group" id="emailGroup">' +
        '<label class="input-label">邮箱地址</label>' +
        '<input class="auth-input" id="authEmail" type="email" placeholder="请输入邮箱地址" autocomplete="email" />' +
        '</div>' +
        '<div class="input-group" id="pwdGroup">' +
        '<label class="input-label">密码</label>' +
        '<input class="auth-input" id="authPassword" type="password" placeholder="请输入密码" maxlength="128" autocomplete="current-password" />' +
        (isRegister ? '<div class="input-group" id="pwdStrengthGroup"><div class="password-strength"><div class="strength-bar" id="strengthBar"></div><span class="strength-label" id="strengthLabel"></span></div></div>' : '') +
        '</div>' +
        (isRegister ? '' +
        '<div class="input-group" id="confirmGroup">' +
        '<label class="input-label">确认密码</label>' +
        '<input class="auth-input" id="authConfirm" type="password" placeholder="请再次输入密码" maxlength="128" autocomplete="new-password" />' +
        '</div>' : '') +
        '<div class="auth-btn' + (isLocked ? ' disabled' : '') + '" id="authBtn">' + (isLocked ? '账户已锁定' : btnText) + '</div>' +
        '<div class="auth-error" id="authError"' + (errorMsg ? '' : ' style="display:none"') + '>' +
        (errorMsg ? '<span class="error-icon">⚠️</span>' + U.escapeHtml(errorMsg) : '') +
        '</div>' +
        '<div class="auth-switch" id="authSwitch">' + U.escapeHtml(switchText) + '</div>' +
        '</div>' +
        '<div class="auth-footer"><span>集英社 v2.0.0 · 安全加密传输</span></div>' +
        '</div>',

      onRender: function() {
        if (isLocked) return;

        var emailInput = document.getElementById('authEmail');
        var pwdInput = document.getElementById('authPassword');
        var authBtn = document.getElementById('authBtn');
        var authError = document.getElementById('authError');
        var authSwitch = document.getElementById('authSwitch');

        if (isRegister) {
          var confirmInput = document.getElementById('authConfirm');
          pwdInput.addEventListener('input', function() {
            updateStrength(pwdInput.value);
          });
        }

        authBtn.addEventListener('click', function() { doAction(); });
        pwdInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') doAction();
        });

        authSwitch.addEventListener('click', function() {
          isRegister = !isRegister;
          JYS.Pages.auth();
        });

        function doAction() {
          if (isLocked) return;
          var email = (document.getElementById('authEmail').value || '').trim();
          var password = (document.getElementById('authPassword').value || '');

          if (!email) {
            showError('请输入邮箱地址');
            return;
          }
          if (!password) {
            showError('请输入密码');
            return;
          }

          if (isRegister) {
            var strength = C.validatePasswordStrength(password);
            if (!strength.valid) {
              showError(strength.errors.join('；'));
              return;
            }
            var confirm = document.getElementById('authConfirm');
            if (confirm && password !== confirm.value) {
              showError('两次输入的密码不一致');
              return;
            }
          }

          authBtn.classList.add('disabled');
          authBtn.textContent = '处理中...';

          var promise = isRegister
            ? App.registerWithSupabase(email, password)
            : App.loginWithSupabase(email, password);

          promise.then(function(result) {
            clearLockState();
            U.showToast(isRegister ? '注册成功' : '登录成功', 'success');
            setTimeout(function() { App.navigateTo('/home'); }, 400);
          }).catch(function(e) {
            authBtn.classList.remove('disabled');
            authBtn.textContent = isRegister ? '注册账户' : '登录';
            handleFailed(e);
          });
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
    var maxScore = 5;
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
  var isSetup = params && params.setup;

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

  var hasPassword = false;
  var storedHash = '';
  var storedSalt = '';

  try {
    storedHash = localStorage.getItem('jys_password_hash');
    storedSalt = localStorage.getItem('jys_password_salt');
    hasPassword = !!(storedHash && storedSalt);
  } catch (e) {}

  var titleText = hasPassword ? '请输入密码' : '首次使用，请设置密码';
  var btnText = hasPassword ? '解锁进入' : '设置密码';

  return {
    html:
      '<div class="auth-page">' +
      '<div class="auth-header">' +
      '<div class="auth-logo"><span class="logo-icon">英</span></div>' +
      '<div class="auth-title">集英社</div>' +
      '<div class="auth-subtitle">' + U.escapeHtml(titleText) + '</div>' +
      '</div>' +
      '<div class="auth-form">' +
      '<div class="password-input-wrapper" id="pwdWrapper">' +
      '<span class="input-icon">🔒</span>' +
      '<input class="password-input" id="authPassword" type="password" placeholder="' + U.escapeHtml(titleText) + '" maxlength="128" />' +
      '</div>' +
      (hasPassword ? '' :
      '<div class="password-input-wrapper" id="confirmWrapper" style="margin-top:12px">' +
      '<span class="input-icon">🔒</span>' +
      '<input class="password-input" id="authConfirm" type="password" placeholder="请再次输入密码" maxlength="128" />' +
      '</div>') +
      '<div class="auth-btn' + (locked ? ' disabled' : '') + '" id="authBtn">' + (locked ? '账户已锁定' : btnText) + '</div>' +
      '<div class="auth-error" id="authError"' + (errorMsg ? '' : ' style="display:none"') + '>' +
      (errorMsg ? '<span class="error-icon">⚠️</span>' + U.escapeHtml(errorMsg) : '') +
      '</div>' +
      '<div class="attempt-hint" id="attemptHint"' + (remainingAttempts >= MAX_ATTEMPTS || locked ? ' style="display:none"' : '') + '>' +
      '剩余尝试次数: ' + remainingAttempts + ' 次' +
      '</div>' +
      '</div>' +
      '<div class="auth-footer"><span>集英社 v2.0.0 · 数据本地加密保护</span></div>',

    onRender: function() {
      if (locked) return;

      var pwdInput = document.getElementById('authPassword');
      var authBtn = document.getElementById('authBtn');
      var authError = document.getElementById('authError');
      var attemptHint = document.getElementById('attemptHint');
      var pwdWrapper = document.getElementById('pwdWrapper');

      pwdInput.addEventListener('focus', function() { pwdWrapper.classList.add('focused'); });
      pwdInput.addEventListener('blur', function() { pwdWrapper.classList.remove('focused'); });

      function doAction() {
        if (locked) return;

        var password = pwdInput.value;

        if (!password) {
          showErr('请输入密码');
          return;
        }

        authBtn.classList.add('disabled');
        authBtn.textContent = '处理中...';

        if (!hasPassword) {
          var confirmInput = document.getElementById('authConfirm');
          var confirm = confirmInput ? confirmInput.value : '';
          if (!confirm) {
            showErr('请再次输入密码');
            authBtn.classList.remove('disabled');
            authBtn.textContent = '设置密码';
            return;
          }
          if (password !== confirm) {
            showErr('两次输入的密码不一致');
            authBtn.classList.remove('disabled');
            authBtn.textContent = '设置密码';
            return;
          }

          var strength = C.validatePasswordStrength(password);
          if (!strength.valid) {
            showErr(strength.errors.join('；'));
            authBtn.classList.remove('disabled');
            authBtn.textContent = '设置密码';
            return;
          }

          setNewPassword(password, function() {
            U.showToast('密码设置成功', 'success');
            App.setAuth(App.SESSION_DURATION_MINUTES);
            setTimeout(function() { App.navigateTo('/home'); }, 400);
          }, function(e) {
            showErr(e.message || '设置失败');
            authBtn.classList.remove('disabled');
            authBtn.textContent = '设置密码';
          });
          return;
        }

        C.verifyPassword(password, storedHash, storedSalt).then(function(match) {
          if (match) {
            clearAttempts();
            App.setAuth(App.SESSION_DURATION_MINUTES);
            U.showToast('验证成功', 'success');
            setTimeout(function() { App.navigateTo('/home'); }, 400);

            if (C.isPasswordExpired(localStorage.getItem('jys_password_updated_at'))) {
              setTimeout(function() {
                U.showToast('密码已过期，建议及时更新', 'warn');
              }, 1000);
            }
          } else {
            handleFailed();
          }
        }).catch(function() {
          handleFailed();
        });
      }

      function setNewPassword(pwd, onSuccess, onError) {
        var salt = C.generateSalt();
        C.hashPassword(pwd, salt).then(function(hash) {
          try {
            localStorage.setItem('jys_password_hash', hash);
            localStorage.setItem('jys_password_salt', salt);
            localStorage.setItem('jys_password_updated_at', new Date().toISOString());
            onSuccess();
          } catch (e) {
            onError(e);
          }
        }).catch(function(e) {
          onError(e);
        });
      }

      function handleFailed() {
        remainingAttempts = Math.max(0, remainingAttempts - 1);
        try { localStorage.setItem('jys_auth_attempts', remainingAttempts); } catch (e) {}

        pwdInput.value = '';
        authBtn.classList.remove('disabled');
        authBtn.textContent = '解锁进入';

        if (remainingAttempts <= 0) {
          lockEnd = Date.now() + LOCK_DURATION;
          try { localStorage.setItem('jys_auth_lock_end', lockEnd); } catch (e) {}
          locked = true;
          authBtn.classList.add('disabled');
          authBtn.textContent = '账户已锁定';
          showErr('尝试次数过多，账户已锁定30分钟');
          if (attemptHint) attemptHint.style.display = 'none';

          var timer = setInterval(function() {
            if (Date.now() >= lockEnd) {
              locked = false;
              remainingAttempts = MAX_ATTEMPTS;
              try {
                localStorage.removeItem('jys_auth_attempts');
                localStorage.removeItem('jys_auth_lock_end');
              } catch (e) {}
              JYS.Pages.auth();
              clearInterval(timer);
            }
          }, 30000);
        } else {
          var msg = remainingAttempts <= 2 ? '密码错误！仅剩 ' + remainingAttempts + ' 次尝试机会' : '密码错误，请重试';
          showErr(msg);
          if (attemptHint) {
            attemptHint.style.display = 'block';
            attemptHint.textContent = '剩余尝试次数: ' + remainingAttempts + ' 次';
          }
        }
        if (navigator.vibrate) navigator.vibrate(100);
      }

      function showErr(msg) {
        authError.style.display = 'block';
        authError.innerHTML = '<span class="error-icon">⚠️</span>' + U.escapeHtml(msg);
      }

      function clearAttempts() {
        try { localStorage.removeItem('jys_auth_attempts'); } catch (e) {}
        try { localStorage.removeItem('jys_auth_lock_end'); } catch (e) {}
      }

      authBtn.addEventListener('click', doAction);
      pwdInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          if (!hasPassword) {
            var cf = document.getElementById('authConfirm');
            if (cf && cf.value) doAction();
            else if (cf) cf.focus();
            else doAction();
          } else {
            doAction();
          }
        }
      });
    }
  };
};