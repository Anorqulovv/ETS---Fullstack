import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useGrantableUsers, useGrantRoles, type GrantableUser } from "@/lib/api/hooks";
import { ROLES, type Role } from "@/lib/roles";

export const Route = createFileRoute("/_app/permissions")({
  head: () => ({ meta: [{ title: "Permissions — Edu CRM" }] }),
  component: PermissionsPage,
});

// Granting a role someone already effectively has (their own base role, or SUPERADMIN itself)
// doesn't mean anything — the backend also filters these out, this just keeps the picker honest.
const GRANTABLE_ROLES = ROLES.filter((r) => r !== "SUPERADMIN");

function PermissionsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useGrantableUsers();
  const [editing, setEditing] = useState<GrantableUser | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const allRows = data ?? [];

  // Bu sahifa ma'lumotlarni bir martada to'liq oladi (pagination yo'q), shuning
  // uchun qidiruv/filter client-side amalga oshiriladi.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (roleFilter && r.role !== roleFilter) return false;
      if (!term) return true;
      return (
        r.fullName?.toLowerCase().includes(term) ||
        r.username?.toLowerCase().includes(term)
      );
    });
  }, [allRows, search, roleFilter]);

  const columns: Column<GrantableUser>[] = [
    {
      key: "fullName",
      header: t("common.title"),
      sortable: true,
      sortValue: (r) => r.fullName ?? "",
      cell: (r) => <span className="font-medium">{r.fullName}</span>,
    },
    { key: "username", header: t("common.username"), cell: (r) => `@${r.username}` },
    { key: "role", header: t("pages.permissions.primaryRole"), cell: (r) => <Badge variant="secondary">{r.role}</Badge> },
    {
      key: "granted",
      header: t("pages.permissions.grantedRoles"),
      cell: (r) =>
        r.grantedRoles?.length ? (
          <div className="flex flex-wrap gap-1">
            {r.grantedRoles.map((role) => (
              <Badge key={role} className="bg-primary/10 text-primary">
                {role}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
          Huquqlarni tahrirlash
        </Button>
      ),
    },
  ];

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader
          title={t("pages.permissions.title")}
          description={t("pages.permissions.subtitle")}
        />

        <FilterBar
          search={search}
          onSearch={setSearch}
          activeFilterCount={roleFilter ? 1 : 0}
          onClear={() => setRoleFilter("")}
          filters={
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("pages.permissions.primaryRole")}</Label>
              <Select value={roleFilter || undefined} onValueChange={(v) => setRoleFilter(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Bu yerda berilgan qo'shimcha huquqlar foydalanuvchining asosiy rolini (va uning
            menyusini) o'zgartirmaydi — faqat qo'shimcha bo'limlarga kirish va ular ustida amal
            bajarish imkonini beradi. O'zgarish foydalanuvchi keyingi safar tizimga kirganda yoki
            tokeni yangilanganda (taxminan 15 daqiqa ichida) kuchga kiradi.
          </p>
        </div>

        <DataTable<GrantableUser>
          columns={columns}
          rows={rows}
          total={rows.length}
          page={1}
          limit={rows.length || 1}
          loading={isLoading}
          onPageChange={() => {}}
          onLimitChange={() => {}}
        />
      </div>

      <GrantRolesDialog
        key={editing?.id ?? "none"}
        user={editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </PageMotion>
  );
}

function GrantRolesDialog({
  user,
  onOpenChange,
}: {
  user: GrantableUser | null;
  onOpenChange: (open: boolean) => void;
}) {
  const grant = useGrantRoles();
  const [selected, setSelected] = useState<Role[]>(user?.grantedRoles ?? []);

  return (
    <Dialog open={user != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{user?.fullName}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Asosiy rol: <Badge variant="secondary">{user?.role}</Badge>
        </p>
        <div className="grid gap-2">
          {GRANTABLE_ROLES.filter((r) => r !== user?.role).map((role) => (
            <label key={role} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(role)}
                onCheckedChange={(v) =>
                  setSelected((prev) => (v ? [...prev, role] : prev.filter((r) => r !== role)))
                }
              />
              {role}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={grant.isPending}
            onClick={() => {
              if (!user) return;
              grant.mutate(
                { userId: user.id, grantedRoles: selected },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
