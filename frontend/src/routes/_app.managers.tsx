import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { StaffPage } from "@/components/shared/staff-page";
import { managersQ } from "@/lib/api/hooks";

export const Route = createFileRoute("/_app/managers")({
  head: () => ({ meta: [{ title: "Managers — Edu CRM" }] }),
  component: ManagersPage,
});

function ManagersPage() {
  const { t } = useTranslation();
  return (
    <StaffPage
      navKey="managers"
      title={t("nav.managers", "Menejerlar")}
      description={t("pages.managers.description")}
      q={managersQ}
    />
  );
}
