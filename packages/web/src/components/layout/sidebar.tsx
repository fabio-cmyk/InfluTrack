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
  Trophy,
  Search,
  BarChart3,
  Palette,
  Settings,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, group: "main" },
  { label: "Campanhas", href: "/campaigns", icon: Megaphone, group: "main" },
  { label: "Influencers", href: "/influencers", icon: Users, group: "main" },
  { label: "Produtos", href: "/products", icon: Package, group: "main" },
  { label: "Pedidos", href: "/orders", icon: ShoppingBag, group: "main" },
  { label: "Performance", href: "/performance", icon: Trophy, group: "main" },
  { label: "Mineracao", href: "/mining", icon: Search, group: "discovery" },
  { label: "Analise", href: "/analysis", icon: BarChart3, group: "discovery" },
  { label: "Branding", href: "/branding", icon: Palette, group: "settings" },
  { label: "Config", href: "/settings", icon: Settings, group: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  const groups = {
    main: navItems.filter((item) => item.group === "main"),
    discovery: navItems.filter((item) => item.group === "discovery"),
    settings: navItems.filter((item) => item.group === "settings"),
  };

  return (
    <TooltipProvider>
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[72px] flex-col items-center bg-sidebar py-4">
        {/* Logo */}
        <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-[oklch(0.6_0.18_350)] shadow-lg shadow-primary/30">
          <span className="text-[18px] font-extrabold text-white">IT</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-1">
          {Object.entries(groups).map(([group, items], groupIndex) => (
            <div key={group} className="flex flex-col items-center gap-1">
              {groupIndex > 0 && <div className="my-2 h-px w-7 bg-sidebar-border" />}
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger
                      render={
                        <Link
                          href={item.href}
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl transition-all relative",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                          )}
                        />
                      }
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      {isActive && (
                        <div className="absolute right-[-2px] top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-l-full bg-sidebar-primary" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
