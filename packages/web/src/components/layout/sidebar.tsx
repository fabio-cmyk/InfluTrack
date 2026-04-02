"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Package,
  ShoppingBag,
  Search,
  BarChart3,
  Palette,
  Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, group: "main" },
  { label: "Campanhas", href: "/campaigns", icon: Megaphone, group: "main" },
  { label: "Influencers", href: "/influencers", icon: Users, group: "main" },
  { label: "Produtos", href: "/products", icon: Package, group: "main" },
  { label: "Pedidos", href: "/orders", icon: ShoppingBag, group: "main" },
  { label: "Mineracao", href: "/mining", icon: Search, group: "discovery" },
  { label: "Analise", href: "/analysis", icon: BarChart3, group: "discovery" },
  { label: "Branding", href: "/branding", icon: Palette, group: "settings" },
  { label: "Configuracoes", href: "/settings", icon: Settings, group: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  const groups = {
    main: navItems.filter((item) => item.group === "main"),
    discovery: navItems.filter((item) => item.group === "discovery"),
    settings: navItems.filter((item) => item.group === "settings"),
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r bg-card">
      {/* Logo — minimal dot + lowercase */}
      <div className="flex h-14 items-center gap-2 px-5 border-b">
        <div className="h-2 w-2 rounded-full bg-foreground" />
        <span className="text-[15px] font-bold tracking-tight lowercase">
          influtrack
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {Object.entries(groups).map(([group, items], groupIndex) => (
          <div key={group}>
            {groupIndex > 0 && <Separator className="my-2" />}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
