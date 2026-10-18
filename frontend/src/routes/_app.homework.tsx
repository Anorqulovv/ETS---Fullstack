import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Upload, CheckCircle2, RotateCcw, Paperclip } from "lucide-react";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  groupsQ,
  homeworkQ,
  useSubmitHomework,
  useMyHomeworkSubmission,
  useHomeworkSubmissions,
  useGradeHomework,
  useResetHomeworkSubmission,
} from "@/lib/api/hooks";
import type { HomeworkAssignment } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

/** Hech qanday UTC konvertatsiyasi qilmaydi -- ustoz kiritgan vaqtni aynan shunday ko'rsatadi ("2026-08-21T12:00" -> "21.08.2026 12:00"). */
function formatDeadline(v: string) {
  const [datePart, timePart] = v.split("T");
  if (!datePart) return v;
  const [y, m, d] = datePart.split("-");
  return `${d}.${m}.${y}${timePart ? " " + timePart.slice(0, 5) : ""}`;
}

type DeadlineStatus = "none" | "overdue" | "soon" | "ok";

function deadlineStatus(deadline?: string): DeadlineStatus {
  if (!deadline) return "none";
  const dl = new Date(deadline);
  if (Number.isNaN(dl.getTime())) return "none";
  const diffMs = dl.getTime() - Date.now();
  if (diffMs < 0) return "overdue";
  if (diffMs < 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

function DeadlineBadge({ deadline, t }: { deadline?: string; t: (key: string) => string }) {
  if (!deadline) return <span className="text-muted-foreground">—</span>;
  const status = deadlineStatus(deadline);
  const label = formatDeadline(deadline);
  const badgeClass =
    status === "overdue"
      ? "bg-destructive/15 text-destructive"
      : status === "soon"
        ? "bg-warning/15 text-warning-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant="secondary" className={badgeClass}>
        {label}
      </Badge>
      {status === "overdue" ? (
        <span className="text-xs text-destructive">{t("pages.homework.overdue")}</span>
      ) : status === "soon" ? (
        <span className="text-xs text-warning-foreground">{t("pages.homework.dueSoon")}</span>
      ) : null}
    </span>
  );
}

export const Route = createFileRoute("/_app/homework")({
  head: () => ({ meta: [{ title: "Uyga vazifalar — Edu CRM" }] }),
  component: HomeworkPage,
});

function HomeworkPage() {
  const { user } = useAuth();
  if (user?.role === "STUDENT") return <StudentHomeworkView />;
  return <StaffHomeworkView />;
}

/* ==================== STAFF (TEACHER/SUPPORT/ADMIN/SUPERADMIN) ==================== */

function StaffHomeworkView() {
  const { t } = useTranslation();
  const groups = groupsQ.useList({ limit: 200 }).data?.data ?? [];
  const [submissionsFor, setSubmissionsFor] = useState<HomeworkAssignment | null>(null);

  const columns: Column<HomeworkAssignment>[] = [
    {
      key: "title",
      header: t("common.title"),
      sortable: true,
      sortValue: (r) => r.title ?? "",
      cell: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: "group",
      header: t("nav.groups"),
      cell: (r) => groups.find((g) => g.id === r.groupId)?.name ?? r.group?.name ?? "—",
    },
    {
      key: "deadline",
      header: t("pages.homework.deadline"),
      cell: (r) => <DeadlineBadge deadline={r.deadline} t={t} />,
    },
    {
      key: "submissions",
      header: "",
      cell: (r) => (
        <Button type="button" size="sm" variant="outline" onClick={() => setSubmissionsFor(r)}>
          {t("pages.homework.submissions")}
        </Button>
      ),
    },
  ];

  return (
    <>
      <CrudPage<HomeworkAssignment>
        title={t("pages.homework.title")}
        description={t("pages.homework.staffDescription")}
        navKey="homework"
        columns={columns}
        useList={homeworkQ.useList}
        useCreate={homeworkQ.useCreate}
        useUpdate={homeworkQ.useUpdate}
        useRemove={homeworkQ.useRemove}
        createTitle={t("pages.homework.createTitle")}
        renderForm={(row, onChange) => (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>{t("common.title")}</Label>
              <Input value={row?.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("pages.homework.description")}</Label>
              <Textarea
                value={row?.description ?? ""}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("nav.groups")}</Label>
              <Select
                value={row?.groupId != null ? String(row.groupId) : undefined}
                onValueChange={(v) => onChange({ groupId: Number(v) })}
              >
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
            <div className="grid gap-1.5">
              <Label>{t("pages.homework.deadline")}</Label>
              <Input
                type="datetime-local"
                value={row?.deadline ? row.deadline.slice(0, 16) : ""}
                onChange={(e) =>
                  onChange({ deadline: e.target.value || undefined })
                }
              />
            </div>
          </div>
        )}
      />
      {submissionsFor ? (
        <SubmissionsDialog
          assignment={submissionsFor}
          open={!!submissionsFor}
          onOpenChange={(v) => !v && setSubmissionsFor(null)}
        />
      ) : null}
    </>
  );
}

