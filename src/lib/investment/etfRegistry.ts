export interface EtfRegistryEntry {
    code: string;
    shortCode: string;
    name: string;
    manager: string;
    color: string;
    dataSource: 'fhtrust' | 'moneydj';
}

export const ETF_REGISTRY: EtfRegistryEntry[] = [
    { code: '00981A', shortCode: '00981', name: '主動統一台股增長', manager: '統一投信', color: '#8b5cf6', dataSource: 'fhtrust' },
    { code: '00980A', shortCode: '00980', name: '野村智慧優選',    manager: '野村投信', color: '#3b82f6', dataSource: 'moneydj' },
    { code: '00991A', shortCode: '00991', name: '復華未來50',      manager: '復華投信', color: '#f59e0b', dataSource: 'moneydj' },
];

export const ETF_CODES = ETF_REGISTRY.map(e => e.code);

export function getEtfMeta(code: string): EtfRegistryEntry | undefined {
    return ETF_REGISTRY.find(e => e.code === code);
}
