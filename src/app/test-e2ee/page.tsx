/**
 * E2EE 加密使用範例
 * 
 * 示範如何在客戶端使用端到端加密功能
 */

'use client';

import { useState } from 'react';
import { SecureApi } from '@/lib/crypto/secureApi';

interface CaseData {
    title: string;
    clientName: string;
    description: string;
}

interface ApiResponse {
    success: boolean;
    caseId?: string;
    message?: string;
    error?: string;
}

/**
 * E2EE 加密測試元件
 */
export default function E2EEExample() {
    const [formData, setFormData] = useState<CaseData>({
        title: '',
        clientName: '',
        description: '',
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>('');

    /**
     * 測試加密 POST 請求
     */
    const handleSecureSubmit = async () => {
        setLoading(true);
        setResult('');

        try {
            // 使用 SecureApi 發送加密請求
            const response = await SecureApi.post<ApiResponse>(
                '/api/cases/secure',
                {
                    ...formData,
                    userId: 'test-user-id', // 實際應從 auth session 取得
                }
            );

            if (response.success) {
                setResult(`✅ 成功！案件 ID: ${response.caseId}\n訊息: ${response.message}`);
            } else {
                setResult(`❌ 失敗: ${response.error}`);
            }
        } catch (error) {
            setResult(`❌ 錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setLoading(false);
        }
    };

    /**
     * 測試加密 GET 請求
     */
    const handleSecureQuery = async () => {
        setLoading(true);
        setResult('');

        try {
            const response = await SecureApi.get<{ cases: CaseData[] }>(
                '/api/cases/secure',
                { userId: 'test-user-id' }
            );

            setResult(`✅ 查詢成功！\n共 ${response.cases.length} 筆案件`);
        } catch (error) {
            setResult(`❌ 錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h1 className="text-2xl font-bold text-blue-900 mb-2">
                    🔐 E2EE 加密測試
                </h1>
                <p className="text-blue-700 text-sm">
                    此頁面示範端到端加密 (End-to-End Encryption) 功能。
                    所有資料在傳輸前會使用 AES-256-GCM 加密。
                </p>
            </div>

            {/* 表單 */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        案件標題
                    </label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="輸入案件標題..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        客戶名稱
                    </label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        placeholder="輸入客戶名稱..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        案件說明
                    </label>
                    <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="輸入案件說明..."
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSecureSubmit}
                        disabled={loading || !formData.title || !formData.clientName}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? '加密傳送中...' : '🔒 加密建立案件'}
                    </button>

                    <button
                        onClick={handleSecureQuery}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? '查詢中...' : '🔍 加密查詢案件'}
                    </button>
                </div>
            </div>

            {/* 結果顯示 */}
            {result && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">執行結果:</h3>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {result}
                    </pre>
                </div>
            )}

            {/* 技術說明 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                <h3 className="font-semibold text-gray-900">🛡️ 安全特性:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li>AES-256-GCM 對稱加密</li>
                    <li>PBKDF2 金鑰衍生 (100,000 迭代)</li>
                    <li>隨機 IV 與 Salt (每次加密都不同)</li>
                    <li>流量混淆 (隨機延遲 50-300ms)</li>
                    <li>封包填充 (512-1536 bytes 隨機資料)</li>
                    <li>自動重試機制 (最多 3 次)</li>
                </ul>
            </div>
        </div>
    );
}
