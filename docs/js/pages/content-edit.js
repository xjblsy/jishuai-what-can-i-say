var JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};

JYS.Pages.contentEdit = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;
  var isEdit = !!params.id;
  var contentId = params.id || '';
  var charId = params.characterId || '';
  var text = '', images = [], tags = [];
  var tempImages = [];
  var allTagsData = [];

  var dataPromise;

  if (isEdit) {
    dataPromise = Promise.all([
      S.getContentById(contentId),
      S.getCharacters(),
      S.getTags()
    ]).then(function(results) {
      var content = results[0];
      var characters = results[1];
      allTagsData = results[2];

      if (content) {
        text = content.text || '';
        images = content.images || [];
        tags = content.tags || [];
        if (content.characterId) charId = content.characterId;
      }

      return { characters: characters };
    });
  } else {
    dataPromise = Promise.all([
      S.getCharacters(),
      S.getTags()
    ]).then(function(results) {
      var characters = results[0];
      allTagsData = results[1];

      if (!charId && characters.length > 0) charId = characters[0].id;

      return { characters: characters };
    });
  }

  return dataPromise.then(function(extra) {
    var characters = extra.characters;

    var charOptions = '';
    characters.forEach(function(c) {
      charOptions += '<option value="' + c.id + '"' + (c.id === charId ? ' selected' : '') + '>' + U.escapeHtml(c.name) + '</option>';
    });

    var imageHTML = '';
    images.forEach(function(img, i) {
      imageHTML += '<div class="image-item" data-index="' + i + '"><img class="image" src="' + U.escapeHtml(img) + '" alt="" /><div class="image-remove">✕</div></div>';
    });

    var tagHTML = '';
    tags.forEach(function(t) {
      tagHTML += '<span class="tag tag-editable" data-tag="' + U.escapeHtml(t) + '">' + U.escapeHtml(t) + '<span class="tag-remove">✕</span></span>';
    });

    return {
      html:
        '<div class="edit-page content-edit-page">' +
        '<div class="form-section">' +
        '<div class="form-group">' +
        '<div class="form-label"><span>所属人物</span><span class="required">*</span></div>' +
        '<select class="form-select" id="contentChar">' + charOptions + '</select>' +
        '</div>' +
        '<div class="form-group">' +
        '<div class="form-label"><span>语录内容</span></div>' +
        '<textarea class="form-textarea content-textarea" id="contentText" placeholder="在这里记录精彩的语录..." maxlength="20000">' + U.escapeHtml(text) + '</textarea>' +
        '<div class="text-counter"><span id="textCount">' + text.length + '</span>/20000</div>' +
        '</div>' +
        '<div class="form-group">' +
        '<div class="form-label"><span>图片</span><span class="counter-tip">最多18张</span></div>' +
        '<div class="image-list" id="imageList">' + imageHTML + '</div>' +
        '<div class="add-image-btn" id="addImages">📷 添加图片</div>' +
        '<input type="file" id="imageFileInput" accept="image/*" multiple style="display:none" />' +
        '</div>' +
        '<div class="form-group">' +
        '<div class="form-label"><span>标签</span></div>' +
        '<div class="tag-input-wrapper">' +
        '<div class="tags-display" id="tagsDisplay">' + tagHTML + '</div>' +
        '<div class="tag-input-row"><input class="tag-input" id="tagInput" placeholder="输入标签后回车添加" maxlength="15" /><div class="tag-add-btn" id="addTag">+</div></div>' +
        (allTagsData.length > 0 ? '<div class="tag-suggestions"><span class="suggest-label">已有标签：</span>' + allTagsData.map(function(t) { return '<span class="suggest-tag" data-tag="' + U.escapeHtml(t) + '">' + U.escapeHtml(t) + '</span>'; }).join('') + '</div>' : '') +
        '</div>' +
        '</div></div>' +
        '<div class="form-buttons">' +
        '<button class="form-btn primary" id="saveContent">保存</button>' +
        '<button class="form-btn secondary" id="cancelContent">取消</button>' +
        '</div>' +
        (isEdit ? '<div class="delete-section"><button class="delete-btn" id="deleteContent">删除此内容</button></div>' : ''),

      onRender: function() {
        tempImages = images.slice();

        var textEl = document.getElementById('contentText');
        textEl.addEventListener('input', function() {
          document.getElementById('textCount').textContent = this.value.length;
        });

        var imageFileInput = document.getElementById('imageFileInput');
        var imageList = document.getElementById('imageList');
        var addImagesBtn = document.getElementById('addImages');

        addImagesBtn.addEventListener('click', function() { imageFileInput.click(); });
        imageFileInput.addEventListener('change', function() {
          var files = Array.from(imageFileInput.files);
          if (!files.length) return;
          U.showLoading('处理中...');
          var promises = files.map(function(f) { return JYS.Image.uploadImage(f); });
          Promise.all(promises).then(function(dataUrls) {
            dataUrls.forEach(function(url) {
              if (tempImages.length < 18) {
                tempImages.push(url);
                addImagePreview(url, tempImages.length - 1);
              }
            });
            U.hideLoading();
          }).catch(function() { U.hideLoading(); U.showToast('图片处理失败', 'error'); });
        });

        function addImagePreview(url, index) {
          var el = document.createElement('div');
          el.className = 'image-item';
          el.dataset.index = index;
          el.innerHTML = '<img class="image" src="' + U.escapeHtml(url) + '" alt="" /><div class="image-remove">✕</div>';
          el.querySelector('.image-remove').addEventListener('click', function(e) {
            e.stopPropagation();
            var idx = parseInt(el.dataset.index);
            if (idx >= 0 && idx < tempImages.length) tempImages.splice(idx, 1);
            imageList.removeChild(el);
            rebuildImages();
          });
          imageList.appendChild(el);
        }

        function rebuildImages() {
          imageList.innerHTML = '';
          tempImages.forEach(function(img, i) { addImagePreview(img, i); });
        }

        var tagsDisplay = document.getElementById('tagsDisplay');
        var tagInput = document.getElementById('tagInput');
        var addTagBtn = document.getElementById('addTag');

        function addTag(name) {
          if (tags.length >= 20) { U.showToast('最多添加20个标签', 'error'); return; }
          if (tags.indexOf(name) !== -1) { U.showToast('标签已存在', 'error'); return; }
          tags.push(name);
          var tagEl = document.createElement('span');
          tagEl.className = 'tag tag-editable';
          tagEl.dataset.name = name;
          tagEl.innerHTML = U.escapeHtml(name) + '<span class="tag-remove">✕</span>';
          tagEl.querySelector('.tag-remove').addEventListener('click', function() {
            var idx = tags.indexOf(name);
            if (idx !== -1) tags.splice(idx, 1);
            tagsDisplay.removeChild(tagEl);
          });
          tagsDisplay.appendChild(tagEl);
        }

        addTagBtn.addEventListener('click', function() {
          var name = tagInput.value.trim();
          if (!name) return;
          addTag(name);
          tagInput.value = '';
        });
        tagInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            var name = tagInput.value.trim();
            if (!name) return;
            addTag(name);
            tagInput.value = '';
          }
        });

        document.querySelectorAll('.suggest-tag').forEach(function(st) {
          st.addEventListener('click', function() { addTag(st.dataset.tag); });
        });

        document.querySelectorAll('.tag-editable .tag-remove').forEach(function(rm) {
          rm.addEventListener('click', function(e) {
            e.stopPropagation();
            var parent = rm.parentNode;
            var name = parent.dataset.tag;
            var idx = tags.indexOf(name);
            if (idx !== -1) tags.splice(idx, 1);
            tagsDisplay.removeChild(parent);
          });
        });

        document.querySelectorAll('.image-remove').forEach(function(rm) {
          rm.addEventListener('click', function(e) {
            e.stopPropagation();
            var parent = rm.parentNode;
            var idx = parseInt(parent.dataset.index);
            if (idx >= 0 && idx < tempImages.length) tempImages.splice(idx, 1);
            rebuildImages();
          });
        });

        var saving = false;
        document.getElementById('saveContent').addEventListener('click', function() {
          if (saving) return;
          var charIdVal = document.getElementById('contentChar').value;
          var textVal = document.getElementById('contentText').value;

          if (!charIdVal) { U.showToast('请选择所属人物', 'error'); return; }

          saving = true;
          U.showLoading('保存中...');

          var data = { characterId: charIdVal, text: textVal, images: tempImages, tags: tags };
          var promise = isEdit ? S.updateContent(contentId, data) : S.addContent(data);

          promise.then(function() {
            U.hideLoading(); saving = false;
            U.showToast(isEdit ? '更新成功' : '添加成功', 'success');
            setTimeout(function() { window.history.back(); }, 600);
          }).catch(function(e) {
            U.hideLoading(); saving = false;
            U.showToast(e.message || '保存失败', 'error');
          });
        });

        document.getElementById('cancelContent').addEventListener('click', function() { window.history.back(); });

        var deleteBtn = document.getElementById('deleteContent');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', function() {
            U.showConfirm('确认删除', '确定要删除这条内容吗？此操作不可恢复。', '确认删除', '取消').then(function() {
              S.deleteContent(contentId).then(function() {
                U.showToast('已删除', 'success');
                setTimeout(function() { JYS.App.navigateTo('/contents'); }, 600);
              });
            }).catch(function() {});
          });
        }
      }
    };
  });
};