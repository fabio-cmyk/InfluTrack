import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className="ml-[260px] transition-all duration-200">
          <TopNav />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
