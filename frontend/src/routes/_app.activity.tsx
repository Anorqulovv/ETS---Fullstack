import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useActivityLogs } from "@/lib/api/hooks";

export const Route = createFileRoute("/_app/activity")({
  head: () => ({ meta: [{ title: "Activity — Edu CRM" }] }),
  component: ActivityPage,
});

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daq oldin`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.round(hours / 24)} kun oldin`;
}

function ActivityPage() {
  const { t } = useTranslation();
  // SUPERADMIN sees the last 8 entries embedded in the dashboard widget — this page is the
  // full log, so it asks for a much larger page of the same GET /activity/logs endpoint.
  const { data, isLoading } = useActivityLogs(100);
  const items = data ?? [];

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader title={t("pages.activity.title")} description={t("pages.activity.subtitle")} />

        <Card className="shadow-soft">
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">{t("common.empty")}</p>
            ) : (
              <div className="divide-y divide-border/50">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {item.user?.fullName ? (
                          <span className="font-medium">{item.user.fullName} — </span>
                        ) : null}
                        {item.action}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageMotion>
  );
}
