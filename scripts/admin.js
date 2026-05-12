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
  };

  var panelTitles = {
    overview: ['Обзор', 'Сводка данных и состояния приложения'],
    users: ['Пользователи', 'Смены, параметры расчёта и поездочные данные по каждому пользователю'],
    documents: ['Документы', 'Редактор manifest.json для раздела документов'],
    functions: ['Функции', 'Черновики новых функций и вариантов расчёта без подключения к основному приложению'],
    raw: ['JSON', 'Точный режим редактирования административных данных'],
  };

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

  function getJsonText(value) {
    return JSON.stringify(value || {}, null, 2);
  }

  function parseJsonTextarea(id) {
    var raw = $('#' + id).value;
    return raw.trim() ? JSON.parse(raw) : {};
  }

  function request(resource, options) {
    var params = new URLSearchParams();
    params.set('resource', resource);
    if (options && options.sid) params.set('sid', options.sid);
    return fetch('/api/admin?' + params.toString(), {
      method: options && options.method ? options.method : 'GET',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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

  function checkAdmin() {
    return fetch('/api/admin/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(function(response) {
        return response.text().then(function(text) {
          var body = text ? JSON.parse(text) : {};
          if (!response.ok) throw new Error(body.error || 'Нет доступа');
          return body;
        });
      })
      .then(function(body) {
        state.admin = body.user || null;
        els.adminUser.textContent = state.admin
          ? ((state.admin.display_name || state.admin.username || ('ID ' + state.admin.id)) + ' · admin')
          : 'Администратор';
      });
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

  function switchPanel(panel) {
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
    panel.innerHTML =
      '<div class="grid grid-3">' +
        metricCard('Всего пользователей', data.stats && data.stats.totalUsers, 'По данным presence и файлов смен') +
        metricCard('Онлайн сейчас', data.stats && data.stats.onlineUsers, 'Окно ' + ((data.stats && data.stats.onlineWindowSeconds) || 0) + ' сек') +
        metricCard('Документов', data.docs && data.docs.totalFiles, 'Категорий: ' + ((data.docs && data.docs.categories || []).length)) +
      '</div>' +
      '<div class="grid grid-2" style="margin-top:12px">' +
        '<div class="card"><div class="card-title">Хранилище</div>' +
          storageLine('Смены', storage.shifts) +
          storageLine('Параметры зарплаты', storage.salaryParams) +
          storageLine('Обучение Поехали', storage.poekhaliLearning) +
          storageLine('Предупреждения', storage.poekhaliWarnings) +
          storageLine('Поездки', storage.poekhaliRuns) +
          '<div class="muted">Presence: ' + formatBytes(storage.presence || 0) + '</div>' +
        '</div>' +
        '<div class="card"><div class="card-title">Админ-доступ</div>' +
          '<div class="muted">ADMIN_TELEGRAM_IDS настроен: ' + (data.app && data.app.adminIdsConfigured ? 'да' : 'нет') + '</div>' +
          '<div class="muted">NODE_ENV: ' + escapeHtml(data.app && data.app.nodeEnv || '—') + '</div>' +
          '<div class="muted">Порт: ' + escapeHtml(data.app && data.app.port || '—') + '</div>' +
          '<div class="muted">Кэш приложения: ' + escapeHtml(data.app && data.app.cacheVersion || '—') + '</div>' +
        '</div>' +
      '</div>';
  }

  function metricCard(label, value, note) {
    return '<div class="card metric"><div class="metric-value">' + escapeHtml(value === undefined ? '—' : value) +
      '</div><div class="metric-label">' + escapeHtml(label) + '</div><div class="muted">' + escapeHtml(note || '') + '</div></div>';
  }

  function storageLine(label, row) {
    row = row || {};
    return '<div class="toolbar"><span>' + escapeHtml(label) + '</span><span class="muted">' +
      escapeHtml(row.files || 0) + ' файлов · ' + formatBytes(row.bytes || 0) + '</span></div>';
  }

  function renderUsers() {
    var panel = els.users;
    var selected = state.selectedUserData;
    panel.innerHTML =
      '<div class="toolbar">' +
        '<div class="toolbar-left"><input class="input" id="userSearch" placeholder="Поиск по ID" style="width:260px" /></div>' +
        '<div class="toolbar-right"><button class="btn-primary" id="btnCreateUser" type="button">Новый пользователь</button></div>' +
      '</div>' +
      '<div class="grid grid-2">' +
        '<div class="card"><div class="card-title">Пользователи</div><div id="usersTableSlot"></div></div>' +
        '<div class="card"><div id="userEditorSlot">' + (selected ? '' : '<div class="empty">Выберите пользователя слева.</div>') + '</div></div>' +
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
      var sid = prompt('Telegram ID нового пользователя');
      if (!sid) return;
      loadUser(sid.trim()).then(function() {
        renderUsers();
      }).catch(showError);
    });
  }

  function renderUsersTable(users) {
    var slot = $('#usersTableSlot');
    if (!users.length) {
      slot.innerHTML = '<div class="empty">Пользователей пока нет.</div>';
      return;
    }
    slot.innerHTML =
      '<div class="table-wrap"><table><thead><tr>' +
      '<th>ID</th><th>Статус</th><th>Смены</th><th>Последний вход</th><th>Поехали</th>' +
      '</tr></thead><tbody>' +
      users.map(function(user) {
        var learning = user.learning || {};
        return '<tr data-sid="' + escapeHtml(user.id) + '">' +
          '<td>' + escapeHtml(user.id) + '</td>' +
          '<td><span class="pill ' + (user.online ? 'is-online' : '') + '">' + (user.online ? 'онлайн' : 'офлайн') + '</span></td>' +
          '<td>' + escapeHtml(user.shifts || 0) + '</td>' +
          '<td>' + escapeHtml(formatDate(user.lastSeenAt)) + '</td>' +
          '<td>' + escapeHtml((user.warnings || 0) + ' пред. · ' + (user.runs || 0) + ' поезд. · ' + (learning.maps || 0) + ' карт') + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
    $all('tbody tr', slot).forEach(function(row) {
      row.addEventListener('click', function() {
        setStatus('Загружаю пользователя ' + row.dataset.sid + '...');
        loadUser(row.dataset.sid).then(function() {
          setStatus('Пользователь загружен', 'ok');
          renderUsers();
        }).catch(showError);
      });
    });
  }

  function renderUserEditor() {
    var data = state.selectedUserData;
    var slot = $('#userEditorSlot');
    slot.innerHTML =
      '<div class="toolbar"><div><div class="card-title">Пользователь ' + escapeHtml(data.sid) + '</div>' +
      '<div class="muted">Изменения сохраняются только после нажатия кнопки.</div></div>' +
      '<button class="btn-primary" id="btnSaveUser" type="button">Сохранить пользователя</button></div>' +
      '<div class="tabs">' + ['shifts','salary','warnings','runs','learning'].map(function(tab) {
        var labels = { shifts:'Смены', salary:'Расчёт', warnings:'Предупреждения', runs:'Поездки', learning:'Обучение' };
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
    if (state.userTab === 'runs') return renderJsonEditor(slot, 'poekhaliRuns', 'Поездки');
    renderJsonEditor(slot, 'poekhaliLearning', 'Обучение Поехали');
  }

  function renderShiftEditor(slot) {
    var shifts = state.selectedUserData.shifts || [];
    slot.innerHTML = '<div class="toolbar"><div class="muted">Всего смен: ' + shifts.length +
      '</div><button class="btn" id="btnAddShift" type="button">Добавить смену</button></div><div class="editor-list" id="shiftList"></div>';
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
    slot.innerHTML = '<div class="toolbar"><div class="muted">Предупреждений: ' + warnings.length +
      '</div><button class="btn" id="btnAddWarning" type="button">Добавить</button></div><div class="editor-list" id="warningsList"></div>';
    $('#btnAddWarning').addEventListener('click', function() {
      warnings.unshift({ id: 'warning-' + Date.now(), mapId: '', shiftId: '', sector: 0, start: 0, end: 100, speed: 25, name: '', note: '', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      renderWarningsEditor(slot);
    });
    var list = $('#warningsList');
    if (!warnings.length) {
      list.innerHTML = '<div class="empty">Предупреждений нет.</div>';
      return;
    }
    list.innerHTML = warnings.map(function(warning, index) {
      return '<div class="row-card"><div class="row-card-head"><strong>' + escapeHtml(warning.name || warning.id) +
        '</strong><button class="icon-btn" data-delete-warning="' + index + '" type="button">×</button></div>' +
        '<div class="form-grid">' +
          warningField('ID', 'id', warning.id, index) +
          warningField('Карта', 'mapId', warning.mapId, index) +
          warningField('Сектор', 'sector', warning.sector, index, 'number') +
          warningField('Начало', 'start', warning.start, index, 'number') +
          warningField('Конец', 'end', warning.end, index, 'number') +
          warningField('Скорость', 'speed', warning.speed, index, 'number') +
          warningField('Название', 'name', warning.name, index) +
          warningField('До даты', 'validUntil', warning.validUntil, index) +
          '<div class="field wide"><label>Заметка</label><textarea class="input" data-warning-field="note" data-index="' + index + '">' + escapeHtml(warning.note || '') + '</textarea></div>' +
        '</div></div>';
    }).join('');
    bindWarningInputs();
  }

  function warningField(label, key, value, index, type) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label><input class="input" type="' + (type || 'text') +
      '" data-warning-field="' + key + '" data-index="' + index + '" value="' + escapeHtml(value === undefined ? '' : value) + '" /></div>';
  }

  function bindWarningInputs() {
    $all('[data-warning-field]').forEach(function(input) {
      input.addEventListener('input', function() {
        var warning = state.selectedUserData.poekhaliWarnings[Number(input.dataset.index)];
        var key = input.dataset.warningField;
        warning[key] = input.type === 'number' ? Number(input.value || 0) : input.value;
        warning.updatedAt = new Date().toISOString();
      });
    });
    $all('[data-delete-warning]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.selectedUserData.poekhaliWarnings.splice(Number(btn.dataset.deleteWarning), 1);
        renderUserEditor();
      });
    });
  }

  function renderJsonEditor(slot, key, title) {
    slot.innerHTML = '<div class="field"><label>' + escapeHtml(title) + '</label><textarea class="textarea" id="json_' + key + '">' +
      escapeHtml(getJsonText(state.selectedUserData[key])) + '</textarea></div>';
    $('#json_' + key).addEventListener('input', function() {
      try {
        state.selectedUserData[key] = parseJsonTextarea('json_' + key);
        setStatus('');
      } catch (error) {
        setStatus('JSON пока невалидный: ' + error.message, 'error');
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

  function renderDocuments() {
    var panel = els.documents;
    var manifest = state.docsManifest || {};
    var categories = Object.keys(manifest);
    if (!categories.includes(state.docsCategory)) state.docsCategory = categories[0] || 'speeds';
    panel.innerHTML =
      '<div class="toolbar"><div class="toolbar-left"><div class="tabs">' + categories.map(function(category) {
        return '<button class="tab ' + (category === state.docsCategory ? 'is-active' : '') + '" data-doc-category="' + category + '" type="button">' + category + '</button>';
      }).join('') + '</div></div>' +
      '<div class="toolbar-right"><button class="btn" id="btnAddDocCategory" type="button">Категория</button><button class="btn-primary" id="btnSaveDocs" type="button">Сохранить документы</button></div></div>' +
      '<div class="card"><div class="toolbar"><div class="card-title">' + escapeHtml(state.docsCategory || 'Документы') +
      '</div><button class="btn" id="btnAddDoc" type="button">Добавить файл</button></div><div class="editor-list" id="docsList"></div></div>';
    $all('[data-doc-category]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.docsCategory = btn.dataset.docCategory;
        renderDocuments();
      });
    });
    $('#btnAddDocCategory').addEventListener('click', function() {
      var name = prompt('Ключ категории латиницей, например memos');
      if (!name) return;
      var safe = name.trim().replace(/[^\w-]+/g, '');
      if (!safe) return;
      if (!state.docsManifest[safe]) state.docsManifest[safe] = [];
      state.docsCategory = safe;
      renderDocuments();
    });
    $('#btnAddDoc').addEventListener('click', function() {
      if (!state.docsManifest[state.docsCategory]) state.docsManifest[state.docsCategory] = [];
      state.docsManifest[state.docsCategory].push({ name: '', path: '/assets/docs/', mime_type: 'application/pdf', size: 0, updated_at: new Date().toISOString().slice(0, 10) });
      renderDocuments();
    });
    $('#btnSaveDocs').addEventListener('click', saveDocs);
    renderDocRows();
  }

  function renderDocRows() {
    var list = $('#docsList');
    var rows = (state.docsManifest && state.docsManifest[state.docsCategory]) || [];
    if (!rows.length) {
      list.innerHTML = '<div class="empty">В категории нет документов.</div>';
      return;
    }
    list.innerHTML = rows.map(function(doc, index) {
      return '<div class="row-card"><div class="row-card-head"><strong>' + escapeHtml(doc.name || 'Новый документ') +
        '</strong><button class="icon-btn" data-delete-doc="' + index + '" type="button">×</button></div>' +
        '<div class="form-grid">' +
          docField('Название', 'name', doc.name, index) +
          docField('Путь', 'path', doc.path, index) +
          docField('MIME', 'mime_type', doc.mime_type, index) +
          docField('Размер', 'size', doc.size, index, 'number') +
          docField('Дата', 'updated_at', doc.updated_at, index) +
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
  }

  function docField(label, key, value, index, type) {
    return '<div class="field ' + (key === 'path' ? 'wide' : '') + '"><label>' + escapeHtml(label) + '</label><input class="input" type="' +
      (type || 'text') + '" data-doc-field="' + key + '" data-index="' + index + '" value="' + escapeHtml(value === undefined ? '' : value) + '" /></div>';
  }

  function saveDocs() {
    setStatus('Сохраняю manifest документов...');
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
      '<div class="toolbar"><div class="muted">Эти записи не меняют поведение приложения, пока их явно не подключить в коде.</div>' +
      '<button class="btn-primary" id="btnSaveConfig" type="button">Сохранить</button></div>' +
      '<div class="grid grid-2">' +
        '<div class="card"><div class="toolbar"><div class="card-title">Функции</div><button class="btn" id="btnAddFeature" type="button">Добавить</button></div><div id="featureList" class="editor-list"></div></div>' +
        '<div class="card"><div class="toolbar"><div class="card-title">Варианты расчёта</div><button class="btn" id="btnAddCalc" type="button">Добавить</button></div><div id="calcList" class="editor-list"></div></div>' +
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
        '<div class="card"><div class="card-title">Пользователь</div>' +
          '<div class="field"><label>ID пользователя</label><input class="input" id="rawSid" value="' + escapeHtml(state.selectedSid || '') + '" /></div>' +
          '<div style="height:10px"></div><button class="btn" id="btnLoadRawUser" type="button">Загрузить</button>' +
          '<div style="height:10px"></div><textarea class="textarea" id="rawUserJson">' + escapeHtml(getJsonText(state.selectedUserData)) + '</textarea>' +
          '<div style="height:10px"></div><button class="btn-primary" id="btnSaveRawUser" type="button">Сохранить пользователя</button>' +
        '</div>' +
        '<div class="card"><div class="card-title">Документы и функции</div>' +
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
    if (state.panel === 'documents') renderDocuments();
    if (state.panel === 'functions') renderFunctions();
    if (state.panel === 'raw') renderRaw();
  }

  function showError(error) {
    setStatus(error && error.message ? error.message : String(error), 'error');
  }

  function refreshAll() {
    setStatus('Обновляю данные...');
    return Promise.all([loadOverview(), loadUsers(), loadDocs(), loadConfig()])
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
        els.adminUser.textContent = 'Нет доступа';
        setStatus(error.message + '. В проде укажите ADMIN_TELEGRAM_IDS с вашим Telegram ID и войдите через приложение.', 'error');
        els.overview.innerHTML = '<div class="empty">Админ API закрыт. Для локальной разработки откройте localhost, для продакшена настройте ADMIN_TELEGRAM_IDS.</div>';
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
