import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { StaffPage } from "@/components/shared/staff-page";
import { financeQ } from "@/lib/api/hooks";

export const Route = createFileRoute("/_app/finance")({
  head: () => ({ meta: [{ title: "Finance — Edu CRM" }] }),
  component: FinancePage,
});

function FinancePage() {
  const { t } = useTranslation();
  return (
    <StaffPage
      navKey="finance"
      title={t("nav.finance", "Moliya")}
      description={t("pages.finance.description")}
      q={financeQ}
    />
  );
}
