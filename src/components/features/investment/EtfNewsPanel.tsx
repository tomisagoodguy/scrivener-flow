import { NewspaperIcon, ExternalLinkIcon } from 'lucide-react';

interface NewsItem {
    stock_code: string;
    pub_date: string;
    pub_time: string | null;
    title: string;
    source: string;
    url: string | null;
}

interface Props {
    news: NewsItem[];
}

export function EtfNewsPanel({ news }: Props) {
    if (news.length === 0) {
        return (
            <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <NewspaperIcon className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">近期重大公告</h3>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-sm">近 5 日無重大公告</p>
            </div>
        );
    }

    const byDate = news.reduce<Record<string, NewsItem[]>>((acc, item) => {
        if (!acc[item.pub_date]) acc[item.pub_date] = [];
        acc[item.pub_date]!.push(item);
        return acc;
    }, {});

    const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

    return (
        <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <NewspaperIcon className="w-5 h-5 text-indigo-500" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">近期重大公告</h3>
                <span className="ml-auto text-xs text-slate-400">來源：公開資訊觀測站</span>
            </div>
            <div className="max-h-72 overflow-y-auto pr-1 space-y-4">
                {sortedDates.map(date => (
                    <div key={date}>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                            {new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })}
                        </div>
                        <div className="space-y-1.5">
                            {byDate[date]!.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 rounded-lg px-3 py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <span className="shrink-0 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 pt-0.5 w-14">
                                        {item.stock_code}
                                    </span>
                                    {item.url ? (
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-slate-700 dark:text-slate-300 leading-snug flex-1 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-start gap-1 group"
                                        >
                                            <span>{item.title}</span>
                                            <ExternalLinkIcon className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                                        </a>
                                    ) : (
                                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug flex-1">
                                            {item.title}
                                        </span>
                                    )}
                                    {item.pub_time && (
                                        <span className="shrink-0 text-xs text-slate-400 pt-0.5">{item.pub_time}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
