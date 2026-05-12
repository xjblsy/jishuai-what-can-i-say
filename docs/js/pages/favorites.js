JYS.Pages.favorites = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;
  var contents = S.getFavorites();
  var characters = S.getCharacters();

  var formatted = contents.map(function(content) {
    var character = characters.find(function(c) { return c.id === content.characterId; });
    return {
      id: content.id,
      characterId: content.characterId,
      characterName: character ? character.name : '未知',
      characterAvatar: character ? character.avatar : '',
      text: content.text,
      images: content.images || [],
      tags: content.tags || [],
      createdAt: content.createdAt,
      formattedTime: U.formatTime(content.createdAt)
    };
  });

  var listHTML = '';
  if (formatted.length > 0) {
    listHTML =
      '<div class="page-header"><span class="header-count">共 ' + formatted.length + ' 条收藏</span>' +
      '<div class="header-actions"><span id="exportFav">导出</span></div></div>';
    formatted.forEach(function(item) {
      listHTML +=
        '<div class="fav-item fade-in">' +
        '<div class="item-header" data-char-id="' + item.characterId + '">' +
        '<div class="header-avatar">' +
        (item.characterAvatar ? '<img class="avatar-img" src="' + U.escapeHtml(item.characterAvatar) + '" alt="" />' :
        '<span class="avatar-text">' + U.escapeHtml(item.characterName[0] || '?') + '</span>') +
        '</div>' +
        '<span class="header-name">' + U.escapeHtml(item.characterName) + '</span>' +
        '<span class="header-time">' + U.escapeHtml(item.formattedTime) + '</span>' +
        '</div>';
      if (item.text) listHTML += '<div class="item-text">' + U.escapeHtml(item.text) + '</div>';
      if (item.images && item.images.length > 0) {
        listHTML += '<div class="item-images">';
        item.images.forEach(function(img) {
          listHTML += '<div class="item-image"><img class="image" src="' + U.escapeHtml(img) + '" alt="" onclick="JYS.Pages._previewImg(\'' + U.escapeHtml(img) + '\')" /></div>';
        });
        listHTML += '</div>';
      }
      if (item.tags && item.tags.length > 0) {
        listHTML += '<div class="item-tags">';
        item.tags.forEach(function(t) { listHTML += '<span class="tag tag-primary">' + U.escapeHtml(t) + '</span>'; });
        listHTML += '</div>';
      }
      listHTML +=
        '<div class="item-footer">' +
        '<span class="unfav-btn" data-unfav="' + item.id + '">⭐ 已收藏</span>' +
        '<div class="action-btns">' +
        '<span data-edit="' + item.id + '" data-char-id="' + item.characterId + '">编辑</span>' +
        '</div></div></div>';
    });
  } else {
    listHTML =
      '<div class="empty-state">' +
      '<div class="empty-icon">⭐</div>' +
      '<div class="empty-text">还没有收藏任何内容<br>点击语录旁的☆即可收藏</div>' +
      '</div>';
  }

  return {
    html: '<div class="favorites-page">' + listHTML + '</div>',
    onRender: function() {
      document.querySelectorAll('[data-unfav]').forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          S.toggleFavorite(el.dataset.unfav);
          U.showToast('已取消收藏', 'success');
          JYS.App.navigateTo('/favorites');
        });
      });

      document.querySelectorAll('[data-edit]').forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          JYS.App.navigateTo('/content/edit?id=' + el.dataset.edit + '&characterId=' + el.dataset.charId);
        });
      });

      document.querySelectorAll('.item-header').forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          JYS.App.navigateTo('/character/detail?id=' + el.dataset.charId);
        });
      });

      var exportBtn = document.getElementById('exportFav');
      if (exportBtn) {
        exportBtn.addEventListener('click', function() {
          var text = '【集英社 - 收藏内容】\n\n';
          formatted.forEach(function(item, i) {
            text += (i + 1) + '. [' + item.characterName + '] ' + (item.text || '(图片内容)') + '\n';
            text += '   时间: ' + U.formatTime(item.createdAt) + '\n';
            if (item.tags && item.tags.length > 0) text += '   标签: ' + item.tags.join('、') + '\n';
            text += '\n';
          });
          navigator.clipboard.writeText(text).then(function() {
            U.showToast('已复制到剪贴板', 'success');
          }).catch(function() {
            U.showToast('复制失败', 'error');
          });
        });
      }
    }
  };
};