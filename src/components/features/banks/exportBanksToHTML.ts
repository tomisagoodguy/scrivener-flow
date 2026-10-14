import { Bank } from '@/types';

interface ExportContact {
    name: string;
    branch: string;
    phone: string;
    email: string;
}

const esc = (v: unknown): string =>
    String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));

/** 聯絡人 JSONB 正規化；多 email 拆成多列（與 BankListCard 一致） */
function toContacts(raw: Bank['contacts']): ExportContact[] {
    return (raw ?? []).flatMap((c) => {
        const base = { name: str(c.name), branch: str(c.branch), phone: str(c.phone) };
        const emails = str(c.email).split(/[,;]/).map((e) => e.trim()).filter(Boolean);
        return emails.length ? emails.map((email) => ({ ...base, email })) : [{ ...base, email: '' }];
    });
}

const copyChip = (icon: string, value: string, cls = '') =>
    value ? `<button class="chip ${cls}" data-copy="${esc(value)}" onclick="copyText(this)" title="點擊複製">${icon} <span>${esc(value)}</span></button>` : '';

const infoRow = (label: string, value?: string) => `
    <div class="info">
      <div class="info-label">${label}</div>
      ${value ? `<div class="info-value copyable" data-copy="${esc(value)}" onclick="copyText(this)" title="點擊複製">${esc(value)}</div>` : '<div class="info-empty">未提供</div>'}
    </div>`;

function renderBank(b: Bank, i: number): string {
    const contacts = toContacts(b.contacts);
    const search = [b.name, b.branch, b.loan_conditions, b.redemption_note, b.redemption_location,
        ...contacts.map((c) => `${c.name} ${c.branch} ${c.phone} ${c.email}`)].join(' ').toLowerCase();

    const contactHtml = contacts.length
        ? contacts.map((c) => `
          <div class="contact">
            <div class="contact-head">
              ${copyChip('👤', c.name, 'name')}
              ${c.branch ? `<span class="branch">${esc(c.branch)}</span>` : ''}
            </div>
            ${copyChip('📞', c.phone)}
            ${copyChip('✉️', c.email)}
          </div>`).join('')
        : '<div class="empty">尚無聯絡人資料</div>';

    return `
    <article class="bank" id="b${i}" data-search="${esc(search)}">
      <header class="bank-head">
        <div class="avatar">${esc(b.name.substring(0, 1))}</div>
        <div style="flex:1;min-width:0">
          <h2>${esc(b.name)}${b.branch ? ` <span class="branch">${esc(b.branch)}</span>` : ''}</h2>
          <div class="meta">
            ${b.redemption_phone ? `<span>📞 ${esc(b.redemption_phone)}（客服）</span>` : ''}
            ${contacts.length ? `<span class="pill">共 ${contacts.length} 位窗口</span>` : ''}
          </div>
        </div>
      </header>
      <div class="grid">
        <div>
          <h3>聯絡窗口通訊錄</h3>
          <div class="contacts">${contactHtml}</div>
          <h3 class="mt">全團隊共享備註（貸款條件）</h3>
          <div class="note">${b.loan_conditions ? esc(b.loan_conditions) : '<span class="empty">尚無共享備註</span>'}</div>
        </div>
        <div>
          <h3>代償與塗銷資訊</h3>
          ${infoRow('匯款專戶', b.redemption_account)}
          ${infoRow('處理天數', b.redemption_days)}
          ${infoRow('領取地點', b.redemption_location)}
          ${infoRow('注意事項', b.redemption_note)}
          ${infoRow('銀行客服代表號', b.redemption_phone)}
        </div>
      </div>
    </article>`;
}

