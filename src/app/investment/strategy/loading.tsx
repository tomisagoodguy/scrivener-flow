export default function Loading() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            {[...Array(2)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-5 space-y-3">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40" />
                    {[...Array(5)].map((_, j) => (
                        <div key={j} className="flex justify-between py-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
