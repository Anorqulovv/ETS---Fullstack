import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, GraduationCap, Wallet, CalendarCheck, Trophy, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStudentDetail, useStudentBalance } from "@/lib/api/hooks";
import { getAvatarUrl } from "@/lib/avatar";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/_app/students/$studentId")({
  head: () => ({ meta: [{ title: "Student — Edu CRM" }] }),
  component: StudentDetailPage,
});

function StudentDetailPage() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { studentId } = Route.useParams();
  const id = Number(studentId);
  const { data: student, isLoading } = useStudentDetail(id);
  const { data: balance } = useStudentBalance(id);

  const initials =
    student?.user?.fullName
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("") ?? "—";

  const results = student?.results ?? [];
  const attendance = student?.attendance ?? [];
  const presentCount = attendance.filter((a) => a.isPresent).length;
  const absentCount = attendance.length - presentCount;

  return (
    <PageMotion>
      <div className="space-y-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/students">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("pages.students.title")}
          </Link>
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !student ? (
          <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : (
          <>
            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={getAvatarUrl(student.user)} alt={student.user?.fullName} />
                  <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="text-xl">{student.user?.fullName}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {student.user?.username ? <span>@{student.user.username}</span> : null}
                    {student.user?.phone ? <span>{student.user.phone}</span> : null}
                    {student.cardId ? <Badge variant="secondary">{student.cardId}</Badge> : null}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatMini
                icon={GraduationCap}
                label={t("pages.tests.title")}
                value={`${student.stats?.avgScore ?? 0}/100`}
                sub={`${t("pages.tests.subject")}: ${student.stats?.totalTests ?? 0}`}
              />
              <StatMini
                icon={CheckCircle2}
                label={t("common.status")}
                value={`${student.stats?.passRate ?? 0}%`}
                sub={`${student.stats?.passedTests ?? 0} / ${student.stats?.totalTests ?? 0}`}
              />
              <StatMini
                icon={CalendarCheck}
                label={t("nav.attendance")}
                value={`${presentCount}/${attendance.length}`}
                sub={absentCount ? `${absentCount} yo'q` : undefined}
              />
              <StatMini icon={Trophy} label={t("pages.gamification.points")} value={String(student.points ?? 0)} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">{t("nav.groups")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {student.group ? (
                    <>
                      <Row label={t("common.name")} value={student.group.name} />
                      <Row label={t("nav.directions")} value={student.group.direction?.name ?? "—"} />
                      <Row label={t("nav.teachers")} value={student.group.teacher?.fullName ?? "—"} />
                    </>
                  ) : (
                    <p className="text-muted-foreground">{t("common.empty")}</p>
                  )}
                  {student.parent ? (
                    <>
                      <Row label={t("nav.parents")} value={student.parent.user?.fullName ?? "—"} />
                      <Row label={t("common.phone")} value={student.parent.user?.phone ?? "—"} />
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4" />
                    {t("pages.payments.courseBilling")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {!balance?.hasCoursePricing ? (
                    <p className="text-muted-foreground">{t("pages.payments.noCoursePricing")}</p>
                  ) : (
                    <div className="space-y-1.5">
                      <Row label={t("pages.payments.monthlyPayment")} value={format(balance.discountedMonthlyAmount ?? 0)} />
                      {balance.fullyPaid || !balance.hasDebt ? (
                        <Badge className="bg-success/15 text-success">{t("pages.payments.noDebt")}</Badge>
                      ) : (
                        <Badge className="bg-destructive/15 text-destructive">
                          {t("pages.payments.debt")}: {format(balance.debtAmount ?? 0)}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">{t("pages.tests.title")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!results.length ? (
                  <p className="p-4 text-sm text-muted-foreground">{t("pages.tests.noResultsYet")}</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {results.map((r) => {
                      const passed = r.score >= (r.test?.minScore ?? 60);
                      return (
                        <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{r.test?.title ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : t("pages.tests.resultsInProgress")}
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={passed ? "bg-success/15 text-success" : "bg-warning/15 text-warning-foreground"}
                          >
                            {passed ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                            {r.score}/100
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageMotion>
  );
}

function StatMini({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold tabular-nums">{value}</div>
          {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
