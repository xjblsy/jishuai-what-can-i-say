var JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};

JYS.Pages.settings = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;
  var C = JYS.Crypto;
  var App = JYS.App;
  var mode = App.globalData.backendMode;

  if (mode === 'supabase') {
    return renderSettingsSupabase(S, U, C, App);
  }

  return renderSettingsLocal(S, U, C, App);
};

function getLocalStorageSize() {
  var total = 0;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('jys_') === 0) {
        total += (localStorage.getItem(key) || '').length;
      }
    }
  } catch (e) {}
  if (total < 1024) return total + 'B';
  if (total < 1048576) return (total / 1024).toFixed(1) + 'KB';
  return (total / 1048576).toFixed(1) + 'MB';
}

function renderSettingsSupabase(S, U, C, App) {
  return Promise.all([
    S.getCharacters().catch(function() { return []; }),
    S.getContents().catch(function() { return []; }),
    S.getFavorites().catch(function() { return []; }),
    S.getStats().catch(function() { return { characterCount: 0, contentCount: 0, favoriteCount: 0, tagCount: 0 }; })
  ]).then(function(results) {
    var characters = results[0];
    var contents = results[1];
    var favorites = results[2];
    var stats = results[3];

    return {
      html: buildSettingsHTML({
        characters: characters,
        contents: contents,
        favorites: favorites,
        stats: stats,
        storageSize: '--',
        isSupabase: true,
        userEmail: App.globalData.userEmail || ''
      }, U, C, App),

      onRender: function() {
        initCommonHandlers(S, U, C, App);
      }
    };
  });
}

function renderSettingsLocal(S, U, C, App) {
  var characters = [];
  var contents = [];
  var favorites = [];
  var storageSize = getLocalStorageSize();

  try {
    var raw = localStorage.getItem('jys_characters');
    if (raw) characters = JSON.parse(raw);
  } catch (e) {}

  try {
    var raw2 = localStorage.getItem('jys_contents');
    if (raw2) contents = JSON.parse(raw2);
  } catch (e) {}

  try {
    favorites = contents.filter(function(c) { return c.isFavorite; });
  } catch (e) {}

  return {
    html: buildSettingsHTML({
      characters: characters,
      contents: contents,
      favorites: favorites,
      stats: {
        characterCount: characters.length,
        contentCount: contents.length,
        favoriteCount: favorites.length,
        tagCount: 0
      },
      storageSize: storageSize,
      isSupabase: false,
      userEmail: ''
    }, U, C, App),

    onRender: function() {
      initCommonHandlers(S, U, C, App);
    }
  };
}

