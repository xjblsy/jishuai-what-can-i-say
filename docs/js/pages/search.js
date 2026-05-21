var JYS = window.JYS = window.JYS || {};
JYS.Pages = JYS.Pages || {};

JYS.Pages.search = function(params) {
  var S = JYS.Storage;
  var U = JYS.Util;
  var hotTags = ['经典语录', '搞笑段子', '人生感悟', '金句', '毒鸡汤'];

  return {
    html:
      '<div class="search-page">' +
      '<div class="search-bar-area">' +
      '<div class="search-input-wrapper">' +
      '<span class="search-icon">🔍</span>' +
      '<input id="searchInput" placeholder="搜索人物或语录内容..." value="" />' +
      '<span class="clear-btn hidden" id="clearSearch">✕</span>' +
      '</div></div>' +
      '<div class="search-tips" id="searchTips">' +
      '<span class="tips-title">热门搜索</span>' +
      '<div class="hot-tags">' +
      hotTags.map(function(t) { return '<span class="hot-tag-item" data-tag="' + U.escapeHtml(t) + '">' + U.escapeHtml(t) + '</span>'; }).join('') +
      '</div></div>' +
      '<div id="searchResults" style="display:none">' +
      '<div class="result-info" id="resultInfo"></div>' +
      '<div id="charResults"></div>' +
      '<div class="section-divider hidden" id="divider"></div>' +
      '<div class="result-list" id="contentResults"></div>' +
      '<div class="no-result hidden" id="noResult">' +
      '<div class="no-result-icon">🔍</div>' +
      '<div class="no-result-text">未找到相关结果</div>' +
      '</div>' +
      '<div class="result-loading" id="resultLoading" style="display:none">' +
      '<div class="loading-spinner"></div>' +
      '<div class="loading-text">搜索中...</div>' +
      '</div></div>',

    onRender: function() {
      var searchInput = document.getElementById('searchInput');
      var clearBtn = document.getElementById('clearSearch');
      var searchTips = document.getElementById('searchTips');
      var searchResults = document.getElementById('searchResults');
      var resultLoading = document.getElementById('resultLoading');

      var debouncedSearch = U.debounce(function() {
        var keyword = searchInput.value.trim();
        if (keyword) {
          doSearch(keyword);
        } else {
          searchTips.style.display = '';
          searchResults.style.display = 'none';
        }
      }, 300);

      searchInput.addEventListener('input', function() {
        clearBtn.classList.toggle('hidden', !searchInput.value);
        debouncedSearch();
      });

      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          var kw = searchInput.value.trim();
          if (kw) doSearch(kw);
        }
      });

      clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearBtn.classList.add('hidden');
        searchTips.style.display = '';
        searchResults.style.display = 'none';
      });

      document.querySelectorAll('.hot-tag-item').forEach(function(tag) {
        tag.addEventListener('click', function() {
          searchInput.value = tag.dataset.tag;
          clearBtn.classList.remove('hidden');
          doSearch(tag.dataset.tag);
        });
      });

      var searching = false;

      function doSearch(keyword) {
        if (searching) return;
        searching = true;
        var kw = keyword.toLowerCase();
        searchTips.style.display = 'none';
        searchResults.style.display = '';
        resultLoading.style.display = '';

        Promise.all([
          S.getCharacters(),
          S.getContents()
        ]).then(function(results) {
          var characters = results[0];
          var contents = results[1];

          var charResults = characters.filter(function(c) {
            return c.name.toLowerCase().indexOf(kw) !== -1 ||
              (c.nickname && c.nickname.toLowerCase().indexOf(kw) !== -1);
          }).map(function(c) {
            return {
              id: c.id,
              name: c.name,
              avatar: c.avatar,
              contentCount: c.contentCount
            };
          });

          var contentResults = contents.filter(function(c) {
            return (c.text && c.text.toLowerCase().indexOf(kw) !== -1) ||
              (c.tags && c.tags.some(function(t) { return t.toLowerCase().indexOf(kw) !== -1; }));
          }).map(function(c) {
            var character = characters.find(function(ch) { return ch.id === c.characterId; });
            return {
              id: c.id,
              characterId: c.characterId,
              characterName: character ? character.name : '未知',
              characterAvatar: character ? character.avatar : '',
              text: c.text,
              images: c.images || [],
              tags: c.tags || [],
              formattedTime: U.formatTime(c.createdAt)
            };
          });

          var total = charResults.length + contentResults.length;
          document.getElementById('resultInfo').textContent = '共找到 ' + total + ' 个结果';

          var charHTML = '';
          if (charResults.length > 0) {
            charResults.forEach(function(c) {
              charHTML +=
                '<div class="char-result-item" data-id="' + c.id + '">' +
                '<div class="char-avatar">' +
                (c.avatar ? '<img class="avatar-img" src="' + U.escapeHtml(c.avatar) + '" alt="" />' :
                '<span class="avatar-text">' + U.escapeHtml(c.name[0] || '?') + '</span>') +
                '</div>' +
                '<div class="char-info">' +
                '<span class="char-name">' + U.escapeHtml(c.name) + '</span>' +
                '<span class="char-count">' + (c.contentCount || 0) + '条语录</span>' +
                '</div></div>';
            });
          }

          var contHTML = '';
          if (contentResults.length > 0) {
            contentResults.forEach(function(item) {
              contHTML +=
                '<div class="result-item fade-in" data-id="' + item.id + '" data-char-id="' + item.characterId + '">' +
                '<div class="item-header" data-char-id="' + item.characterId + '">' +
                '<div class="header-avatar">' +
                (item.characterAvatar ? '<img class="avatar-img" src="' + U.escapeHtml(item.characterAvatar) + '" alt="" />' :
                '<span class="avatar-text">' + U.escapeHtml(item.characterName[0] || '?') + '</span>') +
                '</div>' +
                '<span class="header-name">' + U.escapeHtml(item.characterName) + '</span>' +
                '<span class="header-time">' + U.escapeHtml(item.formattedTime) + '</span>' +
                '</div>';
              if (item.text) {
                contHTML += '<div class="item-text">' + U.escapeHtml(item.text) + '</div>';
              }
              if (item.images && item.images.length > 0) {
                contHTML += '<div class="item-images">';
                item.images.forEach(function(img) {
                  contHTML += '<div class="item-image"><img class="image" src="' + U.escapeHtml(img) + '" alt="" onclick="JYS.Pages._previewImg(\'' + U.escapeJsStr(img) + '\')" /></div>';
                });
                contHTML += '</div>';
              }
              if (item.tags && item.tags.length > 0) {
                contHTML += '<div class="item-tags">';
                item.tags.forEach(function(t) { contHTML += '<span class="tag tag-primary">' + U.escapeHtml(t) + '</span>'; });
                contHTML += '</div>';
              }
              contHTML += '</div>';
            });
          }

          resultLoading.style.display = 'none';
          document.getElementById('charResults').innerHTML = charHTML;
          document.getElementById('contentResults').innerHTML = contHTML;
          document.getElementById('divider').classList.toggle('hidden', !(charResults.length > 0 && contentResults.length > 0));
          document.getElementById('noResult').classList.toggle('hidden', total > 0);

          document.querySelectorAll('.char-result-item').forEach(function(el) {
            el.addEventListener('click', function() {
              JYS.App.navigateTo('/character/detail?id=' + el.dataset.id);
            });
          });

          document.querySelectorAll('.result-item').forEach(function(el) {
            el.addEventListener('click', function() {
              JYS.App.navigateTo('/content/edit?id=' + el.dataset.id + '&characterId=' + el.dataset.charId);
            });
          });

          document.querySelectorAll('.result-item .item-header').forEach(function(el) {
            el.addEventListener('click', function(e) {
              e.stopPropagation();
              JYS.App.navigateTo('/character/detail?id=' + el.dataset.charId);
            });
          });

          searching = false;
        }).catch(function() {
          resultLoading.style.display = 'none';
          document.getElementById('noResult').classList.remove('hidden');
          searching = false;
        });
      }
    }
  };
};