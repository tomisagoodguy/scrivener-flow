import { TodoTask, TaskType } from './types';

/**
 * Mock Data for Development & Testing
 * 生成測試用的代辦事項清單
 */
export const generateMockTasks = (): TodoTask[] => [
    {
        id: '1',
        title: '林小美案 - 簽約確認',
        type: 'legal',
        date: new Date(new Date().setHours(10, 0, 0, 0)),
        isCompleted: false,
        priority: 'urgent-important',
        caseName: '林小美案',
        caseId: 'case-001',
    },
    {
        id: '2',
        title: '陳大文案 - 土增稅繳納期限',
        type: 'tax',
        date: new Date(new Date().setDate(new Date().getDate() + 2)),
        isCompleted: false,
        priority: 'urgent-important',
        caseName: '陳大文案',
        caseId: 'case-002',
    },
    {
        id: '3',
        title: '張經理 - 用印預約',
        type: 'appointment',
        date: new Date(new Date().setHours(14, 30, 0, 0)),
        isCompleted: false,
        priority: 'not-urgent-important',
        notes: '記得帶印鑑證明',
    },
    {
        id: '4',
        title: '去銀行補摺',
        type: 'personal',
        date: new Date(new Date().setDate(new Date().getDate() + 1)),
        isCompleted: true,
        priority: 'not-urgent-not-important',
    },
    {
        id: '5',
        title: '王小明案 - 完稅通知',
        type: 'legal',
        date: new Date(new Date().setDate(new Date().getDate() + 5)),
        isCompleted: false,
        priority: 'not-urgent-important',
        caseName: '王小明案',
    },
    {
        id: '6',
        title: '整理辦公室文件',
        type: 'personal',
        date: new Date(new Date().setDate(new Date().getDate() + 3)),
        isCompleted: false,
        priority: 'not-urgent-not-important',
    },
];
