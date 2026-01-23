export type DateLike = string | Date;

export const money = (val: number) => Math.round(val).toLocaleString();
export const round = (num: number) => Math.round(num);

export const parseDateString = (d: DateLike): Date => {
    if (d instanceof Date) return d;
    if (!d) return new Date();

    let s = d.replace(/\//g, '-').trim();

    const isROC = /^\d{6,7}$/.test(s);
    if (isROC) {
        const yearLen = s.length === 7 ? 3 : 2;
        const rocYear = parseInt(s.substring(0, yearLen));
        const month = parseInt(s.substring(yearLen, yearLen + 2)) - 1;
        const day = parseInt(s.substring(yearLen + 2));
        return new Date(rocYear + 1911, month, day);
    }

    return new Date(s);
};

export const roDate = (d: DateLike): string => {
    try {
        const date = parseDateString(d);
        if (isNaN(date.getTime())) return '';
        const rocYear = date.getFullYear() - 1911;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `民國 ${rocYear} 年 ${month} 月 ${day} 日`;
    } catch (e) {
        return '';
    }
};
