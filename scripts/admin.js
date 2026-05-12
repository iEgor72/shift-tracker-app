(function() {
  'use strict';

  var state = {
    panel: 'overview',
    admin: null,
    overview: null,
    users: [],
    selectedSid: '',
    selectedUserData: null,
    userTab: 'shifts',
    docsManifest: null,
    docsCategory: '',
    adminConfig: null,
    poekhaliMap: null,
    mapRouteId: 'bam-silinka-halgaso',
    selectedLearningMapId: '',
    selectedLearningSectionId: '',
  };

  var panelTitles = {
    overview: ['Главная', 'Что происходит в приложении'],
    users: ['Люди', 'Карточки пользователей, смены, поездки и карта'],
    map: ['Карта Поехали', 'Скорости, станции и светофоры без кода'],
    documents: ['Файлы', 'Документы, которые видят пользователи'],
    functions: ['Конструктор', 'Настройки, идеи и будущие функции в понятных карточках'],
    raw: ['Аварийный режим', 'Скрытая техническая правка для разработчика'],
  };

  var docCategoryLabels = {
    speeds: 'Скорости',
    folders: 'Папки',
    instructions: 'Инструкции',
    memos: 'Режимки',
    reminders: 'Памятки',
  };

  var baseMapSpeedRules = [
    { id: 'bam-18-3799896-3801977-1', routeId: 'bam-silinka-halgaso', sector: 18, start: 3799896, end: 3801977, speed: 70, wayNumber: 1, name: 'Силинка, путь 1' },
    { id: 'bam-18-3795000-3799896-0', routeId: 'bam-silinka-halgaso', sector: 18, start: 3795000, end: 3799896, speed: 70, wayNumber: 0, name: 'Силинка - ПП 3796' },
    { id: 'bam-18-3788300-3789700-1', routeId: 'bam-silinka-halgaso', sector: 18, start: 3788300, end: 3789700, speed: 60, wayNumber: 1, name: 'ПП 3796, путь 1' },
    { id: 'bam-18-3789800-3793800-1', routeId: 'bam-silinka-halgaso', sector: 18, start: 3789800, end: 3793800, speed: 60, wayNumber: 1, name: 'ПП 3796, путь 1' },
    { id: 'bam-18-3793900-3795100-1', routeId: 'bam-silinka-halgaso', sector: 18, start: 3793900, end: 3795100, speed: 70, wayNumber: 1, name: 'ПП 3796, путь 1' },
    { id: 'bam-18-3787846-3795100-2', routeId: 'bam-silinka-halgaso', sector: 18, start: 3787846, end: 3795100, speed: 70, wayNumber: 2, name: 'ПП 3796, путь 2' },
    { id: 'bam-18-3789976-3792106-1', routeId: 'bam-silinka-halgaso', sector: 18, start: 3789976, end: 3792106, speed: 40, wayNumber: 1, name: 'Хальгасо, путь 1' },
    { id: 'bam-18-3787846-3789976-2', routeId: 'bam-silinka-halgaso', sector: 18, start: 3787846, end: 3789976, speed: 70, wayNumber: 2, name: 'Хальгасо, путь 2' },
    { id: 'bam-18-3775256-3789976-0', routeId: 'bam-halgaso-lian-holoni', sector: 18, start: 3775256, end: 3789976, speed: 70, wayNumber: 0, name: 'Хальгасо - Лиан' },
    { id: 'bam-18-3763395-3775256-0', routeId: 'bam-halgaso-lian-holoni', sector: 18, start: 3763395, end: 3775256, speed: 70, wayNumber: 0, name: 'Лиан - Холони' },
    { id: 'bam-18-3763395-3766487-1', routeId: 'bam-holoni', sector: 18, start: 3763395, end: 3766487, speed: 80, wayNumber: 1, name: 'Холони, путь 1' },
    { id: 'bam-18-3760303-3763395-2', routeId: 'bam-holoni', sector: 18, start: 3760303, end: 3763395, speed: 60, wayNumber: 2, name: 'Холони, путь 2' },
    { id: 'bam-18-3751329-3763395-0', routeId: 'bam-holoni', sector: 18, start: 3751329, end: 3763395, speed: 80, wayNumber: 0, name: 'Холони - Хурмули' },
  ];

  var els = {};

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setStatus(message, type) {
    els.statusLine.textContent = message || '';
    els.statusLine.classList.toggle('is-error', type === 'error');
    els.statusLine.classList.toggle('is-ok', type === 'ok');
  }

  function formatDate(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (!isFinite(date.getTime())) return value;
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatBytes(bytes) {
    var value = Number(bytes) || 0;
    if (value < 1024) return value + ' Б';
    if (value < 1024 * 1024) return Math.round(value / 1024) + ' КБ';
    return (value / 1024 / 1024).toFixed(1) + ' МБ';
  }

  function formatDuration(ms) {
    var totalMinutes = Math.max(0, Math.round((Number(ms) || 0) / 60000));
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    if (hours && minutes) return hours + ' ч ' + minutes + ' мин';
    if (hours) return hours + ' ч';
    return minutes + ' мин';
  }

  function formatDistance(meters) {
    var value = Math.max(0, Math.round(Number(meters) || 0));
    if (value >= 1000) return (value / 1000).toFixed(value >= 10000 ? 0 : 1) + ' км';
    return value + ' м';
  }

  function formatCoordinate(value) {
    var coordinate = Math.max(0, Math.round(Number(value) || 0));
    var km = Math.floor(coordinate / 1000);
    var meter = coordinate % 1000;
    var pk = Math.floor(meter / 100) + 1;
    return km + ' км ' + pk + ' пк +' + String(meter % 100).padStart(2, '0') + ' м';
  }

  function getRuleStart(rule) {
    return Math.min(Number(rule && (rule.start || rule.coordinate)) || 0, Number(rule && rule.end) || 0);
  }

  function getRuleEnd(rule) {
    return Math.max(Number(rule && (rule.start || rule.coordinate)) || 0, Number(rule && rule.end) || 0);
  }

  function normalizeMapConfig(config) {
    var source = config && typeof config === 'object' ? config : {};
    return {
      version: 1,
      routes: Array.isArray(source.routes) ? source.routes : [],
      speedRules: Array.isArray(source.speedRules) ? source.speedRules : [],
      objects: Array.isArray(source.objects) ? source.objects : [],
      updatedAt: source.updatedAt || '',
    };
  }

  function getMapRoute(routeId) {
    var map = normalizeMapConfig(state.poekhaliMap);
    return (map.routes || []).find(function(route) { return route.id === routeId; }) || (map.routes || [])[0] || null;
  }

  function getMergedRouteSpeedRules(routeId) {
    var map = normalizeMapConfig(state.poekhaliMap);
    var overrides = {};
    map.speedRules.forEach(function(rule) {
      if (rule && rule.id) overrides[rule.id] = rule;
    });
    return baseMapSpeedRules
      .filter(function(rule) { return !routeId || rule.routeId === routeId; })
      .map(function(rule) { return Object.assign({}, rule, overrides[rule.id] || {}, { baseId: rule.id }); })
      .concat(map.speedRules.filter(function(rule) {
        return rule && rule.routeId === routeId && !baseMapSpeedRules.some(function(base) { return base.id === rule.id; });
      }));
  }

  function getCoordinateBounds(items, keys) {
    var values = [];
    (items || []).forEach(function(item) {
      (keys || ['coordinate', 'start', 'end']).forEach(function(key) {
        var value = Number(item && item[key]);
        if (isFinite(value)) values.push(value);
      });
    });
    if (!values.length) return { min: 0, max: 1000 };
    var min = Math.max(0, Math.min.apply(Math, values));
    var max = Math.max.apply(Math, values);
    if (max <= min) max = min + 1000;
    var padding = Math.max(100, Math.round((max - min) * 0.08));
    return { min: Math.max(0, min - padding), max: max + padding };
  }

  function coordinatePercent(value, bounds) {
    var min = Number(bounds && bounds.min) || 0;
    var max = Number(bounds && bounds.max) || (min + 1);
    var current = Math.max(min, Math.min(max, Number(value) || 0));
    return Math.max(0, Math.min(100, ((current - min) / Math.max(1, max - min)) * 100));
  }

  function getJsonText(value) {
    return JSON.stringify(value || {}, null, 2);
  }

  function parseJsonTextarea(id) {
    var raw = $('#' + id).value;
    return raw.trim() ? JSON.parse(raw) : {};
  }

  function getPercent(value, total) {
    var current = Math.max(0, Number(value) || 0);
    var max = Math.max(1, Number(total) || 0);
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  }

  function sumStorageBytes(storage) {
    return ['shifts', 'salaryParams', 'poekhaliLearning', 'poekhaliWarnings', 'poekhaliRuns'].reduce(function(sum, key) {
      return sum + Number(storage && storage[key] && storage[key].bytes || 0);
    }, 0);
  }

  function getStoredSessionToken() {
    try {
      return localStorage.getItem('shift_tracker_session_token') || '';
    } catch (_) {
      return '';
    }
  }

  function getAuthHeaders(extraHeaders) {
    var headers = extraHeaders && typeof extraHeaders === 'object' ? Object.assign({}, extraHeaders) : {};
    var token = getStoredSessionToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  function request(resource, options) {
    var params = new URLSearchParams();
    params.set('resource', resource);
    if (options && options.sid) params.set('sid', options.sid);
    return fetch('/api/admin?' + params.toString(), {
      method: options && options.method ? options.method : 'GET',
      headers: getAuthHeaders({ 'Content-Type': 'application/json; charset=utf-8' }),
      credentials: 'same-origin',
      body: options && options.body ? JSON.stringify(options.body) : undefined,
    }).then(function(response) {
      return response.text().then(function(text) {
        var body = text ? JSON.parse(text) : {};
        if (!response.ok) {
          throw new Error(body && body.error ? body.error : ('HTTP ' + response.status));
        }
        return body;
      });
    });
  }

  function isTechModeAllowed() {
    try {
      return new URLSearchParams(window.location.search || '').get('tech') === '1';
    } catch (_) {
      return false;
    }
  }

  function checkAdmin() {
    setStatus('Проверяю доступ...');
    return fetch('/api/admin/me', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    })
      .then(function(response) {
        return response.text().then(function(text) {
          var body = text ? JSON.parse(text) : {};
          if (!response.ok) throw new Error(body.error || 'Нет доступа');
          return body;
        });
      })
      .then(function(body) {
        state.admin = body.user || null;
        document.body.classList.remove('admin-locked');
        els.adminUser.textContent = state.admin
          ? ((state.admin.display_name || state.admin.username || ('ID ' + state.admin.id)) + ' · admin')
          : 'Администратор';
      });
  }

  function showAccessDenied(error) {
    var message = error && error.message ? error.message : 'Доступ закрыт';
    document.body.classList.remove('admin-locked');
    document.body.classList.add('admin-denied');
    els.adminUser.textContent = 'Нет доступа';
    setStatus('');
    els.overview.innerHTML =
      '<div class="access-denied-card">' +
        '<div class="access-denied-mark">БМ</div>' +
        '<div class="access-denied-kicker">Закрытый раздел</div>' +
        '<h2>Панель управления доступна только администратору</h2>' +
        '<p>Обычные пользователи могут пользоваться приложением, но не видят данные других людей, документы и настройки.</p>' +
        '<div class="access-denied-actions">' +
          '<a class="btn-primary" href="/">Вернуться в приложение</a>' +
          '<button class="btn" id="btnDeniedRefresh" type="button">Проверить ещё раз</button>' +
        '</div>' +
        '<div class="access-denied-note">' + escapeHtml(message === 'Admin access is not configured for this account' ? 'Если ты администратор, войди в приложение под своим Telegram-аккаунтом и обнови страницу.' : message) + '</div>' +
      '</div>';
    els.overview.classList.add('is-active');
    var btn = $('#btnDeniedRefresh');
    if (btn) btn.addEventListener('click', function() { window.location.reload(); });
  }

  function loadOverview() {
    return request('overview').then(function(data) {
      state.overview = data;
    });
  }

  function loadUsers() {
    return request('users').then(function(data) {
      state.users = data.users || [];
    });
  }

  function loadUser(sid) {
    state.selectedSid = sid;
    state.selectedLearningMapId = '';
    state.selectedLearningSectionId = '';
    return request('user', { sid: sid }).then(function(data) {
      state.selectedUserData = data;
    });
  }

  function loadDocs() {
    return request('docsManifest').then(function(data) {
      state.docsManifest = data.manifest || {};
      if (!state.docsCategory) {
        state.docsCategory = Object.keys(state.docsManifest)[0] || 'speeds';
      }
    });
  }

  function loadConfig() {
    return request('adminConfig').then(function(data) {
      var config = data.config || {};
      state.adminConfig = {
        version: 1,
        features: Array.isArray(config.features) ? config.features : [],
        calculationVariants: Array.isArray(config.calculationVariants) ? config.calculationVariants : [],
        notes: config.notes || '',
        updatedAt: config.updatedAt || '',
      };
    });
  }

  function loadPoekhaliMap() {
    return request('poekhaliMap').then(function(data) {
      state.poekhaliMap = normalizeMapConfig(data.map);
      if (!getMapRoute(state.mapRouteId)) {
        state.mapRouteId = state.poekhaliMap.routes[0] ? state.poekhaliMap.routes[0].id : '';
      }
    });
  }

  function switchPanel(panel) {
    if (panel === 'raw' && !isTechModeAllowed()) panel = 'overview';
    if (!panelTitles[panel]) panel = 'overview';
    state.panel = panel;
    $all('.admin-nav-btn').forEach(function(btn) {
      btn.classList.toggle('is-active', btn.dataset.panel === panel);
    });
    $all('.panel').forEach(function(section) {
      section.classList.toggle('is-active', section.dataset.panel === panel);
    });
    var title = panelTitles[panel] || panelTitles.overview;
    els.pageTitle.textContent = title[0];
    els.pageNote.textContent = title[1];
    render();
  }

  function renderOverview() {
    var data = state.overview;
    var panel = els.overview;
    if (!data) {
      panel.innerHTML = '<div class="empty">Данные ещё не загружены.</div>';
      return;
    }
    var storage = data.storage || {};
    var stats = data.stats || {};
    var onlinePercent = getPercent(stats.onlineUsers, stats.totalUsers);
    var totalBytes = sumStorageBytes(storage);
    panel.innerHTML =
      '<div class="welcome-card">' +
        '<div>' +
          '<div class="welcome-kicker">Что здесь делать</div>' +
          '<div class="welcome-title">Это пульт управления без кода</div>' +
          '<div class="welcome-text">Открывай карточки слева направо: люди, карта Поехали, файлы. Технические данные спрятаны и не мешают обычной работе.</div>' +
        '</div>' +
        '<div class="welcome-actions">' +
          '<button class="btn-primary" type="button" data-jump-panel="users">Открыть людей</button>' +
          '<button class="btn" type="button" data-jump-panel="map">Редактировать карту</button>' +
          '<button class="btn" type="button" data-jump-panel="documents">Загрузить файлы</button>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-3">' +
        metricCard('Людей в приложении', stats.totalUsers, 'Все, кто хотя бы раз заходил или имеет смены', 'users') +
        metricCard('Сейчас онлайн', stats.onlineUsers, 'Зелёная полоска показывает долю онлайн', 'online', onlinePercent) +
        metricCard('Документов в базе', data.docs && data.docs.totalFiles, 'Файлы из раздела "Документы"', 'docs') +
      '</div>' +
      '<div class="grid grid-2" style="margin-top:12px">' +
        '<div class="card"><div class="card-title">Что уже заполнено</div>' +
          '<div class="muted card-help">Это простая шкала: где полоска длиннее, там больше записей.</div>' +
          storageLine('Смены людей', storage.shifts, totalBytes) +
          storageLine('Настройки зарплаты', storage.salaryParams, totalBytes) +
          storageLine('Карты и светофоры', storage.poekhaliLearning, totalBytes) +
          storageLine('Ограничения скорости', storage.poekhaliWarnings, totalBytes) +
          storageLine('Поездки', storage.poekhaliRuns, totalBytes) +
        '</div>' +
        '<div class="card"><div class="card-title">Куда нажимать</div>' +
          guideItem('Люди', 'Карточки пользователей: смены, зарплата, поездки, ограничения и карта.', 'users') +
          guideItem('Файлы', 'Перетащи документ, дай ему название и подпись. Он появится в приложении.', 'documents') +
          guideItem('Конструктор', 'Карточки будущих функций и вариантов расчёта без программирования.', 'functions') +
          '<div class="health-strip"><span>Доступ администратора</span><strong>' + (data.app && data.app.adminIdsConfigured ? 'настроен' : 'не настроен') + '</strong></div>' +
          '<div class="health-strip"><span>Обновление админки</span><strong>без fresh-ссылок</strong></div>' +
        '</div>' +
      '</div>';
    $all('[data-jump-panel], [data-guide-panel]', panel).forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchPanel(btn.dataset.jumpPanel || btn.dataset.guidePanel);
      });
    });
  }

  function metricCard(label, value, note, tone, percent) {
    var safePercent = typeof percent === 'number' ? percent : Math.min(100, Math.max(8, Number(value) ? 70 : 8));
    return '<div class="card metric metric--' + escapeHtml(tone || 'default') + '">' +
      '<div class="metric-top"><div class="metric-label">' + escapeHtml(label) + '</div><div class="metric-dot"></div></div>' +
      '<div class="metric-value">' + escapeHtml(value === undefined ? '—' : value) + '</div>' +
      '<div class="meter"><span style="width:' + safePercent + '%"></span></div>' +
      '<div class="muted">' + escapeHtml(note || '') + '</div></div>';
  }

  function storageLine(label, row, totalBytes) {
    row = row || {};
    var percent = getPercent(row.bytes || 0, totalBytes || row.bytes || 1);
    return '<div class="storage-line">' +
      '<div class="storage-line-top"><span>' + escapeHtml(label) + '</span><strong>' +
      escapeHtml(row.files || 0) + ' файлов · ' + formatBytes(row.bytes || 0) + '</strong></div>' +
      '<div class="meter meter--thin"><span style="width:' + Math.max(3, percent) + '%"></span></div>' +
    '</div>';
  }

  function guideItem(title, text, panel) {
    return '<button class="guide-item" type="button" data-guide-panel="' + escapeHtml(panel) + '">' +
      '<span class="guide-title">' + escapeHtml(title) + '</span>' +
      '<span class="guide-text">' + escapeHtml(text) + '</span>' +
    '</button>';
  }

  function moveArrayItem(items, from, to) {
    if (!Array.isArray(items)) return;
    var start = Number(from);
    var end = Number(to);
    if (!isFinite(start) || !isFinite(end) || start === end || start < 0 || end < 0 || start >= items.length || end >= items.length) return;
    var row = items.splice(start, 1)[0];
    items.splice(end, 0, row);
  }

  function bindReorderCards(root, selector, onMove) {
    var draggedIndex = null;
    $all(selector, root).forEach(function(card) {
      card.addEventListener('dragstart', function(event) {
        draggedIndex = Number(card.dataset.warningCard || card.dataset.docCard);
        card.classList.add('is-dragging');
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', function() {
        card.classList.remove('is-dragging');
        draggedIndex = null;
      });
      card.addEventListener('dragover', function(event) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      });
      card.addEventListener('drop', function(event) {
        event.preventDefault();
        var targetIndex = Number(card.dataset.warningCard || card.dataset.docCard);
        if (draggedIndex !== null && isFinite(targetIndex)) onMove(draggedIndex, targetIndex);
      });
    });
  }

  function renderUsers() {
    var panel = els.users;
    var selected = state.selectedUserData;
    panel.innerHTML =
      '<div class="friendly-note"><strong>Как пользоваться:</strong> выбери карточку человека. Справа откроются понятные вкладки: смены, зарплата, ограничения, поездки и карта. Пока не нажал "Сохранить", изменения не применятся.</div>' +
      '<div class="toolbar">' +
        '<div class="toolbar-left"><input class="input" id="userSearch" placeholder="Найти по ID или открыть нужного человека" style="width:360px" /></div>' +
        '<div class="toolbar-right"><button class="btn-primary" id="btnCreateUser" type="button">Добавить человека</button></div>' +
      '</div>' +
      '<div class="people-layout">' +
        '<div class="card"><div class="card-title">Люди в приложении</div><div id="usersTableSlot"></div></div>' +
        '<div class="card user-editor-card"><div id="userEditorSlot">' + (selected ? '' : '<div class="empty">Выбери карточку человека слева. Здесь появится управление его сменами и поездками.</div>') + '</div></div>' +
      '</div>';
    renderUsersTable(state.users);
    if (selected) renderUserEditor();
    $('#userSearch').addEventListener('input', function(event) {
      var q = event.target.value.trim().toLowerCase();
      renderUsersTable(state.users.filter(function(user) {
        return String(user.id).toLowerCase().indexOf(q) !== -1;
      }));
    });
    $('#btnCreateUser').addEventListener('click', function() {
      var sid = prompt('Введите Telegram ID человека');
      if (!sid) return;
      loadUser(sid.trim()).then(function() {
        renderUsers();
      }).catch(showError);
    });
  }

  function renderUsersTable(users) {
    var slot = $('#usersTableSlot');
    if (!users.length) {
      slot.innerHTML = '<div class="empty">Людей пока нет.</div>';
      return;
    }
    slot.innerHTML =
      '<div class="people-card-list">' +
      users.map(function(user) {
        var learning = user.learning || {};
        var initials = String(user.id || '?').slice(-2).toUpperCase();
        var isSelected = String(state.selectedSid) === String(user.id);
        return '<button class="person-card ' + (isSelected ? 'is-active' : '') + '" type="button" data-sid="' + escapeHtml(user.id) + '">' +
          '<span class="person-avatar">' + escapeHtml(initials) + '</span>' +
          '<span class="person-main"><strong>Пользователь ' + escapeHtml(user.id) + '</strong>' +
            '<span class="person-sub">' + escapeHtml(user.online ? 'сейчас в приложении' : ('последний вход: ' + formatDate(user.lastSeenAt))) + '</span></span>' +
          '<span class="person-badges">' +
            '<span>' + escapeHtml(user.shifts || 0) + ' смен</span>' +
            '<span>' + escapeHtml(user.runs || 0) + ' поездок</span>' +
            '<span>' + escapeHtml(user.warnings || 0) + ' огр.</span>' +
            '<span>' + escapeHtml(learning.maps || 0) + ' карт</span>' +
          '</span>' +
        '</button>';
      }).join('') +
      '</div>';
    $all('[data-sid]', slot).forEach(function(card) {
      card.addEventListener('click', function() {
        setStatus('Открываю карточку человека...');
        loadUser(card.dataset.sid).then(function() {
          setStatus('Карточка открыта', 'ok');
          renderUsers();
        }).catch(showError);
      });
    });
  }

  function renderUserEditor() {
    var data = state.selectedUserData;
    var slot = $('#userEditorSlot');
    slot.innerHTML =
      '<div class="toolbar"><div><div class="card-title">Человек ' + escapeHtml(data.sid) + '</div>' +
      '<div class="muted">Измени нужные карточки и нажми сохранить. Без этой кнопки ничего не применится.</div></div>' +
      '<button class="btn-primary" id="btnSaveUser" type="button">Сохранить изменения</button></div>' +
      '<div class="tabs">' + ['shifts','salary','warnings','runs','learning'].map(function(tab) {
        var labels = { shifts:'Смены', salary:'Зарплата', warnings:'Ограничения', runs:'Поездки', learning:'Карта' };
        return '<button class="tab ' + (state.userTab === tab ? 'is-active' : '') + '" data-user-tab="' + tab + '" type="button">' + labels[tab] + '</button>';
      }).join('') + '</div>' +
      '<div id="userTabSlot"></div>';
    $all('[data-user-tab]', slot).forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.userTab = btn.dataset.userTab;
        renderUserEditor();
      });
    });
    $('#btnSaveUser').addEventListener('click', saveCurrentUser);
    renderUserTab();
  }

  function renderUserTab() {
    var slot = $('#userTabSlot');
    if (state.userTab === 'shifts') return renderShiftEditor(slot);
    if (state.userTab === 'salary') return renderSalaryEditor(slot);
    if (state.userTab === 'warnings') return renderWarningsEditor(slot);
    if (state.userTab === 'runs') return renderRunsCards(slot);
    renderLearningConstructor(slot);
  }

  function renderShiftEditor(slot) {
    var shifts = state.selectedUserData.shifts || [];
    slot.innerHTML = '<div class="toolbar"><div class="muted">Всего смен: ' + shifts.length +
      '</div><button class="btn" id="btnAddShift" type="button">Добавить смену</button></div><div class="mini-chart">' +
      '<div class="mini-chart-bar"><span style="width:' + Math.min(100, shifts.length * 4) + '%"></span></div>' +
      '<div class="muted">Визуально: чем длиннее полоска, тем больше записей у человека.</div></div><div class="editor-list" id="shiftList"></div>';
    $('#btnAddShift').addEventListener('click', function() {
      var now = new Date().toISOString();
      shifts.unshift({ id: 'admin-' + Date.now(), start_msk: now, end_msk: now, created_at: now, route: '', notes: '' });
      renderShiftEditor(slot);
    });
    var list = $('#shiftList');
    if (!shifts.length) {
      list.innerHTML = '<div class="empty">Смен нет.</div>';
      return;
    }
    list.innerHTML = shifts.map(function(shift, index) {
      return '<div class="row-card" data-index="' + index + '">' +
        '<div class="row-card-head"><strong>' + escapeHtml(shift.route || shift.id || 'Смена') + '</strong><button class="icon-btn" data-delete-shift="' + index + '" type="button">×</button></div>' +
        '<div class="form-grid">' +
          field('ID', 'id', shift.id, index) +
          field('Начало МСК', 'start_msk', shift.start_msk, index) +
          field('Конец МСК', 'end_msk', shift.end_msk, index) +
          field('Создано', 'created_at', shift.created_at, index) +
          field('Маршрут', 'route', shift.route, index) +
          field('Локомотив', 'locomotive', shift.locomotive, index) +
          field('Поезд', 'train', shift.train, index) +
          field('Тип', 'type', shift.type, index) +
          '<div class="field wide"><label>Заметки</label><textarea class="input" data-shift-field="notes" data-index="' + index + '">' + escapeHtml(shift.notes || '') + '</textarea></div>' +
        '</div></div>';
    }).join('');
    bindShiftInputs();
  }

  function field(label, key, value, index) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label><input class="input" data-shift-field="' +
      escapeHtml(key) + '" data-index="' + index + '" value="' + escapeHtml(value || '') + '" /></div>';
  }

  function bindShiftInputs() {
    $all('[data-shift-field]').forEach(function(input) {
      input.addEventListener('input', function() {
        var shift = state.selectedUserData.shifts[Number(input.dataset.index)];
        shift[input.dataset.shiftField] = input.value;
      });
    });
    $all('[data-delete-shift]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.selectedUserData.shifts.splice(Number(btn.dataset.deleteShift), 1);
        renderUserEditor();
      });
    });
  }

  function renderSalaryEditor(slot) {
    var salary = state.selectedUserData.salaryParams || {};
    var labels = {
      tariffRate: 'Тариф, ₽/час',
      monthlyNormHours: 'Норма месяца, ч',
      nightPercent: 'Ночные, %',
      classPercent: 'Классность, %',
      zonePercent: 'Зональная, %',
      bamPercent: 'БАМ, %',
      districtPercent: 'Районный, %',
      northPercent: 'Северная, %',
      localPercent: 'Местный, %',
      komPerTrip: 'Командировочные, ₽',
    };
    slot.innerHTML = '<div class="form-grid">' + Object.keys(labels).map(function(key) {
      return '<div class="field"><label>' + labels[key] + '</label><input class="input" type="number" min="0" step="0.01" data-salary-key="' +
        key + '" value="' + escapeHtml(salary[key] === undefined ? '' : salary[key]) + '" /></div>';
    }).join('') + '</div>';
    $all('[data-salary-key]').forEach(function(input) {
      input.addEventListener('input', function() {
        state.selectedUserData.salaryParams[input.dataset.salaryKey] = Number(input.value || 0);
      });
    });
  }

  function renderWarningsEditor(slot) {
    var warnings = state.selectedUserData.poekhaliWarnings || [];
    var bounds = getCoordinateBounds(warnings, ['start', 'end', 'coordinate']);
    slot.innerHTML =
      '<div class="constructor-head">' +
        '<div><div class="card-title">Конструктор ограничений скорости</div>' +
        '<div class="muted">Перетаскивай карточки для порядка. Координаты и скорость меняются ползунками и цифрами.</div></div>' +
        '<button class="btn-primary" id="btnAddWarning" type="button">Добавить ограничение</button>' +
      '</div>' +
      '<div class="route-scale">' +
        '<span>' + escapeHtml(formatCoordinate(bounds.min)) + '</span>' +
        '<div class="route-scale-line"></div>' +
        '<span>' + escapeHtml(formatCoordinate(bounds.max)) + '</span>' +
      '</div>' +
      '<div class="editor-list visual-list" id="warningsList"></div>';
    $('#btnAddWarning').addEventListener('click', function() {
      var start = Math.round(bounds.min + (bounds.max - bounds.min) * 0.35);
      warnings.unshift({ id: 'warning-' + Date.now(), mapId: 'komsomol-sk-tche-9', shiftId: '', sector: 0, start: start, end: start + 1000, speed: 25, name: 'Ограничение 25', note: '', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      renderWarningsEditor(slot);
    });
    var list = $('#warningsList');
    if (!warnings.length) {
      list.innerHTML = '<div class="empty">Ограничений пока нет. Нажми "Добавить ограничение" и выставь место на линии.</div>';
      return;
    }
    list.innerHTML = warnings.map(function(warning, index) {
      var left = coordinatePercent(warning.start, bounds);
      var right = coordinatePercent(warning.end, bounds);
      var width = Math.max(1, right - left);
      var speed = Math.max(1, Math.round(Number(warning.speed) || 25));
      var tone = speed <= 40 ? 'danger' : speed <= 60 ? 'warning' : 'success';
      return '<div class="row-card warning-builder-card" draggable="true" data-warning-card="' + index + '">' +
        '<div class="row-card-head">' +
          '<div><strong>' + escapeHtml(warning.name || ('Ограничение ' + speed)) + '</strong>' +
          '<div class="muted">' + escapeHtml(formatCoordinate(warning.start)) + ' — ' + escapeHtml(formatCoordinate(warning.end)) + '</div></div>' +
          '<div class="row-actions"><span class="speed-badge speed-badge--' + tone + '">' + speed + ' км/ч</span><button class="icon-btn" data-delete-warning="' + index + '" type="button">×</button></div>' +
        '</div>' +
        '<div class="track-preview">' +
          '<div class="track-preview-line"></div>' +
          '<div class="track-segment track-segment--' + tone + '" style="left:' + left + '%;width:' + width + '%"></div>' +
          '<span class="track-pin" style="left:' + left + '%"></span><span class="track-pin" style="left:' + right + '%"></span>' +
        '</div>' +
        '<div class="builder-grid">' +
          warningField('Название на карточке', 'name', warning.name, index) +
          warningField('Карта', 'mapId', warning.mapId || 'komsomol-sk-tche-9', index) +
          warningField('Участок', 'sector', warning.sector, index, 'number') +
          warningField('Действует до', 'validUntil', warning.validUntil, index, 'date') +
          rangeField('Начало', 'start', warning.start, index, bounds) +
          rangeField('Конец', 'end', warning.end, index, bounds) +
          rangeField('Скорость', 'speed', speed, index, { min: 1, max: 120 }) +
          '<div class="field"><label>Включено</label><select class="select" data-warning-field="enabled" data-index="' + index + '">' +
            '<option value="true"' + (warning.enabled === false ? '' : ' selected') + '>да, показывать</option>' +
            '<option value="false"' + (warning.enabled === false ? ' selected' : '') + '>нет, скрыть</option>' +
          '</select></div>' +
          '<div class="field wide"><label>Подпись для себя</label><textarea class="input" data-warning-field="note" data-index="' + index + '">' + escapeHtml(warning.note || '') + '</textarea></div>' +
        '</div></div>';
    }).join('');
    bindWarningInputs(slot);
    bindReorderCards(list, '[data-warning-card]', function(from, to) {
      moveArrayItem(state.selectedUserData.poekhaliWarnings, from, to);
      renderWarningsEditor(slot);
    });
  }

  function warningField(label, key, value, index, type) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label><input class="input" type="' + (type || 'text') +
      '" data-warning-field="' + key + '" data-index="' + index + '" value="' + escapeHtml(value === undefined ? '' : value) + '" /></div>';
  }

  function rangeField(label, key, value, index, bounds) {
    var min = Math.round(Number(bounds && bounds.min) || 0);
    var max = Math.round(Number(bounds && bounds.max) || 100);
    return '<div class="field range-field"><label>' + escapeHtml(label) + ': <strong>' + escapeHtml(key === 'speed' ? (Math.round(Number(value) || 0) + ' км/ч') : formatCoordinate(value)) + '</strong></label>' +
      '<input type="range" min="' + min + '" max="' + max + '" step="1" data-warning-field="' + key + '" data-index="' + index + '" value="' + escapeHtml(value === undefined ? min : value) + '" />' +
      '<input class="input" type="number" min="' + min + '" max="' + max + '" step="1" data-warning-field="' + key + '" data-index="' + index + '" value="' + escapeHtml(value === undefined ? min : value) + '" />' +
    '</div>';
  }

  function bindWarningInputs(slot) {
    $all('[data-warning-field]').forEach(function(input) {
      var update = function() {
        var warning = state.selectedUserData.poekhaliWarnings[Number(input.dataset.index)];
        var key = input.dataset.warningField;
        if (key === 'enabled') {
          warning.enabled = input.value === 'true';
        } else if (input.type === 'number' || input.type === 'range') {
          warning[key] = Number(input.value || 0);
        } else {
          warning[key] = input.value;
        }
        if (key === 'start' && Number(warning.start) > Number(warning.end)) warning.end = warning.start;
        if (key === 'end' && Number(warning.end) < Number(warning.start)) warning.start = warning.end;
        warning.coordinate = Math.min(Number(warning.start) || 0, Number(warning.end) || 0);
        warning.length = Math.max(0, Math.round((Number(warning.end) || 0) - (Number(warning.start) || 0)));
        warning.updatedAt = new Date().toISOString();
      };
      input.addEventListener('input', update);
      input.addEventListener('change', function() {
        update();
        renderWarningsEditor(slot);
      });
    });
    $all('[data-delete-warning]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.selectedUserData.poekhaliWarnings.splice(Number(btn.dataset.deleteWarning), 1);
        renderUserEditor();
      });
    });
  }

  function renderRunsCards(slot) {
    var runs = state.selectedUserData.poekhaliRuns || [];
    var activeCount = runs.filter(function(run) { return run && run.status === 'active'; }).length;
    var totalDistance = runs.reduce(function(sum, run) { return sum + Number(run && run.distanceMeters || 0); }, 0);
    slot.innerHTML =
      '<div class="constructor-head">' +
        '<div><div class="card-title">Поездки карточками</div>' +
        '<div class="muted">Здесь просмотр поездок как в приложении: маршрут, скорость, события и прогресс без JSON.</div></div>' +
      '</div>' +
      '<div class="grid grid-3 trip-summary">' +
        metricCard('Всего поездок', runs.length, 'Записи режима Поехали', 'users') +
        metricCard('Активные', activeCount, 'Ещё не завершены', 'online', activeCount ? 70 : 8) +
        metricCard('Пройдено', formatDistance(totalDistance), 'Сумма записанных поездок', 'docs') +
      '</div>' +
      '<div class="trip-card-list">' + (runs.length ? runs.map(renderRunCard).join('') : '<div class="empty">Поездок пока нет.</div>') + '</div>';
  }

  function renderRunCard(run) {
    var title = run.route || [run.routeFromName, run.routeToName].filter(Boolean).join(' — ') || run.mapTitle || 'Поездка';
    var progress = Math.max(0, Math.min(100, Number(run.routeProgressPct) || 0));
    var status = run.status === 'active' ? 'идёт' : run.status === 'paused' ? 'пауза' : 'завершена';
    return '<div class="trip-card">' +
      '<div class="trip-card-top">' +
        '<div><strong>' + escapeHtml(title) + '</strong><div class="muted">' + escapeHtml(formatDate(run.startedAt || run.createdAt)) + '</div></div>' +
        '<span class="pill ' + (run.status === 'active' ? 'is-online' : '') + '">' + escapeHtml(status) + '</span>' +
      '</div>' +
      '<div class="trip-route">' +
        '<span>' + escapeHtml(run.routeFromName || 'Старт') + '</span>' +
        '<div class="trip-route-line"><i style="width:' + progress + '%"></i></div>' +
        '<span>' + escapeHtml(run.routeToName || 'Финиш') + '</span>' +
      '</div>' +
      '<div class="trip-stats">' +
        '<div><b>' + escapeHtml(formatDuration(run.durationMs)) + '</b><span>время</span></div>' +
        '<div><b>' + escapeHtml(formatDistance(run.distanceMeters)) + '</b><span>путь</span></div>' +
        '<div><b>' + escapeHtml(Math.round(Number(run.maxSpeedKmh) || 0)) + '</b><span>макс км/ч</span></div>' +
        '<div><b>' + escapeHtml(run.warningsCount || 0) + '</b><span>огр.</span></div>' +
      '</div>' +
      '<div class="trip-foot">' +
        '<span>Следующий светофор: <b>' + escapeHtml(run.nextSignalName || '—') + '</b></span>' +
        '<span>Следующая цель: <b>' + escapeHtml(run.nextTargetLabel || run.nextStationName || '—') + '</b></span>' +
      '</div>' +
    '</div>';
  }

  function getLearningStore() {
    var data = state.selectedUserData;
    if (!data.poekhaliLearning || typeof data.poekhaliLearning !== 'object' || Array.isArray(data.poekhaliLearning)) {
      data.poekhaliLearning = { version: 1, maps: {} };
    }
    if (!data.poekhaliLearning.maps || typeof data.poekhaliLearning.maps !== 'object' || Array.isArray(data.poekhaliLearning.maps)) {
      data.poekhaliLearning.maps = {};
    }
    return data.poekhaliLearning;
  }

  function getLearningSections() {
    var store = getLearningStore();
    var rows = [];
    Object.keys(store.maps || {}).forEach(function(mapId) {
      var map = store.maps[mapId] || {};
      Object.keys(map.userSections || {}).forEach(function(sectionId) {
        var section = map.userSections[sectionId];
        if (!section) return;
        rows.push({ mapId: mapId, sectionId: sectionId, section: section });
      });
    });
    return rows;
  }

  function renderLearningConstructor(slot) {
    var sections = getLearningSections();
    var selected = getSelectedLearningSection(sections);
    slot.innerHTML =
      '<div class="constructor-head">' +
        '<div><div class="card-title">Конструктор карты Поехали</div>' +
        '<div class="muted">Светофоры, станции и скорости редактируются карточками на линии координат. Это реальные пользовательские GPS-участки.</div></div>' +
      '</div>' +
      '<div class="learning-layout">' +
        '<div class="learning-sidebar" id="learningSectionList">' + renderLearningSectionList(sections, selected) + '</div>' +
        '<div class="learning-editor" id="learningEditor">' + (selected ? renderLearningSectionEditor(selected) : '<div class="empty">GPS-участков пока нет. Когда в приложении появится пользовательский участок Поехали, здесь будет конструктор светофоров, станций и скоростей.</div>') + '</div>' +
      '</div>';
    $all('[data-learning-section]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.selectedLearningMapId = btn.dataset.mapId;
        state.selectedLearningSectionId = btn.dataset.sectionId;
        renderLearningConstructor(slot);
      });
    });
    if (selected) bindLearningEditor(slot, selected);
  }

  function getSelectedLearningSection(sections) {
    if (!sections.length) return null;
    var selected = sections.find(function(row) {
      return row.mapId === state.selectedLearningMapId && row.sectionId === state.selectedLearningSectionId;
    }) || sections[0];
    state.selectedLearningMapId = selected.mapId;
    state.selectedLearningSectionId = selected.sectionId;
    return selected;
  }

  function renderLearningSectionList(sections, selected) {
    if (!sections.length) return '<div class="empty">Нет участков</div>';
    return sections.map(function(row) {
      var section = row.section || {};
      var active = selected && selected.mapId === row.mapId && selected.sectionId === row.sectionId;
      var signals = (section.objects || []).filter(function(item) { return String(item.type) === '1'; }).length;
      return '<button class="learning-section-card ' + (active ? 'is-active' : '') + '" type="button" data-learning-section="1" data-map-id="' + escapeHtml(row.mapId) + '" data-section-id="' + escapeHtml(row.sectionId) + '">' +
        '<strong>' + escapeHtml(section.title || row.sectionId) + '</strong>' +
        '<span>' + escapeHtml('уч. ' + (section.sector || '—') + ' · ' + signals + ' светофоров · ' + ((section.speeds || []).length) + ' скоростей') + '</span>' +
      '</button>';
    }).join('');
  }

  function renderLearningSectionEditor(row) {
    var section = row.section;
    var points = section.routePoints || [];
    var bounds = getCoordinateBounds(points.map(function(point) { return { coordinate: point.ordinate || point.coordinate }; }), ['coordinate']);
    var entities = getLearningEntities(section);
    return '<div class="learning-workbench">' +
      '<div class="builder-grid">' +
        '<div class="field wide"><label>Название участка</label><input class="input" data-section-meta="title" value="' + escapeHtml(section.title || '') + '" /></div>' +
        '<div class="field"><label>Участок</label><input class="input" type="number" data-section-meta="sector" value="' + escapeHtml(section.sector || 0) + '" /></div>' +
        '<div class="field"><label>Опорный участок</label><input class="input" type="number" data-section-meta="referenceSector" value="' + escapeHtml(section.referenceSector === null || section.referenceSector === undefined ? '' : section.referenceSector) + '" /></div>' +
      '</div>' +
      '<div class="route-scale route-scale--large"><span>' + escapeHtml(formatCoordinate(bounds.min)) + '</span><div class="route-scale-line"></div><span>' + escapeHtml(formatCoordinate(bounds.max)) + '</span></div>' +
      '<div class="map-canvas">' +
        '<div class="map-canvas-rail"></div>' +
        entities.map(function(entity) { return renderLearningMarker(entity, bounds); }).join('') +
      '</div>' +
      '<div class="add-entity-card">' +
        '<div class="card-title">Добавить на линию</div>' +
        '<div class="builder-grid">' +
          '<div class="field"><label>Что</label><select class="select" id="learningNewKind"><option value="signal">Светофор</option><option value="station">Станция</option><option value="speed">Скорость</option></select></div>' +
          '<div class="field"><label>Название</label><input class="input" id="learningNewName" placeholder="Напр. НМ1 или ОГР 60" /></div>' +
          '<div class="field"><label>Координата</label><input class="input" type="number" id="learningNewCoordinate" value="' + escapeHtml(Math.round((bounds.min + bounds.max) / 2)) + '" /></div>' +
          '<div class="field"><label>Длина, м</label><input class="input" type="number" id="learningNewLength" value="0" /></div>' +
          '<div class="field"><label>Скорость</label><input class="input" type="number" id="learningNewSpeed" value="60" /></div>' +
        '</div>' +
        '<button class="btn-primary" id="btnAddLearningEntity" type="button">Добавить карточку</button>' +
      '</div>' +
      '<div class="editor-list visual-list">' + (entities.length ? entities.map(function(entity) { return renderLearningEntityCard(entity, bounds); }).join('') : '<div class="empty">На участке ещё нет светофоров, станций и скоростей.</div>') + '</div>' +
    '</div>';
  }

  function getLearningEntities(section) {
    var result = [];
    (section.objects || []).forEach(function(item, index) {
      result.push({ kind: String(item.type) === '1' ? 'signal' : 'station', list: 'objects', index: index, item: item, coordinate: Number(item.coordinate) || 0 });
    });
    (section.speeds || []).forEach(function(item, index) {
      result.push({ kind: 'speed', list: 'speeds', index: index, item: item, coordinate: Number(item.coordinate) || 0 });
    });
    return result.sort(function(a, b) { return a.coordinate - b.coordinate || a.kind.localeCompare(b.kind); });
  }

  function renderLearningMarker(entity, bounds) {
    var left = coordinatePercent(entity.coordinate, bounds);
    var label = entity.kind === 'signal' ? 'СВ' : entity.kind === 'station' ? 'СТ' : Math.round(Number(entity.item.speed) || 0);
    return '<span class="map-marker map-marker--' + entity.kind + '" style="left:' + left + '%" title="' + escapeHtml(entity.item.name || '') + '">' + escapeHtml(label) + '</span>';
  }

  function renderLearningEntityCard(entity, bounds) {
    var item = entity.item || {};
    var label = entity.kind === 'signal' ? 'Светофор' : entity.kind === 'station' ? 'Станция' : 'Скорость';
    return '<div class="row-card learning-entity-card">' +
      '<div class="row-card-head"><div><strong>' + escapeHtml(label + ': ' + (item.name || 'без названия')) + '</strong><div class="muted">' + escapeHtml(formatCoordinate(item.coordinate)) + '</div></div>' +
      '<button class="icon-btn" data-delete-entity="' + entity.list + ':' + entity.index + '" type="button">×</button></div>' +
      '<div class="track-preview"><div class="track-preview-line"></div><span class="track-pin" style="left:' + coordinatePercent(item.coordinate, bounds) + '%"></span></div>' +
      '<div class="builder-grid">' +
        '<div class="field"><label>Название</label><input class="input" data-learning-list="' + entity.list + '" data-learning-index="' + entity.index + '" data-learning-field="name" value="' + escapeHtml(item.name || '') + '" /></div>' +
        '<div class="field"><label>Координата</label><input class="input" type="number" data-learning-list="' + entity.list + '" data-learning-index="' + entity.index + '" data-learning-field="coordinate" value="' + escapeHtml(item.coordinate || 0) + '" /></div>' +
        '<div class="field range-field"><label>Перетащить по линии</label><input type="range" min="' + Math.round(bounds.min) + '" max="' + Math.round(bounds.max) + '" step="1" data-learning-list="' + entity.list + '" data-learning-index="' + entity.index + '" data-learning-field="coordinate" value="' + escapeHtml(item.coordinate || 0) + '" /></div>' +
        '<div class="field"><label>' + (entity.kind === 'speed' ? 'Длина, м' : 'Длина/зона, м') + '</label><input class="input" type="number" data-learning-list="' + entity.list + '" data-learning-index="' + entity.index + '" data-learning-field="length" value="' + escapeHtml(item.length || 0) + '" /></div>' +
        (entity.kind === 'speed' ? '<div class="field"><label>Скорость</label><input class="input" type="number" data-learning-list="' + entity.list + '" data-learning-index="' + entity.index + '" data-learning-field="speed" value="' + escapeHtml(item.speed || 60) + '" /></div>' : '') +
      '</div></div>';
  }

  function bindLearningEditor(slot, row) {
    var section = row.section;
    $all('[data-section-meta]').forEach(function(input) {
      input.addEventListener('input', function() {
        var key = input.dataset.sectionMeta;
        if (input.type === 'number') {
          section[key] = key === 'referenceSector' && input.value === '' ? null : Number(input.value || 0);
        } else {
          section[key] = input.value;
        }
        section.updatedAt = Date.now();
      });
    });
    $all('[data-learning-field]').forEach(function(input) {
      var update = function() {
        var list = section[input.dataset.learningList] || [];
        var item = list[Number(input.dataset.learningIndex)];
        if (!item) return;
        var key = input.dataset.learningField;
        item[key] = (input.type === 'number' || input.type === 'range') ? Number(input.value || 0) : input.value;
        if (key === 'coordinate' || key === 'length') item.end = Math.max(Number(item.coordinate) || 0, (Number(item.coordinate) || 0) + (Number(item.length) || 0));
        section.updatedAt = Date.now();
      };
      input.addEventListener('input', update);
      input.addEventListener('change', function() {
        update();
        renderLearningConstructor(slot);
      });
    });
    $('#btnAddLearningEntity').addEventListener('click', function() {
      var kind = $('#learningNewKind').value;
      var coordinate = Math.max(0, Math.round(Number($('#learningNewCoordinate').value) || 0));
      var length = Math.max(0, Math.round(Number($('#learningNewLength').value) || 0));
      var speed = Math.max(1, Math.round(Number($('#learningNewSpeed').value) || 60));
      var name = ($('#learningNewName').value || '').trim() || (kind === 'signal' ? 'Новый светофор' : kind === 'station' ? 'Новая станция' : 'ОГР ' + speed);
      if (kind === 'speed') {
        if (!Array.isArray(section.speeds)) section.speeds = [];
        section.speeds.push({ id: 'admin-speed-' + Date.now(), sector: Number(section.sector) || 0, coordinate: coordinate, length: length || 1000, end: coordinate + (length || 1000), speed: speed, name: name, source: 'user' });
      } else {
        if (!Array.isArray(section.objects)) section.objects = [];
        section.objects.push({ id: 'admin-object-' + Date.now(), fileKey: 'user', sector: Number(section.sector) || 0, type: kind === 'signal' ? '1' : '2', name: name, coordinate: coordinate, length: length, end: coordinate + length, source: 'user' });
      }
      section.updatedAt = Date.now();
      renderLearningConstructor(slot);
    });
    $all('[data-delete-entity]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var parts = btn.dataset.deleteEntity.split(':');
        var list = section[parts[0]];
        if (Array.isArray(list)) list.splice(Number(parts[1]), 1);
        section.updatedAt = Date.now();
        renderLearningConstructor(slot);
      });
    });
  }

  function renderJsonEditor(slot, key, title, helpText) {
    slot.innerHTML = '<div class="danger-note"><strong>Осторожно:</strong> ' + escapeHtml(helpText || 'Это технический формат данных. Ошибка в скобке или запятой может сломать сохранение.') + '</div>' +
      '<div class="field"><label>' + escapeHtml(title) + '</label><textarea class="textarea" id="json_' + key + '">' +
      escapeHtml(getJsonText(state.selectedUserData[key])) + '</textarea></div>';
    $('#json_' + key).addEventListener('input', function() {
      try {
        state.selectedUserData[key] = parseJsonTextarea('json_' + key);
        setStatus('');
      } catch (error) {
        setStatus('Технический текст пока с ошибкой: ' + error.message, 'error');
      }
    });
  }

  function saveCurrentUser() {
    setStatus('Сохраняю пользователя...');
    return request('user', { method: 'PUT', sid: state.selectedSid, body: state.selectedUserData })
      .then(function(body) {
        state.selectedUserData = body.userData;
        setStatus('Пользователь сохранён', 'ok');
        return loadUsers();
      })
      .then(renderUsers)
      .catch(showError);
  }

  function renderPoekhaliMap() {
    var map = normalizeMapConfig(state.poekhaliMap);
    var route = getMapRoute(state.mapRouteId);
    if (!route) {
      els.map.innerHTML = '<div class="empty">Карта пока не загружена.</div>';
      return;
    }
    var rules = getMergedRouteSpeedRules(route.id);
    var objects = map.objects.filter(function(item) { return item.routeId === route.id; });
    var bounds = getCoordinateBounds([{ coordinate: route.start }, { coordinate: route.end }].concat(rules), ['coordinate', 'start', 'end']);
    els.map.innerHTML =
      '<div class="friendly-note"><strong>Как менять карту:</strong> выбери участок, меняй скорость ползунком или цифрой, светофор можно добавить и двигать по линии координат. После сохранения Поехали будет брать эти правки как отдельный админ-слой.</div>' +
      '<div class="map-editor-layout">' +
        '<div class="card route-picker-card">' +
          '<div class="card-title">1. Что редактируем</div>' +
          '<div class="route-card-list">' + map.routes.map(function(item) {
            return '<button class="route-choice ' + (item.id === route.id ? 'is-active' : '') + '" type="button" data-map-route="' + escapeHtml(item.id) + '">' +
              '<strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(formatCoordinate(item.start) + ' - ' + formatCoordinate(item.end)) + '</span>' +
            '</button>';
          }).join('') + '</div>' +
        '</div>' +
        '<div class="card map-work-card">' +
          '<div class="card-title">2. Линия участка</div>' +
          '<div class="route-scale route-scale--large"><span>' + escapeHtml(formatCoordinate(bounds.min)) + '</span><div class="route-scale-line"></div><span>' + escapeHtml(formatCoordinate(bounds.max)) + '</span></div>' +
          '<div class="map-canvas admin-map-canvas">' +
            '<div class="map-canvas-rail"></div>' +
            rules.map(function(rule) {
              var left = coordinatePercent(getRuleStart(rule), bounds);
              var width = Math.max(2, coordinatePercent(getRuleEnd(rule), bounds) - left);
              return '<span class="speed-segment" style="left:' + left + '%;width:' + width + '%"><b>' + escapeHtml(rule.speed) + '</b></span>';
            }).join('') +
            objects.map(function(item) {
              return '<span class="map-marker map-marker--signal" style="left:' + coordinatePercent(item.coordinate, bounds) + '%" title="' + escapeHtml(item.name || '') + '">СВ</span>';
            }).join('') +
          '</div>' +
          '<div class="map-section-title">Скорости на выбранном участке</div>' +
          '<div class="visual-list">' + (rules.length ? rules.map(function(rule) { return renderMapSpeedCard(rule, bounds); }).join('') : '<div class="empty">Скоростей на участке нет.</div>') + '</div>' +
          '<div class="map-section-title">Светофоры и точки</div>' +
          '<div class="visual-list">' + (objects.length ? objects.map(function(item) { return renderMapObjectCard(item, bounds); }).join('') : '<div class="empty">Добавь первый светофор кнопкой ниже.</div>') + '</div>' +
          '<div class="map-actions">' +
            '<button class="btn" id="btnAddMapSignal" type="button">Добавить светофор</button>' +
            '<button class="btn-primary" id="btnSavePoekhaliMap" type="button">Сохранить карту Поехали</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    bindPoekhaliMapEditor(route, bounds);
  }

  function renderMapSpeedCard(rule, bounds) {
    var id = escapeHtml(rule.id);
    return '<div class="row-card map-rule-card">' +
      '<div class="row-card-head"><div><strong>' + escapeHtml(rule.name || 'Скорость') + '</strong><div class="muted">' + escapeHtml(formatCoordinate(getRuleStart(rule)) + ' - ' + formatCoordinate(getRuleEnd(rule))) + '</div></div><span class="speed-pill">' + escapeHtml(rule.speed) + ' км/ч</span></div>' +
      '<div class="track-preview"><div class="track-preview-line"></div><span class="track-pin track-pin--wide" style="left:' + coordinatePercent(getRuleStart(rule), bounds) + '%;width:' + Math.max(2, coordinatePercent(getRuleEnd(rule), bounds) - coordinatePercent(getRuleStart(rule), bounds)) + '%"></span></div>' +
      '<div class="builder-grid">' +
        '<div class="field"><label>Название</label><input class="input" data-map-speed="' + id + '" data-map-field="name" value="' + escapeHtml(rule.name || '') + '" /></div>' +
        '<div class="field"><label>Скорость</label><input class="input" type="number" min="5" max="160" data-map-speed="' + id + '" data-map-field="speed" value="' + escapeHtml(rule.speed || 60) + '" /></div>' +
        '<div class="field range-field"><label>Поменять скорость</label><input type="range" min="5" max="160" step="5" data-map-speed="' + id + '" data-map-field="speed" value="' + escapeHtml(rule.speed || 60) + '" /></div>' +
        '<div class="field"><label>Начало</label><input class="input" type="number" data-map-speed="' + id + '" data-map-field="start" value="' + escapeHtml(getRuleStart(rule)) + '" /></div>' +
        '<div class="field"><label>Конец</label><input class="input" type="number" data-map-speed="' + id + '" data-map-field="end" value="' + escapeHtml(getRuleEnd(rule)) + '" /></div>' +
      '</div></div>';
  }

  function renderMapObjectCard(item, bounds) {
    return '<div class="row-card map-rule-card">' +
      '<div class="row-card-head"><div><strong>' + escapeHtml(item.name || 'Светофор') + '</strong><div class="muted">' + escapeHtml(formatCoordinate(item.coordinate)) + '</div></div><button class="icon-btn" data-delete-map-object="' + escapeHtml(item.id) + '" type="button">×</button></div>' +
      '<div class="track-preview"><div class="track-preview-line"></div><span class="track-pin" style="left:' + coordinatePercent(item.coordinate, bounds) + '%"></span></div>' +
      '<div class="builder-grid">' +
        '<div class="field"><label>Название</label><input class="input" data-map-object="' + escapeHtml(item.id) + '" data-map-field="name" value="' + escapeHtml(item.name || '') + '" /></div>' +
        '<div class="field"><label>Координата</label><input class="input" type="number" data-map-object="' + escapeHtml(item.id) + '" data-map-field="coordinate" value="' + escapeHtml(item.coordinate || 0) + '" /></div>' +
        '<div class="field range-field"><label>Передвинуть по линии</label><input type="range" min="' + Math.round(bounds.min) + '" max="' + Math.round(bounds.max) + '" step="1" data-map-object="' + escapeHtml(item.id) + '" data-map-field="coordinate" value="' + escapeHtml(item.coordinate || 0) + '" /></div>' +
      '</div></div>';
  }

  function ensureMapOverrideRule(baseRule) {
    var map = normalizeMapConfig(state.poekhaliMap);
    state.poekhaliMap = map;
    var existing = map.speedRules.find(function(rule) { return rule.id === baseRule.id; });
    if (existing) return existing;
    var copy = Object.assign({}, baseRule, {
      coordinate: getRuleStart(baseRule),
      length: Math.max(0, getRuleEnd(baseRule) - getRuleStart(baseRule)),
    });
    map.speedRules.push(copy);
    return copy;
  }

  function bindPoekhaliMapEditor(route) {
    $all('[data-map-route]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.mapRouteId = btn.dataset.mapRoute;
        renderPoekhaliMap();
      });
    });
    $all('[data-map-speed]').forEach(function(input) {
      input.addEventListener('input', function() {
        var base = getMergedRouteSpeedRules(route.id).find(function(rule) { return rule.id === input.dataset.mapSpeed; });
        if (!base) return;
        var row = ensureMapOverrideRule(base);
        var key = input.dataset.mapField;
        row[key] = input.type === 'number' || input.type === 'range' ? Number(input.value || 0) : input.value;
        row.coordinate = getRuleStart(row);
        row.length = Math.max(0, getRuleEnd(row) - getRuleStart(row));
      });
      input.addEventListener('change', renderPoekhaliMap);
    });
    $all('[data-map-object]').forEach(function(input) {
      var updateObject = function() {
        var map = normalizeMapConfig(state.poekhaliMap);
        state.poekhaliMap = map;
        var row = map.objects.find(function(item) { return item.id === input.dataset.mapObject; });
        if (!row) return;
        row[input.dataset.mapField] = input.type === 'number' || input.type === 'range' ? Number(input.value || 0) : input.value;
        row.end = Number(row.coordinate) + Number(row.length || 0);
      };
      input.addEventListener('input', updateObject);
      input.addEventListener('change', function() { updateObject(); renderPoekhaliMap(); });
    });
    $all('[data-delete-map-object]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.poekhaliMap.objects = state.poekhaliMap.objects.filter(function(item) { return item.id !== btn.dataset.deleteMapObject; });
        renderPoekhaliMap();
      });
    });
    $('#btnAddMapSignal').addEventListener('click', function() {
      var map = normalizeMapConfig(state.poekhaliMap);
      state.poekhaliMap = map;
      var coordinate = Math.round((Number(route.start) + Number(route.end)) / 2);
      map.objects.push({ id: 'signal-' + Date.now(), routeId: route.id, sector: route.sector, type: '1', coordinate: coordinate, length: 0, end: coordinate, name: 'Новый светофор' });
      renderPoekhaliMap();
    });
    $('#btnSavePoekhaliMap').addEventListener('click', savePoekhaliMap);
  }

  function savePoekhaliMap() {
    request('poekhaliMap', { method: 'PUT', body: { map: state.poekhaliMap } })
      .then(function(body) {
        state.poekhaliMap = normalizeMapConfig(body.map);
        setStatus('Карта Поехали сохранена', 'ok');
        renderPoekhaliMap();
      })
      .catch(showError);
  }

  function renderDocuments() {
    var panel = els.documents;
    var manifest = state.docsManifest || {};
    var categories = getDocCategories(manifest);
    if (!categories.includes(state.docsCategory)) state.docsCategory = categories[0] || 'speeds';
    panel.innerHTML =
      '<div class="friendly-note"><strong>Конструктор документов:</strong> перетащи PDF, DOCX или картинку в зону загрузки. Потом дай файлу нормальное название и подпись, как это увидит человек в приложении.</div>' +
      '<div class="toolbar"><div class="toolbar-left"><div class="tabs">' + categories.map(function(category) {
        return '<button class="tab ' + (category === state.docsCategory ? 'is-active' : '') + '" data-doc-category="' + category + '" type="button">' + escapeHtml(docCategoryLabels[category] || category) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="toolbar-right"><button class="btn" id="btnAddDocCategory" type="button">Новый раздел</button><button class="btn-primary" id="btnSaveDocs" type="button">Сохранить порядок и подписи</button></div></div>' +
      '<div class="docs-workbench">' +
        '<div class="doc-dropzone" id="docDropZone">' +
          '<input id="docFileInput" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" hidden />' +
          '<div class="doc-drop-icon">+</div>' +
          '<div><strong>Перетащи файлы сюда</strong><span>или нажми, чтобы выбрать на компьютере</span></div>' +
        '</div>' +
        '<div class="card"><div class="toolbar"><div><div class="card-title">' + escapeHtml(docCategoryLabels[state.docsCategory] || state.docsCategory || 'Документы') +
        '</div><div class="muted">' + (((manifest[state.docsCategory] || []).length) || 0) + ' файлов в этом разделе. Карточки можно перетаскивать.</div></div>' +
        '<button class="btn" id="btnAddDoc" type="button">Карточка без загрузки</button></div><div class="editor-list doc-card-list" id="docsList"></div></div>' +
      '</div>';
    $all('[data-doc-category]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.docsCategory = btn.dataset.docCategory;
        renderDocuments();
      });
    });
    $('#btnAddDocCategory').addEventListener('click', function() {
      var name = prompt('Техническое имя нового раздела латиницей, например memos');
      if (!name) return;
      var safe = name.trim().replace(/[^\w-]+/g, '');
      if (!safe) return;
      if (!state.docsManifest[safe]) state.docsManifest[safe] = [];
      state.docsCategory = safe;
      renderDocuments();
    });
    $('#btnAddDoc').addEventListener('click', function() {
      if (!state.docsManifest[state.docsCategory]) state.docsManifest[state.docsCategory] = [];
      state.docsManifest[state.docsCategory].push({ name: 'Новый документ', caption: '', path: '/assets/docs/', mime_type: 'application/pdf', size: 0, updated_at: new Date().toISOString().slice(0, 10) });
      renderDocuments();
    });
    $('#btnSaveDocs').addEventListener('click', saveDocs);
    bindDocDropzone();
    renderDocRows();
  }

  function getDocCategories(manifest) {
    var known = ['speeds', 'folders', 'instructions', 'memos', 'reminders'];
    var result = known.filter(function(category) { return Object.prototype.hasOwnProperty.call(manifest || {}, category); });
    Object.keys(manifest || {}).forEach(function(category) {
      if (!result.includes(category)) result.push(category);
    });
    return result.length ? result : known;
  }

  function renderDocRows() {
    var list = $('#docsList');
    var rows = (state.docsManifest && state.docsManifest[state.docsCategory]) || [];
    if (!rows.length) {
      list.innerHTML = '<div class="empty">В категории нет документов. Перетащи файл в зону сверху.</div>';
      return;
    }
    list.innerHTML = rows.map(function(doc, index) {
      return '<div class="row-card doc-builder-card" draggable="true" data-doc-card="' + index + '">' +
        '<div class="doc-card-head">' +
          '<div class="doc-type-mark">' + escapeHtml(getDocTypeLabel(doc)) + '</div>' +
          '<div><strong>' + escapeHtml(doc.name || 'Новый документ') + '</strong>' +
          '<div class="muted">' + escapeHtml(doc.caption || doc.path || 'Файл ещё не выбран') + '</div></div>' +
          '<button class="icon-btn" data-delete-doc="' + index + '" type="button">×</button>' +
        '</div>' +
        '<div class="builder-grid">' +
          docField('Название в приложении', 'name', doc.name, index) +
          docField('Подпись под карточкой', 'caption', doc.caption, index) +
          docField('Файл на сервере', 'path', doc.path, index) +
          docField('Тип файла', 'mime_type', doc.mime_type, index) +
          docField('Размер', 'size', doc.size, index, 'number') +
          docField('Дата', 'updated_at', doc.updated_at, index, 'date') +
        '</div></div>';
    }).join('');
    $all('[data-doc-field]').forEach(function(input) {
      input.addEventListener('input', function() {
        var doc = state.docsManifest[state.docsCategory][Number(input.dataset.index)];
        doc[input.dataset.docField] = input.type === 'number' ? Number(input.value || 0) : input.value;
      });
    });
    $all('[data-delete-doc]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.docsManifest[state.docsCategory].splice(Number(btn.dataset.deleteDoc), 1);
        renderDocuments();
      });
    });
    bindReorderCards(list, '[data-doc-card]', function(from, to) {
      moveArrayItem(state.docsManifest[state.docsCategory], from, to);
      renderDocuments();
    });
  }

  function docField(label, key, value, index, type) {
    return '<div class="field ' + (key === 'path' ? 'wide' : '') + '"><label>' + escapeHtml(label) + '</label><input class="input" type="' +
      (type || 'text') + '" data-doc-field="' + key + '" data-index="' + index + '" value="' + escapeHtml(value === undefined ? '' : value) + '" /></div>';
  }

  function getDocTypeLabel(doc) {
    var mime = String(doc && doc.mime_type || '').toLowerCase();
    var path = String(doc && doc.path || '').toLowerCase();
    if (mime.indexOf('pdf') !== -1 || path.endsWith('.pdf')) return 'PDF';
    if (mime.indexOf('image') !== -1 || /\.(jpg|jpeg|png)$/.test(path)) return 'IMG';
    if (mime.indexOf('word') !== -1 || /\.(doc|docx)$/.test(path)) return 'DOC';
    if (mime.indexOf('text') !== -1 || path.endsWith('.txt')) return 'TXT';
    return 'FILE';
  }

  function bindDocDropzone() {
    var dropzone = $('#docDropZone');
    var input = $('#docFileInput');
    if (!dropzone || !input) return;
    dropzone.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function() {
      uploadDocFiles(input.files);
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach(function(type) {
      dropzone.addEventListener(type, function(event) {
        event.preventDefault();
        dropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function(type) {
      dropzone.addEventListener(type, function(event) {
        event.preventDefault();
        dropzone.classList.remove('is-dragover');
      });
    });
    dropzone.addEventListener('drop', function(event) {
      uploadDocFiles(event.dataTransfer && event.dataTransfer.files);
    });
  }

  function uploadDocFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    if (!state.docsManifest[state.docsCategory]) state.docsManifest[state.docsCategory] = [];
    setStatus('Загружаю файлов: ' + files.length + '...');
    files.reduce(function(chain, file, index) {
      return chain.then(function() {
        setStatus('Загружаю ' + (index + 1) + ' из ' + files.length + ': ' + file.name);
        return uploadDocFile(file);
      });
    }, Promise.resolve()).then(function() {
      setStatus('Файлы загружены. Проверь названия и подписи.', 'ok');
      renderDocuments();
    }).catch(showError);
  }

  function uploadDocFile(file) {
    return readFileAsDataUrl(file).then(function(dataUrl) {
      var name = String(file.name || 'Документ').replace(/\.[^.]+$/, '').trim();
      return request('uploadDoc', {
        method: 'POST',
        body: {
          category: state.docsCategory,
          name: name,
          caption: '',
          fileName: file.name,
          mimeType: file.type || '',
          base64: dataUrl,
        },
      }).then(function(body) {
        state.docsManifest = body.manifest || state.docsManifest;
        state.docsCategory = body.category || state.docsCategory;
      });
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(String(reader.result || '')); };
      reader.onerror = function() { reject(new Error('Не удалось прочитать файл')); };
      reader.readAsDataURL(file);
    });
  }

  function saveDocs() {
    setStatus('Сохраняю документы...');
    request('docsManifest', { method: 'PUT', body: { manifest: state.docsManifest } })
      .then(function(body) {
        state.docsManifest = body.manifest;
        setStatus('Документы сохранены', 'ok');
        renderDocuments();
      })
      .catch(showError);
  }

  function renderFunctions() {
    var panel = els.functions;
    var config = state.adminConfig || { features: [], calculationVariants: [], notes: '' };
    panel.innerHTML =
      '<div class="friendly-note"><strong>Это блокнот для развития:</strong> записывай сюда идеи, варианты расчёта и планы. Пользователи этого не увидят, пока мы отдельно не подключим это в коде.</div>' +
      '<div class="toolbar"><div class="muted">Здесь можно хранить черновики без риска для основного приложения.</div>' +
      '<button class="btn-primary" id="btnSaveConfig" type="button">Сохранить идеи</button></div>' +
      '<div class="grid grid-2">' +
        '<div class="card"><div class="toolbar"><div><div class="card-title">Будущие функции</div><div class="muted">Что хочется добавить в приложение</div></div><button class="btn" id="btnAddFeature" type="button">Добавить</button></div><div id="featureList" class="editor-list"></div></div>' +
        '<div class="card"><div class="toolbar"><div><div class="card-title">Варианты расчёта</div><div class="muted">Идеи по зарплате, нормам и формулам</div></div><button class="btn" id="btnAddCalc" type="button">Добавить</button></div><div id="calcList" class="editor-list"></div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:12px"><div class="field"><label>Заметки администратора</label><textarea class="textarea" id="configNotes">' + escapeHtml(config.notes || '') + '</textarea></div></div>';
    $('#btnAddFeature').addEventListener('click', function() {
      config.features.push({ id: 'feature-' + Date.now(), title: 'Новая функция', status: 'draft', enabled: false, description: '' });
      renderFunctions();
    });
    $('#btnAddCalc').addEventListener('click', function() {
      config.calculationVariants.push({ id: 'calc-' + Date.now(), title: 'Новый вариант расчёта', status: 'draft', enabled: false, description: '' });
      renderFunctions();
    });
    $('#btnSaveConfig').addEventListener('click', saveConfig);
    $('#configNotes').addEventListener('input', function(event) {
      config.notes = event.target.value;
    });
    renderConfigList('featureList', config.features, 'features');
    renderConfigList('calcList', config.calculationVariants, 'calculationVariants');
  }

  function renderConfigList(slotId, rows, key) {
    var slot = $('#' + slotId);
    if (!rows.length) {
      slot.innerHTML = '<div class="empty">Записей нет.</div>';
      return;
    }
    slot.innerHTML = rows.map(function(row, index) {
      return '<div class="row-card"><div class="row-card-head"><strong>' + escapeHtml(row.title || row.id) +
        '</strong><button class="icon-btn" data-config-delete="' + key + ':' + index + '" type="button">×</button></div>' +
        '<div class="form-grid">' +
          configField('ID', 'id', row.id, key, index) +
          configField('Название', 'title', row.title, key, index) +
          configField('Статус', 'status', row.status, key, index) +
          '<div class="field"><label>Включено</label><select class="select" data-config-field="enabled" data-list="' + key + '" data-index="' + index + '">' +
            '<option value="false"' + (row.enabled ? '' : ' selected') + '>нет</option>' +
            '<option value="true"' + (row.enabled ? ' selected' : '') + '>да</option>' +
          '</select></div>' +
          '<div class="field wide"><label>Описание</label><textarea class="input" data-config-field="description" data-list="' + key + '" data-index="' + index + '">' + escapeHtml(row.description || '') + '</textarea></div>' +
        '</div></div>';
    }).join('');
    $all('[data-config-field]').forEach(function(input) {
      input.addEventListener('input', updateConfigInput);
      input.addEventListener('change', updateConfigInput);
    });
    $all('[data-config-delete]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var parts = btn.dataset.configDelete.split(':');
        state.adminConfig[parts[0]].splice(Number(parts[1]), 1);
        renderFunctions();
      });
    });
  }

  function configField(label, field, value, listKey, index) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label><input class="input" data-config-field="' + field +
      '" data-list="' + listKey + '" data-index="' + index + '" value="' + escapeHtml(value || '') + '" /></div>';
  }

  function updateConfigInput(event) {
    var input = event.target;
    var row = state.adminConfig[input.dataset.list][Number(input.dataset.index)];
    row[input.dataset.configField] = input.dataset.configField === 'enabled' ? input.value === 'true' : input.value;
  }

  function saveConfig() {
    setStatus('Сохраняю черновики функций...');
    request('adminConfig', { method: 'PUT', body: { config: state.adminConfig } })
      .then(function(body) {
        state.adminConfig = body.config;
        setStatus('Черновики сохранены', 'ok');
        renderFunctions();
      })
      .catch(showError);
  }

  function renderRaw() {
    var panel = els.raw;
    panel.innerHTML =
      '<div class="grid grid-2">' +
        '<div class="card"><div class="card-title">Технические данные человека</div><div class="danger-note"><strong>Осторожно:</strong> этот режим нужен для точечной правки. Если сомневаешься, лучше не сохранять.</div>' +
          '<div class="field"><label>ID пользователя</label><input class="input" id="rawSid" value="' + escapeHtml(state.selectedSid || '') + '" /></div>' +
          '<div style="height:10px"></div><button class="btn" id="btnLoadRawUser" type="button">Загрузить</button>' +
          '<div style="height:10px"></div><textarea class="textarea" id="rawUserJson">' + escapeHtml(getJsonText(state.selectedUserData)) + '</textarea>' +
          '<div style="height:10px"></div><button class="btn-primary" id="btnSaveRawUser" type="button">Сохранить пользователя</button>' +
        '</div>' +
        '<div class="card"><div class="card-title">Технические данные документов и идей</div>' +
          '<div class="field"><label>docs manifest</label><textarea class="textarea" id="rawDocsJson">' + escapeHtml(getJsonText(state.docsManifest)) + '</textarea></div>' +
          '<div style="height:10px"></div><button class="btn" id="btnSaveRawDocs" type="button">Сохранить docs</button>' +
          '<div style="height:14px"></div><div class="field"><label>admin config</label><textarea class="textarea" id="rawConfigJson">' + escapeHtml(getJsonText(state.adminConfig)) + '</textarea></div>' +
          '<div style="height:10px"></div><button class="btn" id="btnSaveRawConfig" type="button">Сохранить config</button>' +
        '</div>' +
      '</div>';
    $('#btnLoadRawUser').addEventListener('click', function() {
      loadUser($('#rawSid').value.trim()).then(function() {
        setStatus('JSON пользователя загружен', 'ok');
        renderRaw();
      }).catch(showError);
    });
    $('#btnSaveRawUser').addEventListener('click', function() {
      var sid = $('#rawSid').value.trim();
      var payload = parseJsonTextarea('rawUserJson');
      request('user', { method: 'PUT', sid: sid, body: payload }).then(function(body) {
        state.selectedSid = sid;
        state.selectedUserData = body.userData;
        setStatus('JSON пользователя сохранён', 'ok');
      }).catch(showError);
    });
    $('#btnSaveRawDocs').addEventListener('click', function() {
      request('docsManifest', { method: 'PUT', body: { manifest: parseJsonTextarea('rawDocsJson') } }).then(function(body) {
        state.docsManifest = body.manifest;
        setStatus('Документы сохранены', 'ok');
      }).catch(showError);
    });
    $('#btnSaveRawConfig').addEventListener('click', function() {
      request('adminConfig', { method: 'PUT', body: { config: parseJsonTextarea('rawConfigJson') } }).then(function(body) {
        state.adminConfig = body.config;
        setStatus('Config сохранён', 'ok');
      }).catch(showError);
    });
  }

  function render() {
    renderOverview();
    if (state.panel === 'users') renderUsers();
    if (state.panel === 'map') renderPoekhaliMap();
    if (state.panel === 'documents') renderDocuments();
    if (state.panel === 'functions') renderFunctions();
    if (state.panel === 'raw') renderRaw();
  }

  function showError(error) {
    setStatus(error && error.message ? error.message : String(error), 'error');
  }

  function refreshAll() {
    setStatus('Обновляю данные...');
    return Promise.all([loadOverview(), loadUsers(), loadDocs(), loadConfig(), loadPoekhaliMap()])
      .then(function() {
        setStatus('Данные обновлены', 'ok');
        render();
      })
      .catch(showError);
  }

  function init() {
    els.pageTitle = $('#pageTitle');
    els.pageNote = $('#pageNote');
    els.statusLine = $('#statusLine');
    els.adminUser = $('#adminUser');
    els.overview = $('#panel-overview');
    els.users = $('#panel-users');
    els.map = $('#panel-map');
    els.documents = $('#panel-documents');
    els.functions = $('#panel-functions');
    els.raw = $('#panel-raw');

    $all('.admin-nav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchPanel(btn.dataset.panel);
      });
    });
    $('#btnRefresh').addEventListener('click', refreshAll);

    checkAdmin()
      .then(refreshAll)
      .catch(function(error) {
        showAccessDenied(error);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
