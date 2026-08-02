import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { branchesQ } from "@/lib/api/hooks";
import type { Branch } from "@/lib/api/types";

export const Route = createFileRoute("/_app/branches")({
  head: () => ({ meta: [{ title: "Branches — Edu CRM" }] }),
  component: BranchesPage,
});

function BranchesPage() {
  const { t } = useTranslation();
  const columns: Column<Branch>[] = [
    {
      key: "name",
      header: t("common.name"),
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "address", header: "Address", cell: (r) => r.address ?? "—" },
    {
      key: "phone",
      header: t("common.phone"),
      cell: (r) => <span className="font-mono text-xs">{r.phone ?? "—"}</span>,
    },
  ];
  return (
    <CrudPage<Branch>
      title={t("pages.branches.title")}
      description={t("pages.branches.subtitle")}
      navKey="branches"
      columns={columns}
      useList={branchesQ.useList}
      useCreate={branchesQ.useCreate}
      useUpdate={branchesQ.useUpdate}
      useRemove={branchesQ.useRemove}
      createTitle={t("pages.branches.createTitle")}
      renderForm={(row, onChange) => (
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("common.name")}</Label>
            <Input value={row?.name ?? ""} onChange={(e) => onChange({ name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("common.address")}</Label>
            <Input
              value={row?.address ?? ""}
              onChange={(e) => onChange({ address: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("common.phone")}</Label>
            <Input value={row?.phone ?? ""} onChange={(e) => onChange({ phone: e.target.value })} />
          </div>
        </div>
      )}
    />
  );
}
