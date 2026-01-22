import { TemplateType, MessageInputs, formatMoneySpoken, guessNextPaymentType } from './messageUtils';

/**
 * 訊息模板生成引擎
 * 根據模板類型與輸入參數生成文字內容
 */
export function generateMessageFromTemplate(
    template: TemplateType | string,
    inputs: MessageInputs,
    caseData: any
): string {
    const buyer = inputs.buyerName;
    let text = '';

    switch (template) {
        case 'PREPAID_FEES':
            text = `【預收規費通知】\n\n${buyer} 您好，\n跟您報告預收規費的部分。\n\n預收規費：${formatMoneySpoken(inputs.prepaidFee)}\n此費用包含地政規費、稅費及代書費。\n\n麻煩您匯款整數【${formatMoneySpoken(inputs.prepaidFee)}整】\n剩餘的費用我們會在交屋時用現金的方式多退少補。\n\n麻煩您和下一筆款項一起匯入履保帳戶即可,謝謝！`;
            break;

        case 'NEXT_PAYMENT':
            const parts = [];
            if (Number(inputs.nextPaymentAmount) > 0) parts.push(`款項 ${formatMoneySpoken(inputs.nextPaymentAmount)}`);
            if (Number(inputs.loanDiff) > 0) parts.push(`貸款差額 ${formatMoneySpoken(inputs.loanDiff)}`);
            if (Number(inputs.prepaidFee) > 0) parts.push(`預收規費 ${formatMoneySpoken(inputs.prepaidFee)}`);

            text = `【付款通知】\n\n${buyer} 您好，\n提醒您下一筆款項 (${inputs.nextPaymentType || guessNextPaymentType(caseData)})。\n\n應匯金額：${parts.join(' + ')}\n總計：${formatMoneySpoken(inputs.totalAmount)}\n\n匯款截止日：${inputs.nextPaymentDate || '請依約定時間匯款'}\n\n請匯入履保專戶，匯款後請通知我們，謝謝！`;
            break;

        case 'SIGNING':
            text = `【簽約通知】\n\n${buyer} 您好，\n恭喜您成交！\n\n簽約時間：${inputs.meetingTime}\n地點：${inputs.meetingLocation}\n\n請攜帶：\n1. 身分證\n2. 印章\n3. 簽約金\n\n期待與您見面！`;
            break;

        case 'SEAL':
            text = `【用印通知】\n\n${buyer} 您好，\n提醒您用印時間。\n\n時間：${inputs.meetingTime}\n地點：${inputs.meetingLocation}\n\n請準備好印鑑證明與印鑑章。\n謝謝！`;
            break;

        case 'TAX_PAYMENT':
            text = `【完稅通知】\n\n${buyer} 您好，\n稅單已核發，我們將儘速處理完稅事宜。\n\n預計完稅日：${inputs.nextPaymentDate}\n\n如有任何問題請隨時聯繫，謝謝！`;
            break;

        case 'HANDOVER':
            text = `【交屋通知】\n\n${buyer} 您好，\n恭喜即將交屋！\n\n交屋時間：${inputs.meetingTime}\n地點：${inputs.meetingLocation}\n\n請攜帶：\n1. 身份證\n2. 印章\n3. 找補款項(若有)\n\n期待您的新居落成！`;
            break;

        case 'CUSTOM':
            text = inputs.buyerName ? `${inputs.buyerName} 您好，\n\n` : '';
            break;

        default:
            text = '';
    }

    return text;
}
