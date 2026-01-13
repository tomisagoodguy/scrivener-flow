import { Header } from "@/components/Header";
import DashboardQuickNotes from "@/components/DashboardQuickNotes";
import DashboardDateCalculator from "@/components/DashboardDateCalculator";
import { RecentCases } from "@/components/RecentCases";

export default function Home() {
  const hours = new Date().getHours();
  const greeting = hours < 12 ? '早安' : hours < 18 ? '午安' : '晚安';

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans text-gray-900 pb-12">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Welcome Section */}
        <div className="mb-8 pl-1">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="text-3xl">👋</span>
            {greeting}，準備好處理今天的案件了嗎？
          </h1>
          <p className="text-gray-500 font-medium mt-1 ml-11">
            這是您的個人代書工作台，所有工具已準備就緒。
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Main Workspace (Notes) - Spans 8 cols */}
          <div className="lg:col-span-8 h-[520px]">
            <DashboardQuickNotes />
          </div>

          {/* Utility Tools (Calculator) - Spans 4 cols */}
          <div className="lg:col-span-4 h-[520px]">
            <DashboardDateCalculator />
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
