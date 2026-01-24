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
            
            /* Drag Handle Styles - High Visibility Mode */
            .drag-handle {
                position: absolute;
                width: 20px !important;
                height: 28px !important;
                cursor: grab;
                /* Use a much clearer WHITE icon on a BLUE background */
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='12' r='1.5'/%3E%3Ccircle cx='9' cy='5' r='1.5'/%3E%3Ccircle cx='9' cy='19' r='1.5'/%3E%3Ccircle cx='15' cy='12' r='1.5'/%3E%3Ccircle cx='15' cy='5' r='1.5'/%3E%3Ccircle cx='15' cy='19' r='1.5'/%3E%3C/svg%3E") !important;
                background-repeat: no-repeat;
                background-position: center;
                background-color: #6366f1; /* Indigo Blue */
                z-index: 50;
                transition: all 0.1s;
                opacity: 0.7 !important; /* High base visibility (70%) */
                border-radius: 4px;
                left: 6px !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            /* Even larger hit area expansion */
            .drag-handle::before {
                content: "";
                position: absolute;
                top: -10px;
                bottom: -10px;
                left: -15px; 
                right: -25px; /* Touches text to prevent flicker */
                z-index: -1;
            }

            .drag-handle:hover, .drag-handle-active {
                opacity: 1 !important;
                background-color: #4f46e5 !important; /* Darker blue */
                transform: scale(1.1);
            }
            
            /* Keep it visible when hovering the block */
            .ProseMirror > *:hover .drag-handle {
                opacity: 0.9 !important;
            }

            .dark .drag-handle {
                 background-color: #818cf8;
            }

            /* Ensure editor has room for the handle */
            .ProseMirror {
                padding-left: 0 !important;
                position: relative;
            }
            /* Add padding to direct children instead so they "own" the gutter space */
            .ProseMirror > * {
                padding-left: 2.8rem !important; /* Slightly more space */
                margin-left: 0 !important;
                position: relative; 
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return null;
}
