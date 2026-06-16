/**
 * Interactive layer for the cases HTML export.
 *
 * Progressively enhances the otherwise-static, self-contained export with:
 * assignment per event, a managed people list, person filtering, today-focus,
 * completion toggling, and a "download assigned version" action that bakes the
 * current people list + assignments back into a new self-contained `.html`.
 *
 * The exported document stays readable with JavaScript disabled; the controls
 * here are injected at runtime.
 */

/** Minimal event shape needed to derive a stable interactive event id. */
export interface InteractiveEvent {
    caseId: string;
    /** Milestone / appointment / tax field key, e.g. 'seal_date'. */
    fieldKey?: string;
    /** Todo id; when present the event is a todo event. */
    todoId?: string;
}

export interface ExportState {
    people: string[];
    /**
     * Per-case assignment: key = caseId, value = person name. A case has exactly
     * one assignee, shared by its timeline event selectors and table row selector.
     */
    assignments: Record<string, string>;
    /**
     * Per-event completion: key = eventId (`caseId::fieldKey` or
     * `caseId::todo::todoId`), value = done flag. Completion stays per event and
     * is decoupled from the case-level assignment above.
     */
    done: Record<string, boolean>;
    /**
     * Per-card memo-block collapse: key = `caseId|blockType`
     * (blockType ∈ warning | pending | private), value = true when collapsed.
     * Collapsed blocks are hidden on screen and in print. Optional so older
     * exports without this field are treated as "all expanded".
     */
    collapsed?: Record<string, boolean>;
}

/**
 * Stable event id used as the key for assignments and completion state.
 * Milestone/appointment/tax events -> `caseId::fieldKey`.
 * Todo events -> `caseId::todo::todoId`.
 * Stable ids (not positional indexes) keep assignments mapped to the same
 * event after the assigned version is downloaded and reopened.
 */
export function getExportEventId(event: InteractiveEvent): string {
    if (event.todoId != null) return `${event.caseId}::todo::${event.todoId}`;
    return `${event.caseId}::${event.fieldKey}`;
}

/**
 * Serialize the initial (empty) interactive state for embedding in the
 * `#export-state` node. Events are validated (each yields a stable id) but the
 * initial state carries no people, assignments, or completion. Never throws —
 * empty lists, missing events, and date-less events all return a valid state.
 */
export function serializeInitialState(events: InteractiveEvent[] = []): string {
    const list = Array.isArray(events) ? events : [];
    // Validate every event produces a non-empty stable id; date is irrelevant.
    list.forEach((event) => {
        getExportEventId(event);
    });
    const state: ExportState = { people: [], assignments: {}, done: {} };
    return JSON.stringify(state);
}

