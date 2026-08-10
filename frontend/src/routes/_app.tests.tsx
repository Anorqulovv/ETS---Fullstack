import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, Sparkles, Trash2, PlayCircle, Clock, ChevronRight } from "lucide-react";

import { isoToLocalInput, localInputToISO } from "@/lib/datetime";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  directionsQ,
  groupsQ,
  testsQ,
  useAiGenerateTest,
  useCreateTest,
  useResetTestAttempt,
  useTest,
  useTestReview,
  useUpdateTest,
} from "@/lib/api/hooks";
import type { CodingProblem, Test, TestQuestion, TestType } from "@/lib/api/types";
import { mockDirections, mockGroups } from "@/lib/api/mock-data";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/tests")({
  head: () => ({ meta: [{ title: "Tests — Edu CRM" }] }),
  component: TestsRoute,
});

function TestsRoute() {
  const { user } = useAuth();
  return user?.role === "STUDENT" ? <StudentTestsView /> : <TestsPage />;
}

const TYPES: TestType[] = ["DAILY", "WEEKLY", "MONTHLY"];

function emptyChoice() {
  return { text: "", isCorrect: false };
}
function emptyQuestion(): TestQuestion {
  return { text: "", choices: [emptyChoice(), emptyChoice()] };
}
function emptyProblem(): CodingProblem {
  return { title: "", description: "", difficulty: "MEDIUM" };
}

