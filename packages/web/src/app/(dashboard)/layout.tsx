import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Usuario";
  const userEmail = user?.email;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-[72px]">
        <TopNav userName={userName} userEmail={userEmail} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
