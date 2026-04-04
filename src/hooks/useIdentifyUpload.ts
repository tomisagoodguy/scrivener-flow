'use client';

import { useState, useCallback, useEffect } from 'react';
import { resizeImage } from '@/utils/imageUtils';

export type ParsedPerson = {
    name: string | null;
    dob: string | null;
    id_number: string | null;
    address: string | null;
    confidence?: number;
};

const LOADING_STAGES = [
    { progress: 10, text: '☁️ 正在上傳檔案...' },
    { progress: 30, text: '🤖 啟動 AI 辨識引擎 (此過程需時較長)...' },
    { progress: 60, text: '🔍 正在分析證件細節...' },
    { progress: 85, text: '✍️ 正在擷取文字資料...' },
    { progress: 95, text: '✨ 即將完成...' },
];

export function useIdentifyUpload() {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<ParsedPerson[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [stageText, setStageText] = useState('');
    const [elapsedTime, setElapsedTime] = useState(0);
    const [finalDuration, setFinalDuration] = useState<number | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFiles(acceptedFiles);
            setResults(null);
            setError(null);
        }
    }, []);

    const removeFile = useCallback((idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    }, []);

    // Simulated progress timer & real clock
    useEffect(() => {
        let stageInterval: NodeJS.Timeout;
        let clockInterval: NodeJS.Timeout;

        if (isUploading) {
            setElapsedTime(0);
            setFinalDuration(null);

            let currentStage = 0;
            setProgress(LOADING_STAGES[0].progress);
            setStageText(LOADING_STAGES[0].text);

            stageInterval = setInterval(() => {
                currentStage++;
                if (currentStage < LOADING_STAGES.length) {
                    setProgress(LOADING_STAGES[currentStage].progress);
                    setStageText(LOADING_STAGES[currentStage].text);
                }
            }, 3000);

            const start = Date.now();
            clockInterval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - start) / 1000));
            }, 100);
        } else {
            setProgress(0);
        }

        return () => {
            clearInterval(stageInterval);
            clearInterval(clockInterval);
        };
    }, [isUploading]);

    const handleUpload = async () => {
        if (files.length === 0) return;
        setIsUploading(true);
        setError(null);
        setResults(null);
        const uploadStart = Date.now();

        try {
            const processedFiles = await Promise.all(
                files.map(file => file.type.startsWith('image/')
                    ? resizeImage(file, { maxDimension: 640 })
                    : file)
            );

            const formData = new FormData();
            processedFiles.forEach(file => formData.append('file', file));

            const response = await fetch('/api/identify', { method: 'POST', body: formData });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            if (data.success && data.data) {
                setResults(data.data);
                setFinalDuration((Date.now() - uploadStart) / 1000);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err: unknown) {
            console.error(err);
            setError(err instanceof Error ? err.message : '發生錯誤，請重試');
        } finally {
            setIsUploading(false);
        }
    };

    return {
        files, setFiles, removeFile, onDrop,
        isUploading, results, error,
        progress, stageText, elapsedTime, finalDuration,
        handleUpload,
    };
}
