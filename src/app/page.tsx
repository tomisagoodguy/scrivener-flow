import TodoContainer from '@/components/todo/TodoContainer';
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
                    <div className="lg:col-span-12 h-[750px]">
                        <TodoContainer />
                    </div>
                    <div className="lg:col-span-12 h-[600px]">
                        <DashboardQuickNotes />
                    </div>
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
