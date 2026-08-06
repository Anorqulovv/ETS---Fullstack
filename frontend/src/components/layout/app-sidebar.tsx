import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  Compass,
  Users2,
  UserRound,
  GraduationCap,
  HeartHandshake,
  UsersRound,
  CalendarCheck,
  FileText,
  CreditCard,
  Bell,
  Settings,
  User,
  Briefcase,
  Megaphone,
  Handshake,
  Landmark,
  ShieldCheck,
  Trophy,
  Activity,
  Wallet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { useAuth, useCurrentRole } from "@/lib/auth-context";
import { effectiveNavKeys, type NavKey } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface NavItem {
  key: NavKey;
  to: string;
  icon: typeof BarChart3;
  group: "main" | "people" | "operations" | "system";
}

const ALL_ITEMS: NavItem[] = [
  { key: "dashboard", to: "/dashboard", icon: BarChart3, group: "main" },
  { key: "directions", to: "/directions", icon: Compass, group: "main" },
  { key: "branches", to: "/branches", icon: Building2, group: "main" },
  { key: "groups", to: "/groups", icon: Users2, group: "main" },
  { key: "teachers", to: "/teachers", icon: UserRound, group: "people" },
  { key: "students", to: "/students", icon: GraduationCap, group: "people" },
  { key: "supportTeachers", to: "/support-teachers", icon: HeartHandshake, group: "people" },
  { key: "parents", to: "/parents", icon: UsersRound, group: "people" },
  { key: "attendance", to: "/attendance", icon: CalendarCheck, group: "operations" },
  { key: "tests", to: "/tests", icon: FileText, group: "operations" },
  { key: "payments", to: "/payments", icon: CreditCard, group: "operations" },
  { key: "notifications", to: "/notifications", icon: Bell, group: "operations" },
  { key: "gamification", to: "/gamification", icon: Trophy, group: "operations" },
  { key: "salary", to: "/salary", icon: Wallet, group: "operations" },
  { key: "users", to: "/users", icon: Users2, group: "system" },
  { key: "managers", to: "/managers", icon: Briefcase, group: "people" },
  { key: "marketing", to: "/marketing", icon: Megaphone, group: "people" },
  { key: "sales", to: "/sales", icon: Handshake, group: "people" },
  { key: "finance", to: "/finance", icon: Landmark, group: "people" },
  { key: "permissions", to: "/permissions", icon: ShieldCheck, group: "system" },
  { key: "activity", to: "/activity", icon: Activity, group: "system" },
  { key: "settings", to: "/settings", icon: Settings, group: "system" },
  { key: "profile", to: "/profile", icon: User, group: "system" },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const role = useCurrentRole();
  const { user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = useMemo(() => {
    const allowed = new Set(effectiveNavKeys(role, user?.grantedRoles ?? []));
    return ALL_ITEMS.filter((i) => allowed.has(i.key));
  }, [role, user?.grantedRoles]);

  const grouped = useMemo(() => {
    const g: Record<NavItem["group"], NavItem[]> = {
      main: [],
      people: [],
      operations: [],
      system: [],
    };
    items.forEach((i) => g[i.group].push(i));
    return g;
  }, [items]);

  const initials =
    user?.fullName
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("") ?? "EC";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2 px-2 py-2"
        >
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white shadow-soft">
            <img src="/branding/ets-logo.png" alt="" className="h-full w-full object-contain p-1" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight">{t("app.name")}</div>
              <div className="truncate text-[11px] text-muted-foreground">{t("app.tagline")}</div>
            </div>
          ) : null}
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {(Object.entries(grouped) as [NavItem["group"], NavItem[]][]).map(([group, list]) =>
          list.length === 0 ? null : (
            <SidebarGroup key={group}>
              {!collapsed ? (
                <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t(
                    group === "main"
                      ? "nav.management"
                      : group === "people"
                        ? "nav.people"
                        : group === "operations"
                          ? "nav.operations"
                          : "nav.system",
                  )}
                </SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {list.map((item) => {
                    const active = pathname === item.to;
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton asChild isActive={active} tooltip={t(`nav.${item.key}`)}>
                          <Link
                            to={item.to}
                            className={cn(
                              "group relative flex items-center gap-2 rounded-md transition-colors",
                              active
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                            )}
                          >
                            {active ? (
                              <motion.span
                                layoutId="sidebar-active-indicator"
                                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-sidebar-primary"
                                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                              />
                            ) : null}
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate text-sm">{t(`nav.${item.key}`)}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <div className="flex items-center gap-2 rounded-md p-2 hover:bg-sidebar-accent">
          <Avatar className="h-8 w-8">
            <AvatarImage src={getAvatarUrl(user)} alt={user?.fullName} />
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.fullName ?? "—"}</div>
              <div className="truncate text-[11px] text-muted-foreground">{t(`roles.${role}`)}</div>
            </div>
          ) : null}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
