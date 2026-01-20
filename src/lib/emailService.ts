/**
 * Email 服務模組 - 標準 Gmail API 實現
 * 用途：發送案件通知、提醒郵件
 */

import nodemailer from 'nodemailer';

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

/**
 * 發送郵件（使用 SMTP）
 * 環境變數需求：
 * - EMAIL_USER: Gmail 帳號
 * - EMAIL_APP_PASSWORD: Gmail 應用程式專用密碼
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD, // Gmail App Password
        },
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    });
}

/**
 * 發送案件提醒通知
 */
export async function sendCaseReminder(
    recipientEmail: string,
    caseNumber: string,
    dueDate: string
): Promise<void> {
    await sendEmail({
        to: recipientEmail,
        subject: `案件提醒：${caseNumber}`,
        html: `
      <h2>案件期限提醒</h2>
      <p>案件編號：<strong>${caseNumber}</strong></p>
      <p>截止日期：<strong>${dueDate}</strong></p>
      <p>請及時處理。</p>
    `,
    });
}