function SubmissionsDialog({
  assignment,
  open,
  onOpenChange,
}: {
  assignment: HomeworkAssignment;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { data: submissions, isLoading } = useHomeworkSubmissions(assignment.id);
  const gradeHomework = useGradeHomework();
  const resetSubmission = useResetHomeworkSubmission();
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const total = submissions?.length ?? 0;
  const graded = submissions?.filter((s) => s.status === "GRADED").length ?? 0;
  // Baholanmaganlar ro'yxat boshida chiqadi -- o'qituvchi avval navbatdagilarni ko'radi.
  const sorted = [...(submissions ?? [])].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "GRADED" ? 1 : -1,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {assignment.title} — {t("pages.homework.submissions")}
          </DialogTitle>
          {total > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("pages.homework.gradedSummary", { graded, total })}
            </p>
          ) : null}
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : null}
          {!isLoading && !sorted.length ? (
            <p className="text-sm text-muted-foreground">{t("pages.homework.noSubmissions")}</p>
          ) : null}
          {sorted.map((s) => (
            <div key={s.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {s.student?.user?.fullName ?? `${t("common.student")} #${s.studentId}`}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={s.status === "GRADED" ? "default" : "secondary"}>
                    {s.status === "GRADED"
                      ? t("pages.homework.scoreLabel", { score: s.score })
                      : t("pages.homework.pendingReview")}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => resetSubmission.mutate({ assignmentId: assignment.id, studentId: s.studentId })}
                    title={t("pages.homework.allowResubmit")}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {s.textContent ? <p className="mt-2 whitespace-pre-wrap text-sm">{s.textContent}</p> : null}
              {s.fileName ? (
                s.fileData ? (
                  <a
                    href={s.fileData}
                    download={s.fileName}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary underline"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {s.fileName}
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.fileName} ({t("pages.homework.fileExpired")})
                  </p>
                )
              ) : null}

              {gradingId === s.id ? (
                <div className="mt-3 grid gap-2 rounded-md border border-dashed p-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder={t("pages.homework.scorePlaceholder")}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                  <Textarea
                    placeholder={t("pages.homework.feedbackPlaceholder")}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setGradingId(null)}>
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!score || gradeHomework.isPending}
                      onClick={() =>
                        gradeHomework.mutate(
                          { submissionId: s.id, score: Number(score), feedback: feedback || undefined },
                          { onSuccess: () => setGradingId(null) },
                        )
                      }
                    >
                      {t("common.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setGradingId(s.id);
                    setScore(s.score != null ? String(s.score) : "");
                    setFeedback(s.feedback ?? "");
                  }}
                >
                  {s.status === "GRADED" ? t("pages.homework.regrade") : t("pages.homework.grade")}
                </Button>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ==================== STUDENT ==================== */

function StudentHomeworkView() {
  const { t } = useTranslation();
  const { data, isLoading } = homeworkQ.useList({ limit: 100 });
  const assignments = data?.data ?? [];

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("pages.homework.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("pages.homework.myDescription")}</p>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : null}
      {!isLoading && !assignments.length ? (
        <p className="text-sm text-muted-foreground">{t("pages.homework.empty")}</p>
      ) : null}
      <div className="grid gap-3">
        {assignments.map((a) => (
          <StudentAssignmentCard key={a.id} assignment={a} />
        ))}
      </div>
    </div>
  );
}

function StudentAssignmentCard({ assignment }: { assignment: HomeworkAssignment }) {
  const { t } = useTranslation();
  const { data: mySubmissions } = useMyHomeworkSubmission(assignment.id);
  const submitHomework = useSubmitHomework();
  const [open, setOpen] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<{ name: string; data: string } | null>(null);

  const current = mySubmissions?.find((s) => s.isCurrent);
  const canSubmit = !current;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, data: reader.result as string });
    reader.readAsDataURL(f);
  }

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{assignment.title}</h3>
          {assignment.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{assignment.description}</p>
          ) : null}
          {assignment.deadline ? (
            <div className="mt-1">
              <DeadlineBadge deadline={assignment.deadline} t={t} />
            </div>
          ) : null}
        </div>
        {current ? (
          <Badge variant={current.status === "GRADED" ? "default" : "secondary"} className="shrink-0">
            {current.status === "GRADED" ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {t("pages.homework.scoreLabel", { score: current.score })}
              </span>
            ) : (
              t("pages.homework.submittedPending")
            )}
          </Badge>
        ) : null}
      </div>

      {current?.status === "GRADED" && current.feedback ? (
        <p className="mt-2 rounded-md bg-muted p-2 text-sm">{current.feedback}</p>
      ) : null}

      {canSubmit ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="mt-3">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {t("pages.homework.submit")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("pages.homework.submitDialogTitle", { title: assignment.title })}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>{t("pages.homework.textOrLink")}</Label>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={4}
                  placeholder={t("pages.homework.textPlaceholder")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("pages.homework.fileOptional")}</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed p-4 text-center transition-colors hover:bg-surface">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : t("pages.homework.chooseFile")}
                  </span>
                  <input type="file" className="hidden" onChange={handleFile} />
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={(!textContent.trim() && !file) || submitHomework.isPending}
                onClick={() =>
                  submitHomework.mutate(
                    {
                      assignmentId: assignment.id,
                      textContent: textContent || undefined,
                      fileName: file?.name,
                      fileData: file?.data,
                    },
                    { onSuccess: () => setOpen(false) },
                  )
                }
              >
                {t("pages.homework.submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
