'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Tag, FileCode } from 'lucide-react';
import { PageSidebar, SidebarGroup } from '@/components/shared/PageSidebar';
import GenericExportExcelButton from '@/components/features/cases/GenericExportExcelButton';
import { useClauses, Clause } from '@/components/features/clauses/useClauses';
import { ClauseEditModal } from '@/components/features/clauses/ClauseEditModal';
import { ClauseItem } from '@/components/features/clauses/ClauseItem';

function exportClausesToHTML(clauses: Clause[]) {
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
            return `<li class="tag-link" onclick="filterByTag('${cat}','${tag}')" title="${tag}">${tag} <span class="badge">${count}</span></li>`;
        }).join('');
        return `
        <div class="sidebar-group">
          <div class="sidebar-cat" onclick="toggleCat(this)">
            <span>${cat}</span>
            <span class="cat-count">${clauses.filter(c => c.category === cat).length}</span>
            <span class="arrow">▾</span>
          </div>
          <ul class="tag-list">${tagLinks}</ul>
        </div>`;
    }).join('');

    const renderClauses = (items: Clause[]) => items.map((c, i) => `
        <div class="clause" id="c${i}"
             data-category="${c.category}"
             data-tags="${(c.tags ?? []).join(',')}"
             data-search="${(c.title + ' ' + c.content + ' ' + (c.tags ?? []).join(' ')).toLowerCase()}">
          <div class="clause-header">
            <div style="flex:1;min-width:0">
              <div class="clause-title">${c.title}</div>
              ${c.tags?.length ? `<div class="tags">${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
            </div>
            <button class="copy-btn" id="btn${i}" onclick="copyClause(event,${i})">複製</button>
          </div>
          <div class="clause-content">${c.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>')}</div>
          <textarea class="raw-text" id="raw${i}" readonly>${c.content}</textarea>
        </div>`).join('');

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
    <section id="sec-${cat}" data-category="${cat}">
      <div class="section-label">
        <span>${cat}</span>
        <span class="cnt" id="cnt-${cat}">${clauses.filter(c => c.category === cat).length}</span>
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

function filterByTag(cat, tag) {
  document.querySelectorAll('.tag-link').forEach(el => el.classList.remove('active'));
  const clicked = [...document.querySelectorAll('.tag-link')].find(
    el => el.onclick?.toString().includes("'"+cat+"','"+tag+"'")
  );
  if (clicked) clicked.classList.add('active');
  activeCategory = cat; activeTag = tag;
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
    ta.style.cssText = 'position:static;opacity:1;pointer-events:auto';
    ta.select();
    try { document.execCommand('copy'); showCopied(btn); } catch(_) {}
    ta.style.cssText = 'position:absolute;left:-9999px;opacity:0;pointer-events:none';
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

export default function ClausesPage() {
    const {
        clauses,
        filteredClauses,
        loading,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        copyFeedback,
        categories,
        tagsByCategory,
        suggestions,
        handleDelete,
        handleCopy,
        handleSaveClause
    } = useClauses();

    const [isEditing, setIsEditing] = useState(false);
    const [currentClause, setCurrentClause] = useState<Partial<Clause>>({ tags: [] });
    const [showSuggestions, setShowSuggestions] = useState(false);

    const basicClauses = filteredClauses.filter(c => c.category === '基本特約');
    const supplementClauses = filteredClauses.filter(c => c.category !== '基本特約');
    const handleEditClause = (c: Clause) => { setCurrentClause(c); setIsEditing(true); };

    const clauseColumns = [
        { header: '情境/標題', key: 'title', width: 30 },
        { header: '條文內容', key: 'content', width: 80 },
    ];

    const sidebarGroups = useMemo<SidebarGroup[]>(() => categories.map((cat) => ({
        title: cat,
        items: (tagsByCategory[cat] ?? []).map((tag: string) => {
            const matched = clauses.filter((c) => c.category === cat && c.tags?.includes(tag));
            return {
                id: `${cat}::${tag}`,
                label: tag,
                count: matched.length,
                icon: <Tag className="w-4 h-4 text-emerald-400" />,
                subLabels: matched.map((c) => c.title),
            };
        }),
    })), [categories, tagsByCategory, clauses]);

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <PageSidebar
                title="常用條文庫"
                groups={sidebarGroups}
                selectedId={selectedCategory}
                onSelect={setSelectedCategory}
                searchable
                hotThreshold={2}
                className="hidden md:block shadow-sm z-10 sticky top-0 h-screen"
            />

            <main className="flex-1 p-6 md:p-12">
                <div className="max-w-6xl mx-auto space-y-8 pb-20">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <span className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
                                    ⚖️
                                </span>
                                代書常用條文
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">
                                快速檢索、複製與管理合約常用條款。
                            </p>
                            <div className="flex items-center gap-2 mt-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    全團隊共用資料庫・即時同步
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <div className="relative group z-20">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="搜尋情境或條文內容..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    // Delay blur to allow click
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 shadow-sm transition-all"
                                />
                                {/* Suggestions Dropdown */}
                                {showSuggestions && searchTerm.length > 0 && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="text-[10px] font-bold text-slate-400 px-3 py-2 bg-slate-50 border-b border-slate-100 uppercase tracking-wider">
                                            快速選擇
                                        </div>
                                        {suggestions.map((s) => (
                                            <button
                                                key={s.id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent blur
                                                    setSearchTerm(s.title);
                                                    setShowSuggestions(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group/item"
                                            >
                                                <span className="font-bold text-slate-700 group-hover/item:text-blue-600 text-sm">
                                                    {s.title}
                                                </span>
                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {s.category}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setCurrentClause({ category: '增補特約', tags: [] });
                                    setIsEditing(true);
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-xl shadow-slate-900/20 border border-slate-700/50 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">新增條文</span>
                            </button>

                            <button
                                onClick={() => exportClausesToHTML(filteredClauses)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                                title="匯出為離線 HTML（可在沒有網路的電腦開啟，支援搜尋與列印）"
                            >
                                <FileCode className="w-4 h-4" />
                                <span className="hidden sm:inline">匯出 HTML</span>
                            </button>

                            <GenericExportExcelButton
                                data={filteredClauses}
                                filename="代書系統_法律法規條文"
                                sheetName="合約條文"
                                columns={clauseColumns}
                            />
                        </div>
                    </div>

                    {/* Active Filter Mobile */}
                    {selectedCategory && (
                        <div className="md:hidden flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold">
                            <span>已選分類: {selectedCategory}</span>
                            <button onClick={() => setSelectedCategory(null)} className="ml-auto text-blue-400 hover:text-blue-700">清除</button>
                        </div>
                    )}

                    {/* Content List */}
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            {/* Simple Loader Placeholder */}
                            <div className="animate-pulse text-slate-400 font-bold">資料載入中...</div>
                        </div>
                    ) : filteredClauses.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">沒有找到條文</h3>
                            <p className="text-slate-500 mt-2">請調整搜尋條件或新增資料</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {basicClauses.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">基本特約</span>
                                        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{basicClauses.length}</span>
                                        <div className="flex-1 h-px bg-slate-200" />
                                    </div>
                                    {basicClauses.map((clause) => (
                                        <ClauseItem key={clause.id} clause={clause} copyFeedback={copyFeedback}
                                            onCopy={handleCopy} onEdit={handleEditClause} onDelete={handleDelete} />
                                    ))}
                                </div>
                            )}
                            {supplementClauses.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">增補特約</span>
                                        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{supplementClauses.length}</span>
                                        <div className="flex-1 h-px bg-slate-200" />
                                    </div>
                                    {supplementClauses.map((clause) => (
                                        <ClauseItem key={clause.id} clause={clause} copyFeedback={copyFeedback}
                                            onCopy={handleCopy} onEdit={handleEditClause} onDelete={handleDelete} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Edit/Add Modal */}
            {isEditing && (
                <ClauseEditModal
                    initialClause={currentClause}
                    onClose={() => setIsEditing(false)}
                    onSave={handleSaveClause}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}
