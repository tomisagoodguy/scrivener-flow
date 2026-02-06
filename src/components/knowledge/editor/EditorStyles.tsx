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
            /* Drag Handle Styles */
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
            .ProseMirror a {
                color: #6366f1;
                text-decoration: underline;
                font-weight: 600;
                padding: 2px 4px;
                background: #f5f3ff;
                border-radius: 4px;
                transition: all 0.2s;
            }
            .dark .ProseMirror a {
                color: #818cf8;
                background: #1e1b4b;
            }
            .ProseMirror a:hover {
                background: #ede9fe;
            }
            .dark .ProseMirror a:hover {
                background: #312e81;
            }
            .ProseMirror img {
                max-width: 100%;
                height: auto;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                margin: 1rem 0;
            }
            /* Editor Content Styles */
            .ProseMirror {
                padding: 1rem !important;
                outline: none !important;
            }
            .ProseMirror > * + * {
                margin-top: 0.75em;
            }
            .ProseMirror p {
                margin: 0.5rem 0;
            }
            /* FORCE LIST STYLES - Removed as per user request to cancel feature attempts */
            .ProseMirror li p {
                margin: 0 !important;
            }
            .ProseMirror a {
                color: #6366f1;
                text-decoration: underline;
                font-weight: 500;
            }
            .ProseMirror img {
                max-width: 100%;
                height: auto;
                border-radius: 0.5rem;
                margin: 1rem 0;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return null;
}
