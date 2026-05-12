JYS.Pages.contentEdit = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;
  var MAX_TEXT_LENGTH = 20000;
  var MAX_IMAGES = 18;
  var MAX_TAG_LENGTH = 15;

  var isEdit = !!params.id;
  var contentId = params.id || '';
  var characters = S.getCharacters();

  var selectedCharacter = {};
  var text = '';
  var images = [];
  var selectedTags = [];
  var customTags = S.getTags();
  var defaultTags = U.getDefaultTags();

  if (isEdit) {
    var content = S.getContentById(contentId);
    if (content) {
      var character = S.getCharacterById(content.characterId);
      selectedCharacter = character || {};
      text = content.text || '';
      images = content.images || [];
      selectedTags = content.tags || [];
    }
  } else if (params.characterId) {
    selectedCharacter = S.getCharacterById(params.characterId) || {};
  }

  if (characters.length === 0 && !isEdit) {
    return {
      html:
        '<div class="edit-page">' +
        '<div class="empty-character-hint">' +
        '<div class="hint-icon">👤</div>' +
        '<div class="hint-text">请先添加人物，才能记录语录哦</div>' +
        '<a class="hint-btn" href="#/character/edit">去添加人物</a>' +
        '</div></div>'
    };
  }

  var charSelectorHTML = '';
  if (!isEdit) {
    charSelectorHTML =
      '<div class="character-selector-area">' +
      '<span class="selector-label">选择人物</span>' +
      '<div class="character-picker" id="charPicker">' +
      '<div class="picker-avatar">' +
      (selectedCharacter.avatar ? '<img class="avatar-img" src="' + U.escapeHtml(selectedCharacter.avatar) + '" alt="" />' :
      '<span class="avatar-text">' + (selectedCharacter.name ? selectedCharacter.name[0] : '?') + '</span>') +
      '</div>' +
      (selectedCharacter.name ? '<span class="picker-name">' + U.escapeHtml(selectedCharacter.name) + '</span>' :
      '<span class="picker-placeholder">请选择人物</span>') +
      '<span class="picker-arrow">›</span>' +
      '</div></div>';
  }

  var imagesHTML = '<div class="image-grid" id="imageGrid">';
  images.forEach(function(img, i) {
    imagesHTML +=
      '<div class="image-item" data-index="' + i + '">' +
      '<img class="image" src="' + U.escapeHtml(img) + '" alt="" />' +
      '<div class="delete-btn"><span>✕</span></div>' +
      '</div>';
  });
  if (images.length < MAX_IMAGES) {
    imagesHTML +=
      '<div class="add-image-btn" id="addImageBtn">' +
      '<span class="add-icon">+</span>' +
      '<span class="add-text">' + images.length + '/' + MAX_IMAGES + '</span>' +
      '</div>';
  }
  imagesHTML += '</div>';

  var tagsHTML = '<div class="tags-wrapper" id="tagsWrapper">';
  defaultTags.forEach(function(t) {
    tagsHTML += '<span class="tag-item' + (selectedTags.indexOf(t) !== -1 ? ' selected' : '') + '" data-tag="' + U.escapeHtml(t) + '">' + U.escapeHtml(t) + '</span>';
  });
  if (customTags.length > 0) {
    customTags.forEach(function(t) {
      if (defaultTags.indexOf(t) === -1) {
        tagsHTML += '<span class="tag-item' + (selectedTags.indexOf(t) !== -1 ? ' selected' : '') + '" data-tag="' + U.escapeHtml(t) + '">' + U.escapeHtml(t) + '</span>';
      }
    });
  }
  tagsHTML += '<input class="custom-tag-input" id="customTagInput" placeholder="自定义标签" maxlength="15" />';
  tagsHTML += '</div>';

  var charPickerModalHTML = '';
  if (!isEdit) {
    charPickerModalHTML =
      '<div class="modal-overlay' + (characters.length > 0 ? '' : ' hidden') + '" id="charPickerModal" style="display:none">' +
      '<div class="modal-content">' +
      '<div class="modal-title">选择人物</div>';
    characters.forEach(function(c) {
      charPickerModalHTML +=
        '<div class="picker-character-item' + (selectedCharacter.id === c.id ? ' selected' : '') + '" data-id="' + c.id + '">' +
        '<div class="picker-char-avatar">' +
        (c.avatar ? '<img class="avatar-img" src="' + U.escapeHtml(c.avatar) + '" alt="" />' : '<span class="avatar-text">' + U.escapeHtml(c.name[0]) + '</span>') +
        '</div>' +
        '<div class="picker-char-info">' +
        '<span class="picker-char-name">' + U.escapeHtml(c.name) + '</span>' +
        (c.nickname ? '<span class="picker-char-nickname">@' + U.escapeHtml(c.nickname) + '</span>' : '') +
        '</div>' +
        (selectedCharacter.id === c.id ? '<span class="picker-char-check">✓</span>' : '') +
        '</div>';
    });
    charPickerModalHTML +=
      '<div class="picker-cancel-wrapper"><span class="picker-cancel-btn" id="closeCharPicker">取消</span></div>' +
      '</div></div>';
  }

  return {
    html:
      '<div class="edit-page">' +
      charSelectorHTML +
      '<div class="content-section">' +
      '<textarea class="content-textarea" id="contentText" placeholder="请输入精彩言论..." maxlength="' + MAX_TEXT_LENGTH + '">' + U.escapeHtml(text) + '</textarea>' +
      '<div class="text-char-count" id="charCount">' + text.length + '/' + MAX_TEXT_LENGTH + '</div>' +
      '</div>' +
      '<div class="images-section">' +
      '<span class="section-label">照片（选填）</span>' +
      imagesHTML +
      '</div>' +
      '<div class="tags-section">' +
      '<span class="section-label">分类标签（选填）</span>' +
      tagsHTML +
      '</div>' +
      '</div>' +
      '<div class="action-bar">' +
      '<button class="action-btn preview" id="previewBtn">预览</button>' +
      '<button class="action-btn primary" id="submitBtn">提交</button>' +
      '</div>' +
      charPickerModalHTML +
      '<input type="file" id="contentImageInput" accept="image/*" multiple style="display:none" />',

    onRender: function() {
      var saving = false;

      var charPicker = document.getElementById('charPicker');
      var charPickerModal = document.getElementById('charPickerModal');
      if (charPicker && charPickerModal) {
        charPicker.addEventListener('click', function() {
          charPickerModal.style.display = '';
        });
        document.getElementById('closeCharPicker').addEventListener('click', function() {
          charPickerModal.style.display = 'none';
        });
        charPickerModal.querySelectorAll('.picker-character-item').forEach(function(item) {
          item.addEventListener('click', function() {
            var c = S.getCharacterById(item.dataset.id);
            if (c) {
              selectedCharacter = c;
              JYS.App.navigateTo('/content/edit?characterId=' + c.id);
            }
          });
        });
      }

      var textarea = document.getElementById('contentText');
      var charCount = document.getElementById('charCount');
      textarea.addEventListener('input', function() {
        text = textarea.value;
        charCount.textContent = text.length + '/' + MAX_TEXT_LENGTH;
      });

      var imageGrid = document.getElementById('imageGrid');
      var imageInput = document.getElementById('contentImageInput');
      var addImageBtn = document.getElementById('addImageBtn');
      if (addImageBtn) {
        addImageBtn.addEventListener('click', function() { imageInput.click(); });
      }

      imageInput.addEventListener('change', function() {
        var files = Array.from(imageInput.files).slice(0, MAX_IMAGES - images.length);
        if (files.length === 0) { imageInput.value = ''; return; }
        U.showLoading('处理图片中...');

        var processed = [];
        function processNext(index) {
          if (index >= files.length) {
            images = images.concat(processed);
            U.hideLoading();
            JYS.App.navigateTo('/content/edit' + (isEdit ? '?id=' + contentId : '?characterId=' + (selectedCharacter.id || '')));
            return;
          }
          JYS.Image.uploadImage(files[index]).then(function(dataUrl) {
            processed.push(dataUrl);
            processNext(index + 1);
          }).catch(function() { processNext(index + 1); });
        }
        processNext(0);
      });

      imageGrid.addEventListener('click', function(e) {
        var deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
          var item = deleteBtn.closest('.image-item');
          var index = parseInt(item.dataset.index);
          images.splice(index, 1);
          JYS.App.navigateTo('/content/edit' + (isEdit ? '?id=' + contentId : '?characterId=' + (selectedCharacter.id || '')));
          return;
        }
        var img = e.target.closest('.image-item img');
        if (img) {
          JYS.Pages._previewImg(img.src);
        }
      });

      var tagsWrapper = document.getElementById('tagsWrapper');
      tagsWrapper.addEventListener('click', function(e) {
        var tagItem = e.target.closest('.tag-item');
        if (!tagItem) return;
        var tag = tagItem.dataset.tag;
        var idx = selectedTags.indexOf(tag);
        if (idx !== -1) { selectedTags.splice(idx, 1); tagItem.classList.remove('selected'); }
        else { selectedTags.push(tag); tagItem.classList.add('selected'); }
      });

      var customTagInput = document.getElementById('customTagInput');
      customTagInput.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        var tag = customTagInput.value.trim();
        if (!tag) return;
        if (tag.length > MAX_TAG_LENGTH) { U.showToast('标签最多' + MAX_TAG_LENGTH + '个字', 'warning'); return; }
        if (selectedTags.indexOf(tag) !== -1) { U.showToast('标签已存在', 'warning'); customTagInput.value = ''; return; }
        selectedTags.push(tag);
        if (customTags.indexOf(tag) === -1) { customTags.push(tag); S.saveTags(customTags); }
        customTagInput.value = '';
        JYS.App.navigateTo('/content/edit' + (isEdit ? '?id=' + contentId : '?characterId=' + (selectedCharacter.id || '')));
      });

      document.getElementById('previewBtn').addEventListener('click', function() {
        if (!validate()) return;
        showPreview();
      });

      document.getElementById('submitBtn').addEventListener('click', function() {
        if (!validate()) return;
        doSubmit();
      });

      function validate() {
        if (!isEdit && !selectedCharacter.id) { U.showToast('请选择人物', 'error'); return false; }
        return true;
      }

      function showPreview() {
        var overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.innerHTML =
          '<div class="preview-header">' +
          '<div class="close-btn" id="closePreview">✕</div>' +
          '<div class="confirm-btn" id="confirmPreview">确认提交</div>' +
          '</div>' +
          '<div class="preview-body"><div class="preview-card">' +
          '<div class="preview-character">' +
          '<div class="pc-avatar">' +
          (selectedCharacter.avatar ? '<img class="avatar-img" src="' + U.escapeHtml(selectedCharacter.avatar) + '" alt="" />' :
          '<span class="avatar-text">' + (selectedCharacter.name ? selectedCharacter.name[0] : '?') + '</span>') +
          '</div>' +
          '<span class="pc-name">' + (selectedCharacter.name || '未选择') + '</span>' +
          '</div>' +
          '<div class="preview-text">' + (textarea.value || '（无文字内容）') + '</div>' +
          (images.length > 0 ? '<div class="preview-images">' + images.map(function(img) { return '<div class="preview-image"><img class="image" src="' + U.escapeHtml(img) + '" alt="" /></div>'; }).join('') + '</div>' : '') +
          (selectedTags.length > 0 ? '<div class="preview-tags">' + selectedTags.map(function(t) { return '<span class="tag tag-primary">' + U.escapeHtml(t) + '</span>'; }).join('') + '</div>' : '') +
          '</div></div>';
        document.body.appendChild(overlay);

        overlay.querySelector('#closePreview').addEventListener('click', function() { document.body.removeChild(overlay); });
        overlay.querySelector('#confirmPreview').addEventListener('click', function() {
          document.body.removeChild(overlay);
          doSubmit();
        });
      }

      function doSubmit() {
        if (saving) return;
        if (!textarea.value.trim() && images.length === 0) {
          U.showToast('请输入内容或添加照片', 'error'); return;
        }
        saving = true;
        U.showLoading('保存中...');

        var data = { characterId: selectedCharacter.id, text: textarea.value.trim(), images: images, tags: selectedTags };

        try {
          if (isEdit) { S.updateContent(contentId, data); }
          else { S.addContent(data); }
          U.hideLoading(); saving = false;
          U.showToast(isEdit ? '更新成功' : '记录成功', 'success');
          setTimeout(function() { window.history.back(); }, 600);
        } catch (e) {
          U.hideLoading(); saving = false;
          U.showToast(e.message || '保存失败', 'error');
        }
      }
    }
  };
};