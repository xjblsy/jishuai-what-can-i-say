var JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};

JYS.Pages.favorites = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;

  return Promise.all([
    S.getFavorites(),
    S.getCharacters()
  ]).then(function(results) {
    var favorites = results[0];
    var characters = results[1];

    var charMap = {};
    characters.forEach(function(c) { charMap[c.id] = c; });

    var formattedItems = favorites.map(function(item) {
      var character = charMap[item.characterId];
      return {
        id: item.id,
        characterId: item.characterId,
        characterName: character ? character.name : '未知',
        characterAvatar: character ? character.avatar : '',
        text: item.text,
        images: item.images || [],
        tags: item.tags || [],
        isFavorite: item.isFavorite,
        formattedTime: U.formatTime(item.createdAt)
      };
    });

    var authWarning = '';
    try {
      var pwdUpdated = localStorage.getItem('jys_password_updated_at');
      if (JYS.Crypto.isPasswordExpired(pwdUpdated)) {
        var remainDays = JYS.Crypto.getPasswordExpireDays(pwdUpdated);
        if (remainDays <= 0) {
          authWarning = '<div class="favorites-warning"><span>⚠️ 密码已过期，请及时更新以确保数据安全</span></div>';
        }
      }
    } catch (e) {}

    var sortOrder = 'desc';

    var contentHTML = '';
    formattedItems.forEach(function(item) {
      contentHTML +=
        '<div class="favorite-item fade-in" data-id="' + item.id + '" data-char-id="' + item.characterId + '" data-time="' + item.createdAt + '">' +
        '<div class="item-header" data-char-id="' + item.characterId + '">' +
        '<div class="header-avatar">' +
        (item.characterAvatar ? '<img class="avatar-img" src="' + U.escapeHtml(item.characterAvatar) + '" alt="" />' : '<span class="avatar-text">' + U.escapeHtml(item.characterName[0] || '?') + '</span>') +
        '</div><span class="header-name">' + U.escapeHtml(item.characterName) + '</span><span class="header-time">' + U.escapeHtml(item.formattedTime) + '</span>' +
        '</div>';
      if (item.text) contentHTML += '<div class="item-text">' + U.escapeHtml(item.text) + '</div>';
      if (item.images && item.images.length > 0) {
        contentHTML += '<div class="item-images">';
        item.images.forEach(function(img) {
          contentHTML += '<div class="item-image"><img class="image" src="' + U.escapeHtml(img) + '" alt="" onclick="JYS.Pages._previewImg(\'' + U.escapeJsStr(img) + '\')" /></div>';
        });
        contentHTML += '</div>';
      }
      if (item.tags && item.tags.length > 0) {
        contentHTML += '<div class="item-tags">';
        item.tags.forEach(function(t) { contentHTML += '<span class="tag tag-primary">' + U.escapeHtml(t) + '</span>'; });
        contentHTML += '</div>';
      }
      contentHTML +=
        '<div class="item-footer">' +
        '<span class="footer-action active" data-toggle-fav="' + item.id + '">⭐ 已收藏</span>' +
        '<span class="footer-action" data-edit="' + item.id + '" data-char-id="' + item.characterId + '">编辑</span>' +
        '</div></div>';
    });

    return {
      html:
        '<div class="favorites-page">' +
        authWarning +
        '<div class="fav-header">' +
        '<div class="fav-count"><span class="count-number">' + formattedItems.length + '</span><span class="count-label">条收藏</span></div>' +
        '<div class="sort-bar"><span class="sort-item" data-sort="desc">时间↓</span></div>' +
        '</div>' +
        (formattedItems.length > 0 ? contentHTML :
        '<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-text">还没有收藏任何语录<br>在语录详情中点击收藏即可</div></div>') +
        '</div>',

      onRender: function() {
        var sortItem = document.querySelector('.sort-item');
        if (sortItem) {
          sortItem.addEventListener('click', function() {
            sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
            var container = document.querySelector('.favorites-page');
            var cards = Array.from(container.querySelectorAll('.favorite-item'));
            cards.sort(function(a, b) {
              return sortOrder === 'desc' ? parseInt(b.dataset.time) - parseInt(a.dataset.time) : parseInt(a.dataset.time) - parseInt(b.dataset.time);
            });
            cards.forEach(function(c) { container.appendChild(c); });
            this.textContent = '时间' + (sortOrder === 'desc' ? '↓' : '↑');
          });
        }

        document.querySelectorAll('.item-header').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            JYS.App.navigateTo('/character/detail?id=' + el.dataset.charId);
          });
        });

        document.querySelectorAll('[data-toggle-fav]').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            S.toggleFavorite(el.dataset.toggleFav).then(function() {
              JYS.App.navigateTo('/favorites');
            });
          });
        });

        document.querySelectorAll('[data-edit]').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            JYS.App.navigateTo('/content/edit?id=' + el.dataset.edit + '&characterId=' + el.dataset.charId);
          });
        });
      }
    };
  });
};