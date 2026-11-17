import type { Clause } from './useClauses';

const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function exportClausesToHTML(clauses: Clause[]): void {
    // 收集所有分類與標籤，用於側邊欄
    const categories = Array.from(new Set(clauses.map(c => c.category)));
    const tagsByCategory: Record<string, string[]> = {};
    categories.forEach(cat => {
        const catClauses = clauses.filter(c => c.category === cat);
        const tagCount: Record<string, number> = {};
        catClauses.forEach(c => (c.tags ?? []).forEach(t => { tagCount[t] = (tagCount[t] ?? 0) + 1; }));
        tagsByCategory[cat] = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a]);
    });

    const sidebarItems = categories.map(cat => {
        const tags = tagsByCategory[cat] ?? [];
        const tagLinks = tags.map(tag => {
            const count = clauses.filter(c => c.category === cat && c.tags?.includes(tag)).length;
            return `<li class="tag-link" data-cat="${escapeHtml(cat)}" data-tag="${escapeHtml(tag)}" onclick="filterByTag(this)" title="${escapeHtml(tag)}">${escapeHtml(tag)} <span class="badge">${count}</span></li>`;
        }).join('');
        return `
        <div class="sidebar-group">
          <div class="sidebar-cat" onclick="toggleCat(this)">
            <span>${escapeHtml(cat)}</span>
            <span class="cat-count">${clauses.filter(c => c.category === cat).length}</span>
            <span class="arrow">▾</span>
          </div>
          <ul class="tag-list">${tagLinks}</ul>
        </div>`;
    }).join('');

    // 全域流水號：renderClauses 會被每個分類各呼叫一次，用區域 index 會讓基本/增補特約的 id 重複
    let seq = 0;
    const renderClauses = (items: Clause[]) => items.map((c) => {
        const i = seq++;
        return `
        <div class="clause" id="c${i}"
             data-category="${escapeHtml(c.category)}"
             data-tags="${escapeHtml((c.tags ?? []).join(','))}"
             data-search="${escapeHtml((c.title + ' ' + c.content + ' ' + (c.tags ?? []).join(' ')).toLowerCase())}">
          <div class="clause-header">
            <div style="flex:1;min-width:0">
              <div class="clause-title">${escapeHtml(c.title)}</div>
              ${c.tags?.length ? `<div class="tags">${c.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            </div>
            <button class="copy-btn" id="btn${i}" onclick="copyClause(event,${i})">複製</button>
          </div>
          <div class="clause-content">${escapeHtml(c.content).replace(/\n/g, '<br>')}</div>
          <textarea class="raw-text" id="raw${i}" readonly>\n${escapeHtml(c.content)}</textarea>
        </div>`;
    }).join('');

    const exportDate = new Date().toLocaleString('zh-TW');
    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>代書常用條文</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif;background:#f1f5f9;color:#1e293b;display:flex;height:100vh;overflow:hidden}

/* ── 側邊欄 ── */
#sidebar{width:220px;min-width:220px;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;transition:width .25s,min-width .25s;overflow:hidden}
#sidebar.collapsed{width:0;min-width:0}
.sidebar-header{padding:16px 14px 10px;border-bottom:1px solid #f1f5f9}
.sidebar-title{font-size:13px;font-weight:900;color:#475569;white-space:nowrap}
#toggle-sidebar{flex-shrink:0;padding:6px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:700;color:#475569;cursor:pointer;white-space:nowrap}
#toggle-sidebar:hover{background:#e2e8f0}
.sidebar-scroll{overflow-y:auto;flex:1;padding:8px 0}
.sidebar-group{border-bottom:1px solid #f1f5f9}
.sidebar-cat{display:flex;align-items:center;gap:6px;padding:10px 14px;cursor:pointer;font-size:12px;font-weight:800;color:#334155;user-select:none;background:#fafafa}
.sidebar-cat:hover{background:#f1f5f9}
.sidebar-cat span{flex:1}
.cat-count{background:#e2e8f0;color:#64748b;font-size:10px;padding:1px 6px;border-radius:999px;font-weight:700}
.arrow{font-size:10px;color:#94a3b8;transition:transform .2s}
.sidebar-cat.closed .arrow{transform:rotate(-90deg)}
.tag-list{list-style:none;padding:4px 0}
.tag-list.hidden{display:none}
.tag-link{padding:7px 14px 7px 22px;font-size:12px;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tag-link:hover{background:#eff6ff;color:#2563eb}
.tag-link.active{background:#eff6ff;color:#2563eb;font-weight:700}
.badge{background:#e2e8f0;color:#64748b;font-size:10px;padding:1px 6px;border-radius:999px;flex-shrink:0}
.sidebar-footer{padding:10px 14px;border-top:1px solid #f1f5f9}
.clear-btn{width:100%;padding:7px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;color:#64748b;cursor:pointer}
.clear-btn:hover{background:#e2e8f0}

/* ── 主區 ── */
#main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{padding:14px 20px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.topbar h1{font-size:18px;font-weight:900;white-space:nowrap}
.topbar p{font-size:11px;color:#94a3b8;white-space:nowrap}
#search{flex:1;min-width:160px;max-width:380px;padding:8px 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;outline:none}
#search:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.print-btn{margin-left:auto;padding:8px 16px;background:#1e293b;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.print-btn:hover{background:#334155}
.content-scroll{flex:1;overflow-y:auto;padding:20px}
.section-label{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.section-label span:first-child{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8}
.section-label .cnt{background:#e2e8f0;color:#64748b;font-size:10px;padding:1px 7px;border-radius:999px;font-weight:700}
.divider{flex:1;height:1px;background:#e2e8f0}
section{margin-bottom:28px}
.clause{background:#fff;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:8px;overflow:hidden;transition:box-shadow .15s}
.clause:hover{box-shadow:0 2px 12px rgba(0,0,0,.07)}
.clause-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px 10px}
.clause-title{font-weight:800;font-size:14px;color:#0f172a;margin-bottom:4px}
.tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.tag{background:#eff6ff;color:#3b82f6;font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;border:1px solid #bfdbfe}
.copy-btn{flex-shrink:0;padding:5px 12px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;font-weight:700;color:#475569;cursor:pointer;transition:all .15s}
.copy-btn:hover{background:#eff6ff;border-color:#bfdbfe;color:#2563eb}
.copy-btn.copied{background:#d1fae5;border-color:#6ee7b7;color:#059669}
.clause-content{padding:0 16px 14px;font-size:13px;color:#475569;line-height:1.8;white-space:pre-wrap}
.raw-text{position:absolute;left:-9999px;opacity:0;pointer-events:none}
.hidden{display:none!important}
.no-result{text-align:center;color:#94a3b8;padding:60px 20px;font-size:15px}

@media print{
  #sidebar,#toggle-sidebar,.print-btn,.copy-btn{display:none!important}
  body{display:block;height:auto;overflow:visible}
  #main{display:block;overflow:visible}
  .content-scroll{overflow:visible;padding:0}
  .clause{break-inside:avoid;border:1px solid #ccc}
}
</style>
</head>
<body>

<div id="sidebar">
  <div class="sidebar-header">
    <span class="sidebar-title">條文庫</span>
  </div>
  <div class="sidebar-scroll">${sidebarItems}</div>
  <div class="sidebar-footer">
    <button class="clear-btn" onclick="clearFilter()">顯示全部</button>
  </div>
</div>

<div id="main">
  <div class="topbar">
    <button id="toggle-sidebar" onclick="toggleSidebar()">☰</button>
    <div>
      <h1>⚖️ 代書常用條文</h1>
      <p>匯出：${exportDate}・共 ${clauses.length} 筆</p>
    </div>
    <input type="text" id="search" placeholder="搜尋情境、條文內容或標籤…" oninput="filterClauses(this.value)">
    <button class="print-btn" onclick="window.print()">🖨️ 列印 / PDF</button>
  </div>

  <div class="content-scroll" id="content-scroll">
    ${categories.map(cat => `
    <section data-category="${escapeHtml(cat)}">
      <div class="section-label">
        <span>${escapeHtml(cat)}</span>
        <span class="cnt">${clauses.filter(c => c.category === cat).length}</span>
        <div class="divider"></div>
      </div>
      ${renderClauses(clauses.filter(c => c.category === cat))}
    </section>`).join('')}
    <div class="no-result hidden" id="no-result">找不到符合的條文</div>
  </div>
</div>

<script>
// ── 側邊欄收合 ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}
function toggleCat(el) {
  el.classList.toggle('closed');
  const ul = el.nextElementSibling;
  ul.classList.toggle('hidden');
}

// ── 篩選狀態 ──
let activeCategory = null, activeTag = null, searchKw = '';

function filterByTag(el) {
  document.querySelectorAll('.tag-link').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  activeCategory = el.dataset.cat; activeTag = el.dataset.tag;
  applyFilter();
}
function clearFilter() {
  activeCategory = null; activeTag = null;
  document.querySelectorAll('.tag-link').forEach(el => el.classList.remove('active'));
  applyFilter();
}
function filterClauses(q) {
  searchKw = q.trim().toLowerCase();
  applyFilter();
}
function applyFilter() {
  let visible = 0;
  document.querySelectorAll('.clause').forEach(el => {
    const kwMatch = !searchKw || el.dataset.search.includes(searchKw);
    const catMatch = searchKw || !activeCategory || el.dataset.category === activeCategory;
    const tagMatch = searchKw || !activeTag || el.dataset.tags.split(',').includes(activeTag);
    const show = catMatch && tagMatch && kwMatch;
    el.classList.toggle('hidden', !show);
    if (show) visible++;
  });
  document.querySelectorAll('section').forEach(s => {
    const any = [...s.querySelectorAll('.clause')].some(c => !c.classList.contains('hidden'));
    s.classList.toggle('hidden', !any);
  });
  document.getElementById('no-result').classList.toggle('hidden', visible > 0);
}

// ── 點擊複製（修正 file:// 環境 clipboard 靜默失敗）──
function copyClause(e, idx) {
  e.stopPropagation();
  const text = document.getElementById('raw'+idx).value;
  const btn = document.getElementById('btn'+idx);
  function fallback() {
    const ta = document.getElementById('raw'+idx);
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { console.error('複製失敗', err); }
    ta.style.cssText = '';
    ta.blur();
    ok ? showCopied(btn) : showFailed(btn);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showCopied(btn)).catch(fallback);
  } else {
    fallback();
  }
}
function showCopied(btn) {
  btn.textContent = '✓ 已複製';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = '複製'; btn.classList.remove('copied'); }, 1800);
}
function showFailed(btn) {
  btn.textContent = '✗ 請手動選取';
  setTimeout(() => { btn.textContent = '複製'; }, 2500);
}
</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `代書常用條文_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
}
