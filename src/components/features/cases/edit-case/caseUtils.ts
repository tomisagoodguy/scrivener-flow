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
