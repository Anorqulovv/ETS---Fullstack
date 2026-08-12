import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { GraduationCap, UserRound, Users2, CircleDollarSign, CalendarDays, ClipboardCheck, Wallet, ListChecks, Trophy } from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDashboard, groupsQ, studentsQ, paymentsQ, useMyPayments, useChildrenPayments, useChildrenDebt, testsQ, usePaymentsSummary, useMyPoints, useLeaderboard, useMySalary, useMyBalance } from "@/lib/api/hooks";
import { useCurrency } from "@/lib/currency";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

function trendOf(pct: number | null | undefined): "up" | "down" | "flat" {
  if (pct == null) return "flat";
  if (pct > 0) return "up";
  if (pct < 0) return "down";
  return "flat";
}

function formatDelta(pct: number | null | undefined, suffix: string, t: (key: string) => string): string {
  if (pct == null) return t("common.notEnoughHistory");
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% ${suffix}`;
}

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Edu CRM" },
      { name: "description", content: "Overview of your organization." },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { user } = useAuth();
  switch (user?.role) {
    case "TEACHER":
    case "SUPPORT":
      return <TeacherDashboard />;
    case "STUDENT":
      return <StudentDashboard />;
    case "PARENT":
      return <ParentDashboard />;
    case "MANAGER":
    case "MARKETING":
    case "HR":
      return <OperationsDashboard />;
    case "SALES":
    case "FINANCE":
      return <FinanceDashboard />;
    default:
      return <StaffDashboard />;
  }
}

function StaffDashboard() {
  const { t } = useTranslation();
  const { data } = useDashboard();
  const { format } = useCurrency();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const stats = data?.stats;

  return (
    <PageMotion>
      <div className="space-y-6">
        <PageHeader title={t("dashboard.title")} description={t("dashboard.subtitle")} />

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("dashboard.stats.students")}
            value={stats?.students ?? "—"}
            delta={formatDelta(stats?.enrollmentDeltaPct, t("common.thisMonth"), t)}
            trend={trendOf(stats?.enrollmentDeltaPct)}
            icon={GraduationCap}
            index={0}
            to="/students"
          />
          <StatCard
            label={t("dashboard.stats.teachers")}
            value={stats?.teachers ?? "—"}
            delta={t("dashboard.stats.teachers")}
            trend="flat"
            icon={UserRound}
            index={1}
            to="/teachers"
          />
          <StatCard
            label={t("dashboard.stats.groups")}
            value={stats?.groups ?? "—"}
            delta={
              stats
                ? `${stats.activeGroups}/${stats.groups} faol`
                : "—"
            }
            trend="flat"
            icon={Users2}
            index={2}
            to="/groups"
          />
          <StatCard
            label={t("dashboard.stats.revenue")}
            value={stats?.revenue ? format(stats.revenue) : "—"}
            delta={formatDelta(stats?.revenueDeltaPct, t("common.thisMonth"), t)}
            trend={trendOf(stats?.revenueDeltaPct)}
            icon={CircleDollarSign}
            index={3}
            to="/payments"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title={t("dashboard.enrollment")} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.enrollment ?? []}>
                <defs>
                  <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#fillPrimary)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("dashboard.attendanceRate")}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data?.attendance ?? []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[60, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--color-chart-3)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title={t("dashboard.revenue")} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.revenue ?? []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {t("dashboard.calendar")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="pointer-events-auto rounded-md border p-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Activity + latest students + latest payments */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("dashboard.activity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-border pl-4">
                {(data?.activity ?? []).map((a, i) => (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                  >
                    <span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-primary shadow-soft" />
                    <div className="text-sm">
                      <span className="font-medium">{a.who}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.at}</div>
                  </motion.li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {t("dashboard.upcomingLessons")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(groupsQ.useList({ limit: 5 }).data?.data ?? []).map((g, i) => (
                  <motion.li
                    key={g.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex items-center justify-between rounded-md border p-2.5 transition-colors hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{g.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.studentsCount} students · {g.startDate}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {g.status}
                    </Badge>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("dashboard.latestStudents")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(studentsQ.useList({ limit: 5 }).data?.data ?? []).map((s, i) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
                        {s.fullName
                          ?.split(" ")
                          ?.map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.fullName}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.cardId}</div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("dashboard.latestPayments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LatestPaymentsTable />
            </CardContent>
          </Card>

          <LeaderboardCard />
        </div>
      </div>
    </PageMotion>
  );
}

function paymentStatusColor(status: string) {
  return status === "PAID"
    ? "bg-success/15 text-success"
    : status === "PARTIAL"
      ? "bg-warning/15 text-warning-foreground"
      : "bg-destructive/15 text-destructive";
}

/** Reused across every dashboard so gamification is visible school-wide, not just to students/teachers. */
function LeaderboardCard({ groupId, title }: { groupId?: number; title?: string }) {
  const { data: leaderboard, isLoading } = useLeaderboard(groupId);
  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <Trophy className="h-4 w-4 text-warning-foreground" />
          {title ?? "Reyting"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !leaderboard?.length ? (
          <p className="text-sm text-muted-foreground">Hozircha reyting bo'sh.</p>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.map((e) => (
              <div
                key={e.studentId}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm odd:bg-muted/40"
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 text-center font-mono text-xs text-muted-foreground">
                    {e.rank}
                  </span>
                  {e.fullName}
                </span>
                <span className="font-medium tabular-nums">{e.points}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LatestPaymentsTable() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { data, isLoading } = paymentsQ.useList({ limit: 5 });
  const rows = data?.data ?? [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{t("common.noData")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">{t("nav.students")}</th>
            <th className="pb-2 font-medium">{t("payments.amount", "Amount")}</th>
            <th className="pb-2 font-medium">{t("common.status")}</th>
            <th className="pb-2 font-medium">{t("common.date")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="py-2 font-medium">{p.studentName ?? "—"}</td>
              <td className="py-2 tabular-nums">{format(p.amount)}</td>
              <td className="py-2">
                <Badge variant="secondary" className={paymentStatusColor(p.status)}>
                  {p.status}
                </Badge>
              </td>
              <td className="py-2 text-muted-foreground">
                {p.paidAt ? new Date(p.paidAt).toLocaleDateString("uz-UZ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={"shadow-soft " + (className ?? "")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

/**
 * TEACHER/SUPPORT dashboard — scoped to their own assigned groups (the backend already filters
 * GET /groups down to "my groups" for these roles), no org-wide revenue/finance data at all.
 */
function TeacherDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { format } = useCurrency();
  const { data: groupsData, isLoading } = groupsQ.useList({ limit: 50 });
  const groups = groupsData?.data ?? [];
  const totalStudents = groups.reduce((sum, g) => sum + (g.studentsCount ?? 0), 0);
  const activeGroups = groups.filter((g) => g.status === "ACTIVE").length;
  const chartData = groups.map((g) => ({ name: g.name, students: g.studentsCount ?? 0 }));
  const { data: leaderboard } = useLeaderboard(groups[0]?.id);

  return (
    <PageMotion>
      <div className="space-y-6">
        <PageHeader title={t("nav.dashboard")} description="Sizga tayinlangan guruhlar" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("pages.dashboard.myGroups")} value={groups.length} icon={Users2} index={0} to="/groups" />
          <StatCard label={t("pages.dashboard.activeGroups")} value={activeGroups} icon={ClipboardCheck} index={1} to="/groups" />
          <StatCard label={t("pages.dashboard.totalStudents")} value={totalStudents} icon={GraduationCap} index={2} to="/students" />
          <SalaryCard salary={user?.salary} format={format} index={3} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Guruhlar bo'yicha o'quvchilar soni" className="lg:col-span-2">
            {chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="students" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("pages.dashboard.myGroups")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hozircha guruh tayinlanmagan.</p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {groups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
                      <div>
                        <div className="font-medium">{g.name}</div>
                        <div className="text-xs text-muted-foreground">{g.studentsCount ?? 0} o'quvchi</div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          g.status === "ACTIVE"
                            ? "bg-success/15 text-success"
                            : g.status === "PAUSED"
                              ? "bg-warning/15 text-warning-foreground"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {g.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {leaderboard?.length ? (
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                <Trophy className="h-4 w-4 text-warning-foreground" />
                {groups[0]?.name} — reyting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {leaderboard.map((e) => (
                  <div
                    key={e.studentId}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm odd:bg-muted/40"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-center font-mono text-xs text-muted-foreground">{e.rank}</span>
                      {e.fullName}
                    </span>
                    <span className="font-medium tabular-nums">{e.points}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageMotion>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      Hozircha ma'lumot yo'q
    </div>
  );
}

/** Reused across every staff dashboard — a role never has a salary of "0", so falsy just means "not set". */
function SalaryCard({
  salary,
  format,
  index,
}: {
  salary?: number;
  format: (n: number) => string;
  index: number;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isLessonBased = user?.role === "TEACHER" || user?.role === "SUPPORT";
  // /salary/my is TEACHER/SUPPORT-only on the backend — only fetch it for those roles, other
  // dashboards (manager, finance, ...) just show the flat salary value passed in via props.
  const { data: mySalary } = useMySalary(undefined, isLessonBased);
  const computed = isLessonBased ? mySalary : undefined;

  if (computed?.mode === "PER_LESSON") {
    return (
      <StatCard
        label={t("pages.salary.myRate")}
        value={format(computed.payableAmount)}
        icon={Wallet}
        trend="flat"
        index={index}
      />
    );
  }

  return (
    <StatCard
      label="Oylik maoshim"
      value={salary ? format(salary) : "Kiritilmagan"}
      icon={Wallet}
      trend="flat"
      index={index}
    />
  );
}
function StudentDashboard() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { data: testsData } = testsQ.useList({ limit: 20 });
  const { data: paymentsData } = useMyPayments();
  const { data: pointsData } = useMyPoints();
  const { data: leaderboard } = useLeaderboard();
  const { data: balance } = useMyBalance();
  const tests = testsData?.data ?? [];
  const payments = paymentsData ?? [];
  const paid = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0);
  // Real qarzdorlik — kurs narxi/chegirma/to'langan oylar asosida (getBalance bilan bir xil
  // mantiq), legacy PaymentStatus emas — chunki yangi to'lov endpointlari (pay-full/pay-monthly)
  // har doim PAID yozuv yaratadi, shuning uchun status bo'yicha hisoblash doim 0 ko'rsatardi.
  const unpaid = balance?.hasCoursePricing ? (balance.debtAmount ?? 0) : 0;
  const paymentChart = [
    { name: t("pages.dashboard.paidLabel"), amount: paid, fill: "var(--color-success)" },
    { name: "Qarzdorlik", amount: unpaid, fill: "var(--color-destructive)" },
  ];

  return (
    <PageMotion>
      <div className="space-y-6">
        <PageHeader title={t("nav.dashboard")} description={t("pages.dashboard.personalStats")} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label={t("pages.dashboard.activeTests")} value={tests.length} icon={ListChecks} index={0} to="/tests" />
          <StatCard
            label={t("pages.dashboard.myPoints")}
            value={pointsData?.points ?? 0}
            icon={Trophy}
            trend={pointsData?.points ? "up" : "flat"}
            index={1}
          />
          <StatCard
            label="Qarzdorlik"
            value={unpaid > 0 ? format(unpaid) : t("common.none")}
            icon={Wallet}
            trend={unpaid > 0 ? "down" : "up"}
            index={2}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title={t("pages.dashboard.paymentStatus")} className="lg:col-span-1">
            {payments.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={paymentChart} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => format(value)}
                  />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <Card className="shadow-soft lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Sizga tayinlangan testlar</CardTitle>
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("pages.dashboard.noActiveTests")}</p>
              ) : (
                <div className="max-h-52 space-y-2 overflow-y-auto">
                  {tests.map((tst) => (
                    <div key={tst.id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
                      <span className="font-medium">{tst.title}</span>
                      <Badge variant="secondary">{tst.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                <Trophy className="h-4 w-4 text-warning-foreground" />
                Reyting
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!leaderboard?.length ? (
                <p className="text-sm text-muted-foreground">Hozircha reyting bo'sh.</p>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((e) => (
                    <div
                      key={e.studentId}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm odd:bg-muted/40"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-5 text-center font-mono text-xs text-muted-foreground">
                          {e.rank}
                        </span>
                        {e.fullName}
                      </span>
                      <span className="font-medium tabular-nums">{e.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("pages.dashboard.pointsHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!pointsData?.logs?.length ? (
                <p className="text-sm text-muted-foreground">{t("pages.dashboard.noHistory")}</p>
              ) : (
                <div className="max-h-52 space-y-1.5 overflow-y-auto">
                  {pointsData.logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <span className="text-muted-foreground">{log.note}</span>
                      <Badge
                        variant="secondary"
                        className={log.amount > 0 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}
                      >
                        +{log.amount}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageMotion>
  );
}

/** PARENT dashboard — their children's payments only. No other family's data. */
function ParentDashboard() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { data: paymentsData } = useChildrenPayments();
  const { data: debtSummary } = useChildrenDebt();
  const payments = paymentsData ?? [];
  // Real qarzdorlik — getChildrenDebtSummary orqali (getBalance bilan bir xil mantiq), legacy
  // PaymentStatus emas.
  const totalUnpaid = debtSummary?.totalDebt ?? 0;

  const byChild = new Map<string, number>();
  for (const p of payments) {
    const name = p.studentName ?? p.student?.user?.fullName ?? "—";
    byChild.set(name, (byChild.get(name) ?? 0) + Number(p.amount));
  }
  const childChart = Array.from(byChild, ([name, amount]) => ({ name, amount }));

  return (
    <PageMotion>
      <div className="space-y-6">
        <PageHeader title={t("nav.dashboard")} description="Farzandingiz haqida ma'lumot" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label={t("pages.dashboard.paymentsCount")} value={payments.length} icon={CircleDollarSign} index={0} />
          <StatCard
            label="Qarzdorlik"
            value={totalUnpaid > 0 ? format(totalUnpaid) : t("common.none")}
            icon={Wallet}
            trend={totalUnpaid > 0 ? "down" : "up"}
            index={1}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {childChart.length > 1 ? (
            <ChartCard title="Farzand bo'yicha to'lovlar" className="lg:col-span-1">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={childChart} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => format(value)}
                  />
                  <Bar dataKey="amount" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : null}

          <Card className={`shadow-soft ${childChart.length > 1 ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">So'nggi to'lovlar</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("pages.dashboard.noPayments")}</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span>{p.studentName ?? p.student?.user?.fullName ?? "—"}</span>
                    <span className="tabular-nums font-medium">{format(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        <LeaderboardCard title="Reyting — farzandingiz qayerda turibdi?" />
      </div>
    </PageMotion>
  );
}

/**
 * MANAGER/MARKETING dashboard — operational overview (enrollment growth, groups/teachers/
 * students headcounts) plus their own salary. No revenue/payment breakdowns — that's Finance's
 * view (see FinanceDashboard) — and no per-student personal data beyond aggregate counts.
 */
function OperationsDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { format } = useCurrency();
  const { data } = useDashboard();
  const stats = data?.stats;

  return (
    <PageMotion>
      <div className="space-y-6">
        <PageHeader title={t("nav.dashboard")} description={t("pages.dashboard.opsSubtitle")} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("dashboard.stats.students")}
            value={stats?.students ?? "—"}
            delta={formatDelta(stats?.enrollmentDeltaPct, t("common.thisMonth"), t)}
            trend={trendOf(stats?.enrollmentDeltaPct)}
            icon={GraduationCap}
            index={0}
            to="/students"
          />
          <StatCard label={t("dashboard.stats.teachers")} value={stats?.teachers ?? "—"} icon={UserRound} trend="flat" index={1} to="/teachers" />
          <StatCard
            label={t("dashboard.stats.groups")}
            value={stats?.groups ?? "—"}
            delta={stats ? `${stats.activeGroups}/${stats.groups} faol` : "—"}
            trend="flat"
            icon={Users2}
            index={2}
            to="/groups"
          />
          <SalaryCard salary={user?.salary} format={format} index={3} />
        </div>

        <ChartCard title={t("dashboard.enrollment")}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.enrollment ?? []}>
              <defs>
                <linearGradient id="fillOps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="students" stroke="var(--color-primary)" fill="url(#fillOps)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <LeaderboardCard />
      </div>
    </PageMotion>
  );
}

