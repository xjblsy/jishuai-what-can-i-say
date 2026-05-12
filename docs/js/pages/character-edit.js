JYS.Pages.characterEdit = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;
  var isEdit = !!params.id;
  var characterId = params.id || '';
  var name = '', nickname = '', remark = '', avatar = '';

  if (isEdit) {
    var character = S.getCharacterById(characterId);
    if (character) {
      name = character.name || '';
      nickname = character.nickname || '';
      remark = character.remark || '';
      avatar = character.avatar || '';
    }
  }

  return {
    html:
      '<div class="edit-page">' +
      '<div class="avatar-section">' +
      '<div class="avatar-picker" id="avatarPicker">' +
      (avatar ? '<img class="avatar-img" src="' + U.escapeHtml(avatar) + '" alt="" />' :
      '<span class="avatar-placeholder">📷</span>') +
      '<div class="avatar-overlay"><span>' + (avatar ? '更换' : '上传') + '</span></div>' +
      '</div>' +
      '<span class="avatar-tip">点击上传头像照片</span>' +
      '</div>' +
      '<div class="form-section">' +
      '<div class="form-group">' +
      '<div class="form-label"><span>姓名</span><span class="required">*</span></div>' +
      '<input class="form-input" id="charName" placeholder="请输入姓名" value="' + U.escapeHtml(name) + '" maxlength="20" />' +
      '</div>' +
      '<div class="form-group">' +
      '<div class="form-label"><span>昵称</span></div>' +
      '<input class="form-input" id="charNickname" placeholder="请输入昵称（选填）" value="' + U.escapeHtml(nickname) + '" maxlength="20" />' +
      '</div>' +
      '<div class="form-group">' +
      '<div class="form-label"><span>备注说明</span></div>' +
      '<textarea class="form-textarea" id="charRemark" placeholder="添加一些备注信息..." maxlength="200">' + U.escapeHtml(remark) + '</textarea>' +
      '<div class="char-counter" id="remarkCounter">' + remark.length + '/200</div>' +
      '</div></div>' +
      '<div class="form-buttons">' +
      '<button class="form-btn primary" id="saveChar">保存</button>' +
      '<button class="form-btn secondary" id="cancelChar">取消</button>' +
      '</div>' +
      (isEdit ? '<div class="delete-section"><button class="delete-btn" id="deleteChar">删除此人物</button></div>' : '') +
      '<input type="file" id="avatarFileInput" accept="image/*" style="display:none" />',

    onRender: function() {
      var avatarFileInput = document.getElementById('avatarFileInput');
      var avatarPicker = document.getElementById('avatarPicker');
      var avatarImg = avatarPicker.querySelector('.avatar-img');
      var avatarPlaceholder = avatarPicker.querySelector('.avatar-placeholder');
      var avatarOverlayText = avatarPicker.querySelector('.avatar-overlay span');

      avatarPicker.addEventListener('click', function() { avatarFileInput.click(); });
      avatarFileInput.addEventListener('change', function() {
        var file = avatarFileInput.files[0];
        if (!file) return;
        U.showLoading('处理中...');
        JYS.Image.uploadImage(file).then(function(dataUrl) {
          avatar = dataUrl;
          if (avatarImg) { avatarImg.src = dataUrl; avatarImg.style.display = ''; }
          else {
            var img = document.createElement('img');
            img.className = 'avatar-img';
            img.src = dataUrl;
            img.alt = '';
            avatarPicker.insertBefore(img, avatarPicker.firstChild);
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
          }
          avatarOverlayText.textContent = '更换';
          U.hideLoading();
        }).catch(function() { U.hideLoading(); U.showToast('图片处理失败', 'error'); });
      });

      document.getElementById('charRemark').addEventListener('input', function() {
        document.getElementById('remarkCounter').textContent = this.value.length + '/200';
      });

      var saving = false;
      document.getElementById('saveChar').addEventListener('click', function() {
        if (saving) return;
        var charName = document.getElementById('charName').value;
        if (!charName.trim()) { U.showToast('请输入姓名', 'error'); return; }

        saving = true;
        U.showLoading('保存中...');
        var data = { name: charName.trim(), nickname: document.getElementById('charNickname').value.trim(), remark: document.getElementById('charRemark').value.trim(), avatar: avatar };

        setTimeout(function() {
          try {
            if (isEdit) { S.updateCharacter(characterId, data); }
            else { S.addCharacter(data); }
            U.hideLoading(); saving = false;
            U.showToast(isEdit ? '更新成功' : '添加成功', 'success');
            setTimeout(function() { window.history.back(); }, 600);
          } catch (e) {
            U.hideLoading(); saving = false;
            U.showToast(e.message || '保存失败', 'error');
          }
        }, 100);
      });

      document.getElementById('cancelChar').addEventListener('click', function() { window.history.back(); });

      var deleteBtn = document.getElementById('deleteChar');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
          var character = S.getCharacterById(characterId);
          if (!character) return;
          U.showConfirm('确认删除', '确定要删除「' + character.name + '」及其所有相关内容吗？此操作不可撤销。', '确认删除', '取消').then(function() {
            S.deleteCharacter(characterId);
            U.showToast('已删除', 'success');
            setTimeout(function() { JYS.App.navigateTo('/characters'); }, 600);
          }).catch(function() {});
        });
      }
    }
  };
};