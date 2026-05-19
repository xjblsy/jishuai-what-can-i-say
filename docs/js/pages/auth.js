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
        '<input class="auth-input" id="authUsername" type="text" placeholder="' + (isRegister ? '设置您的用户名' : '输入用户名') + '" autocomplete="username" />' +
        (isRegister ? '<div class="input-hint">用于登录，可包含字母、数字、下划线</div>' : '') +
        '</div>' +
        '<div class="input-group" id="pwdGroup">' +
        '<label class="input-label">密码</label>' +
        '<input class="auth-input" id="authPassword" type="password" placeholder="' + (isRegister ? '设置登录密码' : '输入密码') + '" maxlength="128" autocomplete="current-password" />' +
        '</div>' +
        (isRegister ? '<div class="input-group" id="pwdStrengthGroup">' +
        '<div class="password-strength-info">' +
        '<div class="strength-bar" id="strengthBar"></div>' +
        '<span class="strength-label" id="strengthLabel"></span>' +
        '</div>' +
        '</div>' : '') +
        (isRegister ? '<div class="input-group" id="confirmGroup">' +
        '<label class="input-label">确认密码</label>' +
        '<input class="auth-input" id="authConfirm" type="password" placeholder="再次输入密码" maxlength="128" autocomplete="new-password" />' +
        '</div>' : '') +
        '<div class="auth-btn' + (isLocked ? ' disabled' : '') + '" id="authBtn">' + (isLocked ? '账户已锁定' : btnText) + '</div>' +
        '<div class="auth-error" id="authError"' + (errorMsg ? '' : ' style="display:none"') + '>' +
        (errorMsg ? '<span class="error-icon">⚠️</span>' + U.escapeHtml(errorMsg) : '') +
        '</div>' +
        '<div class="auth-switch" id="authSwitch">' + U.escapeHtml(switchText) + '</div>' +
        '</div>' +
        '<div class="auth-footer"><span>集英社 v3.0 · 安全加密传输</span></div>' +
        '</div>',

      onRender: function() {
        if (isLocked) return;

        var usernameInput = document.getElementById('authUsername');
        var pwdInput = document.getElementById('authPassword');
        var authBtn = document.getElementById('authBtn');
        var authError = document.getElementById('authError');
        var authSwitch = document.getElementById('authSwitch');

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

            if (!username) {
              showError('请输入用户名');
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
            if (password !== confirm) {
              showError('两次输入的密码不一致');
              return;
            }
            if (password.length < 6) {
              showError('密码至少6位');
              return;
            }

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

            if (!username) {
              showError('请输入用户名');
              return;
            }
            if (!password) {
              showError('请输入密码');
              return;
            }

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
      '<input class="auth-input' + (hasAccount ? ' single' : '') + '" id="authUsername" type="text" placeholder="' + (hasAccount ? '输入用户名' : '设置用户名') + '" autocomplete="username" />' +
      '</div>' +
      '<div class="input-group">' +
      '<label class="input-label">密码</label>' +
      '<input class="auth-input' + (hasAccount ? ' single' : '') + '" id="authPassword" type="password" placeholder="' + (hasAccount ? '输入密码' : '设置密码（默认：jishuai@91）') + '" maxlength="128" autocomplete="current-password" />' +
      '</div>' +
      (!hasAccount ? '<div class="input-group" id="pwdStrengthGroup">' +
      '<div class="password-strength-info">' +
      '<div class="strength-bar" id="strengthBar"></div>' +
      '<span class="strength-label" id="strengthLabel"></span>' +
      '</div>' +
      '</div>' +
      '<div class="input-group">' +
      '<label class="input-label">确认密码</label>' +
      '<input class="auth-input" id="authConfirm" type="password" placeholder="再次输入密码" maxlength="128" autocomplete="new-password" />' +
      '</div>' : '') +
      '<div class="auth-btn' + (locked ? ' disabled' : '') + '" id="authBtn">' + (locked ? '账户已锁定' : btnText) + '</div>' +
      '<div class="auth-error" id="authError"' + (errorMsg ? '' : ' style="display:none"') + '>' +
      (errorMsg ? '<span class="error-icon">⚠️</span>' + U.escapeHtml(errorMsg) : '') +
      '</div>' +
      '<div class="attempt-hint" id="attemptHint"' + (remainingAttempts >= MAX_ATTEMPTS || locked ? ' style="display:none"' : '') + '>' +
      '剩余尝试次数: ' + remainingAttempts + ' 次' +
      '</div>' +
      '</div>' +
      '<div class="auth-footer"><span>集英社 v3.0 · 本地加密存储</span></div>',

    onRender: function() {
      if (locked) return;

      var usernameInput = document.getElementById('authUsername');
      var pwdInput = document.getElementById('authPassword');
      var authBtn = document.getElementById('authBtn');
      var authError = document.getElementById('authError');
      var attemptHint = document.getElementById('attemptHint');

      if (hasAccount) {
        usernameInput.value = storedUsername || '';
      }

      if (!hasAccount && pwdInput) {
        pwdInput.addEventListener('input', function() {
          updateStrength(pwdInput.value);
        });
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

      function doAction() {
        if (locked) return;

        var username = usernameInput.value.trim();
        var password = pwdInput.value;

        if (!username) {
          showErr('请输入用户名');
          return;
        }
        if (username.length < 3) {
          showErr('用户名至少3个字符');
          return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          showErr('用户名仅支持字母、数字和下划线');
          return;
        }
        if (!password) {
          showErr('请输入密码');
          return;
        }

        authBtn.classList.add('disabled');
        authBtn.textContent = '处理中...';

        if (!hasAccount) {
          var confirm = (document.getElementById('authConfirm') || {value: ''}).value;
          if (password !== confirm) {
            showErr('两次输入的密码不一致');
            authBtn.classList.remove('disabled');
            authBtn.textContent = '创建账户';
            return;
          }

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
              showErr('存储失败');
              authBtn.classList.remove('disabled');
              authBtn.textContent = '创建账户';
            }
          }).catch(function(e) {
            showErr('密码加密失败');
            authBtn.classList.remove('disabled');
            authBtn.textContent = '创建账户';
          });

        } else {
          C.verifyPassword(password, storedHash, storedSalt).then(function(match) {
            if (match) {
              clearAttempts();
              App.setAuth(App.SESSION_DURATION_MINUTES, storedUsername, storedUsername);
              U.showToast('登录成功', 'success');
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
      }

      function handleFailed() {
        remainingAttempts = Math.max(0, remainingAttempts - 1);
        try { localStorage.setItem('jys_auth_attempts', remainingAttempts); } catch (e) {}

        pwdInput.value = '';
        authBtn.classList.remove('disabled');
        authBtn.textContent = '登录';

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
          var msg = remainingAttempts <= 2 ? '密码错误！仅剩 ' + remainingAttempts + ' 次' : '密码错误，请重试';
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

      usernameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') pwdInput.focus();
      });

      pwdInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          if (!hasAccount) {
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
