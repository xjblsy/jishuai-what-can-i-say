var JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};

JYS.Pages.characterDetail = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;
  var characterId = params.id;

  return Promise.all([
    S.getCharacterById(characterId),
    S.getContents({ characterId: characterId })
  ]).then(function(results) {
    var character = results[0];
    var contents = results[1];

    if (!character) {
      return { html: '<div class="empty-state"><div class="empty-icon">❓</div><div class="empty-text">人物信息不存在</div></div>' };
    }

    var allTags = [];
    var favoriteCount = 0;
    var imageCount = 0;
    var tagSet = {};

    var formattedContents = contents.map(function(c) {
      if (c.isFavorite) favoriteCount++;
      if (c.images && c.images.length > 0) imageCount += c.images.length;
      if (c.tags && c.tags.length > 0) {
        c.tags.forEach(function(t) { if (!tagSet[t]) { tagSet[t] = true; allTags.push(t); } });
      }
      return {
        id: c.id,
        characterId: c.characterId,
        text: c.text,
        images: c.images || [],
        tags: c.tags || [],
        isFavorite: c.isFavorite,
        formattedTime: U.formatTime(c.createdAt),
        createdAt: c.createdAt
      };
    });

    var sortOrder = 'desc';

    var filterHTML = '';
    if (allTags.length > 0) {
      filterHTML = '<div class="filter-bar"><span class="filter-tag active" data-tag="">全部</span>';
      allTags.forEach(function(t) { filterHTML += '<span class="filter-tag" data-tag="' + U.escapeHtml(t) + '">' + U.escapeHtml(t) + '</span>'; });
      filterHTML += '</div>';
    }

    var contentHTML = '';
    formattedContents.forEach(function(item) {
      contentHTML +=
        '<div class="content-card fade-in" data-tags="' + (item.tags || []).join(',') + '" data-time="' + item.createdAt + '">' +
        '<div class="card-time">' +
        '<span>' + U.escapeHtml(item.formattedTime) + '</span>' +
        '<span class="' + (item.isFavorite ? 'fav-active' : '') + '" data-toggle-fav="' + item.id + '">' + (item.isFavorite ? '⭐' : '☆') + '</span>' +
        '</div>';
      if (item.text) contentHTML += '<div class="card-text">' + U.escapeHtml(item.text) + '</div>';
      if (item.images && item.images.length > 0) {
        contentHTML += '<div class="card-images">';
        item.images.forEach(function(img) {
          contentHTML += '<div class="card-image"><img class="image" src="' + U.escapeHtml(img) + '" alt="" onclick="JYS.Pages._previewImg(\'' + U.escapeJsStr(img) + '\')" /></div>';
        });
        contentHTML += '</div>';
      }
      if (item.tags && item.tags.length > 0) {
        contentHTML += '<div class="card-tags">';
        item.tags.forEach(function(t) { contentHTML += '<span class="tag tag-primary">' + U.escapeHtml(t) + '</span>'; });
        contentHTML += '</div>';
      }
      contentHTML +=
        '<div class="card-footer">' +
        '<span data-edit-content="' + item.id + '">编辑</span>' +
        '<span data-delete-content="' + item.id + '">删除</span>' +
        '</div></div>';
    });
    if (!contentHTML) {
      contentHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">还没有记录任何语录<br>点击上方按钮添加</div></div>';
    }

    var avatarHTML = character.avatar ? '<img class="avatar-img" src="' + U.escapeHtml(character.avatar) + '" alt="" />' : '<span class="avatar-text">' + U.escapeHtml(character.name[0] || '?') + '</span>';

    return {
      html:
        '<div class="detail-page">' +
        '<div class="detail-cover">' +
        '<div class="detail-avatar" id="detailAvatar">' + avatarHTML + '</div>' +
        '<span class="detail-name">' + U.escapeHtml(character.name) + '</span>' +
        (character.nickname ? '<span class="detail-nickname">@' + U.escapeHtml(character.nickname) + '</span>' : '') +
        '<div class="detail-stats">' +
        '<div class="detail-stat"><span class="stat-num">' + contents.length + '</span><span class="stat-label">语录</span></div>' +
        '<div class="detail-stat"><span class="stat-num">' + favoriteCount + '</span><span class="stat-label">收藏</span></div>' +
        '<div class="detail-stat"><span class="stat-num">' + imageCount + '</span><span class="stat-label">图片</span></div>' +
        '</div></div>' +
        '<div class="detail-actions">' +
        '<a class="detail-action-btn primary" href="#/content/edit?characterId=' + character.id + '">✍️ 记录语录</a>' +
        '<a class="detail-action-btn secondary" href="#/character/edit?id=' + character.id + '">✏️ 编辑信息</a>' +
        '</div>' +
        filterHTML +
        '<div class="sort-bar"><span class="sort-item" data-sort="desc">时间↓</span></div>' +
        '<div class="content-list">' + contentHTML + '</div>' +
        '<a class="float-add-btn" href="#/content/edit?characterId=' + character.id + '">+</a>',

      onRender: function() {
        var detailAvatar = document.getElementById('detailAvatar');
        if (detailAvatar) {
          detailAvatar.addEventListener('click', function() {
            JYS.Image.chooseImage({ count: 1 }).then(function(files) {
              if (!files || files.length === 0) return;
              JYS.Image.uploadImage(files[0]).then(function(dataUrl) {
                S.updateCharacter(characterId, { avatar: dataUrl }).then(function() {
                  JYS.App.navigateTo('/character/detail?id=' + characterId);
                });
              });
            });
          });
        }

        document.querySelectorAll('.filter-tag').forEach(function(tag) {
          tag.addEventListener('click', function() {
            var t = tag.dataset.tag;
            document.querySelectorAll('.filter-tag').forEach(function(el) { el.classList.remove('active'); });
            tag.classList.add('active');
            document.querySelectorAll('.content-card').forEach(function(card) {
              var tags = card.dataset.tags || '';
              card.style.display = (!t || tags.split(',').indexOf(t) !== -1) ? '' : 'none';
            });
          });
        });

        var sortItem = document.querySelector('.sort-item');
        if (sortItem) {
          sortItem.addEventListener('click', function() {
            sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
            var container = document.querySelector('.content-list');
            var cards = Array.from(container.querySelectorAll('.content-card'));
            cards.sort(function(a, b) {
              return sortOrder === 'desc' ? parseInt(b.dataset.time) - parseInt(a.dataset.time) : parseInt(a.dataset.time) - parseInt(b.dataset.time);
            });
            cards.forEach(function(c) { container.appendChild(c); });
            this.textContent = '时间' + (sortOrder === 'desc' ? '↓' : '↑');
          });
        }

        document.querySelectorAll('[data-toggle-fav]').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            S.toggleFavorite(el.dataset.toggleFav).then(function() {
              JYS.App.navigateTo('/character/detail?id=' + characterId);
            });
          });
        });

        document.querySelectorAll('[data-edit-content]').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            JYS.App.navigateTo('/content/edit?id=' + el.dataset.editContent + '&characterId=' + characterId);
          });
        });

        document.querySelectorAll('[data-delete-content]').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            U.showConfirm('确认删除', '确定要删除这条内容吗？', '确认删除', '取消').then(function() {
              S.deleteContent(el.dataset.deleteContent).then(function() {
                U.showToast('删除成功', 'success');
                JYS.App.navigateTo('/character/detail?id=' + characterId);
              });
            }).catch(function() {});
          });
        });
      }
    };
  });
};