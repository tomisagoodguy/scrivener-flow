import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, stat } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execAsync = util.promisify(exec);

export async function POST(request: NextRequest) {
    const tempFilePaths: string[] = [];
    const resultJsonPaths: string[] = [];

    try {
        const formData = await request.formData();
        const files = formData.getAll('file') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }

        const projectRoot = process.cwd();
        const ocrServiceDir = path.join(projectRoot, 'ocr_service');
        const tempDir = os.tmpdir();

        // 1. Save all files to temp
        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize
            const fileName = `upload_${uniqueSuffix}_${originalName}`;
            const tempFilePath = path.join(tempDir, fileName);

            await writeFile(tempFilePath, buffer);
            tempFilePaths.push(tempFilePath);

            // Python script naming convention for output: ocr_result_<filename>.json
            const jsonFileName = `ocr_result_${fileName}.json`;
            resultJsonPaths.push(path.join(ocrServiceDir, jsonFileName));
        }

        console.log(`[OCR API] Saved ${tempFilePaths.length} files. Starting Batch Processing...`);

        // 2. Normalize all paths for command line
        // Join with space, wrap each in quotes
        const args = tempFilePaths.map(p => `"${p.split(path.sep).join('/')}"`).join(' ');

        // 3. Execute Python script with ALL file paths
        // Command: uv run main.py "file1" "file2" ...
        const command = `uv run main.py ${args}`;

        console.log(`[OCR API] Executing Batch Command: ${command}`);

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: ocrServiceDir,
                env: {
                    ...process.env,
                    PYTHONIOENCODING: 'utf-8',
                    DISABLE_MODEL_SOURCE_CHECK: 'True'
                },
                timeout: 120000 // Increase timeout for batch
            });
            console.log('[OCR API] Batch Stdout:', stdout.substring(0, 500) + '...');
            if (stderr) console.error('[OCR API] Batch Stderr:', stderr.substring(0, 500) + '...');
        } catch (error: any) {
            console.error('[OCR API] Batch Execution Error:', error);
            // Don't throw, check for results
        }

        // 4. Collect Results
        let allParsedData: any[] = [];

        for (const jsonPath of resultJsonPaths) {
            try {
                // Check exist and read
                await stat(jsonPath);
                const rawData = await readFile(jsonPath, 'utf-8');
                if (rawData && rawData.trim() !== '') {
                    const data = JSON.parse(rawData);
                    if (data.parsed_data) {
                        allParsedData = [...allParsedData, ...data.parsed_data];
                    }
                }
            } catch (e) {
                console.warn(`[OCR API] Could not read result for ${jsonPath}`);
            }
        }

        console.log(`[OCR API] Batch processing complete. Total people found: ${allParsedData.length}`);

        return NextResponse.json({
            success: true,
            data: allParsedData
        });

    } catch (error: any) {
        console.error('[OCR API] Fatal Handler Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error.message
        }, { status: 500 });
    } finally {
        // Cleanup all temp files
        const allPathsToDelete = [...tempFilePaths, ...resultJsonPaths];
        for (const p of allPathsToDelete) {
            try { await unlink(p); } catch (e) { }
        }
    }
}
