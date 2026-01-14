import { DemoCase, Milestone } from '@/types';

export type PipelineStage = 'contract' | 'seal' | 'tax' | 'transfer' | 'handover' | 'closed';

export function getCaseStage(c: DemoCase): PipelineStage {
    const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones as Milestone | undefined;

    // If no milestones record, it's at the beginning (Contract state)
    if (!m) return 'contract';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper to check if a date is "today or future"
    const isFutureOrToday = (dateStr?: string) => {
        if (!dateStr) return false;
        try {
            const d = new Date(dateStr);
            d.setHours(0, 0, 0, 0);
            return d >= today;
        } catch {
            return false;
        }
    };

    // Helper to check if a date is strictly "completed/past"
    const isCompleted = (dateStr?: string) => {
        if (!dateStr) return false;
        try {
            const d = new Date(dateStr);
            d.setHours(0, 0, 0, 0);
            return d < today;
        } catch {
            return false;
        }
    };

    // 1. Look for the *Earliest* Active Plan (Future/Today)
    // This allows skipping steps (e.g. if Seal is null but Tax is set, we show Tax)
    const stages: { id: PipelineStage; date?: string }[] = [
        { id: 'contract', date: m.contract_date },
        { id: 'seal', date: m.seal_date },
        { id: 'tax', date: m.tax_payment_date },
        { id: 'transfer', date: m.transfer_date },
        { id: 'handover', date: m.handover_date },
    ];

    const upcomingStages = stages
        .filter(s => isFutureOrToday(s.date))
        .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    // If we have upcoming scheduled dates, the earliest one is our "Current Stage"
    if (upcomingStages.length > 0) {
        return upcomingStages[0].id;
    }

    // 2. Fallback: If no future dates (all Dates are empty or Past), use logical progression
    // Logic: If a step is COMPLETED, the case is currently at the *NEXT* step.

    if (isCompleted(m.handover_date)) return 'closed';
    if (isCompleted(m.transfer_date)) return 'handover';    // Transfer done -> Case is at Handover stage
    if (isCompleted(m.tax_payment_date)) return 'transfer'; // Tax done -> Case is at Transfer stage
    if (isCompleted(m.seal_date)) return 'tax';             // Seal done -> Case is at Tax stage
    if (isCompleted(m.contract_date)) return 'seal';        // Contract done -> Case is at Seal stage

    // Default: Nothing started -> At Contract stage
    return 'contract';
}
