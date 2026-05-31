import topicMapData from './topicMap.json';

interface TopicEntry {
    id: string;
    group: string;
    shortname: string;
    stocks: string[];
}

// Static supply chain edges (source → target = upstream → downstream)
// Mirrors supabase/migrations/20260602130000_add_topic_chain_edges.sql
const CHAIN_EDGES: [string, string][] = [
    ['silicon-wafer', 'wafer-foundry'],
    ['semi-process-materials', 'wafer-foundry'],
    ['wafer-fab-equipment', 'wafer-foundry'],
    ['asic-ip-design', 'wafer-foundry'],
    ['hpc-network-ic', 'wafer-foundry'],
    ['edge-ai', 'wafer-foundry'],
    ['analog-power-ic', 'wafer-foundry'],
    ['ddic', 'wafer-foundry'],
    ['automotive-ic', 'wafer-foundry'],
    ['sic-gan-power', 'wafer-foundry'],
    ['wafer-foundry', 'cowos-advanced-packaging'],
    ['wafer-foundry', 'high-end-testing'],
    ['wafer-foundry', 'ic-substrate'],
    ['wafer-foundry', 'advanced-packaging-test'],
    ['wafer-foundry', 'advanced-packaging-process'],
    ['ic-substrate', 'cowos-advanced-packaging'],
    ['glass-core-substrate', 'ic-substrate'],
    ['fiberglass-cloth', 'glass-core-substrate'],
    ['packaging-materials', 'cowos-advanced-packaging'],
    ['advanced-packaging-automation', 'cowos-advanced-packaging'],
    ['cowos-advanced-packaging', 'ai-server-odm'],
    ['hbm', 'cowos-advanced-packaging'],
    ['hbm', 'ai-server-odm'],
    ['cxl-technology', 'ai-server-odm'],
    ['memory-modules', 'ai-server-odm'],
    ['niche-memory', 'memory-modules'],
    ['high-end-testing', 'ai-server-odm'],
    ['bbu', 'ai-server-odm'],
    ['psu', 'ai-server-odm'],
    ['thermal_components_air', 'ai-server-odm'],
    ['liquid_cooling_advanced', 'ai-server-odm'],
    ['ems-smt', 'ai-server-odm'],
    ['networking-equipment', 'ai-server-odm'],
    ['ai-server-odm', 'ai-server-chassis-rails'],
    ['pcb-manufacturing', 'ems-smt'],
    ['fpc', 'ems-smt'],
    ['connector', 'ems-smt'],
    ['mlcc-capacitor', 'ems-smt'],
    ['passive-inductor', 'ems-smt'],
    ['passive-resistor', 'ems-smt'],
    ['quartz-components', 'ems-smt'],
    ['precision-metal-casing', 'ai-server-chassis-rails'],
    ['silicon-photonics', 'networking-equipment'],
    ['high-speed-optics', 'networking-equipment'],
    ['hpc-network-ic', 'networking-equipment'],
    ['connector-highspeed', 'networking-equipment'],
    ['leo-satellite', 'networking-equipment'],
    ['silicon-photonics', 'high-speed-optics'],
    ['ic-distribution', 'ems-smt'],
    ['ic-distribution', 'ai-server-odm'],
    ['battery-materials', 'battery-cell-module'],
    ['battery-cell-module', 'ess-storage'],
    ['battery-cell-module', 'connector-automotive'],
    ['sic-gan-power', 'motor-drive-discrete'],
    ['sic-gan-power', 'ess-storage'],
    ['motor-drive-discrete', 'industrial-automation'],
    ['motor-drive-discrete', 'robotics_physical_ai'],
    ['industrial-automation', 'robotics_physical_ai'],
    ['connector-automotive', 'automotive-ic'],
    ['automotive-ic', 'motor-drive-discrete'],
    ['asic-ip-design', 'edge-ai'],
    ['edge-ai', 'robotics_physical_ai'],
    ['edge-ai', 'industrial-automation'],
    ['solar-energy', 'ess-storage'],
    ['offshore-wind', 'ess-storage'],
    ['electrical_equipment', 'ess-storage'],
    ['electrical_equipment', 'solar-energy'],
    ['electrical_equipment', 'offshore-wind'],
    ['water-environment', 'circular-economy-ewaste'],
    ['display-panel', 'ar-vr-xr-optics'],
    ['optical-lens-camera', 'ar-vr-xr-optics'],
    ['optical-sensors', 'ar-vr-xr-optics'],
    ['ar-vr-xr-optics', 'mobile'],
    ['pc-nb-tablet', 'cloud-msp'],
    ['mobile', 'e-commerce'],
    ['enterprise-saas', 'cloud-msp'],
    ['cybersecurity', 'cloud-msp'],
    ['it-si', 'cloud-msp'],
    ['cloud-msp', 'e-commerce'],
    ['ddic', 'display-panel'],
    ['optical-sensors', 'mobile'],
    ['optical-lens-camera', 'mobile'],
    ['hpc-network-ic', 'leo-satellite'],
    ['asic-ip-design', 'leo-satellite'],
    ['cnc-machine-tool', 'wafer-fab-equipment'],
    ['cnc-machine-tool', 'precision-metal-casing'],
    ['cnc-machine-tool', 'advanced-packaging-automation'],
    ['pcb-manufacturing', 'networking-equipment'],
    ['fpc', 'mobile'],
    ['fpc', 'pc-nb-tablet'],
    ['connector', 'ai-server-chassis-rails'],
    ['psu', 'ems-smt'],
    ['thermal_components_air', 'ems-smt'],
    ['liquid_cooling_advanced', 'ai-server-chassis-rails'],
    ['mlcc-capacitor', 'automotive-ic'],
    ['passive-inductor', 'automotive-ic'],
    ['battery-cell-module', 'pc-nb-tablet'],
    ['wafer-foundry', 'niche-memory'],
    ['wafer-foundry', 'hbm'],
    ['packaging-materials', 'ic-substrate'],
    ['semi-process-materials', 'cowos-advanced-packaging'],
    ['silicon-photonics', 'leo-satellite'],
    ['industrial-automation', 'cnc-machine-tool'],
];