/**
 * SALES/FINANCE dashboard — revenue trend + payment status breakdown + their own salary. No
 * per-student academic data (attendance/tests) — that's outside this role's concern.
 */
function FinanceDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { format } = useCurrency();
  const { data } = useDashboard();
  const { data: summary } = usePaymentsSummary();
  const stats = data?.stats;

  return (
    <PageMotion>
      <div className="space-y-6">
        <PageHeader title={t("nav.dashboard")} description="Moliyaviy ko'rsatkichlar" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("dashboard.stats.revenue")}
            value={stats?.revenue ? format(stats.revenue) : "—"}
            delta={formatDelta(stats?.revenueDeltaPct, t("common.thisMonth"), t)}
            trend={trendOf(stats?.revenueDeltaPct)}
            icon={CircleDollarSign}
            index={0}
            to="/payments"
          />
          <StatCard
            label={t("pages.dashboard.paidLabel")}
            value={summary ? summary.byStatus.PAID : "—"}
            icon={ClipboardCheck}
            trend="up"
            index={1}
            to="/payments"
          />
          <StatCard
            label={t("pages.payments.debt")}
            value={summary ? format(summary.totalDebt ?? 0) : "—"}
            icon={Wallet}
            trend={summary && (summary.totalDebt ?? 0) > 0 ? "down" : "flat"}
            delta={summary ? `${summary.studentsWithDebt ?? 0} o'quvchida` : undefined}
            index={2}
            to="/payments"
          />
          <SalaryCard salary={user?.salary} format={format} index={3} />
        </div>

        <ChartCard title={t("dashboard.revenue")}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.revenue ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => format(value)}
              />
              <Bar dataKey="revenue" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <LeaderboardCard />
      </div>
    </PageMotion>
  );
}
