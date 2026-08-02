import { useTranslation } from "react-i18next";
import { LogOut, Search } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { CurrencySwitcher } from "./currency-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";

interface TopNavProps {
  onOpenPalette: () => void;
}

export function TopNav({ onOpenPalette }: TopNavProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const initials =
    user?.fullName
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("") || "EC";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="h-8 w-8" />
      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button
        variant="outline"
        size="sm"
        onClick={onOpenPalette}
        className="hidden h-8 min-w-[240px] justify-start gap-2 px-2.5 text-muted-foreground shadow-none sm:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-sm">{t("common.quickJump")}</span>
        <kbd className="ml-auto rounded border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 sm:hidden"
        onClick={onOpenPalette}
        aria-label={t("common.commandPalette")}
      >
        <Search className="h-4 w-4" />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <CurrencySwitcher />
        <LanguageSwitcher />
        <Separator orientation="vertical" className="mx-1 h-5" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarImage src={getAvatarUrl(user)} alt={user?.fullName} />
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">{user?.fullName ?? ""}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="text-sm font-medium">{user?.fullName}</span>
              <span className="text-xs text-muted-foreground">{user?.phone}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">{t("nav.profile")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">{t("nav.settings")}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
