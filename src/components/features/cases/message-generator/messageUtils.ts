/**
 * 訊息模板類型與工具函數
 */

export type TemplateType =
    | 'PREPAID_FEES'
    | 'SIGNING'
    | 'SEAL'
    | 'TAX_PAYMENT'
    | 'TRANSFER'
    | 'HANDOVER'
    | 'COMPLETION'
    | 'CUSTOM'
    | 'NEXT_PAYMENT';

export interface CustomTemplate {
    name: string;
    content: string;
}

export interface MessageInputs {
    buyerName: string;
    prepaidFee: string;
    nextPaymentDate: string;
    nextPaymentAmount: string;
    nextPaymentType: string;
    loanDiff: string;
    totalAmount: string;
    bankName: string;
    meetingTime: string;
    meetingLocation: string;
}

/**
 * 格式化金額為千分位顯示
 */
export const fmtMoney = (val: string | number): string => {
    if (!val) return '0';
    return Number(val).toLocaleString();
};

/**
 * 將金額轉換為口語化中文（如：25000 → 2萬5000元）
 */
export const formatMoneySpoken = (val: string | number): string => {
    if (!val) return '0元';
    const num = Number(val);
    if (num >= 10000) {
        const wan = Math.floor(num / 10000);
        const remainder = num % 10000;
        return `${wan}萬${remainder > 0 ? remainder : ''}元`;
    }
    return `${num}元`;
};

/**
 * 根據案件狀態自動推測下一階段款項類型
 */
export const guessNextPaymentType = (caseData: any): string => {
    const stage = caseData.status;
    if (stage === 'Processing') return '用印款';
    return '尾款';
};
