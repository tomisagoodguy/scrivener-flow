'use client';

import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { DemoCase } from '@/types';
import { getCaseStage } from '@/lib/stageUtils';

interface ShareCaseProgressProps {
    caseData: DemoCase;
}

export default function ShareCaseProgress({ caseData }: ShareCaseProgressProps) {
    const [copied, setCopied] = useState(false);

    const generateReport = () => {
        const stage = getCaseStage(caseData);
        const date = new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
        const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

        // Map stage to Chinese Label
        const stageMap: Record<string, string> = {
            contract: '簽約',
            seal: '用印',
            tax: '完稅',
            transfer: '過戶',
            handover: '交屋',
            closed: '結案',
            Rollback: '退回/補正中'
        };
        const stageLabel = stageMap[stage] || stage;

        // Identify next milestone (simple logic for now)
        let nextStep = '後續進度請留意通知';
        const milestones = (caseData.milestones?.[0] || {}) as import('@/types').Milestone;

        if (stage === 'contract' && milestones.seal_appointment) {
            const d = new Date(milestones.seal_appointment);
            nextStep = `預計 ${d.getMonth() + 1}/${d.getDate()} 進行用印`;
        } else if (stage === 'seal' && milestones.tax_appointment) {
            const d = new Date(milestones.tax_appointment);
            nextStep = `預計 ${d.getMonth() + 1}/${d.getDate()} 進行完稅`;
        } else if (stage === 'tax' && milestones.handover_appointment) {
            const d = new Date(milestones.handover_appointment);
            nextStep = `預計 ${d.getMonth() + 1}/${d.getDate()} 進行交屋`;
        }

        const lines = [
            `【案件進度回報】${caseData.buyer_name} 案`,
            `📅 時間：${date} ${time}`,
            `📍 目前狀態：${stageLabel}${caseData.status === 'Rollback' ? ' (退回/補正中)' : ''}`,
            caseData.is_on_hold ? `⚠️ 暫停中：${caseData.on_hold_reason || '未說明原因'}` : '',
            `-------------------`,
            `📢 說明：${nextStep}`,
            `如有任何疑問，歡迎隨時聯繫。`,
        ].filter(Boolean);

        return lines.join('\n');
    };

    const handleCopy = () => {
        const text = generateReport();
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
            title="複製 Line 回報文字"
        >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? '已複製' : 'Line 回報'}
        </button>
    );
}
