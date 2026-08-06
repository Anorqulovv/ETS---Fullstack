import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { GenderSelect } from "@/components/shared/gender-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { groupsQ, parentsQ, studentsQ, useCreateStudent } from "@/lib/api/hooks";
import type { Student } from "@/lib/api/types";
import { mockGroups } from "@/lib/api/mock-data";

export const Route = createFileRoute("/_app/students")({
  head: () => ({ meta: [{ title: "Students — Edu CRM" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const { t } = useTranslation();
  const groups = groupsQ.useList({ limit: 200 }).data?.data ?? mockGroups;
  const columns: Column<Student>[] = [
    {
      key: "name",
      header: t("common.name"),
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
              {r.fullName
                ?.split(" ")
                ?.map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link
              to="/students/$studentId"
              params={{ studentId: String(r.id) }}
              className="truncate font-medium hover:underline"
            >
              {r.fullName}
            </Link>
            <div className="truncate text-xs text-muted-foreground">{r.cardId}</div>
          </div>
        </div>
      ),
    },
    {
      key: "group",
      header: t("nav.groups"),
      cell: (r) => groups.find((g) => g.id === r.groupId)?.name ?? "—",
    },
    {
      key: "parent",
      header: t("nav.parents"),
      cell: (r) => r.parentName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "phone",
      header: t("common.phone"),
      cell: (r) => <span className="font-mono text-xs">{r.phone ?? "—"}</span>,
    },
    {
      key: "username",
      header: t("common.username"),
      cell: (r) => (
        <span className="text-muted-foreground">{r.username ? `@${r.username}` : "—"}</span>
      ),
    },
    {
      key: "view",
      header: "",
      cell: (r) => (
        <Button asChild size="sm" variant="ghost">
          <Link to="/students/$studentId" params={{ studentId: String(r.id) }}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {t("common.view")}
          </Link>
        </Button>
      ),
    },
  ];
  return (
    <CrudPage<Student>
      title={t("pages.students.title")}
      description={t("pages.students.subtitle")}
      navKey="students"
      columns={columns}
      useList={studentsQ.useList}
      useCreate={useCreateStudent}
      useUpdate={studentsQ.useUpdate}
      useRemove={studentsQ.useRemove}
      createTitle={t("pages.students.createTitle")}
      validate={(row) => (!row.gender ? t("common.genderRequired") : null)}
      renderForm={(row, onChange) => (
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("common.name")}</Label>
            <Input
              value={row?.fullName ?? ""}
              onChange={(e) => onChange({ fullName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("common.cardId")}</Label>
              <Input
                value={row?.cardId ?? ""}
                onChange={(e) => onChange({ cardId: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.phone")}</Label>
              <Input
                value={row?.phone ?? ""}
                onChange={(e) => onChange({ phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("common.username")}</Label>
              <Input
                value={row?.username ?? ""}
                onChange={(e) => onChange({ username: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("nav.groups")}</Label>
              <Select
                value={row?.groupId ? String(row.groupId) : undefined}
                onValueChange={(v) => onChange({ groupId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(groupsQ.useList({ limit: 200 }).data?.data ?? mockGroups).map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <GenderSelect value={row?.gender} onChange={(gender) => onChange({ gender })} />

          <div className="grid gap-1.5">
            <Label>{t("nav.parents")}</Label>
            <Select
              value={row?.parentId ? String(row.parentId) : undefined}
              onValueChange={(v) => onChange({ parentId: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {(parentsQ.useList({ limit: 200 }).data?.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Ota-ona biriktirilsa, test natijalari va davomat haqida Telegram bot orqali
              xabar boradi.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("common.password")}</Label>
            <Input
              type="password"
              placeholder={row?.id ? t("common.passwordUnchangedHint") : undefined}
              value={row?.password ?? ""}
              onChange={(e) => onChange({ password: e.target.value })}
            />
          </div>
        </div>
      )}
    />
  );
}