function buildSettingsHTML(data, U, C, App) {
  var chars = data.characters || [];
  var contents = data.contents || [];
  var favs = data.favorites || [];
  var stats = data.stats || { characterCount: 0, contentCount: 0, favoriteCount: 0, tagCount: 0 };

  var passwordAgeHtml = '';
  try {
    var pwdUpdated = localStorage.getItem('jys_password_updated_at');
    if (pwdUpdated && C.isPasswordExpired(pwdUpdated)) {
      var ageDays = C.getPasswordAgeDays(pwdUpdated);
      passwordAgeHtml = '<div class="setting-warn">⚠️ 密码已使用 ' + ageDays + ' 天，建议更新</div>';
    } else if (pwdUpdated) {
      var remainDays = C.getPasswordExpireDays(pwdUpdated);
      if (remainDays <= 14) {
        passwordAgeHtml = '<div class="setting-warn">🔔 密码将在 ' + remainDays + ' 天后过期</div>';
      }
    }
  } catch (e) {}

  var backendBadge = data.isSupabase
    ? '<span class="backend-badge cloud">☁️ Supabase 云存储</span>'
    : '<span class="backend-badge local">💾 本地存储</span>';

  var emailRow = data.isSupabase && data.userEmail
    ? '<div class="info-item"><span class="info-num">' + U.escapeHtml(data.userEmail) + '</span><span class="info-label">账户</span></div>'
    : '';

  return '<div class="settings-page">' +
    '<div class="storage-info">' +
    '<div class="info-item"><span class="info-num">' + stats.characterCount + '</span><span class="info-label">人物</span></div>' +
    '<div class="info-item"><span class="info-num">' + stats.contentCount + '</span><span class="info-label">语录</span></div>' +
    '<div class="info-item"><span class="info-num">' + stats.favoriteCount + '</span><span class="info-label">收藏</span></div>' +
    '<div class="info-item"><span class="info-num">' + U.escapeHtml(data.storageSize) + '</span><span class="info-label">存储</span></div>' +
    emailRow +
    '</div>' +
    backendBadge +
    passwordAgeHtml +
    '<div class="settings-section">' +
    '<span class="section-header">安全设置</span>' +
    (data.isSupabase ?
      '<div class="settings-item" id="changePasswordSupabase">' +
      '<div class="item-left"><div class="item-icon red">🔑</div><div class="item-title">修改账户密码</div></div>' +
      '<span class="item-arrow">›</span></div>' :
      '<div class="settings-item" id="changePassword">' +
      '<div class="item-left"><div class="item-icon red">🔑</div><div class="item-title">修改访问密码</div></div>' +
      '<span class="item-arrow">›</span></div>') +
    '<div class="settings-item" id="lockNow">' +
    '<div class="item-left"><div class="item-icon red">🔒</div><div class="item-title">立即锁定</div></div>' +
    '<span class="item-arrow">›</span></div>' +
    '</div>' +
    '<div class="settings-section">' +
    '<span class="section-header">数据管理</span>' +
    '<div class="settings-item" id="exportData">' +
    '<div class="item-left"><div class="item-icon blue">📤</div>' +
    '<div><div class="item-title">导出数据</div><div class="item-desc">导出所有数据为文本格式</div></div></div>' +
    '<span class="item-arrow">›</span></div>' +
    '<div class="settings-item" id="importData">' +
    '<div class="item-left"><div class="item-icon green">📥</div>' +
    '<div><div class="item-title">导入数据</div><div class="item-desc">从剪贴板导入备份数据</div></div></div>' +
    '<span class="item-arrow">›</span></div>' +
    '<div class="settings-item" id="clearCache">' +
    '<div class="item-left"><div class="item-icon orange">🗑️</div>' +
    '<div><div class="item-title">清理缓存</div><div class="item-desc">清理本地缓存数据</div></div></div>' +
    '<span class="item-arrow">›</span></div>' +
    '</div>' +
    '<div class="settings-section">' +
    '<span class="section-header">其他</span>' +
    '<div class="settings-item" id="aboutApp">' +
    '<div class="item-left"><div class="item-icon blue">ℹ️</div><div class="item-title">关于集英社</div></div>' +
    '<span class="item-value">v2.0.0</span><span class="item-arrow">›</span></div>' +
    '</div>' +
    '<button class="logout-btn" id="logout">退出登录</button>' +
    '<div class="version-info"><span>集英社 v2.0.0 · 专注记录精彩瞬间</span></div>' +
    '</div>';
}

