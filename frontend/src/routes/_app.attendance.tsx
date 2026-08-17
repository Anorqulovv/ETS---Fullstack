import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users2 } from "lucide-react";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { attendanceQ, groupsQ, studentsQ, useCreateAttendance, useMarkGroupAttendance } from "@/lib/api/hooks";
import type { AttendanceRecord, Student } from "@/lib/api/types";
import { mockStudents } from "@/lib/api/mock-data";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Edu CRM" }] }),
  component: AttendancePage,
});

// The backend's Attendance entity is only { id, studentId, isPresent, type, timestamp } —
// no groupId/date/note, and no PATCH or DELETE endpoint (see AttendanceController in the
// backend). "Group" here is purely a client-side filter to narrow the student picker.
function statusColor(isPresent: boolean) {
  return isPresent ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
}

function AttendancePage() {
  const { t } = useTranslation();
  const groups = groupsQ.useList({ limit: 200 }).data?.data ?? [];
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Backend GET /attendance hech qanday filtr/pagination query parametrini
  // qabul qilmaydi — har doim ruxsat etilgan hamma yozuvni qaytaradi. Shuning
  // uchun guruh/holat bo'yicha filtrni client-side qilib, o'zimiz sahifalaymiz.
  function useAttendanceListWithFilters(params: {
    page?: number;
    limit?: number;
    search?: string;
    groupId?: string;
    isPresent?: string;
  }) {
    const { page = 1, limit = 10, search, groupId, isPresent } = params;
    const raw = attendanceQ.useList({ search, limit: 100000 });
    const filtered = useMemo(() => {
      let rows = raw.data?.data ?? [];
      if (groupId) rows = rows.filter((a) => String(a.groupId) === groupId);
      if (isPresent) rows = rows.filter((a) => String(a.isPresent) === isPresent);
      return rows;
    }, [raw.data, groupId, isPresent]);
    const start = (page - 1) * limit;
    const sliced = useMemo(
      () => filtered.slice(start, start + limit),
      [filtered, start, limit],
    );
    return { data: { data: sliced, total: filtered.length }, isLoading: raw.isLoading };
  }

  const columns: Column<AttendanceRecord>[] = [
    {
      key: "student",
      header: t("nav.students"),
      sortable: true,
      sortValue: (r) => r.studentName ?? "",
      cell: (r) => r.studentName ?? "—",
    },
    {
      key: "timestamp",
      header: t("common.date"),
      sortable: true,
      sortValue: (r) => (r.timestamp ? new Date(r.timestamp).getTime() : 0),
      cell: (r) => (
        <span className="font-mono text-xs">
          {r.timestamp ? new Date(r.timestamp).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (r) => (
        <Badge variant="secondary" className={statusColor(r.isPresent)}>
          {r.isPresent ? t("status.present") : t("status.absent")}
        </Badge>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (r) => <span className="text-muted-foreground">{r.type ?? "—"}</span>,
    },
  ];
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="shadow-soft">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium">{t("pages.attendance.byGroup")}</p>
            <p className="text-xs text-muted-foreground">
              Bir guruhning barcha o'quvchilarini bir vaqtda belgilang
            </p>
          </div>
          <Button variant="outline" onClick={() => setGroupDialogOpen(true)}>
            <Users2 className="mr-1.5 h-4 w-4" />
            Guruh bo'yicha belgilash
          </Button>
        </CardContent>
      </Card>

      <CrudPage<AttendanceRecord>
        title={t("pages.attendance.title")}
        description={t("pages.attendance.subtitle")}
        navKey="attendance"
        columns={columns}
        useList={useAttendanceListWithFilters}
        extraListParams={{
          groupId: groupFilter || undefined,
          isPresent: statusFilter || undefined,
        }}
        activeFilterCount={(groupFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
        onClearFilters={() => {
          setGroupFilter("");
          setStatusFilter("");
        }}
        filters={
          <>
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("nav.groups")}</Label>
              <Select value={groupFilter || undefined} onValueChange={(v) => setGroupFilter(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("common.status")}</Label>
              <Select value={statusFilter || undefined} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t("status.present")}</SelectItem>
                  <SelectItem value="false">{t("status.absent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        }
        useCreate={useCreateAttendance}
        useUpdate={attendanceQ.useUpdate}
        useRemove={attendanceQ.useRemove}
        createTitle={t("pages.attendance.createTitle")}
        renderForm={(row, onChange) => (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>{t("nav.students")}</Label>
              <Select
                value={row?.studentId ? String(row.studentId) : undefined}
                onValueChange={(v) => onChange({ studentId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {(studentsQ.useList({ limit: 100 }).data?.data ?? mockStudents).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.status")}</Label>
              <Select
                value={row?.isPresent === false ? "ABSENT" : "PRESENT"}
                onValueChange={(v) => onChange({ isPresent: v === "PRESENT" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">{t("status.present")}</SelectItem>
                  <SelectItem value="ABSENT">{t("status.absent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.type")}</Label>
              <Input
                placeholder="LATE, TURNSTILE, …"
                value={row?.type ?? ""}
                onChange={(e) => onChange({ type: e.target.value })}
              />
            </div>
          </div>
        )}
      />

      <GroupAttendanceDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} />
    </div>
  );
}

/**
 * Bulk-marks a whole group at once via POST /attendance/group/:groupId — much faster than
 * the one-student-at-a-time form above. Teachers only see/can mark their own groups (enforced
 * server-side too — see AttendanceService.markGroupAttendance).
 */
function GroupAttendanceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [groupId, setGroupId] = useState<string>("");
  const [presentMap, setPresentMap] = useState<Record<number, boolean>>({});
  const groups = groupsQ.useList({ limit: 100 }).data?.data ?? [];
  const allStudents = studentsQ.useList({ limit: 500 }).data?.data ?? [];
  const groupStudents: Student[] = groupId
    ? allStudents.filter((s) => String(s.groupId) === groupId)
    : [];
  const markGroup = useMarkGroupAttendance(() => {
    onOpenChange(false);
    setGroupId("");
    setPresentMap({});
  });

  const isPresent = (studentId: number) => presentMap[studentId] ?? true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("pages.attendance.byGroup")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("nav.groups")}</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {groupId ? (
            groupStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("pages.attendance.noStudents")}</p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{t("nav.students")} ({groupStudents.length})</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPresentMap(Object.fromEntries(groupStudents.map((s) => [s.id, true])))
                      }
                    >
                      Barchasi keldi
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPresentMap(Object.fromEntries(groupStudents.map((s) => [s.id, false])))
                      }
                    >
                      Barchasi kelmadi
                    </Button>
                  </div>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                  {groupStudents.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="flex items-center gap-2">
                        <Checkbox
                          checked={isPresent(s.id)}
                          onCheckedChange={(v) =>
                            setPresentMap((prev) => ({ ...prev, [s.id]: v === true }))
                          }
                        />
                        {s.fullName}
                      </span>
                      <Badge
                        variant="secondary"
                        className={isPresent(s.id) ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}
                      >
                        {isPresent(s.id) ? t("status.present") : t("status.absent")}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
            )
          ) : null}
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!groupId || groupStudents.length === 0 || markGroup.isPending}
            onClick={() =>
              markGroup.mutate({
                groupId: Number(groupId),
                attendances: groupStudents.map((s) => ({
                  studentId: s.id,
                  isPresent: isPresent(s.id),
                })),
              })
            }
          >
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
