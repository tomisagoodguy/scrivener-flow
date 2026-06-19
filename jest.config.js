/** @type {import('jest').Config} */
const config = {
    // 測試環境
    testEnvironment: 'jsdom',

    // 測試檔案位置
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
        '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
    ],

    // 模組路徑別名 (對應 tsconfig.json)
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },

    // 轉換器
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
        }],
    },

    // 設定檔
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

    // 忽略的檔案
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
        // setup.ts 為 setupFilesAfterEnv 設定檔，非測試套件，避免被當成空測試套件而失敗
        '<rootDir>/src/__tests__/setup.ts',
    ],

    // 覆蓋率設定
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
    ],

    // 模組檔案副檔名
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};

module.exports = config;
