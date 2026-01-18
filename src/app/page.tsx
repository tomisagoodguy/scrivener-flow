import TodoContainer from '@/components/todo/TodoContainer';
import DashboardDateCalculator from '@/components/dashboard/DashboardDateCalculator';
import DashboardQuickNotes from '@/components/dashboard/DashboardQuickNotes';
import { RecentCases } from '@/components/features/cases/RecentCases';
import { WorkDashboard } from '@/components/dashboard/WorkDashboard';
import WelcomeHeader from '@/components/dashboard/WelcomeHeader';

export default function Home() {
    return (
        <div className="pb-12 animate-fade-in">
            <main className="max-w-7xl mx-auto pt-4 sm:pt-8 bg-transparent">
                {/* Welcome Section (Client Side) */}
                <WelcomeHeader />

                {/* WORK DASHBOARD (7-Day Risk Radar & Pipeline) */}
                <div className="mb-8">
                    <WorkDashboard />
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
