var JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};

JYS.Pages.home = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;

  return Promise.all([
    S.getCharacters(),
    S.getContents(),
    S.getFavorites()
  ]).then(function(results) {
    var characters = results[0];
    var allContents = results[1];
    var favorites = results[2];

    var hour = new Date().getHours();
    var greeting = '早上好 ☀️';
    if (hour >= 12 && hour < 14) greeting = '中午好 🌤️';
    else if (hour >= 14 && hour < 18) greeting = '下午好 🌈';
    else if (hour >= 18 && hour < 22) greeting = '晚上好 🌙';
    else if (hour >= 22 || hour < 6) greeting = '夜深了 🌃';

    var recentContents = allContents.slice(0, 10).map(function(content) {
      var character = characters.find(function(c) { return c.id === content.characterId; });
      return {
        id: content.id,
        characterId: content.characterId,
        characterName: character ? character.name : '未知',
        characterAvatar: character ? character.avatar : '',
        text: content.text,
        images: content.images || [],
        tags: content.tags || [],
        isFavorite: content.isFavorite,
        formattedTime: U.formatTime(content.createdAt)
      };
    });

    var posterHTML = '';
    if (characters.length > 0) {
      posterHTML =
        '<div class="poster-section">' +
        '<div class="poster-section-header">' +
        '<span class="title">人物海报</span>' +
        '<a class="more" href="#/characters">查看全部 ›</a>' +
        '</div>' +
        '<div class="poster-swiper" id="posterSwiper">';
      characters.forEach(function(c, i) {
        posterHTML +=
          '<div class="poster-card' + (i === 0 ? ' active' : '') + '" data-id="' + c.id + '" data-index="' + i + '">' +
          '<div class="poster-bg">' +
          (c.avatar ? '<img class="poster-bg-img" src="' + U.escapeHtml(c.avatar) + '" alt="" />' :
          '<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)"></div>') +
          '</div>' +
          '<div class="poster-gradient"></div>' +
          '<div class="poster-gradient-top"></div>' +
          '<div class="poster-content">' +
          '<div class="poster-avatar-row">' +
          '<div class="poster-mini-avatar">' +
          (c.avatar ? '<img class="avatar-img" src="' + U.escapeHtml(c.avatar) + '" alt="" />' :
          '<div class="avatar-placeholder"><span>' + U.escapeHtml(c.name[0] || '?') + '</span></div>') +
          '</div>' +
          '<span class="poster-name">' + U.escapeHtml(c.name) + '</span>' +
          '</div>' +
          '<div class="poster-info-row">' +
          '<span class="poster-info-tag accent">' + (c.contentCount || 0) + '条语录</span>' +
          (c.nickname ? '<span class="poster-info-tag">' + U.escapeHtml(c.nickname) + '</span>' : '') +
          (c.remark ? '<span class="poster-info-tag">' + U.escapeHtml(c.remark) + '</span>' : '') +
          '</div>' +
          '</div>' +
          '</div>';
      });
      posterHTML += '</div>' +
        '<div class="poster-progress" id="posterProgress">';
      characters.forEach(function(c, i) {
        posterHTML += '<span class="progress-dot' + (i === 0 ? ' active' : '') + (c.contentCount > 0 ? ' has-content' : '') + '" data-index="' + i + '"></span>';
      });
      posterHTML += '</div></div>';
    } else {
      posterHTML =
        '<div class="poster-section">' +
        '<div class="poster-empty">' +
        '<div class="empty-icon">🎬</div>' +
        '<div class="empty-text">还没有添加人物<br>创建第一个角色海报吧</div>' +
        '<a class="empty-btn" href="#/character/edit">添加人物</a>' +
        '</div></div>';
    }

    var contentHTML = '';
    if (recentContents.length > 0) {
      contentHTML = '<div class="content-list">';
      recentContents.forEach(function(item) {
        contentHTML +=
          '<div class="content-item fade-in" data-id="' + item.id + '" data-character-id="' + item.characterId + '" onclick="JYS.Pages._goContentEdit(\'' + U.escapeJsStr(item.id) + '\',\'' + U.escapeJsStr(item.characterId) + '\')">' +
          '<div class="content-item-header">' +
          '<div class="item-avatar">' +
          (item.characterAvatar ? '<img class="avatar-img" src="' + U.escapeHtml(item.characterAvatar) + '" alt="" />' :
          '<span class="avatar-text">' + U.escapeHtml(item.characterName[0] || '?') + '</span>') +
          '</div>' +
          '<span class="item-name">' + U.escapeHtml(item.characterName) + '</span>' +
          '<span class="item-time">' + U.escapeHtml(item.formattedTime) + '</span>' +
          '</div>' +
          '<div class="content-item-text">' + U.escapeHtml(item.text || '') + '</div>';
        if (item.images && item.images.length > 0) {
          contentHTML += '<div class="content-item-images">';
          item.images.forEach(function(img, i) {
            contentHTML += '<div class="content-item-image" onclick="event.stopPropagation();JYS.Pages._previewImg(\'' + U.escapeJsStr(img) + '\')"><img class="image" src="' + U.escapeHtml(img) + '" alt="" /></div>';
          });
          contentHTML += '</div>';
        }
        if (item.tags && item.tags.length > 0) {
          contentHTML += '<div class="content-item-tags">';
          item.tags.forEach(function(t) { contentHTML += '<span class="tag tag-primary">' + U.escapeHtml(t) + '</span>'; });
          contentHTML += '</div>';
        }
        contentHTML +=
          '<div class="content-item-footer">' +
          '<span class="footer-action' + (item.isFavorite ? ' active' : '') + '" onclick="event.stopPropagation();JYS.Pages._toggleFavHome(\'' + U.escapeJsStr(item.id) + '\')">' + (item.isFavorite ? '⭐ 收藏' : '☆ 收藏') + '</span>' +
          '<span class="footer-action" onclick="event.stopPropagation();JYS.Pages._shareContent(\'' + U.escapeJsStr(item.id) + '\')">分享</span>' +
          '</div></div>';
      });
      contentHTML += '</div>';
    } else {
      contentHTML =
        '<div class="empty-state">' +
        '<div class="empty-icon">📝</div>' +
        '<div class="empty-text">还没有记录任何语录<br>快去添加第一条吧</div>' +
        '</div>';
    }

    return {
      html:
        '<div class="home-page">' +
        '<div class="home-header">' +
        '<div class="header-top">' +
        '<span class="header-greeting">' + greeting + '</span>' +
        '<a class="header-search-btn" href="#/search">🔍</a>' +
        '</div>' +
        '<span class="header-subtitle">记录每一个高光时刻</span>' +
        '<div class="stats-row">' +
        '<div class="stat-card"><span class="stat-number">' + characters.length + '</span><span class="stat-label">人物</span></div>' +
        '<div class="stat-card"><span class="stat-number">' + allContents.length + '</span><span class="stat-label">语录</span></div>' +
        '<div class="stat-card"><span class="stat-number">' + favorites.length + '</span><span class="stat-label">收藏</span></div>' +
        '</div>' +
        '</div>' +
        posterHTML +
        '<div class="quick-section">' +
        '<div class="section-header"><span class="title">快捷操作</span></div>' +
        '<div class="quick-actions">' +
        '<a class="quick-action-item" href="#/character/edit"><div class="action-icon blue">👤</div><span class="action-name">添加人物</span></a>' +
        '<a class="quick-action-item" href="#/content/edit"><div class="action-icon red">✍️</div><span class="action-name">记录语录</span></a>' +
        '<a class="quick-action-item" href="#/search"><div class="action-icon green">🔍</div><span class="action-name">搜索</span></a>' +
        '<a class="quick-action-item" href="#/favorites"><div class="action-icon orange">⭐</div><span class="action-name">收藏</span></a>' +
        '</div></div>' +
        '<div class="content-section">' +
        '<div class="section-header"><span class="title">最新语录</span>' + (recentContents.length > 0 ? '<a class="more" href="#/contents">查看全部 ›</a>' : '') + '</div>' +
        contentHTML +
        '</div>' +
        '<div class="add-fab" onclick="JYS.Pages._quickAdd()">+</div>',

      onRender: function() {
        var swiper = document.getElementById('posterSwiper');
        if (!swiper) return;

        var cards = swiper.querySelectorAll('.poster-card');
        var dots = document.querySelectorAll('#posterProgress .progress-dot');
        var current = 0;
        var total = cards.length;
        var autoTimer = null;
        var isDragging = false, startX = 0, movedX = 0;
        var listeners = [];

        function on(name, el, fn) {
          el.addEventListener(name, fn);
          listeners.push({ name: name, el: el, fn: fn });
        }

        function cleanupAll() {
          listeners.forEach(function(l) { l.el.removeEventListener(l.name, l.fn); });
          listeners = [];
        }

        function goTo(index) {
          if (index < 0) index = total - 1;
          if (index >= total) index = 0;
          cards.forEach(function(c) { c.classList.remove('active'); });
          dots.forEach(function(d) { d.classList.remove('active'); });
          cards[index].classList.add('active');
          dots[index].classList.add('active');
          current = index;
        }

        function next() { goTo(current + 1); }

        function startAuto() {
          stopAuto();
          autoTimer = setInterval(next, 4000);
        }
        function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }
        function resetAuto() { stopAuto(); startAuto(); }

        on('mousedown', swiper, function(e) {
          isDragging = true; startX = e.clientX; stopAuto();
        });
        on('touchstart', swiper, function(e) {
          isDragging = true; startX = e.touches[0].clientX; stopAuto();
        });

        on('mouseup', window, function(e) {
          if (!isDragging) return;
          isDragging = false;
          var diff = e.clientX - startX;
          if (Math.abs(diff) > 40) { goTo(current + (diff > 0 ? -1 : 1)); }
          startAuto();
        });
        on('touchend', swiper, function(e) {
          if (!isDragging) return;
          isDragging = false;
          var diff = (e.changedTouches[0].clientX || startX) - startX;
          if (Math.abs(diff) > 40) { goTo(current + (diff > 0 ? -1 : 1)); }
          startAuto();
        });

        cards.forEach(function(card) {
          card.addEventListener('click', function(e) {
            if (Math.abs(movedX) > 10) { movedX = 0; return; }
            var id = card.dataset.id;
            if (id) JYS.App.navigateTo('/character/detail?id=' + id);
          });
        });

        document.querySelectorAll('#posterProgress .progress-dot').forEach(function(dot) {
          dot.addEventListener('click', function() {
            goTo(parseInt(dot.dataset.index));
            resetAuto();
          });
        });

        startAuto();
          JYS.Pages._homeTimer = autoTimer;
          JYS.Pages._homeCleanup = function() { cleanupAll(); stopAuto(); JYS.Pages._homeTimer = null; };
        },
        onCleanup: function() {
          if (JYS.Pages._homeCleanup) { JYS.Pages._homeCleanup(); JYS.Pages._homeCleanup = null; }
        }
      };
    });
};

