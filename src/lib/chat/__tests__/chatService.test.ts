/**
 * TDD：實作前先寫測試。涵蓋 spec 需求「Users can discover and start
 * conversations without approval」的三個 Scenario，以及送訊息、標記已讀、
 * 取得使用者清單的行為。使用純記憶體內的假 Supabase query builder（支援
 * eq/in/select/single/insert/update/rpc），不依賴真實連線。
 */

import {
    findOrCreateDirectConversation,
    createGroupConversation,
    sendMessage,
    markConversationRead,
    listChatUsers,
    chatDisplayName,
    recallMessage,
    hideConversation,
    isConversationHidden,
} from '@/lib/chat/chatService';

type Row = Record<string, unknown>;

class FakeQuery implements PromiseLike<{ data: unknown; error: null }> {
    private filters: Array<(r: Row) => boolean> = [];
    private wantSingle = false;

    constructor(private store: Map<string, Row[]>, private table: string) {}

    eq(col: string, val: unknown) {
        this.filters.push((r) => r[col] === val);
        return this;
    }

    in(col: string, vals: unknown[]) {
        this.filters.push((r) => vals.includes(r[col]));
        return this;
    }

    select(_cols?: string) {
        return this;
    }

    single() {
        this.wantSingle = true;
        return this;
    }

    maybeSingle() {
        this.wantSingle = true;
        return this;
    }

    limit(_n: number) {
        return this;
    }

    insert(payload: Row | Row[]) {
        const rows = Array.isArray(payload) ? payload : [payload];
        const withIds: Row[] = rows.map((r) => ({ id: `gen_${Math.random().toString(36).slice(2)}`, created_at: new Date().toISOString(), ...r }));
        const existing = this.store.get(this.table) ?? [];
        this.store.set(this.table, [...existing, ...withIds]);
        this.filters.push((r) => withIds.includes(r));
        this.wantSingle = withIds.length === 1;
        return this;
    }

    update(payload: Row) {
        const rows = this.store.get(this.table) ?? [];
        // update applies to rows matching subsequently-chained eq() filters;
        // since eq() is called after update() in our usage, defer via closure.
        this.pendingUpdate = payload;
        void rows;
        return this;
    }

    private pendingUpdate: Row | null = null;

    then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
        onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null
    ): PromiseLike<TResult1 | TResult2> {
        const all = this.store.get(this.table) ?? [];
        const matched = all.filter((r) => this.filters.every((f) => f(r)));

        if (this.pendingUpdate) {
            matched.forEach((r) => Object.assign(r, this.pendingUpdate));
        }

        const data = this.wantSingle ? matched[0] ?? null : matched;
        return Promise.resolve(onfulfilled ? onfulfilled({ data, error: null }) : (({ data, error: null } as unknown) as TResult1));
    }
}

