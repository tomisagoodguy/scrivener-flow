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

    // ── Pocket.tw 爬蟲（官網 API 待破解）──
    { code: '00986A', shortCode: '00986', name: '主動兆豐台灣主動', manager: '兆豐投信',     issuer: '兆豐',   color: '#0ea5e9', dataSource: 'pocket' },
    { code: '00987A', shortCode: '00987', name: '主動台新優勢成長', manager: '台新投信',     issuer: '台新',   color: '#84cc16', dataSource: 'pocket' },
    { code: '00990A', shortCode: '00990', name: '主動元大AI新經濟', manager: '元大投信',     issuer: '元大',   color: '#14b8a6', dataSource: 'official_api' },
    { code: '00994A', shortCode: '00994', name: '主動第一金台股優', manager: '第一金投信',   issuer: '第一金', color: '#64748b', dataSource: 'pocket' },
    { code: '00995A', shortCode: '00995', name: '主動中信台灣卓越', manager: '中國信託投信', issuer: '中信',   color: '#ec4899', dataSource: 'pocket' },
];

export const ETF_CODES = ETF_REGISTRY.map(e => e.code);

export function getEtfMeta(code: string): EtfRegistryEntry | undefined {
    return ETF_REGISTRY.find(e => e.code === code);
}
