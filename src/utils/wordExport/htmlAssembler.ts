/**
 * Word 匯出 - HTML 組裝工具
 * 將內容組裝成符合 html-docx-js 格式的完整 HTML 文件
 */

/**
 * 組裝完整 HTML 文件（含樣式）
 */
export function assembleFullHtml(title: string, bodyContent: string): string {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Microsoft JhengHei', '微軟正黑體', 'Arial', sans-serif;
            line-height: 1.6;
            color: #1f2937;
          }
          h1 {
            color: #1e3a8a;
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 8pt;
          }
          h2 {
            color: #2563eb;
            font-size: 18pt;
            font-weight: bold;
            margin-top: 12pt;
            margin-bottom: 6pt;
          }
          h3 {
            color: #3b82f6;
            font-size: 14pt;
            font-weight: bold;
            margin-top: 8pt;
            margin-bottom: 4pt;
          }
          p {
            margin: 6pt 0;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 12pt 0;
          }
          td, th {
            border: 1px solid #d1d5db;
            padding: 8px;
            vertical-align: top;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 12pt 0;
          }
          strong, b {
            font-weight: bold;
          }
          em, i {
            font-style: italic;
          }
          u {
            text-decoration: underline;
          }
          ul, ol {
            margin: 6pt 0;
            padding-left: 24pt;
          }
          li {
            margin: 3pt 0;
          }
          a {
            color: #2563eb;
            text-decoration: underline;
          }
          hr {
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 16pt 0;
          }
          code {
            font-family: 'Courier New', monospace;
            background-color: #f3f4f6;
            padding: 2px 4px;
            border-radius: 3px;
          }
          pre {
            background-color: #f3f4f6;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
          }
          blockquote {
            border-left: 4px solid #d1d5db;
            padding-left: 12pt;
            margin-left: 0;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <hr />
        ${bodyContent}
        <hr />
        <p style="color: #9ca3af; font-size: 9pt; margin-top: 24pt;">
          匯出日期：${new Date().toLocaleString('zh-TW')} | 由 ScrivenerFlow 系統生成
        </p>
      </body>
    </html>
  `;
}

/**
 * 轉義 HTML 特殊字元
 */
export function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