function TestsPage() {
  const { t } = useTranslation();
  const [resultsTestId, setResultsTestId] = useState<number | null>(null);

  const columns: Column<Test>[] = [
    {
      key: "title",
      header: t("common.title"),
      cell: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (r) => <Badge variant="secondary">{r.type}</Badge>,
    },
    {
      key: "group",
      header: t("nav.groups"),
      cell: (r) => r.group?.name ?? "—",
    },
    {
      key: "questions",
      header: "Savollar",
      cell: (r) => <span className="tabular-nums">{r.questionsCount ?? r.questions?.length ?? 0}</span>,
    },
    {
      key: "duration",
      header: "Davomiyligi",
      cell: (r) => (r.durationMinutes ? `${r.durationMinutes} daq` : "—"),
    },
    {
      key: "date",
      header: t("common.date"),
      cell: (r) => (
        <span className="font-mono text-xs">
          {r.startsAt ? new Date(r.startsAt).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "results",
      header: "Natijalar",
      cell: (r) => (
        <Button variant="outline" size="sm" onClick={() => setResultsTestId(r.id)}>
          Ko'rish
        </Button>
      ),
    },
  ];

  return (
    <>
      <CrudPage<Test>
        title={t("pages.tests.title")}
        description={t("pages.tests.subtitle")}
        navKey="tests"
        columns={columns}
        dialogSize="xl"
        useList={testsQ.useList}
        useCreate={useCreateTest}
        useUpdate={useUpdateTest}
        useRemove={testsQ.useRemove}
        createTitle={t("pages.tests.createTitle")}
        renderForm={(row, onChange) => <TestForm row={row} onChange={onChange} />}
      />
      <TestResultsDialog testId={resultsTestId} onOpenChange={(open) => !open && setResultsTestId(null)} />
    </>
  );
}

/** Shows every student's attempt(s) for a test — GET /tests/:id includes the `results` relation for staff. */
function TestResultsDialog({
  testId,
  onOpenChange,
}: {
  testId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { data: test, isLoading } = useTest(testId ?? undefined);
  const resetAttempt = useResetTestAttempt();
  const [reviewStudentId, setReviewStudentId] = useState<number | null>(null);

  return (
    <>
      <Dialog open={testId != null} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{test?.title ?? "Natijalar"}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("pages.gamification.loading")}</p>
          ) : !test?.results?.length ? (
            <p className="text-sm text-muted-foreground">{t("pages.tests.noResultsYet")}</p>
          ) : (
            <div className="space-y-2">
              {test.results.map((res) => {
                // A current (isCurrent) attempt with no submittedAt is still being taken right
                // now — its score is just the not-yet-final default (0), not a real result, so
                // it must never be shown as if the student had finished and scored 0.
                const inProgress = res.isCurrent && !res.submittedAt;
                return (
                  <div key={res.id} className="rounded-md border p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {res.studentName ?? `#${res.studentId}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {res.attempt}-urinish
                          {res.submittedAt ? ` · ${new Date(res.submittedAt).toLocaleString()}` : ""}
                          {res.forceScoreZero
                            ? ` · ${res.violationReason ?? t("pages.tests.violationDefaultShort")}`
                            : ""}
                        </div>
                      </div>
                      {inProgress ? (
                        <Badge className="bg-warning/15 text-warning-foreground">
                          {t("pages.tests.resultsInProgress")}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="bg-success/15 text-success">
                            {t("pages.tests.resultsFinished")}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={
                              res.forceScoreZero
                                ? "bg-destructive/15 text-destructive"
                                : res.score >= (test.minScore ?? 60)
                                  ? "bg-success/15 text-success"
                                  : "bg-warning/15 text-warning-foreground"
                            }
                          >
                            {res.score}/100
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={inProgress}
                        onClick={() => setReviewStudentId(res.studentId)}
                      >
                        {t("pages.tests.viewAnswers")}
                      </Button>
                      {res.isCurrent ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resetAttempt.isPending}
                          onClick={() =>
                            testId != null &&
                            resetAttempt.mutate({ testId, studentId: res.studentId })
                          }
                        >
                          {t("pages.tests.allowRetry")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TestReviewDialog
        testId={testId}
        studentId={reviewStudentId}
        onOpenChange={(open) => !open && setReviewStudentId(null)}
      />
    </>
  );
}

/** Question-by-question right/wrong breakdown for one student's attempt(s) at a test. */
function TestReviewDialog({
  testId,
  studentId,
  onOpenChange,
}: {
  testId: number | null;
  studentId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: review, isLoading } = useTestReview(testId, studentId);

  return (
    <Dialog open={studentId != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{review?.studentName ?? "Javoblar"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
        ) : !review?.attempts?.length ? (
          <p className="text-sm text-muted-foreground">Urinish topilmadi.</p>
        ) : (
          <div className="space-y-6">
            {review.attempts.map((attempt) => (
              <div key={attempt.resultId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {attempt.attempt}-urinish{attempt.isCurrent ? " (joriy)" : ""}
                  </span>
                  <Badge variant="secondary">{attempt.score}/100</Badge>
                </div>
                <div className="space-y-2">
                  {attempt.questions.map((q, qIdx) => (
                    <div
                      key={q.questionId}
                      className={`rounded-md border p-2.5 text-sm ${
                        q.isCorrect ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"
                      }`}
                    >
                      <p className="font-medium">
                        {qIdx + 1}. {q.questionText}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Javobi: {q.selectedChoiceText ?? "javob berilmagan"}
                      </p>
                      {!q.isCorrect ? (
                        <p className="mt-0.5 text-xs text-success">
                          To'g'ri javob: {q.correctChoiceText ?? "—"}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {attempt.problems?.length ? (
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        Masalalar {attempt.problemsScore != null ? `(o'rtacha: ${attempt.problemsScore}/100)` : ""}
                      </p>
                    </div>
                    {attempt.problems.map((p, pIdx) => {
                      const notSubmitted = p.status === "NOT_SUBMITTED" || !p.code;
                      const tone = notSubmitted
                        ? "border-muted bg-muted/20"
                        : (p.aiScore ?? 0) >= 60
                          ? "border-success/40 bg-success/5"
                          : "border-destructive/40 bg-destructive/5";
                      return (
                        <div key={p.problemId} className={`rounded-md border p-2.5 text-sm ${tone}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">
                              {pIdx + 1}. {p.title}
                            </p>
                            {notSubmitted ? (
                              <Badge variant="secondary">Yechilmagan</Badge>
                            ) : (
                              <Badge variant="secondary">{p.aiScore ?? 0}/100</Badge>
                            )}
                          </div>
                          {!notSubmitted ? (
                            <>
                              <pre className="mt-1.5 max-h-40 overflow-auto rounded bg-muted/50 p-2 font-mono text-xs">
                                {p.code}
                              </pre>
                              {p.aiFeedback?.summary ? (
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                  {p.aiFeedback.summary}
                                </p>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TestForm({
  row,
  onChange,
}: {
  row: Partial<Test> | null;
  onChange: (patch: Partial<Test>) => void;
}) {
  const { t } = useTranslation();
  const questions = row?.questions ?? [];
  const problems = row?.problems ?? [];

  // GET /tests (list) doesn't include the `questions`/`problems` relation — only GET /tests/:id does.
  // When editing an existing test, the row handed to us here has no questions yet, so fetch
  // them once and fill the form. Without this, saving with an empty question list would wipe
  // out every question the test already had (the backend replaces the whole set on update).
  const { data: fullTest } = useTest(row?.id);
  const hydratedRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      row?.id != null &&
      fullTest?.id === row.id &&
      row.questions == null &&
      hydratedRef.current !== row.id
    ) {
      hydratedRef.current = row.id;
      onChange({ questions: fullTest.questions ?? [], problems: fullTest.problems ?? [] });
    }
  }, [row?.id, row?.questions, fullTest, onChange]);

  const setQuestions = (next: TestQuestion[]) => onChange({ questions: next });
  const setProblems = (next: CodingProblem[]) => onChange({ problems: next });

  // Savollar ro'yxati uzun bo'lishi mumkin — har birini boshidanoq to'liq ochiq ko'rsatish
  // o'rniga, sarlavhasiga bosilganda variantlari pastida ochiladi.
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const toggleQuestion = (qIdx: number) =>
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qIdx)) next.delete(qIdx);
      else next.add(qIdx);
      return next;
    });

  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion()]);
    setExpandedQuestions((prev) => new Set(prev).add(questions.length));
  };
  const removeQuestion = (qIdx: number) => setQuestions(questions.filter((_, i) => i !== qIdx));
  const updateQuestionText = (qIdx: number, text: string) =>
    setQuestions(questions.map((q, i) => (i === qIdx ? { ...q, text } : q)));

  const addChoice = (qIdx: number) =>
    setQuestions(
      questions.map((q, i) => (i === qIdx ? { ...q, choices: [...q.choices, emptyChoice()] } : q)),
    );
  const removeChoice = (qIdx: number, cIdx: number) =>
    setQuestions(
      questions.map((q, i) =>
        i === qIdx ? { ...q, choices: q.choices.filter((_, j) => j !== cIdx) } : q,
      ),
    );
  const updateChoiceText = (qIdx: number, cIdx: number, text: string) =>
    setQuestions(
      questions.map((q, i) =>
        i === qIdx
          ? { ...q, choices: q.choices.map((c, j) => (j === cIdx ? { ...c, text } : c)) }
          : q,
      ),
    );
  // Only one correct choice per question — selecting a new one clears the rest.
  const setCorrectChoice = (qIdx: number, cIdx: number) =>
    setQuestions(
      questions.map((q, i) =>
        i === qIdx
          ? { ...q, choices: q.choices.map((c, j) => ({ ...c, isCorrect: j === cIdx })) }
          : q,
      ),
    );

  // Masalalar (coding problems) — butunlay ixtiyoriy bo'lim.
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());
  const toggleProblem = (pIdx: number) =>
    setExpandedProblems((prev) => {
      const next = new Set(prev);
      if (next.has(pIdx)) next.delete(pIdx);
      else next.add(pIdx);
      return next;
    });
  const addProblem = () => {
    setProblems([...problems, emptyProblem()]);
    setExpandedProblems((prev) => new Set(prev).add(problems.length));
  };
  const removeProblem = (pIdx: number) => setProblems(problems.filter((_, i) => i !== pIdx));
  const updateProblem = (pIdx: number, patch: Partial<CodingProblem>) =>
    setProblems(problems.map((p, i) => (i === pIdx ? { ...p, ...patch } : p)));

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label>{t("common.title")}</Label>
        <Input value={row?.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>{t("common.type")}</Label>
          <Select value={row?.type} onValueChange={(v) => onChange({ type: v as TestType })}>
            <SelectTrigger>
              <SelectValue placeholder={t("common.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>{t("nav.directions")}</Label>
          <Select
            value={row?.directionId ? String(row.directionId) : undefined}
            onValueChange={(v) =>
              onChange({ directionId: Number(v), groupId: undefined })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {(directionsQ.useList({ limit: 200 }).data?.data ?? mockDirections).map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>{t("nav.groups")}</Label>
          <Select
            value={row?.groupId ? String(row.groupId) : undefined}
            onValueChange={(v) => onChange({ groupId: Number(v) })}
            disabled={!row?.directionId}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  row?.directionId ? t("common.selectPlaceholder") : "Avval yo'nalishni tanlang"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(groupsQ.useList({ limit: 200 }).data?.data ?? mockGroups)
                .filter((g) => !row?.directionId || g.directionId === row.directionId)
                .map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Min score</Label>
          <Input
            type="number"
            value={row?.minScore ?? ""}
            onChange={(e) => onChange({ minScore: Number(e.target.value) })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>{t("common.durationMinutes")}</Label>
          <Input
            type="number"
            min={1}
            placeholder="masalan 30"
            value={row?.durationMinutes ?? ""}
            onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>{t("common.date")}</Label>
          <Input
            type="datetime-local"
            value={isoToLocalInput(row?.startsAt)}
            onChange={(e) => onChange({ startsAt: localInputToISO(e.target.value) })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>{t("common.endsAt")}</Label>
          <Input
            type="datetime-local"
            value={isoToLocalInput(row?.endsAt)}
            onChange={(e) => onChange({ endsAt: localInputToISO(e.target.value) })}
          />
        </div>
      </div>

      <AiGenerateSection row={row} onChange={onChange} setQuestions={setQuestions} setProblems={setProblems} />

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Savollar va variantlar</Label>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("pages.tests.addQuestion")}
          </Button>
        </div>

        {questions.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            {t("pages.tests.noQuestionsYetPrefix")}{t("pages.tests.addQuestion")}{t("pages.tests.noQuestionsYetSuffix")}
          </p>
        ) : null}

        <div className="space-y-3">
          {questions.map((q, qIdx) => {
            const isExpanded = expandedQuestions.has(qIdx);
            const correctChoice = q.choices.find((c) => c.isCorrect);
            return (
              <Card key={qIdx} className="shadow-none">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleQuestion(qIdx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleQuestion(qIdx);
                    }
                  }}
                  className="flex w-full cursor-pointer items-start gap-2 p-3 text-left"
                >
                  <ChevronRight
                    className={"mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform " + (isExpanded ? "rotate-90" : "")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {qIdx + 1}. {q.text || `Savol ${qIdx + 1}`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {correctChoice?.text
                        ? `To'g'ri javob: ${correctChoice.text}`
                        : "To'g'ri javob belgilanmagan"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeQuestion(qIdx);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isExpanded ? (
                  <CardContent className="space-y-3 border-t p-3 pt-3">
                    <Textarea
                      placeholder={`Savol ${qIdx + 1} matni`}
                      value={q.text}
                      onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                      className="min-h-[44px] flex-1"
                    />

                    <RadioGroup
                      value={String(q.choices.findIndex((c) => c.isCorrect))}
                      onValueChange={(v) => setCorrectChoice(qIdx, Number(v))}
                      className="space-y-2"
                    >
                      {q.choices.map((c, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2">
                          <RadioGroupItem value={String(cIdx)} id={`q${qIdx}-c${cIdx}`} />
                          <Input
                            placeholder={`Variant ${cIdx + 1}`}
                            value={c.text}
                            onChange={(e) => updateChoiceText(qIdx, cIdx, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground"
                            onClick={() => removeChoice(qIdx, cIdx)}
                            disabled={q.choices.length <= 2}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </RadioGroup>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addChoice(qIdx)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Variant qo'shish
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      To'g'ri javobni belgilash uchun variant yonidagi doiraga bosing.
                    </p>
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <div>
            <Label>Masalalar (ixtiyoriy)</Label>
            <p className="text-[11px] text-muted-foreground">
              LeetCode uslubidagi masalalar — savollardan alohida, testning pastida ko'rsatiladi.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addProblem}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Masala qo'shish
          </Button>
        </div>

        {problems.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Hozircha masala yo'q — bu bo'lim ixtiyoriy, xohlasangiz "AI orqali test yaratish"
            bo'limida masalalar sonini belgilab AI'ga generatsiya qildirishingiz yoki qo'lda
            qo'shishingiz mumkin.
          </p>
        ) : null}

        <div className="space-y-3">
          {problems.map((p, pIdx) => {
            const isExpanded = expandedProblems.has(pIdx);
            return (
              <Card key={pIdx} className="shadow-none">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleProblem(pIdx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleProblem(pIdx);
                    }
                  }}
                  className="flex w-full cursor-pointer items-start gap-2 p-3 text-left"
                >
                  <ChevronRight
                    className={"mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform " + (isExpanded ? "rotate-90" : "")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {pIdx + 1}. {p.title || `Masala ${pIdx + 1}`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Daraja: {p.difficulty === "SIMPLE" ? "Sodda" : p.difficulty === "DEEP" ? "Chuqur" : "O'rta"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProblem(pIdx);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isExpanded ? (
                  <CardContent className="space-y-3 border-t p-3 pt-3">
                    <Input
                      placeholder="Masala nomi"
                      value={p.title}
                      onChange={(e) => updateProblem(pIdx, { title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Masala sharti (to'liq matn)"
                      value={p.description}
                      onChange={(e) => updateProblem(pIdx, { description: e.target.value })}
                      className="min-h-[100px]"
                    />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="col-span-2 grid gap-1.5 sm:col-span-1">
                        <Label className="text-xs">Daraja</Label>
                        <Select
                          value={p.difficulty}
                          onValueChange={(v) => updateProblem(pIdx, { difficulty: v as CodingProblem["difficulty"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SIMPLE">Sodda</SelectItem>
                            <SelectItem value="MEDIUM">O'rta</SelectItem>
                            <SelectItem value="DEEP">Chuqur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Namuna kirish (ixtiyoriy)"
                      value={p.sampleInput ?? ""}
                      onChange={(e) => updateProblem(pIdx, { sampleInput: e.target.value })}
                      className="min-h-[44px] font-mono text-xs"
                    />
                    <Textarea
                      placeholder="Namuna chiqish (ixtiyoriy)"
                      value={p.sampleOutput ?? ""}
                      onChange={(e) => updateProblem(pIdx, { sampleOutput: e.target.value })}
                      className="min-h-[44px] font-mono text-xs"
                    />
                    <Input
                      placeholder="Cheklovlar (ixtiyoriy, masalan: 1 <= n <= 10^5)"
                      value={p.constraints ?? ""}
                      onChange={(e) => updateProblem(pIdx, { constraints: e.target.value })}
                    />
                    <Textarea
                      placeholder="Starter kod (ixtiyoriy)"
                      value={p.starterCode ?? ""}
                      onChange={(e) => updateProblem(pIdx, { starterCode: e.target.value })}
                      className="min-h-[60px] font-mono text-xs"
                    />
                    <Textarea
                      placeholder="Namunaviy to'g'ri yechim — AI tekshiruvida yordamchi sifatida ishlatiladi, o'quvchiga ko'rsatilmaydi"
                      value={p.referenceSolution ?? ""}
                      onChange={(e) => updateProblem(pIdx, { referenceSolution: e.target.value })}
                      className="min-h-[60px] font-mono text-xs"
                    />
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * POST /tests/ai-generate only returns a draft — it doesn't save anything. Generating fills the
 * title/type/questions above so the person can review and edit before actually saving the test
 * (via the normal Save button, which is a plain POST /tests).
 */
function AiGenerateSection({
  row,
  onChange,
  setQuestions,
  setProblems,
}: {
  row: Partial<Test> | null;
  onChange: (patch: Partial<Test>) => void;
  setQuestions: (next: TestQuestion[]) => void;
  setProblems: (next: CodingProblem[]) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("10");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [problemCount, setProblemCount] = useState("");
  const aiGenerate = useAiGenerateTest();

  const directionId = row?.directionId;

  const handleGenerate = () => {
    if (!directionId || !row?.type || !topic.trim()) return;
    aiGenerate.mutate(
      {
        directionId,
        groupId: row.groupId,
        type: row.type,
        topic: topic.trim(),
        count: count ? Number(count) : undefined,
        difficulty,
        problemCount: problemCount ? Number(problemCount) : undefined,
      },
      {
        onSuccess: (draft) => {
          onChange({
            title: draft.title ?? row?.title,
            minScore: draft.minScore ?? row?.minScore,
            problemCount: draft.problemCount ?? row?.problemCount,
          });
          if (draft.questions?.length) setQuestions(draft.questions);
          if (draft.problems?.length) setProblems(draft.problems);
          setOpen(false);
        },
      },
    );
  };

  return (
    <div className="rounded-md border p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-sm font-medium"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        AI orqali test yaratish
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          {!row?.directionId ? (
            <p className="text-[11px] text-destructive">
              Avval yuqorida "{t("nav.directions")}" ni tanlang — AI generatsiya uchun kerak.
            </p>
          ) : null}
          {!row?.type ? (
            <p className="text-[11px] text-destructive">
              Avval yuqorida "Type" ni tanlang — AI generatsiya uchun kerak.
            </p>
          ) : null}
          <div className="grid gap-1.5">
            <Label>{t("pages.tests.subject")}</Label>
            <Input
              placeholder="masalan: Present Simple"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Savollar soni</Label>
              <Input
                type="number"
                min={3}
                max={50}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Qiyinlik</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as typeof difficulty)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Oson</SelectItem>
                  <SelectItem value="medium">{t("pages.tests.medium")}</SelectItem>
                  <SelectItem value="hard">Qiyin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5 rounded-md border border-dashed p-2.5">
            <Label>Masalalar soni (butunlay ixtiyoriy)</Label>
            <Input
              type="number"
              min={0}
              max={20}
              placeholder="masalan: 5 — bo'sh qoldirsangiz masala qo'shilmaydi"
              value={problemCount}
              onChange={(e) => setProblemCount(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              AI shu mavzudan LeetCode uslubidagi masalalar yaratadi (savollar bilan
              aralashtirmaydi), daraja avtomatik sodda→o'rta→chuqur bo'yicha taqsimlanadi.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={!directionId || !row?.type || !topic.trim() || aiGenerate.isPending}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {aiGenerate.isPending ? t("pages.tests.generating") : t("pages.tests.generateBtn")}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Generatsiyadan keyin savollarni pastda ko'rib chiqib, kerak bo'lsa tahrirlang — hali
            saqlanmagan, faqat "{t("common.save")}" bosilganda saqlanadi.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function typeLabel(type: TestType) {
  return type === "DAILY" ? "Kunlik" : type === "WEEKLY" ? "Haftalik" : "Oylik";
}

/**
 * Student's own view of /tests — the backend already filters GET /tests down to just the
 * ACTIVE tests for this student's group/direction (see TestsService.findAll), so this is just
 * a "start" launcher. The actual lockdown test-taking experience lives on its own standalone
 * route (/take-test/$testId) with no sidebar/topnav, so there's nothing to alt-tab back into.
 */
function StudentTestsView() {
  const { t } = useTranslation();
  const { data, isLoading } = testsQ.useList({ limit: 50 });
  const tests = data?.data ?? [];

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader title={t("pages.tests.title")} description={t("pages.tests.subtitle")} />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : tests.length === 0 ? (
          <EmptyState
            title={t("common.empty")}
            description={t("pages.dashboard.noActiveTests")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => (
              <StudentTestCard key={test.id} test={test} />
            ))}
          </div>
        )}
      </div>
    </PageMotion>
  );
}

/**
 * GET /tests (list) doesn't include the student's own results (see TestsService.findAll), only
 * GET /tests/:id does — so each card fetches its own detail to know whether this student hasn't
 * started, is mid-attempt, or already submitted, and shows the matching status/button.
 */
function StudentTestCard({ test: listTest }: { test: Test }) {
  const { t } = useTranslation();
  const { data: detail } = useTest(listTest.id);
  const myResults = detail?.results ?? [];
  const current = myResults.find((r) => r.isCurrent);
  const latestSubmitted = [...myResults]
    .filter((r) => r.submittedAt)
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0];

  const status: "not_started" | "in_progress" | "finished" =
    current && !current.submittedAt ? "in_progress" : latestSubmitted ? "finished" : "not_started";

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{listTest.title}</CardTitle>
          <Badge variant="secondary">{typeLabel(listTest.type)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {listTest.durationMinutes ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {listTest.durationMinutes} daq
            </span>
          ) : null}
          {listTest.minScore ? <span>O'tish balli: {listTest.minScore}</span> : null}
          {status === "in_progress" ? (
            <Badge className="bg-warning/15 text-warning-foreground">{t("pages.tests.inProgress")}</Badge>
          ) : status === "finished" ? (
            <Badge className="bg-success/15 text-success">
              Tugagan{latestSubmitted ? ` · ${latestSubmitted.score}/100` : ""}
            </Badge>
          ) : null}
        </div>

        {status === "finished" ? (
          <Button className="w-full" variant="secondary" disabled>
            Test topshirilgan
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link to="/take-test/$testId" params={{ testId: String(listTest.id) }}>
              <PlayCircle className="mr-1.5 h-4 w-4" />
              {status === "in_progress" ? t("pages.tests.continueBtn") : t("pages.tests.startTestBtn")}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
