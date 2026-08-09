import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { StaffPage } from "@/components/shared/staff-page";
import { hrQ } from "@/lib/api/hooks";

export const Route = createFileRoute("/_app/hr")({
  head: () => ({ meta: [{ title: "HR — Edu CRM" }] }),
  component: HrPage,
});

function HrPage() {
  const { t } = useTranslation();
  return (
    <StaffPage
      navKey="hr"
      title={t("nav.hr", "Kadrlar (HR)")}
      description={t("pages.hr.description")}
      q={hrQ}
    />
  );
}
