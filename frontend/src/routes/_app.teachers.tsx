import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { GenderSelect } from "@/components/shared/gender-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { directionsQ, teachersQ } from "@/lib/api/hooks";
import type { Direction, Teacher } from "@/lib/api/types";
import { mockDirections } from "@/lib/api/mock-data";

export const Route = createFileRoute("/_app/teachers")({
  head: () => ({ meta: [{ title: "Teachers — Edu CRM" }] }),
  component: TeachersPage,
});

function teacherDirectionIds(t: Partial<Teacher> | null): number[] {
  if (t?.directionIds?.length) return t.directionIds;
  return t?.directionId ? [t.directionId] : [];
}

function DirectionsMultiSelect({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  const { t } = useTranslation();
  const directions = directionsQ.useList({ limit: 200 }).data?.data ?? mockDirections;

  function toggle(d: Direction, checked: boolean) {
    if (checked) {
      onChange([...selected, d.id]);
    } else {
      onChange(selected.filter((id) => id !== d.id));
    }
  }

  return (
    <div className="grid gap-1.5">
      <Label>{t("nav.directions")}</Label>
      <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
        {directions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
        ) : (
          directions.map((d) => {
            const isSelected = selected.includes(d.id);
            return (
              <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={isSelected} onCheckedChange={(checked) => toggle(d, checked === true)} />
                {d.name}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function TeachersPage() {
  const { t } = useTranslation();
  const directions = directionsQ.useList({ limit: 200 }).data?.data ?? mockDirections;
  const [directionFilter, setDirectionFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // directionId backend'da (findAll query.directionId) filtrlanadi — samaraliroq.
  // isActive esa backend tomonidan qo'llab-quvvatlanmaydi, shuning uchun olingan
  // ro'yxatni client-side filtrlab, o'zimiz sahifalaymiz.
  function useTeacherListWithFilters(params: {
    page?: number;
    limit?: number;
    search?: string;
    directionId?: string;
    isActive?: string;
  }) {
    const { page = 1, limit = 10, search, directionId, isActive } = params;
    const raw = teachersQ.useList({ search, directionId, limit: 100000 });
    const filtered = useMemo(() => {
      const rows = raw.data?.data ?? [];
      return isActive ? rows.filter((tc) => String(tc.isActive) === isActive) : rows;
    }, [raw.data, isActive]);
    const start = (page - 1) * limit;
    const sliced = useMemo(
      () => filtered.slice(start, start + limit),
      [filtered, start, limit],
    );
    return { data: { data: sliced, total: filtered.length }, isLoading: raw.isLoading };
  }

  const columns: Column<Teacher>[] = [
    {
      key: "name",
      header: t("common.name"),
      sortable: true,
      sortValue: (r) => r.fullName ?? "",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
              {r.fullName
                ?.split(" ")
                ?.map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{r.fullName}</div>
            <div className="truncate text-xs text-muted-foreground">@{r.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: "direction",
      header: t("nav.directions"),
      cell: (r) => {
        const ids = teacherDirectionIds(r);
        const names = directions.filter((d) => ids.includes(d.id)).map((d) => d.name);
        if (!names.length) return "—";
        return (
          <div className="flex flex-wrap gap-1">
            {names.map((n) => (
              <Badge key={n} variant="secondary">
                {n}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: "phone",
      header: t("common.phone"),
      cell: (r) => <span className="font-mono text-xs">{r.phone}</span>,
    },
    {
      key: "groups",
      header: t("nav.groups"),
      sortable: true,
      sortValue: (r) => r.groupsCount ?? 0,
      cell: (r) => <span className="tabular-nums">{r.groupsCount ?? 0}</span>,
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
    <CrudPage<Teacher>
      title={t("pages.teachers.title")}
      description={t("pages.teachers.subtitle")}
      navKey="teachers"
      columns={columns}
      useList={useTeacherListWithFilters}
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
      useCreate={teachersQ.useCreate}
      useUpdate={teachersQ.useUpdate}
      useRemove={teachersQ.useRemove}
      createTitle={t("pages.teachers.createTitle")}
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

          <DirectionsMultiSelect
            selected={teacherDirectionIds(row)}
            onChange={(next) =>
              onChange({ directionIds: next, directionId: next[0] })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            {!row?.id ? (
              <div className="grid gap-1.5">
                <Label>{t("common.password")}</Label>
                <Input
                  type="password"
                  value={row?.password ?? ""}
                  onChange={(e) => onChange({ password: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Kamida 8 belgi, katta-kichik harf, raqam va maxsus belgi (masalan: Ab1@cdef)
                </p>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label>{t("common.salary")}</Label>
              <Input
                type="number"
                placeholder="4000000"
                value={row?.salary ?? ""}
                onChange={(e) => onChange({ salary: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
        </div>
      )}
    />
  );
}
