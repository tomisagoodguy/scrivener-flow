export const PREDEFINED_STRATEGIES = ['創260高', '低波動', '融資健康', '營收9月高', '投信買超'] as const;
export type Strategy = (typeof PREDEFINED_STRATEGIES)[number];
