import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, stat } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import fs from 'fs';

const execAsync = util.promisify(exec);

export async function POST(request: NextRequest) {
    const tempFilePaths: string[] = [];
    const resultJsonPaths: string[] = [];
    const allParsedData: any[] = [];

    try {
        const formData = await request.formData();
        const files = formData.getAll('file') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }

        const projectRoot = process.cwd();
        const ocrServiceDir = path.join(projectRoot, 'ocr_service');
        const tempDir = os.tmpdir();

        // 偵測是否使用雲端 AI 服務
        const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL;

        if (OCR_SERVICE_URL) {
            const targetUrl = OCR_SERVICE_URL.endsWith('/') ? OCR_SERVICE_URL.slice(0, -1) : OCR_SERVICE_URL;
            console.log(`[OCR] 偵測到雲端服務，正在請求: ${targetUrl}/identify`);

            for (const file of files) {
                const cloudFormData = new FormData();
                cloudFormData.append('file', file);

                try {
                    const response = await fetch(`${targetUrl}/identify`, {
                        method: 'POST',
                        body: cloudFormData,
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log(`[OCR] 雲端回應成功，取得 ${result.data?.length || 0} 筆資料`);
                        if (result.success && result.data) {
                            allParsedData.push(...result.data);
                        }
                    } else {
                        const errorText = await response.text();
                        console.error(`[OCR] 雲端伺服器報錯 (${response.status}): ${errorText}`);
                    }
                } catch (err: any) {
                    console.error("[OCR] 無法連線至雲端服務 (網路錯誤):", err.message);
                }
            }
        } else {
            console.log("[OCR] 使用地端 CLI 辨識模式 (開發模式)");
            // --- 模式 B: 地端 Python CLI 模式 ---

            // 1. 先儲存所有檔案到臨時目錄
            for (const file of files) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
                const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `upload_${uniqueSuffix}_${originalName}`;
                const tempFilePath = path.join(tempDir, fileName);

                await writeFile(tempFilePath, buffer);
                tempFilePaths.push(tempFilePath);

                // 預期 Python 輸出的 JSON 檔名
                const jsonFileName = `ocr_result_${fileName}.json`;
                resultJsonPaths.push(path.join(ocrServiceDir, jsonFileName));
            }

            // 2. 執行批次辨識指令
            const args = tempFilePaths.map(p => `"${p.split(path.sep).join('/')}"`).join(' ');
            const command = `uv run main.py ${args}`;
            console.log(`[OCR API] 執行批次指令: ${command}`);

            try {
                await execAsync(command, {
                    cwd: ocrServiceDir,
                    env: {
                        ...process.env,
                        PYTHONIOENCODING: 'utf-8',
                        DISABLE_MODEL_SOURCE_CHECK: 'True'
                    },
                    timeout: 120000
                });
            } catch (error: any) {
                console.error('[OCR API] Python 執行錯誤 (可能是部分辨識失敗):', error);
            }

            // 3. 收集所有 JSON 結果
            for (const jsonPath of resultJsonPaths) {
                try {
                    if (fs.existsSync(jsonPath)) {
                        const rawData = await readFile(jsonPath, 'utf-8');
                        const data = JSON.parse(rawData);
                        if (data.parsed_data) {
                            allParsedData.push(...data.parsed_data);
                        }
                    }
                } catch (e) {
                    console.warn(`[OCR API] 無法讀取結果檔: ${jsonPath}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            data: allParsedData
        });

    } catch (error: any) {
        console.error('[OCR API] 系統致命錯誤:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error.message
        }, { status: 500 });
    } finally {
        // 最後清理所有臨時檔案
        const allPathsToDelete = [...tempFilePaths, ...resultJsonPaths];
        for (const p of allPathsToDelete) {
            try {
                if (fs.existsSync(p)) {
                    await unlink(p);
                }
            } catch (e) { }
        }
    }
}
