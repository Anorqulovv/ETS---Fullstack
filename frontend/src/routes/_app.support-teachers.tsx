import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { GenderSelect } from "@/components/shared/gender-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { directionsQ, supportsQ } from "@/lib/api/hooks";
import type { User } from "@/lib/api/types";

export const Route = createFileRoute("/_app/support-teachers")({
  head: () => ({ meta: [{ title: "Support teachers — Edu CRM" }] }),
  component: SupportTeachersPage,
});

function SupportTeachersPage() {
  const { t } = useTranslation();
  const directions = directionsQ.useList({ limit: 200 }).data?.data ?? [];
  const [directionFilter, setDirectionFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // directionId backend'da (SupportService.findAll) filtrlanadi. isActive esa
  // backend tomonidan qo'llab-quvvatlanmaydi — client-side filtrlab, o'zimiz
  // sahifalaymiz.
  function useSupportListWithFilters(params: {
    page?: number;
    limit?: number;
    search?: string;
    directionId?: string;
    isActive?: string;
  }) {
    const { page = 1, limit = 10, search, directionId, isActive } = params;
    const raw = supportsQ.useList({ search, directionId, limit: 100000 });
    const filtered = useMemo(() => {
      const rows = raw.data?.data ?? [];
      return isActive ? rows.filter((s) => String(s.isActive) === isActive) : rows;
    }, [raw.data, isActive]);
    const start = (page - 1) * limit;
    const sliced = useMemo(
      () => filtered.slice(start, start + limit),
      [filtered, start, limit],
    );
    return { data: { data: sliced, total: filtered.length }, isLoading: raw.isLoading };
  }

  const columns: Column<User>[] = [
    {
      key: "name",
      header: t("common.name"),
      sortable: true,
      sortValue: (r) => r.fullName ?? "",
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
      useList={useSupportListWithFilters}
      extraListParams={{
        directionId: directionFilter || undefined,
        isActive: statusFilter || undefined,
      }}
      activeFilterCount={(directionFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
      onClearFilters={() => {
        setDirectionFilter("");
        setStatusFilter("");
      }}
      filters={
        <>
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("nav.directions")}</Label>
            <Select value={directionFilter || undefined} onValueChange={(v) => setDirectionFilter(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {directions.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("common.status")}</Label>
            <Select value={statusFilter || undefined} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("status.active")}</SelectItem>
                <SelectItem value="false">{t("status.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
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
