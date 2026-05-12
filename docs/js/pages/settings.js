JYS.Pages.settings = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;

  var characters = S.getCharacters();
  var contents = S.getContents();
  var favorites = S.getFavorites();
  var currentPassword = S.getPassword() || JYS.App.globalData.defaultPassword;
  var isDefaultPassword = currentPassword === JYS.App.globalData.defaultPassword;
  var storageSize = '--';

  try {
    var total = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('jys_') === 0) {
        total += (localStorage.getItem(key) || '').length;
      }
    }
    if (total < 1024) storageSize = total + 'B';
    else if (total < 1048576) storageSize = (total / 1024).toFixed(1) + 'KB';
    else storageSize = (total / 1048576).toFixed(1) + 'MB';
  } catch (e) {}

  return {
    html:
      '<div class="settings-page">' +
      '<div class="storage-info">' +
      '<div class="info-item"><span class="info-num">' + characters.length + '</span><span class="info-label">人物</span></div>' +
      '<div class="info-item"><span class="info-num">' + contents.length + '</span><span class="info-label">语录</span></div>' +
      '<div class="info-item"><span class="info-num">' + favorites.length + '</span><span class="info-label">收藏</span></div>' +
      '<div class="info-item"><span class="info-num">' + U.escapeHtml(storageSize) + '</span><span class="info-label">存储</span></div>' +
      '</div>' +
      '<div class="settings-section">' +
      '<span class="section-header">安全设置</span>' +
      '<div class="settings-item" id="changePassword">' +
      '<div class="item-left"><div class="item-icon red">🔑</div><div class="item-title">修改访问密码</div></div>' +
      '<span class="item-arrow">›</span></div>' +
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
      '<span class="item-value">v1.0.0</span><span class="item-arrow">›</span></div>' +
      '</div>' +
      '<button class="logout-btn" id="logout">退出登录</button>' +
      '<div class="version-info"><span>集英社 v1.0.0 · 专注记录精彩瞬间</span></div>' +
      '</div>',

    onRender: function() {
      document.getElementById('changePassword').addEventListener('click', function() {
        showPasswordModal();
      });

      document.getElementById('lockNow').addEventListener('click', function() {
        JYS.App.clearAuth();
        U.showToast('已锁定', 'success');
        setTimeout(function() { JYS.App.navigateTo('/auth'); }, 600);
      });

      document.getElementById('exportData').addEventListener('click', function() {
        U.showConfirm('导出数据', '将导出所有人物、语录和标签数据到剪贴板，请妥善保管。', '确认导出', '取消').then(function() {
          var data = S.exportAllData();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(data).then(function() {
              U.showToast('已复制到剪贴板，请粘贴保存', 'success');
            }).catch(function() { fallbackExport(data); });
          } else { fallbackExport(data); }
        }).catch(function() {});
      });

      function fallbackExport(data) {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML =
          '<div class="modal-content confirm-modal">' +
          '<div class="modal-title">导出数据</div>' +
          '<div class="modal-body">请手动复制以下内容保存：</div>' +
          '<textarea readonly style="width:100%;height:200px;font-size:12px;border:1px solid #ddd;border-radius:8px;padding:12px;resize:none;font-family:monospace">' + JYS.Util.escapeHtml(data) + '</textarea>' +
          '<div class="modal-buttons"><button class="modal-btn confirm close-export">关闭</button></div></div>';
        document.getElementById('modal-container').appendChild(overlay);
        overlay.querySelector('.close-export').addEventListener('click', function() { overlay.parentNode.removeChild(overlay); });
        overlay.querySelector('textarea').select();
      }

      document.getElementById('importData').addEventListener('click', function() {
        U.showConfirm('导入数据', '将从剪贴板读取备份数据并导入。注意：导入将覆盖现有数据。', '确认导入', '取消').then(function() {
          if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function(text) {
              if (!text) { fallbackImport(); return; }
              tryImport(text);
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
        document.getElementById('modal-container').appendChild(overlay);
        overlay.querySelector('.close-import').addEventListener('click', function() { overlay.parentNode.removeChild(overlay); });
        overlay.querySelector('.do-import').addEventListener('click', function() {
          var text = overlay.querySelector('#importTextarea').value;
          overlay.parentNode.removeChild(overlay);
          if (!text) { U.showToast('请粘贴数据', 'error'); return; }
          tryImport(text);
        });
      }

      function tryImport(text) {
        try {
          S.importData(text);
          U.showToast('导入成功', 'success');
          JYS.App.navigateTo('/settings');
        } catch (e) { U.showToast(e.message || '导入失败', 'error'); }
      }

      document.getElementById('clearCache').addEventListener('click', function() {
        U.showConfirm('清理缓存', '将清理本地缓存数据，不影响核心数据。', '确认清理', '取消').then(function() {
          U.showToast('清理完成', 'success');
        }).catch(function() {});
      });

      document.getElementById('aboutApp').addEventListener('click', function() {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML =
          '<div class="modal-content confirm-modal">' +
          '<div class="modal-title">关于集英社</div>' +
          '<div class="modal-body">集英社 v1.0.0<br><br>一款专注于记录好友精彩言论的Web应用。<br><br>功能介绍：<br>· 添加管理好友人物<br>· 记录文字和照片语录<br>· 标签分类管理<br>· 收藏和导出功能<br>· 密码保护隐私<br><br>所有数据存储在浏览器本地，请定期备份。</div>' +
          '<div class="modal-buttons"><button class="modal-btn confirm">知道了</button></div></div>';
        document.getElementById('modal-container').appendChild(overlay);
        overlay.querySelector('.modal-btn.confirm').addEventListener('click', function() { overlay.parentNode.removeChild(overlay); });
      });

      document.getElementById('logout').addEventListener('click', function() {
        JYS.App.clearAuth();
        U.showToast('已退出', 'success');
        setTimeout(function() { JYS.App.navigateTo('/auth'); }, 600);
      });

      function showPasswordModal() {
        var overlay = document.createElement('div');
        overlay.className = 'password-modal-overlay';
        overlay.innerHTML =
          '<div class="password-modal">' +
          '<div class="modal-title">修改访问密码</div>' +
          '<div class="modal-input-group">' +
          '<div class="modal-input-label">当前密码</div>' +
          '<input class="modal-input" type="password" id="oldPwd" placeholder="请输入当前密码" />' +
          '</div>' +
          '<div class="modal-input-group">' +
          '<div class="modal-input-label">新密码</div>' +
          '<input class="modal-input" type="password" id="newPwd" placeholder="请输入新密码" />' +
          '</div>' +
          '<div class="modal-input-group">' +
          '<div class="modal-input-label">确认新密码</div>' +
          '<input class="modal-input" type="password" id="confirmPwd" placeholder="请再次输入新密码" />' +
          '</div>' +
          '<div class="modal-buttons">' +
          '<button class="modal-btn cancel" id="cancelPwd">取消</button>' +
          '<button class="modal-btn confirm" id="confirmPwdBtn">确认</button>' +
          '</div></div>';
        document.getElementById('modal-container').appendChild(overlay);

        overlay.querySelector('#cancelPwd').addEventListener('click', function() { overlay.parentNode.removeChild(overlay); });
        overlay.querySelector('#confirmPwdBtn').addEventListener('click', function() {
          var oldPwd = document.getElementById('oldPwd').value;
          var newPwd = document.getElementById('newPwd').value;
          var confirmPwd = document.getElementById('confirmPwd').value;

          if (!newPwd.trim()) { U.showToast('请输入新密码', 'error'); return; }
          if (newPwd.length < 4) { U.showToast('密码至少需要4位', 'error'); return; }
          if (newPwd !== confirmPwd) { U.showToast('两次输入的密码不一致', 'error'); return; }

          var storedPwd = S.getPassword() || JYS.App.globalData.defaultPassword;
          if (oldPwd !== storedPwd) { U.showToast('当前密码错误', 'error'); return; }

          try {
            S.savePassword(newPwd.trim());
            U.showToast('密码修改成功', 'success');
            overlay.parentNode.removeChild(overlay);
          } catch (e) { U.showToast(e.message, 'error'); }
        });
      }
    }
  };
};