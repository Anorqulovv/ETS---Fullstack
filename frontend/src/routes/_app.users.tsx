import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { GenderSelect } from "@/components/shared/gender-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usersQ } from "@/lib/api/hooks";
import type { User } from "@/lib/api/types";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Users — Edu CRM" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { t } = useTranslation();
  const columns: Column<User>[] = [
    {
      key: "name",
      header: t("common.name"),
      cell: (r) => <span className="font-medium">{r.fullName}</span>,
    },
    {
      key: "username",
      header: t("common.username"),
      cell: (r) => <span className="text-muted-foreground">@{r.username}</span>,
    },
    {
      key: "phone",
      header: t("common.phone"),
      cell: (r) => <span className="font-mono text-xs">{r.phone}</span>,
    },
    {
      key: "role",
      header: t("common.role"),
      cell: (r) => <Badge variant="secondary">{t(`roles.${r.role}`)}</Badge>,
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (r) => (
        <Badge
          variant="secondary"
          className={r.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}
        >
          {r.isActive ? t("status.active") : t("status.inactive")}
        </Badge>
      ),
    },
  ];
  return (
    <CrudPage<User>
      title={t("pages.users.title")}
      description={t("pages.users.subtitle")}
      navKey="users"
      columns={columns}
      // GET /users (no role filter) now returns every role, paginated — this used to point at
      // /admins (ADMIN accounts only) because the real /users controller was dead code (never
      // registered in AppModule). It's registered now, so this page shows everyone.
      useList={usersQ.useList}
      useCreate={usersQ.useCreate}
      useUpdate={usersQ.useUpdate}
      useRemove={usersQ.useRemove}
      createTitle={t("pages.users.createTitle")}
      validate={(row) => (!row.gender ? t("common.genderRequired") : null)}
      renderForm={(row, onChange) => (
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("common.name")}</Label>
            <Input
              value={row?.fullName ?? ""}
              onChange={(e) =>
                onChange(
                  row?.id
                    ? { fullName: e.target.value }
                    : { fullName: e.target.value, role: "ADMIN" as User["role"] },
                )
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("common.username")}</Label>
              <Input
                value={row?.username ?? ""}
                onChange={(e) => onChange({ username: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.phone")}</Label>
              <Input
                value={row?.phone ?? ""}
                onChange={(e) => onChange({ phone: e.target.value })}
              />
            </div>
          </div>

          <GenderSelect value={row?.gender} onChange={(gender) => onChange({ gender })} />

          {/* Creating from here always makes an ADMIN account — other roles (teacher, student,
              parent...) have their own dedicated pages that also create the matching domain
              record (Teacher/Student/Parent), which a bare POST /users would skip entirely. */}
          {!row?.id ? (
            <div className="grid gap-1.5">
              <Label>{t("common.password")}</Label>
              <Input
                type="password"
                value={row?.password ?? ""}
                onChange={(e) => onChange({ password: e.target.value })}
              />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label>{t("common.password")}</Label>
              <Input
                type="password"
                placeholder={t("common.passwordUnchangedHint")}
                value={row?.password ?? ""}
                onChange={(e) => onChange({ password: e.target.value })}
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>{t("common.salary")}</Label>
            <Input
              type="number"
              placeholder="5000000"
              value={row?.salary ?? ""}
              onChange={(e) => onChange({ salary: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
      )}
    />
  );
}
