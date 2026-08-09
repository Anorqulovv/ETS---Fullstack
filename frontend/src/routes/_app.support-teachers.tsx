import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { GenderSelect } from "@/components/shared/gender-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supportsQ } from "@/lib/api/hooks";
import type { User } from "@/lib/api/types";

export const Route = createFileRoute("/_app/support-teachers")({
  head: () => ({ meta: [{ title: "Support teachers — Edu CRM" }] }),
  component: SupportTeachersPage,
});

function SupportTeachersPage() {
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
      title={t("pages.supportTeachers.title")}
      description={t("pages.supportTeachers.subtitle")}
      navKey="supportTeachers"
      columns={columns}
      useList={supportsQ.useList}
      useCreate={supportsQ.useCreate}
      useUpdate={supportsQ.useUpdate}
      useRemove={supportsQ.useRemove}
      createTitle={t("pages.supportTeachers.createTitle")}
      validate={(row) => (!row.gender ? t("common.genderRequired") : null)}
      renderForm={(row, onChange) => (
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("common.name")}</Label>
            <Input
              value={row?.fullName ?? ""}
              onChange={(e) => onChange({ fullName: e.target.value })}
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

          <div className="grid gap-1.5">
            <Label>{t("common.password")}</Label>
            <Input
              type="password"
              placeholder={row?.id ? t("common.passwordUnchangedHint") : undefined}
              value={row?.password ?? ""}
              onChange={(e) => onChange({ password: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Kamida 8 belgi, katta-kichik harf, raqam va maxsus belgi (masalan: Ab1@cdef)
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("common.salary")}</Label>
            <Input
              type="number"
              placeholder="3000000"
              value={row?.salary ?? ""}
              onChange={(e) => onChange({ salary: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
      )}
    />
  );
}