const topics = topicMapData as TopicEntry[];

// topic_id → group
const topicGroupMap = new Map<string, string>(topics.map(t => [t.id, t.group]));

// group → Set<topic_id>
const groupTopicsMap = new Map<string, Set<string>>();
for (const t of topics) {
    if (!groupTopicsMap.has(t.group)) groupTopicsMap.set(t.group, new Set());
    groupTopicsMap.get(t.group)!.add(t.id);
}

// stock_code → Set<topic_id>
const stockTopicMap = new Map<string, Set<string>>();
for (const t of topics) {
    for (const code of t.stocks) {
        if (!stockTopicMap.has(code)) stockTopicMap.set(code, new Set());
        stockTopicMap.get(code)!.add(t.id);
    }
}

export interface CategoryChain {
    upstream: string[];   // category names that feed INTO this category
    downstream: string[]; // category names that this category feeds INTO
}

/**
 * Given a sector category name (matching topicMap group names),
 * returns the upstream and downstream category names connected via supply chain edges.
 * Same-category internal edges are excluded.
 */
export function getCategoryChain(category: string): CategoryChain {
    const myTopics = groupTopicsMap.get(category) ?? new Set<string>();
    if (myTopics.size === 0) return { upstream: [], downstream: [] };

    const upstream = new Set<string>();
    const downstream = new Set<string>();

    for (const [source, target] of CHAIN_EDGES) {
        // source → target edge means source is upstream of target
        if (myTopics.has(target) && !myTopics.has(source)) {
            const group = topicGroupMap.get(source);
            if (group && group !== category) upstream.add(group);
        }
        if (myTopics.has(source) && !myTopics.has(target)) {
            const group = topicGroupMap.get(target);
            if (group && group !== category) downstream.add(group);
        }
    }

    return {
        upstream: Array.from(upstream),
        downstream: Array.from(downstream),
    };
}

/**
 * Given a list of stock codes (from an expanded sector),
 * derives which topicMap groups they belong to, then returns
 * upstream and downstream groups via supply chain edges.
 * Works with any sector category naming convention.
 */
export function getStockChain(stockIds: string[]): CategoryChain {
    // Collect all topic_ids that appear among these stocks
    const myTopics = new Set<string>();
    for (const code of stockIds) {
        const tids = stockTopicMap.get(code);
        if (tids) for (const tid of tids) myTopics.add(tid);
    }
    if (myTopics.size === 0) return { upstream: [], downstream: [] };

    // Derive which groups "own" these topics
    const myGroups = new Set<string>();
    for (const tid of myTopics) {
        const g = topicGroupMap.get(tid);
        if (g) myGroups.add(g);
    }

    const upstream = new Set<string>();
    const downstream = new Set<string>();

    for (const [source, target] of CHAIN_EDGES) {
        if (myTopics.has(target) && !myTopics.has(source)) {
            const group = topicGroupMap.get(source);
            if (group && !myGroups.has(group)) upstream.add(group);
        }
        if (myTopics.has(source) && !myTopics.has(target)) {
            const group = topicGroupMap.get(target);
            if (group && !myGroups.has(group)) downstream.add(group);
        }
    }

    return {
        upstream: Array.from(upstream),
        downstream: Array.from(downstream),
    };
}