// The runtime script is authored with string concatenation only (no template
// literals, no ${...}) so it can be embedded verbatim without escaping.
const SCRIPT_BODY = `(function () {
  'use strict';

  var EMBEDDED_STATE = __EMBEDDED_STATE__;
  var STORAGE_KEY = 'sf-cases-export-done::' + (location.pathname || 'doc');

  function emptyState() { return { people: [], assignments: {}, done: {}, collapsed: {} }; }

  function cloneState(s) {
    var base = emptyState();
    if (s && typeof s === 'object') {
      base.people = Array.isArray(s.people) ? s.people.slice() : [];
      base.assignments = (s.assignments && typeof s.assignments === 'object')
        ? JSON.parse(JSON.stringify(s.assignments)) : {};
      base.done = (s.done && typeof s.done === 'object')
        ? JSON.parse(JSON.stringify(s.done)) : {};
      // Older exports may lack collapsed → treated as "all expanded".
      base.collapsed = (s.collapsed && typeof s.collapsed === 'object')
        ? JSON.parse(JSON.stringify(s.collapsed)) : {};
    }
    return base;
  }

  function readState() {
    var node = document.getElementById('export-state');
    if (node && node.textContent && node.textContent.trim()) {
      try { return cloneState(JSON.parse(node.textContent)); }
      catch (e) { return cloneState(EMBEDDED_STATE); }
    }
    return cloneState(EMBEDDED_STATE);
  }

  function loadLocalDone() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { var d = JSON.parse(raw); if (d && typeof d === 'object') return d; }
    } catch (e) {}
    return null;
  }

  function saveLocalDone(done) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(done)); } catch (e) {}
  }

  var WEEKDAY_TC = ['日', '一', '二', '三', '四', '五', '六'];

  function todayKey() {
    var n = new Date();
    return dateKey(n);
  }

  function dateKey(d) {
    var mm = String(d.getMonth() + 1); if (mm.length < 2) mm = '0' + mm;
    var dd = String(d.getDate()); if (dd.length < 2) dd = '0' + dd;
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  // Parse a local 'yyyy-MM-dd' into a local-midnight Date (no timezone shift).
  function parseLocalDate(s) {
    var p = (s || '').split('-');
    if (p.length < 3) return null;
    var y = Number(p[0]), m = Number(p[1]), d = Number(p[2]);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  // Monday that starts the week containing the given date (week starts Monday).
  function mondayOf(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = x.getDay(); // 0=Sun .. 6=Sat
    var diff = (day === 0) ? -6 : (1 - day);
    x.setDate(x.getDate() + diff);
    return x;
  }

  function uniquePush(arr, name) {
    name = (name || '').trim();
    if (!name) return false;
    for (var i = 0; i < arr.length; i++) { if (arr[i] === name) return false; }
    arr.push(name);
    return true;
  }

  var state = readState();
  var localDone = loadLocalDone();
  if (localDone) {
    for (var k in localDone) {
      if (Object.prototype.hasOwnProperty.call(localDone, k)) state.done[k] = localDone[k];
    }
  }

  var items = Array.prototype.slice.call(document.querySelectorAll('.timeline-item'));
  var tableRows = Array.prototype.slice.call(document.querySelectorAll('tr[data-case-id]'));
  var memoCards = Array.prototype.slice.call(document.querySelectorAll('.memo-card[data-case-id]'));
  // All assignee selectors (timeline + table) keyed by caseId.
  var assigneeSelects = [];
  // All "承辦：<name>" badges (table + memo) keyed by caseId.
  var badges = [];
  var currentFilter = '__all__';
  var toolbar = null;
  // Timeline view: 'list' (default static list) or 'week' (week-agenda).
  var currentView = 'list';
  var weekContainer = null;
  var weekRendered = false;
  var viewBtns = [];
  // Completion controls keyed by eventId; both list and week events register so
  // a single state.done[eventId] stays the single source of truth across views.
  var doneRegistry = {};
  // Per-card memo-block collapse buttons; one entry per .memo-block so both
  // per-card toggles and the global category switches redraw from state.collapsed.
  var memoCollapseBtns = [];
  // Global per-category switches (warning/pending/private); redrawn from state.
  var memoGlobalBtns = [];

  function caseAssignee(caseId) { return (caseId && state.assignments[caseId]) || ''; }

  function isCaseVisible(caseId) {
    if (currentFilter === '__all__') return true;
    return caseAssignee(caseId) === currentFilter;
  }

  function applyDoneStyle(item, done) {
    if (done) item.classList.add('export-item-done');
    else item.classList.remove('export-item-done');
  }

  // Register a completion checkbox + its node under an eventId and sync it to
  // the current state. List and week events for the same eventId share state.
  function registerDone(eventId, cb, item) {
    if (!doneRegistry[eventId]) doneRegistry[eventId] = [];
    doneRegistry[eventId].push({ cb: cb, item: item });
    cb.checked = !!state.done[eventId];
    applyDoneStyle(item, cb.checked);
  }

  // Single source of truth toggle: updates state, localStorage, and every
  // registered checkbox + node for this eventId (across both timeline views).
  function setDone(eventId, done) {
    if (done) state.done[eventId] = true; else delete state.done[eventId];
    saveLocalDone(state.done);
    var arr = doneRegistry[eventId] || [];
    for (var i = 0; i < arr.length; i++) {
      arr[i].cb.checked = done;
      applyDoneStyle(arr[i].item, done);
    }
  }

  // Hide each .timeline-day-group container (header + its items) as a whole when
  // it has no visible .timeline-item left after filtering. Hiding the container
  // — not just the header — avoids leaving an empty cell in the two-column grid.
  function refreshDayHeaders() {
    var groups = document.querySelectorAll('.timeline-day-group');
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var groupItems = group.querySelectorAll('.timeline-item');
      var visibleCount = 0;
      for (var i = 0; i < groupItems.length; i++) {
        if (groupItems[i].style.display !== 'none') visibleCount++;
      }
      group.style.display = visibleCount > 0 ? '' : 'none';
    }
  }

  // Filter all three sections by each item's caseId + the per-case assignment.
  function applyFilter() {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      it.style.display = isCaseVisible(it.getAttribute('data-case-id')) ? '' : 'none';
    }
    for (var r = 0; r < tableRows.length; r++) {
      var row = tableRows[r];
      row.style.display = isCaseVisible(row.getAttribute('data-case-id')) ? '' : 'none';
    }
    for (var m = 0; m < memoCards.length; m++) {
      var card = memoCards[m];
      card.style.display = isCaseVisible(card.getAttribute('data-case-id')) ? '' : 'none';
    }
    // Week-agenda events share the same per-case visibility rule. Queried live
    // because the week DOM is built lazily on first switch to the week view.
    var weekEvents = document.querySelectorAll('.week-event');
    for (var w = 0; w < weekEvents.length; w++) {
      var we = weekEvents[w];
      we.style.display = isCaseVisible(we.getAttribute('data-case-id')) ? '' : 'none';
    }
    refreshDayHeaders();
  }

  function applyToday() {
    var tk = todayKey();
    var headers = document.querySelectorAll('.timeline-day');
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      if (h.getAttribute('data-day') === tk) h.classList.add('timeline-day-today');
      else h.classList.remove('timeline-day-today');
    }
  }

  function fillSelect(sel, current) {
    sel.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = ''; opt0.textContent = '未指派';
    sel.appendChild(opt0);
    for (var j = 0; j < state.people.length; j++) {
      var o = document.createElement('option');
      o.value = state.people[j]; o.textContent = state.people[j];
      if (state.people[j] === current) o.selected = true;
      sel.appendChild(o);
    }
    sel.value = current;
  }

  function updateSelects() {
    for (var i = 0; i < assigneeSelects.length; i++) {
      var c = assigneeSelects[i];
      fillSelect(c.sel, caseAssignee(c.caseId));
    }
  }

  function updateBadges() {
    for (var i = 0; i < badges.length; i++) {
      var b = badges[i];
      var name = caseAssignee(b.caseId);
      if (name) { b.el.textContent = '承辦：' + name; b.el.style.display = ''; }
      else { b.el.textContent = ''; b.el.style.display = 'none'; }
    }
  }

  // Single entry point for any assignment change (timeline or table selector).
  function applyAssignment(caseId, person) {
    if (!caseId) return;
    if (person) state.assignments[caseId] = person; else delete state.assignments[caseId];
    updateSelects();
    updateBadges();
    applyFilter();
  }

  // Remove a person: drop from the list, unassign every case held by them,
  // reset the filter if it pointed at them, and refresh all three sections.
  function deletePerson(name) {
    var idx = state.people.indexOf(name);
    if (idx === -1) return;
    state.people.splice(idx, 1);
    for (var k in state.assignments) {
      if (Object.prototype.hasOwnProperty.call(state.assignments, k) && state.assignments[k] === name) {
        delete state.assignments[k];
      }
    }
    if (currentFilter === name) currentFilter = '__all__';
    renderPeople();
    applyFilter();
  }

  function renderFilterBar(filterBar) {
    filterBar.innerHTML = '';
    var labels = ['__all__'].concat(state.people);
    for (var i = 0; i < labels.length; i++) {
      (function (val) {
        var isAll = val === '__all__';
        var chip = document.createElement('span');
        chip.className = 'export-filter-chip';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'export-filter-btn' + (currentFilter === val ? ' active' : '');
        btn.textContent = isAll ? '全部' : val;
        btn.addEventListener('click', function () { currentFilter = val; renderFilterBar(filterBar); applyFilter(); });
        chip.appendChild(btn);

        if (!isAll) {
          var del = document.createElement('button');
          del.type = 'button';
          del.className = 'export-filter-del';
          del.textContent = '×';
          del.title = '刪除 ' + val;
          del.addEventListener('click', function () { deletePerson(val); });
          chip.appendChild(del);
        }

        filterBar.appendChild(chip);
      })(labels[i]);
    }
  }

  function renderPeople() {
    if (toolbar) renderFilterBar(toolbar.filterBar);
    updateSelects();
    updateBadges();
  }

  function makeAssigneeSelect(caseId) {
    var sel = document.createElement('select');
    sel.className = 'export-assignee';
    sel.addEventListener('change', function () { applyAssignment(caseId, sel.value); });
    assigneeSelects.push({ caseId: caseId, sel: sel });
    return sel;
  }

  function makeBadge(caseId, extraClass) {
    var b = document.createElement('span');
    b.className = 'export-ui export-assignee-badge' + (extraClass ? ' ' + extraClass : '');
    b.style.display = 'none';
    badges.push({ caseId: caseId, el: b });
    return b;
  }

  function downloadAssigned() {
    var clone = document.documentElement.cloneNode(true);
    var injected = clone.querySelectorAll('.export-ui');
    for (var i = 0; i < injected.length; i++) {
      if (injected[i].parentNode) injected[i].parentNode.removeChild(injected[i]);
    }
    var stateNode = clone.querySelector('#export-state');
    if (stateNode) stateNode.textContent = JSON.stringify(state);
    var html = '<!DOCTYPE html>\\n' + clone.outerHTML;
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cases-assigned-' + todayKey() + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  function buildToolbar() {
    // Anchor above the first section so the toolbar (filter + add-person +
    // download) sits at the very top — assignment now drives all three sections,
    // and enhancement no longer depends on the timeline section existing.
    var anchor = document.querySelector('.section');
    var parent = anchor ? anchor.parentNode : null;
    if (!anchor || !parent) return null;

    var bar = document.createElement('div');
    bar.className = 'export-ui export-toolbar';

    var filterBar = document.createElement('div');
    filterBar.className = 'export-filterbar';
    bar.appendChild(filterBar);

    var addWrap = document.createElement('div');
    addWrap.className = 'export-people-add';
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '新增承辦人…';
    input.className = 'export-add-input';
    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'export-add-btn';
    addBtn.textContent = '新增';
    addWrap.appendChild(input);
    addWrap.appendChild(addBtn);
    bar.appendChild(addWrap);

    var dl = document.createElement('button');
    dl.type = 'button';
    dl.className = 'export-download';
    dl.textContent = '📥 下載已指派版本';
    bar.appendChild(dl);

    parent.insertBefore(bar, anchor);

    addBtn.addEventListener('click', function () {
      if (uniquePush(state.people, input.value)) { input.value = ''; renderPeople(); }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); }
    });
    dl.addEventListener('click', downloadAssigned);

    return { filterBar: filterBar };
  }

  function buildItemControls() {
    for (var i = 0; i < items.length; i++) {
      (function (item) {
        var eventId = item.getAttribute('data-event-id');
        if (!eventId) return;
        var caseId = item.getAttribute('data-case-id');

        var wrap = document.createElement('span');
        wrap.className = 'export-ui export-item-controls';

        // Assignment is per case; this selector shares state with the table row.
        var sel = makeAssigneeSelect(caseId);
        wrap.appendChild(sel);

        var doneLabel = document.createElement('label');
        doneLabel.className = 'export-done';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!state.done[eventId];
        doneLabel.appendChild(cb);
        var doneTxt = document.createElement('span');
        doneTxt.textContent = '完成';
        doneLabel.appendChild(doneTxt);
        wrap.appendChild(doneLabel);

        // Lead each row with the control group (承辦＋完成) so it aligns at the
        // far left instead of being pushed to the right edge past short content.
        item.insertBefore(wrap, item.firstChild);
        registerDone(eventId, cb, item);

        // Completion stays per event (eventId), decoupled from assignment, and
        // is mirrored to any week-agenda event sharing the same eventId.
        cb.addEventListener('change', function () {
          setDone(eventId, cb.checked);
        });
      })(items[i]);
    }
  }

  // ── Week calendar view (7-column month grid) ────────────────────────
  // Rebuild a compact chip from its list .timeline-item, reusing the
  // icon/label/parties spans — buyer/seller names identify the case far better
  // than the opaque case number, which is dropped here (case identity is still
  // carried via data-case-id for filtering/sync). The completion checkbox is
  // kept so the chip stays in sync with the list view.
  function makeWeekEvent(src) {
    var caseId = src.getAttribute('data-case-id');
    var eventId = src.getAttribute('data-event-id');
    var node = document.createElement('div');
    node.className = 'export-ui week-event';
    node.setAttribute('data-case-id', caseId);
    node.setAttribute('data-event-id', eventId);

    var spans = src.querySelectorAll('.timeline-icon, .timeline-label, .timeline-parties');
    for (var i = 0; i < spans.length; i++) node.appendChild(spans[i].cloneNode(true));

    var doneLabel = document.createElement('label');
    doneLabel.className = 'export-done';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    doneLabel.appendChild(cb);
    var doneTxt = document.createElement('span');
    doneTxt.textContent = '完成';
    doneLabel.appendChild(doneTxt);
    node.appendChild(doneLabel);

    registerDone(eventId, cb, node);
    cb.addEventListener('change', function () { setDone(eventId, cb.checked); });
    return node;
  }

  // Rebuild the calendar from the existing .timeline-item nodes: each week is a
  // 7-column .week-grid (Mon..Sun) of .week-cell, covering this week through the
  // week of the last upcoming event. Each cell carries data-day and its date
  // label; empty days are empty cells (preserving the grid). Today is marked.
  function renderWeekAgenda() {
    if (!weekContainer) return;
    weekContainer.innerHTML = '';

    var byDate = {};
    var maxDate = null;
    for (var i = 0; i < items.length; i++) {
      var dk = items[i].getAttribute('data-event-date');
      var pd = parseLocalDate(dk);
      if (!pd) continue;
      if (!byDate[dk]) byDate[dk] = [];
      byDate[dk].push(items[i]);
      if (!maxDate || pd.getTime() > maxDate.getTime()) maxDate = pd;
    }

    var tk = todayKey();
    var startMon = mondayOf(new Date());
    var endRef = maxDate || startMon;
    var endMon = mondayOf(endRef);

    var weekStart = new Date(startMon.getFullYear(), startMon.getMonth(), startMon.getDate());
    while (weekStart.getTime() <= endMon.getTime()) {
      var grid = document.createElement('div');
      grid.className = 'export-ui week-grid';
      weekContainer.appendChild(grid);

      for (var d = 0; d < 7; d++) {
        var cellDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + d);
        var key = dateKey(cellDate);
        var cell = document.createElement('div');
        cell.className = 'week-cell' + (key === tk ? ' week-cell-today' : '');
        cell.setAttribute('data-day', key);

        var dateLbl = document.createElement('div');
        dateLbl.className = 'week-cell-date';
        dateLbl.textContent = (cellDate.getMonth() + 1) + '/' + cellDate.getDate() + '（' + WEEKDAY_TC[cellDate.getDay()] + '）';
        cell.appendChild(dateLbl);

        var dayEvents = byDate[key] || [];
        for (var e = 0; e < dayEvents.length; e++) cell.appendChild(makeWeekEvent(dayEvents[e]));

        grid.appendChild(cell);
      }

      weekStart.setDate(weekStart.getDate() + 7);
    }
  }

  // Toggle between the static list and the lazily-built week-agenda container.
  function setView(view) {
    currentView = (view === 'week') ? 'week' : 'list';
    var list = document.querySelector('.timeline-list');
    if (currentView === 'week') {
      if (!weekRendered) { renderWeekAgenda(); weekRendered = true; applyFilter(); }
      if (list) list.style.display = 'none';
      if (weekContainer) weekContainer.style.display = '';
    } else {
      if (list) list.style.display = '';
      if (weekContainer) weekContainer.style.display = 'none';
    }
    for (var i = 0; i < viewBtns.length; i++) {
      if (viewBtns[i].view === currentView) viewBtns[i].el.classList.add('active');
      else viewBtns[i].el.classList.remove('active');
    }
  }

  // Inject the list/week switcher and the (hidden) week-agenda container around
  // the timeline list. All injected nodes carry export-ui so the downloaded
  // version strips them and the script rebuilds them on reopen.
  function buildViewSwitcher() {
    var list = document.querySelector('.timeline-list');
    if (!list || !list.parentNode) return;

    var bar = document.createElement('div');
    bar.className = 'export-ui export-view-switch';
    var defs = [{ view: 'list', label: '條列' }, { view: 'week', label: '週曆' }];
    for (var i = 0; i < defs.length; i++) {
      (function (def) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'export-view-btn' + (def.view === currentView ? ' active' : '');
        btn.textContent = def.label;
        btn.addEventListener('click', function () { setView(def.view); });
        bar.appendChild(btn);
        viewBtns.push({ view: def.view, el: btn });
      })(defs[i]);
    }
    list.parentNode.insertBefore(bar, list);

    weekContainer = document.createElement('div');
    weekContainer.className = 'export-ui week-agenda';
    weekContainer.style.display = 'none';
    list.parentNode.insertBefore(weekContainer, list.nextSibling);
  }

  function buildTableControls() {
    if (!tableRows.length) return;
    var table = tableRows[0].closest ? tableRows[0].closest('table') : null;
    if (table) {
      var headRow = table.querySelector('thead tr');
      if (headRow) {
        var th = document.createElement('th');
        th.className = 'export-ui';
        th.textContent = '承辦人';
        headRow.appendChild(th);
      }
    }
    for (var i = 0; i < tableRows.length; i++) {
      (function (row) {
        var caseId = row.getAttribute('data-case-id');
        var td = document.createElement('td');
        td.className = 'export-ui export-row-assignee-cell';
        td.appendChild(makeAssigneeSelect(caseId));
        td.appendChild(document.createElement('br'));
        td.appendChild(makeBadge(caseId, 'export-row-badge'));
        row.appendChild(td);
      })(tableRows[i]);
    }
  }

  function buildMemoControls() {
    for (var i = 0; i < memoCards.length; i++) {
      (function (card) {
        var caseId = card.getAttribute('data-case-id');
        var head = card.querySelector('.memo-card-head') || card;
        head.appendChild(makeBadge(caseId, 'export-memo-badge'));
      })(memoCards[i]);
    }
  }

  // ── Memo-block collapse ─────────────────────────────────────────────
  // Map a .memo-block to its blockType from its category class.
  function memoBlockType(block) {
    if (block.classList.contains('memo-warning')) return 'warning';
    if (block.classList.contains('memo-pending')) return 'pending';
    if (block.classList.contains('memo-private')) return 'private';
    return '';
  }

  function collapseKey(caseId, blockType) { return caseId + '|' + blockType; }

  // Apply collapse to one block: the class hides the actual content node on
  // screen and in print; the button label flips between 收合 / 展開.
  function applyCollapse(block, btn, collapsed) {
    if (collapsed) block.classList.add('export-collapsed');
    else block.classList.remove('export-collapsed');
    if (btn) btn.textContent = collapsed ? '展開' : '收合';
  }

  // Single source of truth write: per-card key in state.collapsed.
  function setCollapsed(caseId, blockType, collapsed) {
    if (collapsed) state.collapsed[collapseKey(caseId, blockType)] = true;
    else delete state.collapsed[collapseKey(caseId, blockType)];
  }

  // A category is "all collapsed" only when it has blocks and every one is
  // collapsed; an empty category counts as not-all-collapsed.
  function categoryAllCollapsed(blockType) {
    var any = false, all = true;
    for (var i = 0; i < memoCollapseBtns.length; i++) {
      var c = memoCollapseBtns[i];
      if (c.blockType !== blockType) continue;
      any = true;
      if (!state.collapsed[collapseKey(c.caseId, c.blockType)]) all = false;
    }
    return any && all;
  }

  // Redraw every per-card button + block AND the global switch labels from
  // state.collapsed (single source of truth for both init and global actions).
  function refreshCollapse() {
    for (var i = 0; i < memoCollapseBtns.length; i++) {
      var c = memoCollapseBtns[i];
      applyCollapse(c.block, c.btn, !!state.collapsed[collapseKey(c.caseId, c.blockType)]);
    }
    for (var g = 0; g < memoGlobalBtns.length; g++) {
      var gb = memoGlobalBtns[g];
      gb.btn.textContent = (categoryAllCollapsed(gb.type) ? '展開' : '收合') + gb.label;
    }
  }

  // Inject an export-ui collapse toggle into each memo block, then restore the
  // collapsed state from state.collapsed (so reopened downloads stay collapsed).
  function buildMemoCollapse() {
    for (var i = 0; i < memoCards.length; i++) {
      (function (card) {
        var caseId = card.getAttribute('data-case-id');
        var blocks = card.querySelectorAll('.memo-block');
        for (var j = 0; j < blocks.length; j++) {
          (function (block) {
            var blockType = memoBlockType(block);
            if (!blockType) return;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'export-ui export-memo-collapse';
            btn.textContent = '收合';
            var label = block.querySelector('.memo-label') || block;
            label.appendChild(btn);
            memoCollapseBtns.push({ caseId: caseId, blockType: blockType, block: block, btn: btn });
            btn.addEventListener('click', function () {
              var next = !block.classList.contains('export-collapsed');
              setCollapsed(caseId, blockType, next);
              applyCollapse(block, btn, next);
            });
          })(blocks[j]);
        }
      })(memoCards[i]);
    }
    refreshCollapse();
  }

  // Batch-apply per-card collapse to a whole category. Direction is derived
  // from current state: any expanded card → collapse all; else expand all.
  // No second-level state is introduced — only per-card state.collapsed keys.
  function toggleCategory(blockType) {
    var target = !categoryAllCollapsed(blockType); // true → collapse all
    for (var i = 0; i < memoCollapseBtns.length; i++) {
      var c = memoCollapseBtns[i];
      if (c.blockType !== blockType) continue;
      setCollapsed(c.caseId, blockType, target);
    }
    refreshCollapse();
  }

  // Inject one export-ui category switch per block type at the top of the memo
  // section. Each batch-applies per-card collapse; labels redraw from state.
  function buildMemoCategorySwitch() {
    var grid = document.querySelector('.memo-grid');
    if (!grid || !grid.parentNode) return;

    var bar = document.createElement('div');
    bar.className = 'export-ui export-memo-switch';
    var defs = [
      { type: 'warning', label: '警示' },
      { type: 'pending', label: '其他' },
      { type: 'private', label: '私密' }
    ];
    for (var i = 0; i < defs.length; i++) {
      (function (def) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'export-ui export-memo-collapse-all';
        btn.setAttribute('data-block-type', def.type);
        bar.appendChild(btn);
        memoGlobalBtns.push({ type: def.type, label: def.label, btn: btn });
        btn.addEventListener('click', function () { toggleCategory(def.type); });
      })(defs[i]);
    }
    grid.parentNode.insertBefore(bar, grid);
    refreshCollapse();
  }

  toolbar = buildToolbar();
  if (toolbar) {
    buildItemControls();
    buildTableControls();
    buildMemoControls();
    buildMemoCollapse();
    buildMemoCategorySwitch();
    buildViewSwitcher();
    renderPeople();
    applyToday();
    applyFilter();
  }
})();`;

/**
 * Build the inline `<script>` (as a string) that hydrates from the embedded
 * `#export-state` node and enhances the export. The passed state is embedded as
 * a JS fallback used when the state node is missing or malformed.
 */
export function buildInteractiveScript(state: string = serializeInitialState()): string {
    const body = SCRIPT_BODY.replace('__EMBEDDED_STATE__', () => state);
    return `<script>\n${body}\n</script>`;
}
