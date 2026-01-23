import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            // ==========================================
            // Senior Architect TypeScript Guidelines
            // ==========================================

            // 強制禁止 any，必須使用 unknown 並進行 Type Guard
            '@typescript-eslint/no-explicit-any': 'warn', // 暫時設為 warn，避免舊程式碼大量報錯，日後改為 error

            // 優先使用 interface 定義物件
            '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],

            // 禁止未使用的變數 (允許 _ 開頭的變數)
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],

            // ==========================================
            // React / Next.js Best Practices
            // ==========================================

            // 允許在 JSX 中使用某些未跳脫字元
            'react/no-unescaped-entities': 'off',

            // 關閉 Display Name 強制檢查 (對 Server Components 來說較不重要)
            'react/display-name': 'off',

            // ==========================================
            // Code Quality
            // ==========================================

            // 避免這類容易導致 Bug 的寫法
            'no-console': ['warn', { allow: ['warn', 'error', 'info', 'dir'] }],
            'prefer-const': 'error',
        },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
        // 專案特定忽略
        'node_modules/**',
        'public/**',
    ]),
]);

export default eslintConfig;
