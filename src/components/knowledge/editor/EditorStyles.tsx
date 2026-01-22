'use client';
import { useEffect } from 'react';

export function EditorStyles() {
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .ProseMirror table {
                border-collapse: collapse;
                margin: 1rem 0;
                overflow: hidden;
                table-layout: fixed;
                width: 100%;
            }
            .ProseMirror td,
            .ProseMirror th {
                border: 2px solid #334155;
                box-sizing: border-box;
                min-width: 1em;
                padding: 6px 8px;
                position: relative;
                vertical-align: top;
            }
            .ProseMirror th {
                background-color: #f1f5f9;
                font-weight: bold;
                text-align: left;
            }
            .dark .ProseMirror th {
                background-color: #1e293b;
            }
            .ProseMirror .selectedCell:after {
                background: rgba(59, 130, 246, 0.1);
                content: "";
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                pointer-events: none;
                position: absolute;
                z-index: 2;
            }
            .ProseMirror mark {
                background-color: #fef08a;
                border-radius: 0.25rem;
                padding: 0.125rem 0.25rem;
                box-decoration-break: clone;
            }
            .dark .ProseMirror mark {
                background-color: #854d0e;
                color: #fef9c3;
            }
            /* Make AI content even tighter */
            .ProseMirror ul, .ProseMirror ol {
                margin-top: 0.25rem !important;
                margin-bottom: 0.25rem !important;
            }
            .ProseMirror li {
                margin-top: 0.125rem !important;
                margin-bottom: 0.125rem !important;
            }
            .ProseMirror p {
                margin-top: 0.25rem !important;
                margin-bottom: 0.25rem !important;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return null;
}
