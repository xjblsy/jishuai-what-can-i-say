var JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};

JYS.Pages.contentList = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;

  return Promise.all([
    S.getCharacters(),
    S.getContents()
  ]).then(function(results) {
    var characters = results[0];
    var contents = results[1];

    var allTags = [];
    var tagSet = {};
    var formattedContents = contents.map(function(content) {
      var character = characters.find(function(c) { return c.id === content.characterId; });
      if (content.tags && content.tags.length > 0) {
        content.tags.forEach(function(t) { if (!tagSet[t]) { tagSet[t] = true; allTags.push(t); } });
      }
      return {
        id: content.id,
        characterId: content.characterId,
        text: content.text,
        images: content.images || [],
        tags: content.tags || [],
        isFavorite: content.isFavorite,
        characterName: character ? character.name : '未知',
        characterAvatar: character ? character.avatar : '',
        formattedTime: U.formatTime(content.createdAt),
        createdAt: content.createdAt
      };
    });

    var charChips = '<span class="character-chip active" data-id="">全部</span>';
    characters.forEach(function(c) {
      var avatarHTML = c.avatar ? '<img class="avatar-img" src="' + U.escapeHtml(c.avatar) + '" alt="" />' : '<span class="avatar-text" style="font-size:12px;color:#999">' + U.escapeHtml(c.name[0]) + '</span>';
      charChips += '<span class="character-chip" data-id="' + c.id + '"><span class="chip-avatar">' + avatarHTML + '</span>' + U.escapeHtml(c.name) + '</span>';
    });

    var tagFilters = '';
    if (allTags.length > 0) {
      tagFilters = '<span class="filter-tag active" data-tag="">全部</span>';
      allTags.forEach(function(t) { tagFilters += '<span class="filter-tag" data-tag="' + U.escapeHtml(t) + '">' + U.escapeHtml(t) + '</span>'; });
    }

    var contentHTML = '';
    formattedContents.forEach(function(item) {
      contentHTML +=
        '<div class="content-card fade-in" data-character="' + item.characterId + '" data-tags="' + (item.tags || []).join(',') + '" data-time="' + item.createdAt + '">' +
        '<div class="card-header" data-char-id="' + item.characterId + '">' +
        '<div class="header-avatar">' +
        (item.characterAvatar ? '<img class="avatar-img" src="' + U.escapeHtml(item.characterAvatar) + '" alt="" />' : '<span class="avatar-text">' + U.escapeHtml(item.characterName[0] || '?') + '</span>') +
        '</div><span class="header-name">' + U.escapeHtml(item.characterName) + '</span><span class="header-time">' + U.escapeHtml(item.formattedTime) + '</span></div>';
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
        '<span class="' + (item.isFavorite ? 'fav-active' : '') + '" data-toggle-fav="' + item.id + '">' + (item.isFavorite ? '⭐ 收藏' : '☆ 收藏') + '</span>' +
        '<span data-edit-content="' + item.id + '" data-char-id="' + item.characterId + '">编辑</span>' +
        '</div></div>';
    });

    return {
      html:
        '<div class="list-page">' +
        '<div class="filter-section">' +
        '<div class="filter-row"><span class="filter-label">人物</span><div class="character-selector">' + charChips + '</div></div>' +
        (allTags.length > 0 ? '<div class="filter-row"><span class="filter-label">标签</span><div class="filter-tags">' + tagFilters + '</div></div>' : '') +
        '</div>' +
        '<div class="sort-row"><span class="result-count" id="resultCount">共 ' + formattedContents.length + ' 条</span>' +
        '<div class="sort-options"><span class="sort-option active" data-sort="desc">时间↓</span></div></div>' +
        (formattedContents.length > 0 ? contentHTML : '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">暂无匹配的语录内容</div></div>') +
        '</div>',

      onRender: function() {
        var activeChar = '', activeTag = '', sortOrder = 'desc';

        function applyFilters() {
          var cards = document.querySelectorAll('.content-card');
          var count = 0;
          cards.forEach(function(card) {
            var match = true;
            if (activeChar && card.dataset.character !== activeChar) match = false;
            if (activeTag && (',' + card.dataset.tags + ',').indexOf(',' + activeTag + ',') === -1) match = false;
            card.style.display = match ? '' : 'none';
            if (match) count++;
          });
          var countEl = document.getElementById('resultCount');
          if (countEl) countEl.textContent = '共 ' + count + ' 条';
        }

        document.querySelectorAll('.character-chip').forEach(function(chip) {
          chip.addEventListener('click', function() {
            document.querySelectorAll('.character-chip').forEach(function(c) { c.classList.remove('active'); });
            chip.classList.add('active');
            activeChar = chip.dataset.id;
            applyFilters();
          });
        });

        document.querySelectorAll('.filter-tag').forEach(function(tag) {
          tag.addEventListener('click', function() {
            document.querySelectorAll('.filter-tag').forEach(function(t) { t.classList.remove('active'); });
            tag.classList.add('active');
            activeTag = tag.dataset.tag;
            applyFilters();
          });
        });

        var sortOption = document.querySelector('.sort-option');
        if (sortOption) {
          sortOption.addEventListener('click', function() {
            sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
            var container = document.querySelector('.list-page');
            var cards = Array.from(container.querySelectorAll('.content-card:not([style*="display: none"])'));
            cards.sort(function(a, b) {
              return sortOrder === 'desc' ? parseInt(b.dataset.time) - parseInt(a.dataset.time) : parseInt(a.dataset.time) - parseInt(b.dataset.time);
            });
            cards.forEach(function(c) { container.appendChild(c); });
            this.textContent = '时间' + (sortOrder === 'desc' ? '↓' : '↑');
          });
        }

        document.querySelectorAll('.card-header').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            JYS.App.navigateTo('/character/detail?id=' + el.dataset.charId);
          });
        });

        document.querySelectorAll('[data-toggle-fav]').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            S.toggleFavorite(el.dataset.toggleFav).then(function() {
              JYS.App.navigateTo('/contents');
            });
          });
        });

        document.querySelectorAll('[data-edit-content]').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            JYS.App.navigateTo('/content/edit?id=' + el.dataset.editContent + '&characterId=' + el.dataset.charId);
          });
        });
      }
    };
  });
};