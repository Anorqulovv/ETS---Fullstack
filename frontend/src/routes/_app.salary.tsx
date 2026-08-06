import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useCurrency } from "@/lib/currency";
import {
  useSalaryOverview,
  useSalarySettings,
  useSetUserSalary,
  useUpdateSalarySettings,
} from "@/lib/api/hooks";
import type { SalaryInfo } from "@/lib/api/types";

export const Route = createFileRoute("/_app/salary")({
  head: () => ({ meta: [{ title: "Salary — Edu CRM" }] }),
  component: SalaryPage,
});

function SalarySettingsCard() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { data: settings } = useSalarySettings();
  const updateSettings = useUpdateSalarySettings();
  const [teacherRate, setTeacherRate] = useState("");
  const [supportRate, setSupportRate] = useState("");

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">{t("pages.salary.settingsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">{t("pages.salary.teacherRate")}</Label>
          <Input
            type="number"
            className="w-48"
            placeholder={settings ? String(settings.teacherPerLessonRate) : "50000"}
            value={teacherRate}
            onChange={(e) => setTeacherRate(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">{t("pages.salary.supportRate")}</Label>
          <Input
            type="number"
            className="w-48"
            placeholder={settings ? String(settings.supportPerLessonRate) : "30000"}
            value={supportRate}
            onChange={(e) => setSupportRate(e.target.value)}
          />
        </div>
        <Button
          disabled={updateSettings.isPending}
          onClick={() =>
            updateSettings.mutate({
              teacherPerLessonRate: teacherRate ? Number(teacherRate) : (settings?.teacherPerLessonRate ?? 50000),
              supportPerLessonRate: supportRate ? Number(supportRate) : (settings?.supportPerLessonRate ?? 30000),
            })
          }
        >
          {t("common.save")}
        </Button>
        {settings ? (
          <p className="w-full text-xs text-muted-foreground">
            {t("pages.salary.teacherRate")}: {format(settings.teacherPerLessonRate)} ·{" "}
            {t("pages.salary.supportRate")}: {format(settings.supportPerLessonRate)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RateDialog({ row, onOpenChange }: { row: SalaryInfo | null; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const setUserSalary = useSetUserSalary();
  const [mode, setMode] = useState<"FIXED" | "PER_LESSON">(row?.mode ?? "FIXED");
  const [rate, setRate] = useState(row?.perLessonRate ? String(row.perLessonRate) : "");
  const [salary, setSalary] = useState(row?.fixedSalary ? String(row.fixedSalary) : "");

  if (!row) return null;

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.fullName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("pages.salary.mode")}</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "FIXED" | "PER_LESSON")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIXED">{t("pages.salary.modeFixed")}</SelectItem>
                <SelectItem value="PER_LESSON">{t("pages.salary.modePerLesson")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "PER_LESSON" ? (
            <div className="grid gap-1.5">
              <Label>{t("pages.salary.customRate")}</Label>
              <Input
                type="number"
                placeholder={String(row.perLessonRate)}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label>{t("pages.salary.monthlySalaryFixed")}</Label>
              <Input
                type="number"
                placeholder={String(row.fixedSalary)}
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={setUserSalary.isPending}
            onClick={() =>
              setUserSalary.mutate(
                {
                  userId: row.userId,
                  salaryMode: mode,
                  ...(mode === "PER_LESSON"
                    ? { perLessonRate: rate ? Number(rate) : undefined }
                    : { salary: salary ? Number(salary) : undefined }),
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SalaryPage() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { user } = useAuth();
  const isSuperadmin = user?.role === "SUPERADMIN";
  const { data: rows, isLoading } = useSalaryOverview();
  const [editing, setEditing] = useState<SalaryInfo | null>(null);

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader title={t("pages.salary.title")} description={t("pages.salary.subtitle")} />

        {isSuperadmin ? <SalarySettingsCard /> : null}

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              {t("pages.salary.employee")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : !rows?.length ? (
              <p className="p-4 text-sm text-muted-foreground">{t("common.empty")}</p>
            ) : (
              <div className="divide-y divide-border/50">
                {rows.map((row) => (
                  <div
                    key={row.userId}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{row.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {t(`roles.${row.role}`)} · {t("pages.salary.lessonsThisMonth")}: {row.lessonsCount}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {row.mode === "PER_LESSON" ? t("pages.salary.modePerLesson") : t("pages.salary.modeFixed")}
                      </Badge>
                      <span className="font-medium tabular-nums">{format(row.payableAmount)}</span>
                      {isSuperadmin ? (
                        <Button size="sm" variant="outline" onClick={() => setEditing(row)}>
                          {t("common.edit")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RateDialog row={editing} onOpenChange={(v) => !v && setEditing(null)} />
    </PageMotion>
  );
}
