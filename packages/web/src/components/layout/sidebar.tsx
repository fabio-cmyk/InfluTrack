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
  ChevronLeft,
  Target,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    group: "main",
  },
  {
    label: "Campanhas",
    href: "/campaigns",
    icon: Megaphone,
    group: "main",
  },
  {
    label: "Influencers",
    href: "/influencers",
    icon: Users,
    group: "main",
  },
  {
    label: "Produtos",
    href: "/products",
    icon: Package,
    group: "main",
  },
  {
    label: "Pedidos",
    href: "/orders",
    icon: ShoppingBag,
    group: "main",
  },
  {
    label: "Mineração",
    href: "/mining",
    icon: Search,
    group: "discovery",
  },
  {
    label: "Análise",
    href: "/analysis",
    icon: BarChart3,
    group: "discovery",
  },
  {
    label: "Branding",
    href: "/branding",
    icon: Palette,
    group: "settings",
  },
  {
    label: "Configurações",
    href: "/settings",
    icon: Settings,
    group: "settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const groups = {
    main: navItems.filter((item) => item.group === "main"),
    discovery: navItems.filter((item) => item.group === "discovery"),
    settings: navItems.filter((item) => item.group === "settings"),
  };

  return (
    <TooltipProvider>
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Target className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight">
            InfluTrack
          </span>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {Object.entries(groups).map(([group, items], groupIndex) => (
          <div key={group}>
            {groupIndex > 0 && <Separator className="my-3" />}
            <ul className="space-y-1">
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <li key={item.href}>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            />
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                }

                return <li key={item.href}>{linkContent}</li>;
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span className="ml-2">Recolher</span>}
        </Button>
      </div>
    </aside>
    </TooltipProvider>
  );
}
