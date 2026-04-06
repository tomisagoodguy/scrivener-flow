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
    { code: '00980A', shortCode: '00980', name: '野村智慧優選',     manager: '野村投信',       color: '#3b82f6', dataSource: 'moneydj' },
    { code: '00991A', shortCode: '00991', name: '復華未來50',       manager: '復華投信',       color: '#f59e0b', dataSource: 'moneydj' },
    { code: '00982A', shortCode: '00982', name: '中信優選成長',     manager: '中國信託投信',   color: '#10b981', dataSource: 'moneydj' },
    { code: '00984A', shortCode: '00984', name: '群益主動優選',     manager: '群益投信',       color: '#f43f5e', dataSource: 'moneydj' },
    { code: '00985A', shortCode: '00985', name: '元大主動選股',     manager: '元大投信',       color: '#06b6d4', dataSource: 'moneydj' },
    { code: '00987A', shortCode: '00987', name: '凱基主動精選',     manager: '凱基投信',       color: '#84cc16', dataSource: 'moneydj' },
    { code: '00992A', shortCode: '00992', name: '統一主動選股',     manager: '統一投信',       color: '#a855f7', dataSource: 'moneydj' },
    { code: '00993A', shortCode: '00993', name: '永豐主動選股',     manager: '永豐投信',       color: '#fb923c', dataSource: 'moneydj' },
    { code: '00994A', shortCode: '00994', name: '新光主動選股',     manager: '新光投信',       color: '#64748b', dataSource: 'moneydj' },
    { code: '00995A', shortCode: '00995', name: '台新主動選股',     manager: '台新投信',       color: '#ec4899', dataSource: 'moneydj' },
];

export const ETF_CODES = ETF_REGISTRY.map(e => e.code);

export function getEtfMeta(code: string): EtfRegistryEntry | undefined {
    return ETF_REGISTRY.find(e => e.code === code);
}