function makeSupabase(seed: Record<string, Row[]> = {}, rpcResult: Row[] = []) {
    const store = new Map<string, Row[]>(Object.entries(seed));
    return {
        from: (table: string) => new FakeQuery(store, table),
        rpc: (_name: string) => Promise.resolve({ data: rpcResult, error: null }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
}

describe('findOrCreateDirectConversation', () => {
    it('若兩人已有 1 對 1 對話則重用而非新建', async () => {
        const supabase = makeSupabase({
            conversations: [
                { id: 'conv_1', is_group: false, name: null, created_by: 'userA', created_at: '2026-07-01T00:00:00Z' },
            ],
            conversation_members: [
                { conversation_id: 'conv_1', user_id: 'userA', last_read_at: '2026-07-01T00:00:00Z', joined_at: '2026-07-01T00:00:00Z' },
                { conversation_id: 'conv_1', user_id: 'userB', last_read_at: '2026-07-01T00:00:00Z', joined_at: '2026-07-01T00:00:00Z' },
            ],
        });

        const result = await findOrCreateDirectConversation(supabase, 'userA', 'userB');

        expect(result.id).toBe('conv_1');
        const conversations = (supabase.from('conversations') as unknown as FakeQuery);
        // 沒有新增對話：conversations 表仍只有種子資料的 1 筆
        const all = await (supabase.from('conversations').select('*') as unknown as Promise<{ data: Row[] }>);
        expect(all.data).toHaveLength(1);
        void conversations;
    });

    it('若兩人尚無 1 對 1 對話則新建對話與雙方成員', async () => {
        const supabase = makeSupabase({ conversations: [], conversation_members: [] });

        const result = await findOrCreateDirectConversation(supabase, 'userA', 'userB');

        expect(result.is_group).toBe(false);
        const members = await (supabase.from('conversation_members').select('*').eq('conversation_id', result.id) as unknown as Promise<{ data: Row[] }>);
        expect(members.data.map((m) => m.user_id).sort()).toEqual(['userA', 'userB']);
    });
});

describe('createGroupConversation', () => {
    it('選取多位使用者建立群組對話，成員包含建立者本人', async () => {
        const supabase = makeSupabase({ conversations: [], conversation_members: [] });

        const result = await createGroupConversation(supabase, 'userA', ['userB', 'userC'], '案件討論群');

        expect(result.is_group).toBe(true);
        expect(result.name).toBe('案件討論群');
        const members = await (supabase.from('conversation_members').select('*').eq('conversation_id', result.id) as unknown as Promise<{ data: Row[] }>);
        expect(members.data.map((m) => m.user_id).sort()).toEqual(['userA', 'userB', 'userC']);
    });
});

describe('sendMessage', () => {
    it('送出訊息後回傳含 conversation_id 與 sender_id 的訊息紀錄', async () => {
        const supabase = makeSupabase({ messages: [] });

        const message = await sendMessage(supabase, 'conv_1', 'userA', '測試訊息');

        expect(message.conversation_id).toBe('conv_1');
        expect(message.sender_id).toBe('userA');
        expect(message.content).toBe('測試訊息');
    });

    it('空白訊息內容應被拒絕，不寫入資料庫', async () => {
        const supabase = makeSupabase({ messages: [] });

        await expect(sendMessage(supabase, 'conv_1', 'userA', '   ')).rejects.toThrow();
    });
});

describe('recallMessage', () => {
    it('寄件者收回自己的訊息後 deleted_at 被標記', async () => {
        const supabase = makeSupabase({
            messages: [{ id: 'msg_1', conversation_id: 'conv_1', sender_id: 'userA', content: '測試訊息', deleted_at: null }],
        });

        await recallMessage(supabase, 'msg_1', 'userA');

        const result = await (supabase.from('messages').select('*').eq('id', 'msg_1') as unknown as Promise<{ data: Row[] }>);
        expect(result.data[0].deleted_at).not.toBeNull();
    });
});

describe('markConversationRead', () => {
    it('更新指定成員的 last_read_at', async () => {
        const supabase = makeSupabase({
            conversation_members: [
                { conversation_id: 'conv_1', user_id: 'userA', last_read_at: '2026-07-01T00:00:00Z', joined_at: '2026-07-01T00:00:00Z' },
            ],
        });

        await markConversationRead(supabase, 'conv_1', 'userA');

        const members = await (supabase.from('conversation_members').select('*').eq('conversation_id', 'conv_1').eq('user_id', 'userA') as unknown as Promise<{ data: Row[] }>);
        expect(members.data[0].last_read_at).not.toBe('2026-07-01T00:00:00Z');
    });
});

describe('hideConversation', () => {
    it('標記指定成員列的 hidden_at，只影響本人', async () => {
        const supabase = makeSupabase({
            conversation_members: [
                { conversation_id: 'conv_1', user_id: 'userA', last_read_at: '2026-07-01T00:00:00Z', joined_at: '2026-07-01T00:00:00Z', hidden_at: null },
                { conversation_id: 'conv_1', user_id: 'userB', last_read_at: '2026-07-01T00:00:00Z', joined_at: '2026-07-01T00:00:00Z', hidden_at: null },
            ],
        });

        await hideConversation(supabase, 'conv_1', 'userA');

        const members = await (supabase.from('conversation_members').select('*').eq('conversation_id', 'conv_1') as unknown as Promise<{ data: Row[] }>);
        const a = members.data.find((m) => m.user_id === 'userA');
        const b = members.data.find((m) => m.user_id === 'userB');
        expect(a?.hidden_at).not.toBeNull();
        expect(b?.hidden_at).toBeNull();
    });
});

describe('isConversationHidden', () => {
    it('hidden_at 為 null 時未隱藏', () => {
        expect(isConversationHidden(null, '2026-07-01T00:00:00Z')).toBe(false);
    });

    it('隱藏後沒有更新訊息則維持隱藏', () => {
        expect(isConversationHidden('2026-07-05T00:00:00Z', '2026-07-01T00:00:00Z')).toBe(true);
    });

    it('隱藏後有新訊息（含自己再次發言）則自動恢復顯示', () => {
        expect(isConversationHidden('2026-07-01T00:00:00Z', '2026-07-05T00:00:00Z')).toBe(false);
    });

    it('沒有任何訊息時以對話建立時間比較', () => {
        expect(isConversationHidden('2026-07-05T00:00:00Z', null, '2026-07-01T00:00:00Z')).toBe(true);
    });
});

describe('listChatUsers', () => {
    it('回傳 RPC list_chat_users 的結果（含姓名）', async () => {
        const supabase = makeSupabase({}, [{ id: 'userB', email: 'b@example.com', full_name: '陳小明' }]);

        const users = await listChatUsers(supabase);

        expect(users).toEqual([{ id: 'userB', email: 'b@example.com', full_name: '陳小明' }]);
    });
});

describe('chatDisplayName', () => {
    it('有 full_name 時優先顯示姓名', () => {
        expect(chatDisplayName({ email: 'b@example.com', full_name: '陳小明' })).toBe('陳小明');
    });

    it('沒有 full_name 時退回 email 帳號名稱', () => {
        expect(chatDisplayName({ email: 'b@example.com', full_name: null })).toBe('b');
    });

    it('email 與 full_name 皆缺時顯示未知使用者', () => {
        expect(chatDisplayName({ email: null, full_name: null })).toBe('未知使用者');
    });
});
