"use client";

import { Search, Bell, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-card px-6">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar campanhas, influencers..."
          className="pl-9"
        />
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="relative h-8 w-8 rounded-full" />}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              IT
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">Minha Marca</p>
            <p className="text-xs text-muted-foreground">admin@marca.com</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
