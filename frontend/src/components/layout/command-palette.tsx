import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCurrentRole } from "@/lib/auth-context";
import { ROLE_NAV } from "@/lib/roles";
import { mockGroups, mockStudents, mockTeachers } from "@/lib/api/mock-data";

const NAV_LINKS = [
  { key: "dashboard", to: "/dashboard" },
  { key: "directions", to: "/directions" },
  { key: "branches", to: "/branches" },
  { key: "groups", to: "/groups" },
  { key: "teachers", to: "/teachers" },
  { key: "students", to: "/students" },
  { key: "supportTeachers", to: "/support-teachers" },
  { key: "parents", to: "/parents" },
  { key: "attendance", to: "/attendance" },
  { key: "tests", to: "/tests" },
  { key: "payments", to: "/payments" },
  { key: "notifications", to: "/notifications" },
  { key: "users", to: "/users" },
  { key: "settings", to: "/settings" },
  { key: "profile", to: "/profile" },
] as const;

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useCurrentRole();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navItems = useMemo(() => {
    const allowed = new Set(ROLE_NAV[role]);
    return NAV_LINKS.filter((n) => allowed.has(n.key));
  }, [role]);

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  return (
    <>
      {/* Hidden hint element */}
      <Command style={{ display: "none" }} />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("common.quickJump") + "…"} />
        <CommandList className="scrollbar-thin">
          <CommandEmpty>{t("common.noResults")}</CommandEmpty>
          <CommandGroup heading={t("nav.management")}>
            {navItems.map((n) => (
              <CommandItem key={n.to} value={t(`nav.${n.key}`)} onSelect={() => go(n.to)}>
                {t(`nav.${n.key}`)}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("nav.students")}>
            {mockStudents.slice(0, 6).map((s) => (
              <CommandItem key={s.id} value={s.fullName} onSelect={() => go("/students")}>
                {s.fullName}
                <span className="ml-auto text-xs text-muted-foreground">{s.cardId}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t("nav.teachers")}>
            {mockTeachers.slice(0, 6).map((s) => (
              <CommandItem key={s.id} value={s.fullName} onSelect={() => go("/teachers")}>
                {s.fullName}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t("nav.groups")}>
            {mockGroups.slice(0, 6).map((g) => (
              <CommandItem key={g.id} value={g.name} onSelect={() => go("/groups")}>
                {g.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
