import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarX2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

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

// Backend bilan bir xil xarita (GroupsService.WEEKDAY_INDEX) — JS Date.getDay(): 0=Yakshanba.
const WEEKDAY_INDEX: Record<string, number> = {
  Yakshanba: 0,
  Dushanba: 1,
  Seshanba: 2,
  Chorshanba: 3,
  Payshanba: 4,
  Juma: 5,
  Shanba: 6,
};

type LessonStatus = "held" | "cancelled" | "pending";

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Read-only month calendar for a group's schedule — marks each lesson-day date as already held,
 * cancelled (see CancelledLesson), or still pending (today or in the future). */
function GroupCalendarDialog({ group, open, onOpenChange }: { group: Group; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const { data: cancelled } = useCancelledLessons(open ? Number(group.id) : undefined);
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const allowedWeekdays = new Set((group.lessonDays ?? []).map((d) => WEEKDAY_INDEX[d]).filter((v) => v !== undefined));
  const cancelledDates = new Set((cancelled ?? []).map((c) => c.date));
  const start = group.startDate ? new Date(`${group.startDate.slice(0, 10)}T00:00:00`) : null;
  const end = group.endDate ? new Date(`${group.endDate.slice(0, 10)}T00:00:00`) : null;
  const todayStr = today.toISOString().slice(0, 10);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  // Dushanba = birinchi ustun bo'lishi uchun (getDay(): 0=Yak..6=Shanba -> 0=Dush..6=Yak)
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells: { date: string; day: number; status: LessonStatus | null }[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ date: "", day: 0, status: null });
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    let status: LessonStatus | null = null;
    const isLessonDay = allowedWeekdays.has(d.getDay()) && (!start || d >= start) && (!end || d <= end);
    if (isLessonDay) {
      if (cancelledDates.has(dateStr)) status = "cancelled";
      else if (dateStr < todayStr) status = "held";
      else status = "pending";
    }
    cells.push({ date: dateStr, day, status });
  }

  const STATUS_STYLE: Record<LessonStatus, string> = {
    held: "bg-success/15 text-success border-success/30",
    cancelled: "bg-destructive/15 text-destructive border-destructive/30 line-through",
    pending: "bg-warning/15 text-warning-foreground border-warning/30",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {group.name} — {t("pages.groups.calendarTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize">{monthLabel(year, month)}</span>
          <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {group.lessonTime ? (
          <p className="text-xs text-muted-foreground">
            {t("pages.groups.lessonTime")}: {group.lessonTime}
          </p>
        ) : null}

        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((d) => (
            <div key={d} className="py-1 font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((c, i) =>
            c.day === 0 ? (
              <div key={i} />
            ) : (
              <div
                key={i}
                className={
                  "flex h-8 items-center justify-center rounded-md border text-xs " +
                  (c.status ? STATUS_STYLE[c.status] : "text-muted-foreground/50")
                }
              >
                {c.day}
              </div>
            ),
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> {t("pages.groups.lessonHeld")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> {t("pages.groups.lessonCancelled")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" /> {t("pages.groups.lessonPending")}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupCalendarButton({ group }: { group: Group }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="ghost" title={t("pages.groups.calendar")} onClick={() => setOpen(true)}>
        <CalendarDays className="h-4 w-4" />
      </Button>
      {open ? <GroupCalendarDialog group={group} open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}

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
    {
      key: "calendar",
      header: "",
      cell: (r) => <GroupCalendarButton group={r} />,
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
