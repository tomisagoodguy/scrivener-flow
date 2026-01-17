import TodoContainer from '@/components/todo/TodoContainer';
import DashboardDateCalculator from '@/components/DashboardDateCalculator';
import DashboardQuickNotes from '@/components/DashboardQuickNotes';
import { RecentCases } from '@/components/RecentCases';

export default function Home() {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? '早安' : hours < 18 ? '午安' : '晚安';

    return (
        <div className="pb-12 animate-fade-in">
            <main className="max-w-7xl mx-auto pt-4 sm:pt-8 bg-transparent">
                {/* Welcome Section */}
                <div className="mb-8 pl-1">
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span>{greeting}，</span>
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
                            Administrator
                        </span>
                        <span className="animate-bounce">👋</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
                        這是您的個人代書工作台，所有工具已準備就緒。
                    </p>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                    {/* Main Workspace (Notes) - Spans 8 cols */}
                    <div className="lg:col-span-8 h-[750px]">
                        <TodoContainer />
                    </div>

                    {/* Utility Tools (Calculator) - Spans 4 cols */}
                    <div className="lg:col-span-4 h-auto">
                        <div className="h-[750px]">
                            <DashboardDateCalculator />
                        </div>
                    </div>

                    {/* Personal Working Notes - Full Width Big Area */}
                    <div className="lg:col-span-12 h-[600px]">
                        <DashboardQuickNotes />
                    </div>

                    {/* Recent Cases - Spans Full Width */}
                    <div className="lg:col-span-12 min-h-[400px]">
                        <RecentCases />
                    </div>
                </div>

                <footer className="text-center text-gray-400 text-xs py-8 font-medium">
                    Scrivener Flow Professional • v2.0
                </footer>
            </main>
        </div>
    );
}
