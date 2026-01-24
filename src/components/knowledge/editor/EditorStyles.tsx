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
            /* Drag Handle Styles */
            .drag-handle {
                position: absolute;
                width: 1.2rem;
                height: 1.5rem;
                cursor: grab;
                background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 16"><path fillOpacity="0.2" d="M4 10h2v2H4v-2zm0-4h2v2H4V6zm0-4h2v2H4V2z"/></svg>');
                background-repeat: no-repeat;
                background-size: contain;
                z-index: 50;
                transition: opacity 0.2s;
                opacity: 0;
                border-radius: 4px;
            }
            .drag-handle:hover, .drag-handle-active {
                opacity: 1;
                background-color: #f1f5f9;
            }
            .dark .drag-handle:hover, .dark .drag-handle-active {
                background-color: #1e293b;
            }
            .ProseMirror:hover .drag-handle {
                opacity: 0.5;
            }
            /* Indent content slightly to make room for handle */
            .ProseMirror {
                padding-left: 2rem !important; 
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return null;
}
