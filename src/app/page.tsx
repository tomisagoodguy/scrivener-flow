import { WorkDashboard } from '@/components/dashboard/WorkDashboard';

export default function Home() {
    return (
        <div className="pb-6 animate-fade-in">
            <main className="max-w-7xl mx-auto pt-4 sm:pt-6 bg-transparent">
                <WorkDashboard />
                <footer className="text-center text-gray-400 text-xs py-6 font-medium">
                    Scrivener Flow Professional • v2.0
                </footer>
            </main>
        </div>
    );
}
