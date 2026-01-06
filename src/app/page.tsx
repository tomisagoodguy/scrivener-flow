import { Header } from "@/components/Header";
import { DashboardStats } from "@/components/DashboardStats";
import { RecentCases } from "@/components/RecentCases";

export default function Home() {
  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto font-sans">
      <Header />
      <main>
        <DashboardStats />
        <RecentCases />
      </main>
    </div>
  );
}