JYS.Pages._goContentEdit = function(id, characterId) {
  JYS.App.navigateTo('/content/edit?id=' + id + '&characterId=' + characterId);
};

JYS.Pages._toggleFavHome = function(id) {
  JYS.Storage.toggleFavorite(id).then(function() {
    JYS.App.navigateTo('/home');
  });
};

JYS.Pages._previewImg = function(url) {
  var overlay = document.createElement('div');
  overlay.className = 'img-preview-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '图片预览');
  var img = document.createElement('img');
  img.src = url;
  img.alt = '';
  overlay.appendChild(img);
  var escHandler = function(e) { if (e.key === 'Escape') closePreview(); };
  var closePreview = function() {
    document.body.removeChild(overlay);
    document.removeEventListener('keydown', escHandler);
  };
  overlay.onclick = closePreview;
  document.addEventListener('keydown', escHandler);
  document.body.appendChild(overlay);
};

JYS.Pages._shareContent = function(id) {
  JYS.Storage.getContentById(id).then(function(content) {
    if (content && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content.text || '分享自集英社').then(function() {
        JYS.Util.showToast('内容已复制，可粘贴分享', 'success');
      }).catch(function() {
        JYS.Util.showToast('复制失败', 'error');
      });
    }
  });
};

JYS.Pages._quickAdd = function() {
  JYS.Storage.getCharacters().then(function(characters) {
    if (characters.length === 0) {
      JYS.Util.showConfirm('提示', '请先添加一个人物，再记录语录', '去添加', '取消').then(function() {
        JYS.App.navigateTo('/character/edit');
      }).catch(function() {});
      return;
    }
    JYS.App.navigateTo('/content/edit');
  });
};