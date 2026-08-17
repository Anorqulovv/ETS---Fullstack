import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { GenderSelect } from "@/components/shared/gender-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parentsQ } from "@/lib/api/hooks";
import type { Parent } from "@/lib/api/types";

export const Route = createFileRoute("/_app/parents")({
  head: () => ({ meta: [{ title: "Parents — Edu CRM" }] }),
  component: ParentsPage,
});

function ParentsPage() {
  const { t } = useTranslation();
  const [hasChildrenFilter, setHasChildrenFilter] = useState<string>("");

  // Backend GET /parents hech qanday filtr/pagination query parametrini qabul
  // qilmaydi — client-side filtrlab, o'zimiz sahifalaymiz.
  function useParentListWithFilters(params: {
    page?: number;
    limit?: number;
    search?: string;
    hasChildren?: string;
  }) {
    const { page = 1, limit = 10, search, hasChildren } = params;
    const raw = parentsQ.useList({ search, limit: 100000 });
    const filtered = useMemo(() => {
      const rows = raw.data?.data ?? [];
      if (!hasChildren) return rows;
      return rows.filter((p) =>
        hasChildren === "yes" ? (p.childrenCount ?? 0) > 0 : (p.childrenCount ?? 0) === 0,
      );
    }, [raw.data, hasChildren]);
    const start = (page - 1) * limit;
    const sliced = useMemo(
      () => filtered.slice(start, start + limit),
      [filtered, start, limit],
    );
    return { data: { data: sliced, total: filtered.length }, isLoading: raw.isLoading };
  }

  const columns: Column<Parent>[] = [
    {
      key: "name",
      header: t("common.name"),
      sortable: true,
      sortValue: (r) => r.fullName ?? "",
      cell: (r) => <span className="font-medium">{r.fullName}</span>,
    },
    {
      key: "phone",
      header: t("common.phone"),
      cell: (r) => <span className="font-mono text-xs">{r.phone}</span>,
    },
    {
      key: "children",
      header: "Children",
      sortable: true,
      sortValue: (r) => r.childrenCount ?? 0,
      cell: (r) => <span className="tabular-nums">{r.childrenCount ?? 0}</span>,
    },
  ];
  return (
    <CrudPage<Parent>
      title={t("pages.parents.title")}
      description={t("pages.parents.subtitle")}
      navKey="parents"
      columns={columns}
      useList={useParentListWithFilters}
      extraListParams={{ hasChildren: hasChildrenFilter || undefined }}
      activeFilterCount={hasChildrenFilter ? 1 : 0}
      onClearFilters={() => setHasChildrenFilter("")}
      filters={
        <div className="grid gap-1.5">
          <Label className="text-xs">Farzandi</Label>
          <Select
            value={hasChildrenFilter || undefined}
            onValueChange={(v) => setHasChildrenFilter(v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t("common.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Bor</SelectItem>
              <SelectItem value="no">Yo'q</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      useCreate={parentsQ.useCreate}
      useUpdate={parentsQ.useUpdate}
      useRemove={parentsQ.useRemove}
      createTitle={t("pages.parents.createTitle")}
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
            <Label>{t("common.telegramId")}</Label>
            <Input
              value={row?.telegramId ?? ""}
              onChange={(e) => onChange({ telegramId: e.target.value })}
              placeholder="123456789"
            />
            <p className="text-[11px] text-muted-foreground">
              Bo'sh qoldirsangiz ham bo'ladi — ota-ona botga birinchi marta yozganda bu
              avtomatik to'ldiriladi. Bu yerga qo'lda ham kiritish mumkin.
            </p>
          </div>
        </div>
      )}
    />
  );
}
