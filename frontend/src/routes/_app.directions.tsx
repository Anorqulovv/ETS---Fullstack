import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { directionsQ } from "@/lib/api/hooks";
import type { Direction } from "@/lib/api/types";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/_app/directions")({
  head: () => ({ meta: [{ title: "Directions — Edu CRM" }] }),
  component: DirectionsPage,
});

function DirectionsPage() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const columns: Column<Direction>[] = [
    {
      key: "name",
      header: t("common.title"),
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "price",
      header: "Kurs narxi",
      cell: (r) =>
        r.price ? (
          <div className="text-sm">
            <div>{format(r.price)}</div>
            {r.durationMonths ? (
              <div className="text-xs text-muted-foreground">
                {r.durationMonths} oy · {format(Math.round(r.price / r.durationMonths))}/oy
              </div>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "desc",
      header: "Description",
      cell: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span>,
    },
  ];
  return (
    <CrudPage<Direction>
      title={t("pages.directions.title")}
      description={t("pages.directions.subtitle")}
      navKey="directions"
      columns={columns}
      useList={directionsQ.useList}
      useCreate={directionsQ.useCreate}
      useUpdate={directionsQ.useUpdate}
      useRemove={directionsQ.useRemove}
      createTitle={t("pages.directions.createTitle")}
      renderForm={(row, onChange) => (
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("common.title")}</Label>
            <Input value={row?.name ?? ""} onChange={(e) => onChange({ name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea
              value={row?.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Kurs narxi (so'm)</Label>
              <Input
                type="number"
                placeholder="10000000"
                value={row?.price ?? ""}
                onChange={(e) => onChange({ price: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("pages.directions.durationMonths")}</Label>
              <Input
                type="number"
                placeholder="5"
                value={row?.durationMonths ?? ""}
                onChange={(e) =>
                  onChange({ durationMonths: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
          </div>
          {row?.price && row?.durationMonths ? (
            <p className="text-xs text-muted-foreground">
              Oylik to'lov: {format(Math.round(Number(row.price) / Number(row.durationMonths)))}
            </p>
          ) : null}
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label className="text-sm font-normal">{t("common.status")}</Label>
            <Switch
              checked={row?.isActive ?? true}
              onCheckedChange={(checked) => onChange({ isActive: checked })}
            />
          </div>
        </div>
      )}
    />
  );
}
