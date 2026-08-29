import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Users2,
  GraduationCap,
  CalendarCheck,
  Wallet,
  Trophy,
  Baby,
  Activity,
  type LucideIcon,
} from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/lib/api/hooks";
import { getAvatarUrl } from "@/lib/avatar";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/_app/users/$userId")({
  head: () => ({ meta: [{ title: "Foydalanuvchi profili — Edu CRM" }] }),
  component: UserProfilePage,
});

function UserProfilePage() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { userId } = Route.useParams();
  const id = Number(userId);
  const { data, isLoading } = useUserProfile(id);

  const user = data?.user;
  const roleData = data?.roleData ?? {};
  const recentActivity = data?.recentActivity ?? [];

  const initials =
    user?.fullName
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("") ?? "—";

  return (
    <PageMotion>
      <div className="space-y-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/users">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("pages.users.title")}
          </Link>
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !user ? (
          <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : (
          <>
            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={getAvatarUrl(user)} alt={user.fullName} />
                  <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">{user.fullName}</CardTitle>
                    <Badge variant="secondary">{t(`roles.${user.role}`)}</Badge>
                    <Badge
                      variant="secondary"
                      className={user.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}
                    >
                      {user.isActive ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {user.username ? <span>@{user.username}</span> : null}
                    {user.phone ? <span>{user.phone}</span> : null}
                    {user.branch?.name ? <span>{user.branch.name}</span> : null}
                    {user.direction?.name ? <span>{user.direction.name}</span> : null}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* ── Rolga qarab statistika kartochkalari ── */}
            {user.role === "TEACHER" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatMini icon={Users2} label={t("nav.groups")} value={String(roleData.groupsCount ?? 0)} />
                <StatMini
                  icon={GraduationCap}
                  label={t("pages.students.title")}
                  value={String(roleData.studentsCount ?? 0)}
                />
              </div>
            ) : null}

            {user.role === "STUDENT" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatMini
                  icon={GraduationCap}
                  label={t("pages.tests.title")}
                  value={`${roleData.testStats?.avgScore ?? 0}/100`}
                  sub={`${t("pages.tests.subject")}: ${roleData.testStats?.totalTests ?? 0}`}
                />
                <StatMini
                  icon={CalendarCheck}
                  label={t("nav.attendance")}
                  value={`${roleData.attendanceStats?.attendanceRate ?? 0}%`}
                  sub={`${roleData.attendanceStats?.presentCount ?? 0}/${roleData.attendanceStats?.totalDays ?? 0}`}
                />
                <StatMini
                  icon={Wallet}
                  label={t("pages.payments.title")}
                  value={format(roleData.paymentStats?.totalPaid ?? 0)}
                />
                <StatMini icon={Trophy} label={t("pages.gamification.points")} value={String(roleData.points ?? 0)} />
              </div>
            ) : null}

            {user.role === "PARENT" ? (
              <StatMini icon={Baby} label={t("nav.students")} value={String(roleData.children?.length ?? 0)} />
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* TEACHER — guruhlar ro'yxati */}
              {user.role === "TEACHER" && roleData.groups?.length ? (
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-base">{t("nav.groups")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {roleData.groups.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-2">
                        <span>{g.name}</span>
                        <span className="text-muted-foreground">{g.studentsCount} {t("pages.students.title").toLowerCase()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {/* STUDENT — guruh va ota-ona */}
              {user.role === "STUDENT" ? (
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-base">{t("nav.groups")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {roleData.group ? (
                      <>
                        <Row label={t("common.name")} value={roleData.group.name} />
                        <Row label={t("nav.directions")} value={roleData.group.direction ?? "—"} />
                      </>
                    ) : (
                      <p className="text-muted-foreground">{t("common.empty")}</p>
                    )}
                    {roleData.parent ? (
                      <>
                        <Row label={t("nav.parents")} value={roleData.parent.fullName ?? "—"} />
                        <Row label={t("common.phone")} value={roleData.parent.phone ?? "—"} />
                      </>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              {/* PARENT — farzandlar */}
              {user.role === "PARENT" && roleData.children?.length ? (
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-base">{t("nav.students")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {roleData.children.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2">
                        <span>{c.fullName ?? "—"}</span>
                        <span className="text-muted-foreground">{c.group ?? "—"}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {/* So'nggi harakatlar — barcha rollar uchun */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4" />
                    {t("nav.activity")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {!recentActivity.length ? (
                    <p className="p-4 text-sm text-muted-foreground">{t("common.empty")}</p>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {recentActivity.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{a.action ?? a.path}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(a.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {a.method}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
