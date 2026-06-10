export interface EtfRegistryEntry {
    code: string;
    shortCode: string;
    name: string;
    manager: string;
    issuer: string;
    color: string;
    dataSource: 'official_api' | 'pocket';
    isPrimary?: boolean;
}

export const ETF_REGISTRY: EtfRegistryEntry[] = [
    // ── 主流程 ETF ──
    { code: '00981A', shortCode: '00981', name: '主動統一台股增長', manager: '統一投信',     issuer: '統一',   color: '#8b5cf6', dataSource: 'official_api', isPrimary: true },

    // ── 官網 API 備援 ──
    { code: '00403A', shortCode: '00403', name: '主動統一升級50', manager: '統一投信',   issuer: '統一',   color: '#f97316', dataSource: 'official_api' },
    { code: '00980A', shortCode: '00980', name: '主動野村臺灣優選', manager: '野村投信',     issuer: '野村',   color: '#3b82f6', dataSource: 'official_api' },
    { code: '00982A', shortCode: '00982', name: '主動群益台灣強棒', manager: '群益投信',     issuer: '群益',   color: '#10b981', dataSource: 'official_api' },
    { code: '00984A', shortCode: '00984', name: '主動安聯台灣高息', manager: '安聯投信',     issuer: '安聯',   color: '#f43f5e', dataSource: 'official_api' },
    { code: '00985A', shortCode: '00985', name: '主動野村台灣50',   manager: '野村投信',     issuer: '野村',   color: '#06b6d4', dataSource: 'official_api' },
    { code: '00988A', shortCode: '00988', name: '主動統一全球創新', manager: '統一投信',     issuer: '統一',   color: '#6366f1', dataSource: 'official_api' },
    { code: '00991A', shortCode: '00991', name: '主動復華未來50',   manager: '復華投信',     issuer: '復華',   color: '#f59e0b', dataSource: 'official_api' },
    { code: '00992A', shortCode: '00992', name: '主動群益科技創新', manager: '群益投信',     issuer: '群益',   color: '#a855f7', dataSource: 'official_api' },
    { code: '00993A', shortCode: '00993', name: '主動安聯台灣',     manager: '安聯投信',     issuer: '安聯',   color: '#fb923c', dataSource: 'official_api' },
    { code: '00997A', shortCode: '00997', name: '主動群益美國增長', manager: '群益投信',     issuer: '群益',   color: '#d946ef', dataSource: 'official_api' },

    // ── 官網 API 備援（stable-etf-scrapers 新增）──
    { code: '00987A', shortCode: '00987', name: '主動台新優勢成長', manager: '台新投信',     issuer: '台新',   color: '#84cc16', dataSource: 'official_api' },
    { code: '00990A', shortCode: '00990', name: '主動元大AI新經濟', manager: '元大投信',     issuer: '元大',   color: '#14b8a6', dataSource: 'official_api' },
    { code: '00994A', shortCode: '00994', name: '主動第一金台股優', manager: '第一金投信',   issuer: '第一金', color: '#64748b', dataSource: 'official_api' },
    { code: '00995A', shortCode: '00995', name: '主動中信台灣卓越', manager: '中國信託投信', issuer: '中信',   color: '#ec4899', dataSource: 'official_api' },

    // ── 官網 API（台新第二檔）──
    { code: '00986A', shortCode: '00986', name: '主動台新龍頭成長', manager: '台新投信',     issuer: '台新',   color: '#0ea5e9', dataSource: 'official_api' },
    { code: '00999A', shortCode: '00999', name: '主動野村臺灣高息', manager: '野村投信',     issuer: '野村',   color: '#22c55e', dataSource: 'official_api' },

    // ── Pocket.tw 爬蟲（官網 API 待破解或 fund_id 未確認）──
    // 00996A：兆豐 mega scraper 存在，fund_id 待確認，自動 fallback pocket
    { code: '00996A', shortCode: '00996', name: '主動兆豐台灣豐收', manager: '兆豐投信',     issuer: '兆豐',   color: '#78716c', dataSource: 'official_api' },
    // 00998A：復華第二檔，fhtrust fund_code 待確認
    { code: '00998A', shortCode: '00998', name: '主動復華金融股息', manager: '復華投信',     issuer: '復華',   color: '#e11d48', dataSource: 'pocket' },
    // 00983A：中信 ARK HTML 爬蟲（replace-pocket-scrapers）
    { code: '00983A', shortCode: '00983', name: '主動中信ARK創新', manager: '中國信託投信', issuer: '中信',   color: '#7c3aed', dataSource: 'official_api' },
    // 00401A、00400A、00989A：已有官方 API（replace-pocket-scrapers）
    { code: '00401A', shortCode: '00401', name: '主動摩根台灣鑫收', manager: '摩根投信',     issuer: '摩根',   color: '#0891b2', dataSource: 'official_api' },
    { code: '00400A', shortCode: '00400', name: '主動國泰動能高息', manager: '國泰投信',     issuer: '國泰',   color: '#ca8a04', dataSource: 'official_api' },
    // 00989A：摩根第二檔（美國科技）
    { code: '00989A', shortCode: '00989', name: '主動摩根美國科技', manager: '摩根投信',     issuer: '摩根',   color: '#0284c7', dataSource: 'official_api' },

    // ── D 類 ETF（債券型）——expand-etf-coverage-and-diff-schema 新增 ──
    { code: '00984D', shortCode: '00984', name: '主動聯博全球非投', manager: '聯博投信',     issuer: '聯博',   color: '#b45309', dataSource: 'official_api' },
    { code: '00982D', shortCode: '00982', name: '主動富邦動態入息', manager: '富邦投信',     issuer: '富邦',   color: '#059669', dataSource: 'official_api' },
    { code: '00983D', shortCode: '00983', name: '主動富邦複合收益', manager: '富邦投信',     issuer: '富邦',   color: '#0d9488', dataSource: 'official_api' },
];

export const ETF_CODES = ETF_REGISTRY.map(e => e.code);

export function getEtfMeta(code: string): EtfRegistryEntry | undefined {
    return ETF_REGISTRY.find(e => e.code === code);
}
