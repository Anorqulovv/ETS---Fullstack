import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { StaffPage } from "@/components/shared/staff-page";
import { salesQ } from "@/lib/api/hooks";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({ meta: [{ title: "Sales — Edu CRM" }] }),
  component: SalesPage,
});

function SalesPage() {
  const { t } = useTranslation();
  return (
    <StaffPage
      navKey="sales"
      title={t("nav.sales", "Sotuv operatorlari")}
      description={t("pages.sales.description")}
      q={salesQ}
    />
  );
}
