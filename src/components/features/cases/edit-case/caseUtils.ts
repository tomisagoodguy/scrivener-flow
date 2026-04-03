/**
 * Utility functions for Case Form
 */

export const parseAttributes = (rawNotes: string) => {
    const match = rawNotes.match(/\[\[ATTR:(.*?)\]\]/);
    if (match && match[1]) {
        try {
            return JSON.parse(match[1]);
        } catch (e) {
            return {};
        }
    }
    return {};
};

export const stripAttributesFromNotes = (rawNotes: string) => {
    return rawNotes.replace(/\[\[ATTR:.*?\]\]/, '').trim();
};

/** 移除 HTML 標籤，保留換行結構（<p>/<br> 轉換成換行） */
export const stripHtml = (html: string): string => {
    if (!html) return '';
    if (!/<[a-z][\s\S]*>/i.test(html)) return html; // 純文字直接返回
    return html
        .replace(/<\/p>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

export const toISODate = (val: any) => {
    if (!val) return '';
    try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
};

export const toISODatetime = (val: any) => {
    if (!val) return '';
    try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}`;
    } catch {
        return '';
    }
};
