import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LANG_LABELS, SUPPORTED_LANGS } from "@/i18n";
import { CURRENCIES, useCurrency } from "@/lib/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Edu CRM" }] }),
  component: SettingsPage,
});

/**
 * There's no backend endpoint for per-channel notification subscriptions (see
 * NotificationsController — only broadcast/list/read-all exist), so this is a genuine
 * client-side-only preference. Persisted to localStorage so it's at least real and durable,
 * instead of an uncontrolled `defaultChecked` switch that silently did nothing.
 */
const NOTIF_STORAGE_KEY = "edu-crm-notif-prefs";
type NotifPrefs = Record<"email" | "sms" | "system" | "payments", boolean>;
const DEFAULT_NOTIF_PREFS: NotifPrefs = { email: true, sms: true, system: true, payments: true };

function readNotifPrefs(): NotifPrefs {
  try {
    const raw = window.localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIF_PREFS;
    return { ...DEFAULT_NOTIF_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    return DEFAULT_NOTIF_PREFS;
  }
}

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { currency, setCurrency } = useCurrency();
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(readNotifPrefs);

  function toggleNotif(key: keyof NotifPrefs, value: boolean) {
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    try {
      window.localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }

  const notifRows: { k: keyof NotifPrefs; label: string }[] = [
    { k: "email", label: t("pages.settings.notifEmail") },
    { k: "sms", label: t("pages.settings.notifSms") },
    { k: "system", label: t("pages.settings.notifSystem") },
    { k: "payments", label: t("pages.settings.notifPayments") },
  ];

  return (
    <PageMotion>
      <div className="space-y-6">
        <PageHeader title={t("pages.settings.title")} description={t("pages.settings.subtitle")} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="shadow-soft lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("pages.settings.workspaceTitle")}</CardTitle>
              <CardDescription>{t("pages.settings.workspaceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label>{t("common.language")}</Label>
                <Select
                  value={i18n.resolvedLanguage}
                  onValueChange={(v) => {
                    void i18n.changeLanguage(v);
                    toast.success(t("toast.languageChanged"));
                  }}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {LANG_LABELS[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("pages.settings.currency")}</Label>
                <Select
                  value={currency}
                  onValueChange={(v) => {
                    setCurrency(v as (typeof CURRENCIES)[number]);
                    toast.success(t("toast.updated"));
                  }}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">{t("pages.settings.notificationsTitle")}</CardTitle>
              <CardDescription>{t("pages.settings.notificationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifRows.map((row) => (
                <div key={row.k} className="flex items-center justify-between">
                  <Label className="text-sm font-normal">{row.label}</Label>
                  <Switch
                    checked={notifPrefs[row.k]}
                    onCheckedChange={(checked) => toggleNotif(row.k, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageMotion>
  );
}