function initCommonHandlers(S, U, C, App) {
  var mode = App.globalData.backendMode;

  if (mode === 'supabase') {
    var changePwdBtn = document.getElementById('changePasswordSupabase');
    if (changePwdBtn) {
      changePwdBtn.addEventListener('click', function() {
        U.showConfirm('修改密码', '将通过邮件发送密码重置链接到您的注册邮箱。', '发送重置邮件', '取消').then(function() {
          var supabase = App.getSupabase();
          if (!supabase) {
            U.showToast('数据库未连接', 'error');
            return;
          }
          supabase.auth.resetPasswordForEmail(App.globalData.userEmail).then(function(r) {
            if (r.error) {
              U.showToast('发送失败: ' + r.error.message, 'error');
            } else {
              U.showToast('密码重置邮件已发送，请查收', 'success');
            }
          }).catch(function() {
            U.showToast('发送失败，请检查邮箱地址', 'error');
          });
        }).catch(function() {});
      });
    }
  } else {
    var changePwdBtn = document.getElementById('changePassword');
    if (changePwdBtn) {
      changePwdBtn.addEventListener('click', function() {
        showPasswordModalLocal(S, U, C, App);
      });
    }
  }

  var lockBtn = document.getElementById('lockNow');
  if (lockBtn) {
    lockBtn.addEventListener('click', function() {
      if (mode === 'supabase') {
        App.signOutFromSupabase().then(function() {
          U.showToast('已退出登录', 'success');
          setTimeout(function() { App.navigateTo('/auth'); }, 600);
        });
      } else {
        App.clearAuth();
        U.showToast('已锁定', 'success');
        setTimeout(function() { App.navigateTo('/auth'); }, 600);
      }
    });
  }

  function safeExport(data) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(data).then(function() {
        U.showToast('已复制到剪贴板，请粘贴保存', 'success');
      }).catch(function() { fallbackExport(data); });
    } else { fallbackExport(data); }
  }

  function fallbackExport(data) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML =
      '<div class="modal-content confirm-modal">' +
      '<div class="modal-title">导出数据</div>' +
      '<div class="modal-body">请手动复制以下内容保存：</div>' +
      '<textarea readonly style="width:100%;height:200px;font-size:12px;border:1px solid #ddd;border-radius:8px;padding:12px;resize:none;font-family:monospace">' + U.escapeHtml(data) + '</textarea>' +
      '<div class="modal-buttons"><button class="modal-btn confirm close-export">关闭</button></div></div>';
    var container = document.getElementById('modal-container');
    container.appendChild(overlay);
    overlay.querySelector('.close-export').addEventListener('click', function() { container.removeChild(overlay); });
    overlay.querySelector('textarea').select();
  }

  var exportBtn = document.getElementById('exportData');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      U.showConfirm('导出数据', '将导出所有人物、语录和标签数据，请妥善保管。', '确认导出', '取消').then(function() {
        var result = S.exportAllData();
        if (result && typeof result.then === 'function') {
          result.then(function(data) { safeExport(data); }).catch(function(e) {
            U.showToast('导出失败: ' + e.message, 'error');
          });
        } else {
          safeExport(result);
        }
      }).catch(function() {});
    });
  }

  var importBtn = document.getElementById('importData');
  if (importBtn) {
    importBtn.addEventListener('click', function() {
      U.showConfirm('导入数据', '将从剪贴板读取备份数据并导入。注意：导入将新增数据。', '确认导入', '取消').then(function() {
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(function(text) {
            if (!text) { fallbackImport(); return; }
            doImport(text);
          }).catch(function() { fallbackImport(); });
        } else { fallbackImport(); }
      }).catch(function() {});
    });

    function fallbackImport() {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML =
        '<div class="modal-content confirm-modal">' +
        '<div class="modal-title">导入数据</div>' +
        '<div class="modal-body">请将备份数据粘贴到下方：</div>' +
        '<textarea id="importTextarea" placeholder="请粘贴备份数据..." style="width:100%;height:200px;font-size:12px;border:1px solid #ddd;border-radius:8px;padding:12px;resize:none;font-family:monospace"></textarea>' +
        '<div class="modal-buttons">' +
        '<button class="modal-btn cancel close-import">取消</button>' +
        '<button class="modal-btn confirm do-import">确认导入</button>' +
        '</div></div>';
      var container = document.getElementById('modal-container');
      container.appendChild(overlay);
      overlay.querySelector('.close-import').addEventListener('click', function() { container.removeChild(overlay); });
      overlay.querySelector('.do-import').addEventListener('click', function() {
        var text = overlay.querySelector('#importTextarea').value;
        container.removeChild(overlay);
        if (!text) { U.showToast('请粘贴数据', 'error'); return; }
        doImport(text);
      });
    }

    function doImport(text) {
      var result = S.importData(text);
      if (result && typeof result.then === 'function') {
        result.then(function() {
          U.showToast('导入成功', 'success');
          setTimeout(function() { App.navigateTo('/settings'); }, 500);
        }).catch(function(e) {
          U.showToast(e.message || '导入失败', 'error');
        });
      } else {
        try {
          U.showToast('导入成功', 'success');
          setTimeout(function() { App.navigateTo('/settings'); }, 500);
        } catch (e) {
          U.showToast(e.message || '导入失败', 'error');
        }
      }
    }
  }

  var clearBtn = document.getElementById('clearCache');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      U.showConfirm('清理缓存', '将清理本地缓存数据，不影响核心数据。', '确认清理', '取消').then(function() {
        try {
          var keys = [];
          for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf('jys_cache_') === 0) {
              keys.push(key);
            }
          }
          keys.forEach(function(k) { localStorage.removeItem(k); });
        } catch (e) {}
        U.showToast('清理完成', 'success');
      }).catch(function() {});
    });
  }

  var aboutBtn = document.getElementById('aboutApp');
  if (aboutBtn) {
    aboutBtn.addEventListener('click', function() {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML =
        '<div class="modal-content confirm-modal">' +
        '<div class="modal-title">关于集英社</div>' +
        '<div class="modal-body">集英社 v2.0.0<br><br>一款专注于记录好友精彩言论的全栈应用。<br><br>功能介绍：<br>· 添加管理好友人物<br>· 记录文字和照片语录<br>· 标签分类管理<br>· 收藏和导出功能<br>· 密码保护隐私<br>· 云端数据存储（需配置Supabase）<br><br>安全特性：<br>· SHA-256加盐哈希密码存储<br>· 异常登录检测与锁定<br>· 90天密码过期提醒<br>· RLS行级数据隔离<br>· 活动审计日志</div>' +
        '<div class="modal-buttons"><button class="modal-btn confirm">知道了</button></div></div>';
      var container = document.getElementById('modal-container');
      container.appendChild(overlay);
      overlay.querySelector('.modal-btn.confirm').addEventListener('click', function() { container.removeChild(overlay); });
    });
  }

  var logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (mode === 'supabase') {
        App.signOutFromSupabase().then(function() {
          U.showToast('已退出', 'success');
          setTimeout(function() { App.navigateTo('/auth'); }, 600);
        });
      } else {
        App.clearAuth();
        U.showToast('已退出', 'success');
        setTimeout(function() { App.navigateTo('/auth'); }, 600);
      }
    });
  }
}

