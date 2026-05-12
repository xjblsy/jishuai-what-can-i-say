JYS.Pages.characterList = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;
  var characters = S.getCharacters();
  var viewMode = localStorage.getItem('char_view_mode') || 'grid';

  var gridHTML = '';
  var listHTML = '';
  characters.forEach(function(c) {
    var avatarHTML = c.avatar ? '<img class="avatar-img" src="' + U.escapeHtml(c.avatar) + '" alt="" />' : '<span class="avatar-text">' + U.escapeHtml(c.name[0] || '?') + '</span>';
    gridHTML +=
      '<div class="character-card" data-id="' + c.id + '">' +
      '<div class="card-avatar">' + avatarHTML + '</div>' +
      '<span class="card-name">' + U.escapeHtml(c.name) + '</span>' +
      (c.nickname ? '<span class="card-nickname">' + U.escapeHtml(c.nickname) + '</span>' : '') +
      '<span class="card-count">' + (c.contentCount || 0) + '条</span>' +
      '</div>';
    listHTML +=
      '<div class="character-item" data-id="' + c.id + '">' +
      '<div class="item-avatar">' + avatarHTML + '</div>' +
      '<div class="item-info">' +
      '<span class="item-name">' + U.escapeHtml(c.name) + '</span>' +
      (c.nickname ? '<span class="item-nickname">昵称: ' + U.escapeHtml(c.nickname) + '</span>' : '') +
      '<span class="item-count">' + (c.contentCount || 0) + '条语录</span>' +
      '</div>' +
      '<span class="item-arrow">›</span>' +
      '</div>';
  });

  return {
    html:
      '<div class="character-list-page">' +
      '<div class="search-bar">' +
      '<span class="search-icon">🔍</span>' +
      '<input id="charSearchInput" placeholder="搜索人物..." value="" />' +
      '</div>' +
      '<div class="view-toggle">' +
      '<span class="' + (viewMode === 'grid' ? 'active' : '') + '" data-mode="grid">▦</span>' +
      '<span class="' + (viewMode === 'list' ? 'active' : '') + '" data-mode="list">☰</span>' +
      '</div>' +
      '<div class="character-grid' + (viewMode !== 'grid' || characters.length === 0 ? ' hidden' : '') + '" id="charGrid">' + gridHTML + '</div>' +
      '<div class="list-view' + (viewMode !== 'list' || characters.length === 0 ? ' hidden' : '') + '" id="charList">' + listHTML + '</div>' +
      (characters.length === 0 ? '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">还没有添加人物<br>点击右下角 + 添加</div></div>' : '') +
      '</div>' +
      '<div class="float-add-btn"><a href="#/character/edit">+</a></div>',

    onRender: function() {
      var searchInput = document.getElementById('charSearchInput');
      var gridEl = document.getElementById('charGrid');
      var listEl = document.getElementById('charList');

      var debouncedFilter = U.debounce(function() {
        var keyword = searchInput.value.trim().toLowerCase();
        var allCards = document.querySelectorAll('.character-card, .character-item');
        allCards.forEach(function(card) {
          var name = (card.querySelector('.card-name, .item-name') || {}).textContent || '';
          var nickname = (card.querySelector('.card-nickname, .item-nickname') || {}).textContent || '';
          card.style.display = (keyword && !name.toLowerCase().includes(keyword) && !nickname.toLowerCase().includes(keyword)) ? 'none' : '';
        });
      }, 300);

      searchInput.addEventListener('input', debouncedFilter);

      document.querySelectorAll('.view-toggle span').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var mode = btn.dataset.mode;
          localStorage.setItem('char_view_mode', mode);
          gridEl.classList.toggle('hidden', mode !== 'grid');
          listEl.classList.toggle('hidden', mode !== 'list');
          document.querySelectorAll('.view-toggle span').forEach(function(s) { s.classList.remove('active'); });
          btn.classList.add('active');
        });
      });

      document.querySelectorAll('.character-card, .character-item').forEach(function(card) {
        card.addEventListener('click', function() { JYS.App.navigateTo('/character/detail?id=' + card.dataset.id); });
        card.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          var id = card.dataset.id;
          var character = S.getCharacterById(id);
          if (!character) return;
          showContextMenu(e, id, character);
        });
      });

      function showContextMenu(e, id, character) {
        var menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.innerHTML =
          '<div class="context-item" data-action="edit">编辑信息</div>' +
          '<div class="context-item danger" data-action="delete">删除人物</div>';
        document.body.appendChild(menu);

        function closeMenu() { if (menu.parentNode) menu.parentNode.removeChild(menu); document.removeEventListener('click', closeMenu); }
        setTimeout(function() { document.addEventListener('click', closeMenu); }, 0);

        menu.querySelector('[data-action="edit"]').addEventListener('click', function() {
          closeMenu();
          JYS.App.navigateTo('/character/edit?id=' + id);
        });
        menu.querySelector('[data-action="delete"]').addEventListener('click', function() {
          closeMenu();
          U.showConfirm('确认删除', '确定要删除「' + character.name + '」及其所有内容吗？此操作不可恢复。', '确认删除', '取消').then(function() {
            S.deleteCharacter(id);
            U.showToast('删除成功', 'success');
            JYS.App.navigateTo('/characters');
          }).catch(function() {});
        });
      }
    }
  };
};