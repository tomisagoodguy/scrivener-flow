
export const extract = (pattern: RegExp, source: string): string | undefined => {
    const match = source.match(pattern);
    return match ? match[1].trim() : undefined;
};

// Format: YYYY/MM/DD -> YYYY-MM-DD
export const formatDate = (dateStr?: string): string | undefined => {
    if (!dateStr) return undefined;
    const parts = dateStr.match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
    if (parts) {
        const year = parts[1];
        const month = parts[2].padStart(2, '0');
        const day = parts[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return undefined;
};