function showPasswordModalLocal(S, U, C, App) {
  var overlay = document.createElement('div');
  overlay.className = 'password-modal-overlay';

  var storedHash = '';
  var storedSalt = '';
  try {
    storedHash = localStorage.getItem('jys_password_hash') || '';
    storedSalt = localStorage.getItem('jys_password_salt') || '';
  } catch (e) {}

  overlay.innerHTML =
    '<div class="password-modal">' +
    '<div class="modal-title">修改访问密码</div>' +
    '<div class="modal-input-group">' +
    '<div class="modal-input-label">当前密码</span>' +
    '<input class="modal-input" type="password" id="oldPwd" placeholder="请输入当前密码" />' +
    '</div>' +
    '<div class="modal-input-group">' +
    '<div class="modal-input-label">新密码</span>' +
    '<input class="modal-input" type="password" id="newPwd" placeholder="请输入新密码（至少6位，含字母和数字）" maxlength="128" />' +
    '<div class="password-strength" style="margin-top:6px"><div class="strength-bar" id="modalStrengthBar" style="width:0%"></div><span class="strength-label" id="modalStrengthLabel" style="font-size:11px"></span></div>' +
    '</div>' +
    '<div class="modal-input-group">' +
    '<div class="modal-input-label">确认新密码</span>' +
    '<input class="modal-input" type="password" id="confirmPwd" placeholder="请再次输入新密码" maxlength="128" />' +
    '</div>' +
    '<div class="modal-buttons">' +
    '<button class="modal-btn cancel" id="cancelPwd">取消</button>' +
    '<button class="modal-btn confirm" id="confirmPwdBtn">确认修改</button>' +
    '</div></div>';

  var container = document.getElementById('modal-container');
  container.appendChild(overlay);

  var newPwdInput = overlay.querySelector('#newPwd');
  if (newPwdInput) {
    newPwdInput.addEventListener('input', function() {
      var bar = overlay.querySelector('#modalStrengthBar');
      var label = overlay.querySelector('#modalStrengthLabel');
      if (!bar || !label) return;
      var result = C.getPasswordStrengthLabel(newPwdInput.value);
      bar.style.width = Math.min(100, (result.score / 5) * 100) + '%';
      bar.style.backgroundColor = result.color;
      label.textContent = result.label;
      label.style.color = result.color;
    });
  }

  overlay.querySelector('#cancelPwd').addEventListener('click', function() { container.removeChild(overlay); });

  overlay.querySelector('#confirmPwdBtn').addEventListener('click', function() {
    var oldPwd = overlay.querySelector('#oldPwd').value;
    var newPwd = overlay.querySelector('#newPwd').value;
    var confirmPwd = overlay.querySelector('#confirmPwd').value;

    if (!oldPwd && storedHash) { U.showToast('请输入当前密码', 'error'); return; }
    if (!newPwd) { U.showToast('请输入新密码', 'error'); return; }

    var strength = C.validatePasswordStrength(newPwd);
    if (!strength.valid) { U.showToast(strength.errors.join('；'), 'error'); return; }
    if (newPwd !== confirmPwd) { U.showToast('两次输入的密码不一致', 'error'); return; }

    function updatePassword() {
      var newSalt = C.generateSalt();
      C.hashPassword(newPwd, newSalt).then(function(newHash) {
        try {
          localStorage.setItem('jys_password_hash', newHash);
          localStorage.setItem('jys_password_salt', newSalt);
          localStorage.setItem('jys_password_updated_at', new Date().toISOString());
          U.showToast('密码修改成功', 'success');
          container.removeChild(overlay);
        } catch (e) { U.showToast(e.message, 'error'); }
      }).catch(function(e) { U.showToast(e.message, 'error'); });
    }

    if (storedHash) {
      C.verifyPassword(oldPwd, storedHash, storedSalt).then(function(match) {
        if (match) updatePassword();
        else U.showToast('当前密码错误', 'error');
      }).catch(function() { U.showToast('验证失败，请重试', 'error'); });
    } else {
      updatePassword();
    }
  });
}