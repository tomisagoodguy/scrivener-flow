export interface EtfRegistryEntry {
    code: string;
    shortCode: string;
    name: string;
    manager: string;
    color: string;
    dataSource: 'fhtrust' | 'moneydj';
}

export const ETF_REGISTRY: EtfRegistryEntry[] = [
    { code: '00981A', shortCode: '00981', name: '主動統一台股增長', manager: '統一投信',       color: '#8b5cf6', dataSource: 'fhtrust' },
    { code: '00980A', shortCode: '00980', name: '主動野村臺灣優選', manager: '野村投信',       color: '#3b82f6', dataSource: 'moneydj' },
    { code: '00991A', shortCode: '00991', name: '主動復華未來50',   manager: '復華投信',       color: '#f59e0b', dataSource: 'moneydj' },
    { code: '00982A', shortCode: '00982', name: '主動群益台灣強棒', manager: '群益投信',       color: '#10b981', dataSource: 'moneydj' },
    { code: '00984A', shortCode: '00984', name: '主動安聯台灣高息', manager: '安聯投信',       color: '#f43f5e', dataSource: 'moneydj' },
    { code: '00985A', shortCode: '00985', name: '主動野村台灣50',   manager: '野村投信',       color: '#06b6d4', dataSource: 'moneydj' },
    { code: '00987A', shortCode: '00987', name: '主動台新優勢成長', manager: '台新投信',       color: '#84cc16', dataSource: 'moneydj' },
    { code: '00992A', shortCode: '00992', name: '主動群益科技創新', manager: '群益投信',       color: '#a855f7', dataSource: 'moneydj' },
    { code: '00993A', shortCode: '00993', name: '主動安聯台灣',     manager: '安聯投信',       color: '#fb923c', dataSource: 'moneydj' },
    { code: '00994A', shortCode: '00994', name: '主動第一金台股優', manager: '第一金投信',     color: '#64748b', dataSource: 'moneydj' },
    { code: '00995A', shortCode: '00995', name: '主動中信台灣卓越', manager: '中國信託投信',   color: '#ec4899', dataSource: 'moneydj' },
];

export const ETF_CODES = ETF_REGISTRY.map(e => e.code);

export function getEtfMeta(code: string): EtfRegistryEntry | undefined {
    return ETF_REGISTRY.find(e => e.code === code);
}