/** 匯出銀行資訊為離線 HTML（可在無網路電腦開啟，支援搜尋、點擊複製、列印） */
export function exportBanksToHTML(banks: Bank[]): void {
    const exportDate = new Date().toLocaleString('zh-TW');
    const sidebar = banks.map((b, i) => {
        const n = toContacts(b.contacts).length;
        return `<li class="nav" data-target="b${i}" onclick="jump('b${i}')" title="${esc(b.name)}">${esc(b.name)}${n ? ` <span class="badge">${n}</span>` : ''}</li>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>銀行資訊中心</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif;background:#f1f5f9;color:#1e293b;display:flex;height:100vh;overflow:hidden}
#sidebar{width:220px;min-width:220px;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;transition:width .25s,min-width .25s;overflow:hidden}
#sidebar.collapsed{width:0;min-width:0}
.sidebar-header{padding:16px 14px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:900;color:#475569;white-space:nowrap}
.sidebar-scroll{overflow-y:auto;flex:1;padding:8px 0;list-style:none}
.nav{padding:8px 14px;font-size:12px;font-weight:700;color:#475569;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav:hover{background:#eff6ff;color:#2563eb}
.nav.active{background:#eff6ff;color:#2563eb}
.badge{background:#d1fae5;color:#059669;font-size:10px;padding:1px 6px;border-radius:999px;flex-shrink:0}
#toggle-sidebar{flex-shrink:0;padding:6px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:700;color:#475569;cursor:pointer}
#toggle-sidebar:hover{background:#e2e8f0}
#main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{padding:14px 20px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.topbar h1{font-size:18px;font-weight:900;white-space:nowrap}
.topbar p{font-size:11px;color:#94a3b8;white-space:nowrap}
#search{flex:1;min-width:160px;max-width:380px;padding:8px 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;outline:none}
#search:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.print-btn{margin-left:auto;padding:8px 16px;background:#1e293b;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.print-btn:hover{background:#334155}
.content-scroll{flex:1;overflow-y:auto;padding:20px}
.bank{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:14px;scroll-margin-top:12px;transition:box-shadow .15s}
.bank:hover{box-shadow:0 2px 12px rgba(0,0,0,.07)}
.bank.flash{box-shadow:0 0 0 3px rgba(59,130,246,.35)}
.bank-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.avatar{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#9333ea);color:#fff;font-weight:900;font-size:19px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.bank-head h2{font-size:17px;font-weight:900;color:#0f172a}
.meta{display:flex;gap:12px;flex-wrap:wrap;margin-top:3px;font-size:11px;font-weight:700;color:#64748b}
.pill{background:#ecfdf5;color:#059669;padding:0 7px;border-radius:5px}
.branch{font-size:11px;font-weight:600;color:#64748b;background:#f1f5f9;padding:1px 7px;border-radius:999px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;border-top:1px solid #f1f5f9;padding-top:16px}
h3{font-size:11px;font-weight:900;color:#94a3b8;letter-spacing:.08em;margin-bottom:8px}
h3.mt{margin-top:16px;color:#2563eb}
.contacts{display:grid;gap:6px}
.contact{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:3px}
.contact-head{display:flex;align-items:center;gap:6px}
.chip{display:flex;align-items:center;gap:6px;width:100%;text-align:left;background:transparent;border:1px solid transparent;border-radius:8px;padding:4px 8px;font-size:12px;color:#475569;cursor:pointer;font-family:inherit}
.chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chip:hover{background:#eff6ff;border-color:#bfdbfe;color:#2563eb}
.chip.name{width:auto;font-weight:800;font-size:13px;color:#1e293b}
.note{background:#fffbeb;border:1px dashed #fde68a;border-radius:10px;padding:12px;font-size:13px;line-height:1.7;white-space:pre-wrap;color:#334155}
.info{background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:8px 12px;margin-bottom:6px}
.info-label{font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:2px}
.info-value{font-size:13px;color:#1e293b;white-space:pre-wrap;line-height:1.6}
.copyable{cursor:pointer;border-radius:6px}
.copyable:hover{background:#eff6ff;color:#2563eb}
.info-empty,.empty{font-size:12px;color:#94a3b8;font-style:italic}
.copied{background:#d1fae5!important;border-color:#6ee7b7!important;color:#059669!important}
.hidden{display:none!important}
.no-result{text-align:center;color:#94a3b8;padding:60px 20px;font-size:15px}
#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:8px 16px;border-radius:10px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none}
#toast.show{opacity:1}
@media (max-width:760px){.grid{grid-template-columns:1fr}#sidebar{width:0;min-width:0}#sidebar.open{width:200px;min-width:200px}}
@media print{
  #sidebar,#toggle-sidebar,.print-btn,#search,#toast{display:none!important}
  body{display:block;height:auto;overflow:visible}
  #main{display:block;overflow:visible}
  .content-scroll{overflow:visible;padding:0}
  .bank{break-inside:avoid;border:1px solid #ccc}
}
</style>
</head>
<body>
<div id="sidebar">
  <div class="sidebar-header">銀行目錄（${banks.length}）</div>
  <ul class="sidebar-scroll">${sidebar}</ul>
</div>
<div id="main">
  <div class="topbar">
    <button id="toggle-sidebar" onclick="toggleSidebar()">☰</button>
    <div>
      <h1>🏦 銀行資訊中心</h1>
      <p>匯出：${exportDate}・共 ${banks.length} 家</p>
    </div>
    <input type="text" id="search" placeholder="搜尋銀行、聯絡人、電話、備註…" oninput="filterBanks(this.value)">
    <button class="print-btn" onclick="window.print()">🖨️ 列印 / PDF</button>
  </div>
  <div class="content-scroll">
    ${banks.map(renderBank).join('')}
    <div class="no-result hidden" id="no-result">找不到符合的銀行</div>
  </div>
</div>
<div id="toast"></div>
<script>
function toggleSidebar(){
  var s=document.getElementById('sidebar');
  s.classList.toggle(window.innerWidth<=760?'open':'collapsed');
}
function jump(id){
  var el=document.getElementById(id);
  if(!el)return;
  el.classList.remove('hidden');
  el.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.nav').forEach(function(n){n.classList.toggle('active',n.dataset.target===id);});
  el.classList.add('flash');setTimeout(function(){el.classList.remove('flash');},1200);
}
function filterBanks(q){
  var kw=q.trim().toLowerCase(),visible=0;
  document.querySelectorAll('.bank').forEach(function(el){
    var show=!kw||el.dataset.search.indexOf(kw)!==-1;
    el.classList.toggle('hidden',!show);
    document.querySelector('.nav[data-target="'+el.id+'"]').classList.toggle('hidden',!show);
    if(show)visible++;
  });
  document.getElementById('no-result').classList.toggle('hidden',visible>0);
}
// 點擊複製（file:// 環境 clipboard 失敗時 fallback execCommand）
function copyText(el){
  var text=el.dataset.copy;
  function done(ok){
    showToast(ok?'已複製：'+text:'複製失敗，請手動選取');
    if(!ok)return;
    el.classList.add('copied');setTimeout(function(){el.classList.remove('copied');},1500);
  }
  function fallback(){
    var ta=document.createElement('textarea');
    ta.value=text;ta.style.cssText='position:fixed;left:-9999px';
    document.body.appendChild(ta);ta.select();
    var ok=false;try{ok=document.execCommand('copy');}catch(_){ok=false;}
    document.body.removeChild(ta);done(ok);
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){done(true);}).catch(fallback);
  }else{fallback();}
}
var toastTimer;
function showToast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show');},1600);
}
</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `銀行資訊中心_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
}
