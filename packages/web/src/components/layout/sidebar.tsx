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
  CalendarDays,
  Funnel,
  Search,
  BarChart3,
  Palette,
  Settings,
  Menu,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, group: "main" },
  { label: "Campanhas", href: "/campaigns", icon: Megaphone, group: "main" },
  { label: "Influencers", href: "/influencers", icon: Users, group: "main" },
  { label: "Prospeccao", href: "/prospects", icon: Funnel, group: "main" },
  { label: "Produtos", href: "/products", icon: Package, group: "main" },
  { label: "Pedidos", href: "/orders", icon: ShoppingBag, group: "main" },
  { label: "Performance", href: "/performance", icon: Trophy, group: "main" },
  { label: "Calendario", href: "/calendar", icon: CalendarDays, group: "main" },
  { label: "Mineracao", href: "/mining", icon: Search, group: "discovery" },
  { label: "Analise", href: "/analysis", icon: BarChart3, group: "discovery" },
  { label: "Branding", href: "/branding", icon: Palette, group: "settings" },
  { label: "Config", href: "/settings", icon: Settings, group: "settings" },
];

function MobileNavItems({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();

  const groups = {
    main: navItems.filter((item) => item.group === "main"),
    discovery: navItems.filter((item) => item.group === "discovery"),
    settings: navItems.filter((item) => item.group === "settings"),
  };

  return (
    <>
      {Object.entries(groups).map(([group, items], groupIndex) => (
        <div key={group} className="flex flex-col gap-1">
          {groupIndex > 0 && <div className="my-2 h-px bg-sidebar-border" />}
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const groups = {
    main: navItems.filter((item) => item.group === "main"),
    discovery: navItems.filter((item) => item.group === "discovery"),
    settings: navItems.filter((item) => item.group === "settings"),
  };

  return (
    <TooltipProvider>
      <aside
        className="fixed inset-y-0 left-0 z-50 hidden lg:flex w-[72px] flex-col items-center bg-sidebar py-4"
        aria-label="Navegacao principal"
      >
        {/* Logo */}
        <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-[oklch(0.6_0.18_350)] shadow-lg shadow-primary/30">
          <span className="text-[18px] font-extrabold text-white">IT</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-1" aria-label="Menu principal">
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
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors relative",
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

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" aria-label="Abrir menu" />
        }
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] bg-sidebar p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.6_0.18_350)] shadow-lg shadow-primary/30">
              <span className="text-sm font-extrabold text-white">IT</span>
            </div>
            <SheetTitle className="text-sidebar-foreground">InfluTrack</SheetTitle>
          </div>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 py-2" aria-label="Menu principal">
          <MobileNavItems onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
