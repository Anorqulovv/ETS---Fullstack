import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarX2 } from "lucide-react";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  branchesQ,
  directionsQ,
  groupsQ,
  teachersQ,
  supportsQ,
  useCancelLesson,
  useCancelledLessons,
} from "@/lib/api/hooks";
import type { Group, GroupStatus } from "@/lib/api/types";
import { mockBranches, mockDirections, mockSupports, mockTeachers } from "@/lib/api/mock-data";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/groups")({
  head: () => ({ meta: [{ title: "Groups — Edu CRM" }] }),
  component: GroupsPage,
});

const STATUSES: GroupStatus[] = ["ACTIVE", "PAUSED", "FINISHED"];

// Backend faqat shu 7 ta o'zbekcha nom bilan ishlaydi (GroupsService.validateLessonDays) —
// Yakshanba (yakshanba) tanlab bo'lmaydi.
const LESSON_DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

/** Compact version of the cancel-lesson action for the table row — doesn't require full group
 * edit rights, since backend grants this to TEACHER independently (POST /groups/:id/cancel-lesson
 * allows SUPERADMIN/ADMIN/TEACHER, unlike full group editing which is admin-only). */
function CancelLessonButton({ groupId }: { groupId: number }) {
  const { t } = useTranslation();
  const cancelLesson = useCancelLesson();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" title={t("pages.groups.cancelLesson")}>
          <CalendarX2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pages.groups.cancelLesson")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("pages.groups.cancelDate")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("pages.gamification.reasonOptional")}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("pages.groups.cancelReasonPlaceholder")}
              rows={2}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("pages.groups.cancelHint")}</p>
        </div>
        <DialogFooter>
          <Button
            disabled={!date || cancelLesson.isPending}
            onClick={() =>
              cancelLesson.mutate(
                { groupId, date, reason: reason || undefined },
                {
                  onSuccess: () => {
                    setOpen(false);
                    setDate("");
                    setReason("");
                  },
                },
              )
            }
          >
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canCancelLesson =
    user?.role === "SUPERADMIN" || user?.role === "ADMIN" || user?.role === "TEACHER";
  const directions = directionsQ.useList({ limit: 200 }).data?.data ?? mockDirections;
  const teachers = teachersQ.useList({ limit: 200 }).data?.data ?? mockTeachers;
  const branches = branchesQ.useList({ limit: 200 }).data?.data ?? mockBranches;

  const columns: Column<Group>[] = [
    {
      key: "name",
      header: t("common.name"),
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "direction",
      header: t("nav.directions"),
      cell: (r) => directions.find((d) => d.id === r.directionId)?.name ?? "—",
    },
    {
      key: "teacher",
      header: t("nav.teachers"),
      cell: (r) => teachers.find((x) => x.id === r.teacherId)?.fullName ?? "—",
    },
    {
      key: "branch",
      header: t("nav.branches"),
      cell: (r) => branches.find((b) => b.id === r.branchId)?.name ?? "—",
    },
    {
      key: "students",
      header: t("nav.students"),
      cell: (r) => <span className="tabular-nums">{r.studentsCount ?? 0}</span>,
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (r) => (
        <Badge
          variant="secondary"
          className={
            r.status === "ACTIVE"
              ? "bg-success/15 text-success"
              : r.status === "PAUSED"
                ? "bg-warning/15 text-warning-foreground"
                : r.status === "FINISHED"
                  ? "bg-muted text-muted-foreground"
                  : "bg-destructive/15 text-destructive"
          }
        >
          {r.status}
        </Badge>
      ),
    },
    ...(canCancelLesson
      ? [
          {
            key: "cancelLesson",
            header: "",
            cell: (r: Group) => (r.id != null ? <CancelLessonButton groupId={Number(r.id)} /> : null),
          } as Column<Group>,
        ]
      : []),
  ];

  return (
    <CrudPage<Group>
      title={t("pages.groups.title")}
      description={t("pages.groups.subtitle")}
      navKey="groups"
      columns={columns}
      useList={groupsQ.useList}
      useCreate={groupsQ.useCreate}
      useUpdate={groupsQ.useUpdate}
      useRemove={groupsQ.useRemove}
      createTitle={t("pages.groups.createTitle")}
      renderForm={(row, onChange) => {
        const selectedDirection = directions.find((d) => d.id === row?.directionId);
        const durationMonths = selectedDirection?.durationMonths;
        const computedEndDate =
          durationMonths && row?.startDate ? addMonthsMinusDay(row.startDate, durationMonths) : undefined;
        const lessonDays = row?.lessonDays ?? [];

        return (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>{t("common.name")}</Label>
              <Input value={row?.name ?? ""} onChange={(e) => onChange({ name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldSelect
                label={t("nav.directions")}
                value={row?.directionId}
                onChange={(v) => onChange({ directionId: v })}
                options={directions.map((d) => ({
                  value: d.id,
                  label: d.durationMonths ? `${d.name} (${d.durationMonths} oy)` : d.name,
                }))}
              />
              <FieldSelect
                label={t("nav.branches")}
                value={row?.branchId}
                onChange={(v) => onChange({ branchId: v })}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />
              <FieldSelect
                label={t("nav.teachers")}
                value={row?.teacherId}
                onChange={(v) => onChange({ teacherId: v })}
                options={teachers
                  .filter((x) => {
                    // No direction chosen for the group yet — show every teacher. Once a direction
                    // is picked, only teachers who actually teach that direction (directionIds, or
                    // the legacy single directionId for teachers with just one) are assignable.
                    if (!row?.directionId) return true;
                    const ids = x.directionIds?.length ? x.directionIds : x.directionId ? [x.directionId] : [];
                    return ids.includes(row.directionId);
                  })
                  .map((x) => ({ value: x.id, label: x.fullName }))}
              />
              <FieldSelect
                label={t("nav.supportTeachers")}
                value={row?.supportId}
                onChange={(v) => onChange({ supportId: v })}
                options={(supportsQ.useList({ limit: 200 }).data?.data ?? mockSupports).map((x) => ({
                  value: x.id,
                  label: x.fullName,
                }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("pages.groups.lessonDays")}</Label>
              <div className="flex flex-wrap gap-3 rounded-md border p-3">
                {LESSON_DAYS.map((day) => (
                  <label key={day} className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={lessonDays.includes(day)}
                      onCheckedChange={(checked) =>
                        onChange({
                          lessonDays: checked
                            ? [...lessonDays, day]
                            : lessonDays.filter((d) => d !== day),
                        })
                      }
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("pages.groups.lessonTime")}</Label>
                <Input
                  type="time"
                  value={row?.lessonTime ?? ""}
                  onChange={(e) => onChange({ lessonTime: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("pages.groups.lessonDuration")}</Label>
                <Input
                  type="number"
                  placeholder="90"
                  value={row?.lessonDuration ?? ""}
                  onChange={(e) =>
                    onChange({ lessonDuration: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("common.from")}</Label>
                <Input
                  type="date"
                  value={row?.startDate?.slice(0, 10) ?? ""}
                  onChange={(e) => onChange({ startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("common.to")}</Label>
                {durationMonths ? (
                  <>
                    <Input type="date" value={computedEndDate ?? ""} disabled />
                    <p className="text-xs text-muted-foreground">
                      {t("pages.groups.autoEndDateHint", { direction: selectedDirection?.name, months: durationMonths })}
                    </p>
                  </>
                ) : (
                  <Input
                    type="date"
                    value={row?.endDate?.slice(0, 10) ?? ""}
                    onChange={(e) => onChange({ endDate: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("common.status")}</Label>
              <Select
                value={row?.status}
                onValueChange={(v) => onChange({ status: v as GroupStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {row?.id ? <CancelLessonSection groupId={row.id} /> : null}
          </div>
        );
      }}
    />
  );
}

/** startDate + durationMonths, minus a day — matches the backend's GroupsService.computeEndDate. */
function addMonthsMinusDay(startDate: string, durationMonths: number): string {
  const d = new Date(`${startDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + durationMonths);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function CancelLessonSection({ groupId }: { groupId: number }) {
  const { t } = useTranslation();
  const { data: cancelled } = useCancelledLessons(groupId);
  const cancelLesson = useCancelLesson();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="grid gap-2 rounded-md border border-dashed p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("pages.groups.cancelledLessons")}</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              <CalendarX2 className="mr-1.5 h-3.5 w-3.5" />
              {t("pages.groups.cancelLesson")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("pages.groups.cancelLesson")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>{t("pages.groups.cancelDate")}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("pages.gamification.reasonOptional")}</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("pages.groups.cancelReasonPlaceholder")}
                  rows={2}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("pages.groups.cancelHint")}
              </p>
            </div>
            <DialogFooter>
              <Button
                disabled={!date || cancelLesson.isPending}
                onClick={() =>
                  cancelLesson.mutate(
                    { groupId, date, reason: reason || undefined },
                    {
                      onSuccess: () => {
                        setOpen(false);
                        setDate("");
                        setReason("");
                      },
                    },
                  )
                }
              >
                {t("common.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {cancelled?.length ? (
        <div className="space-y-1">
          {cancelled.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{c.date}</span>
              <span>{c.reason ?? "—"}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("pages.groups.noCancelled")}</p>
      )}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select
        value={value != null ? String(value) : undefined}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("common.selectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
