# 📝 CaseScheduleManager 改進指南

## 🎯 目標

添加過濾功能,解決過期提醒問題

---

## 🔧 修改步驟

### Step 1: 添加過濾狀態 (第 36 行後)

在 `const [editContent, setEditContent] = useState('');` 後面添加:

\`\`\`typescript
// Filter State
const [filter, setFilter] = useState<'all' | 'future' | 'today' | 'expired'>('future');
\`\`\`

---

### Step 2: 修改 fetchSchedule 函數 (第 38-51 行)

**原始代碼**:
\`\`\`typescript
const fetchSchedule = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_deleted', false)
        .order('due_date', { ascending: true });

    if (data) {
        setScheduleItems(data as any[]);
    }
    setLoading(false);
};
\`\`\`

**修改為**:
\`\`\`typescript
const fetchSchedule = async () => {
    setLoading(true);

    // 計算 7 天前的日期 (保留最近的過期提醒,避免遺漏)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_deleted', false)
        .gte('due_date', sevenDaysAgo.toISOString()) // 只顯示 7 天內的提醒
        .order('due_date', { ascending: true });

    if (data) {
        setScheduleItems(data as any[]);
    }
    setLoading(false);
};
\`\`\`

---

### Step 3: 添加過濾按鈕 UI (第 216 行後)

在 `</div>` (新增表單結束) 後面添加:

\`\`\`typescript
{/*Filter Buttons*/}
<div className="flex gap-2 mb-4">
    <button
        onClick={() => setFilter('future')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'future'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
    >
        未來
    </button>
    <button
        onClick={() => setFilter('today')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'today'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
    >
        今天
    </button>
    <button
        onClick={() => setFilter('expired')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'expired'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
    >
        已過期
    </button>
    <button
        onClick={() => setFilter('all')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'all'
                ? 'bg-slate-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
    >
        全部
    </button>
</div>
\`\`\`

---

### Step 4: 添加過濾邏輯 (第 220-227 行)

**找到這段代碼**:
\`\`\`typescript
{loading ? (
    <div className="text-center text-slate-400 text-sm py-4">載入中...</div>
) : scheduleItems.length === 0 ? (
    <div className="text-center text-slate-400 text-sm py-4 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
        目前沒有安排特定行程
    </div>
) : (
    scheduleItems.map((item) => {
\`\`\`

**修改為**:
\`\`\`typescript
{loading ? (
    <div className="text-center text-slate-400 text-sm py-4">載入中...</div>
) : (() => {
    // Apply filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filteredItems = scheduleItems.filter(item => {
        const dueDate = new Date(item.due_date);
        const itemDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        
        switch (filter) {
            case 'future':
                return dueDate >= now;
            case 'today':
                return itemDate.getTime() === today.getTime();
            case 'expired':
                return dueDate < now && !item.is_completed;
            case 'all':
            default:
                return true;
        }
    });

    return filteredItems.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-4 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
            目前沒有安排特定行程
        </div>
    ) : (
        filteredItems.map((item) => {
\`\`\`

---

### Step 5: 關閉過濾函數 (最後)

在列表的最後 `})` 後面添加:

\`\`\`typescript
        })
    );
})()}
\`\`\`

---

## ✅ **完成檢查**

修改完成後,檢查:

- [ ] 沒有 TypeScript 錯誤
- [ ] 頁面可以正常載入
- [ ] 過濾按鈕可以點擊
- [ ] 切換過濾器時列表會更新

---

## 🎯 **預期效果**

1. **預設顯示「未來」的提醒**
2. **點擊「今天」只顯示今天的**
3. **點擊「已過期」只顯示過期未完成的**
4. **點擊「全部」顯示所有**

---

需要我提供完整的修改後文件嗎?
