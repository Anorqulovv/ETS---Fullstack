import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { StaffPage } from "@/components/shared/staff-page";
import { marketingQ } from "@/lib/api/hooks";

export const Route = createFileRoute("/_app/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Edu CRM" }] }),
  component: MarketingPage,
});

function MarketingPage() {
  const { t } = useTranslation();
  return (
    <StaffPage
      navKey="marketing"
      title={t("nav.marketing", "Marketing")}
      description={t("pages.marketing.description")}
      q={marketingQ}
    />
  );
}
