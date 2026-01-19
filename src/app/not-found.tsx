import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card max-w-md w-full p-8 text-center space-y-6 border border-white/20 shadow-2xl rounded-2xl animate-slide-up">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <div className="relative text-8xl font-black text-primary/80 select-none">
                        404
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">
                        找不到此頁面
                    </h2>
                    <p className="text-foreground/60 font-medium">
                        您嘗試訪問的頁面可能已被移除或暫時無法使用。
                    </p>
                </div>

                <div className="pt-4">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
                    >
                        返回首頁
                    </Link>
                </div>
            </div>
        </div>
    );
}
