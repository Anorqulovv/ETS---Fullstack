import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { readStoredToken, readStoredUser } from "@/lib/auth-storage";
import {
  useMarkViolation,
  useMyCodingResults,
  useStartTest,
  useSubmitCodingProblem,
  useSubmitTest,
  useTest,
  useTestProblems,
} from "@/lib/api/hooks";
import type {
  CodingProblem,
  CodingSubmission,
  CodingSubmissionFeedback,
  StartTestResponse,
  SubmitTestResponse,
} from "@/lib/api/types";

export const Route = createFileRoute("/take-test/$testId")({
  head: () => ({ meta: [{ title: "Test — Edu CRM" }] }),
  // Deliberately outside the `_app` layout — no sidebar, no topnav, nothing to
  // click away to. Same auth check as the app shell, plus a STUDENT-only gate:
  // starting/submitting/violation endpoints are all @AccessRoles(STUDENT) on
  // the backend anyway, so anyone else here would just get 403s.
  beforeLoad: () => {
    const token = readStoredToken();
    const user = readStoredUser();
    if (!token || !user) {
      throw redirect({ to: "/login" });
    }
    if (user.role !== "STUDENT") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: TakeTestPage,
});

type Phase = "intro" | "loading" | "active" | "violated" | "submitted" | "error";

const VIOLATION_LABEL_KEYS: Record<string, string> = {
  TAB_HIDDEN: "pages.takeTest.violationTabHidden",
  WINDOW_BLUR: "pages.takeTest.violationWindowBlur",
  FULLSCREEN_EXITED: "pages.takeTest.violationFullscreenExited",
  BACK_NAVIGATION: "pages.takeTest.violationBackNav",
  TEST_PAGE_LEFT: "pages.takeTest.violationPageLeft",
  TIME_EXPIRED: "pages.takeTest.violationTimeExpired",
};

function violationLabel(reason: string | null, t: (key: string) => string) {
  if (!reason) return t("pages.takeTest.violationDefault");
  const key = VIOLATION_LABEL_KEYS[reason];
  return key ? t(key) : reason;
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TakeTestPage() {
  const { t } = useTranslation();
  const { testId } = Route.useParams();
  const testIdNum = Number(testId);
  const navigate = useNavigate();

  const { data: test, isLoading: testLoading, isError: testError } = useTest(testIdNum);
  const startMutation = useStartTest();
  const submitMutation = useSubmitTest();
  const violationMutation = useMarkViolation();

  const [phase, setPhase] = useState<Phase>("intro");
  const [startError, setStartError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitTestResponse | null>(null);
  const [violationReason, setViolationReason] = useState<string | null>(null);

  // Masalalar (coding problems) — ixtiyoriy, faqat ustoz belgilagan bo'lsa yuklanadi.
  const { data: problems } = useTestProblems(phase === "active" ? testIdNum : undefined);
  const hasProblems = (problems?.length ?? 0) > 0;

  // O'quvchi allaqachon AI bilan tekshirtirgan masalalar — shu urinish davomida
  // qayta yechib bo'lmaydi, shuning uchun har bir masalaga oldingi (tekshirilgan)
  // natijasini oldindan uzatamiz.
  const { data: myResults } = useMyCodingResults(phase === "active" ? testIdNum : undefined);
  const checkedByProblemId = new Map<number, CodingSubmission>();
  for (const s of myResults?.submissions ?? []) {
    if (s.status !== "CHECKED") continue;
    const prev = checkedByProblemId.get(s.problemId);
    if (!prev || (s.aiScore ?? 0) > (prev.aiScore ?? 0)) checkedByProblemId.set(s.problemId, s);
  }

  // Guards against double-firing (e.g. blur + visibilitychange both fire for one tab switch).
  const lockedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        /* ignore — nothing we can do if the browser refuses */
      });
    }
  };

  const reportViolation = useCallback(
    (reason: string) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setViolationReason(reason);
      setPhase("violated");
      exitFullscreen();
      violationMutation.mutate({ testId: testIdNum, reason });
    },
    [testIdNum, violationMutation],
  );

  const doSubmit = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    submitMutation.mutate(
      { testId: testIdNum, answers: answersRef.current },
      {
        onSuccess: (res) => {
          setResult(res);
          setPhase("submitted");
          exitFullscreen();
        },
        onError: () => {
          lockedRef.current = false;
          setPhase("error");
        },
      },
    );
  }, [testIdNum, submitMutation]);

  // Countdown — ticks once a second while the attempt is active; hits 0 -> auto-submit.
  useEffect(() => {
    if (phase !== "active" || remainingSeconds == null) return;
    if (remainingSeconds <= 0) {
      doSubmit();
      return;
    }
    const timer = setTimeout(() => setRemainingSeconds((s) => (s == null ? s : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [phase, remainingSeconds, doSubmit]);

  // Lockdown: copy/paste/right-click blocked outright; tab-switch, window-blur, exiting
  // fullscreen, and back-button attempts are all treated as a rule violation -> auto 0,
  // exactly like the backend's own TIME_EXPIRED handling in submitTest.
  useEffect(() => {
    if (phase !== "active") return;

    const onVisibility = () => {
      if (document.hidden) reportViolation("TAB_HIDDEN");
    };
    const onBlur = () => reportViolation("WINDOW_BLUR");
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) reportViolation("FULLSCREEN_EXITED");
    };
    const blockEvent = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isDevtoolsCombo =
        key === "f12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(key));
      const isClipboardCombo =
        (e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "u", "s"].includes(key);
      if (isDevtoolsCombo || isClipboardCombo) e.preventDefault();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("copy", blockEvent);
    document.addEventListener("cut", blockEvent);
    document.addEventListener("paste", blockEvent);
    document.addEventListener("contextmenu", blockEvent);
    document.addEventListener("keydown", onKeyDown);

    // Back button: push a guard entry and immediately restore it if the user tries to leave.
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      reportViolation("BACK_NAVIGATION");
    };
    window.addEventListener("popstate", onPopState);

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("copy", blockEvent);
      document.removeEventListener("cut", blockEvent);
      document.removeEventListener("paste", blockEvent);
      document.removeEventListener("contextmenu", blockEvent);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [phase, reportViolation]);

  const handleStart = () => {
    setPhase("loading");
    startMutation.mutate(testIdNum, {
      onSuccess: (res: StartTestResponse) => {
        // Backend endi aniq "deadlineAt"ni hisoblab yuboradi: oddiy urinishda
        // testning umumiy tugash vaqtigacha, qayta ishlashga ruxsat berilganda esa
        // yangi boshlangan vaqtdan + davomiylik. `durationMinutes` endi timer uchun
        // ishlatilmaydi (faqat intro ekranida ma'lumot sifatida ko'rsatiladi).
        const totalSeconds =
          res.deadlineAt && res.startedAt
            ? Math.max(
                0,
                Math.round(
                  (new Date(res.deadlineAt).getTime() - new Date(res.startedAt).getTime()) / 1000,
                ),
              )
            : null;
        if (totalSeconds != null && res.startedAt) {
          // Elapsed vaqtni HAR IKKALA tomonni ham serverdan olingan vaqt bilan hisoblaymiz
          // (startedAt va serverNow — ikkalasi ham backend clock'i). Agar bu yerda
          // `Date.now()` (klient kompyuteri vaqti) ishlatilsa, kompyuter/telefon vaqti
          // noto'g'ri sozlangan foydalanuvchilarda test boshlanishi bilanoq "vaqt tugadi"
          // deb avtomatik topshirilib ketishi yoki aksincha noto'g'ri ko'p vaqt qolgandek
          // ko'rsatishi mumkin edi.
          const referenceNow = res.serverNow ? new Date(res.serverNow).getTime() : Date.now();
          const elapsed = Math.floor((referenceNow - new Date(res.startedAt).getTime()) / 1000);
          setRemainingSeconds(Math.max(0, totalSeconds - elapsed));
        } else {
          setRemainingSeconds(totalSeconds);
        }
        setPhase("active");
        // Best-effort — needs a user gesture, which this click provides. If the browser
        // still refuses (unsupported, embedded webview, etc.) the test still works; the
        // other listeners (blur/visibility/back-button) keep covering the "left the screen" case.
        const el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        }
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === "object" && "response" in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setStartError(message ?? null);
        setPhase("error");
      },
    });
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = test?.questions?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      {phase === "intro" || phase === "loading" ? (
        <IntroScreen
          loading={testLoading || phase === "loading"}
          error={testError}
          title={test?.title}
          questionCount={totalQuestions}
          durationMinutes={test?.durationMinutes}
          minScore={test?.minScore}
          onStart={handleStart}
          onCancel={() => void navigate({ to: "/tests" })}
        />
      ) : null}

      {phase === "active" && test ? (
        <div className="mx-auto w-full max-w-3xl flex-1 select-none px-4 py-6">
          <div className="sticky top-0 z-10 mb-6 flex items-center justify-between rounded-lg border bg-card/95 px-4 py-3 shadow-soft backdrop-blur">
            <div className="min-w-0">
              <div className="truncate font-medium">{test.title}</div>
              <div className="text-xs text-muted-foreground">
                {answeredCount}/{totalQuestions} javob berildi
              </div>
            </div>
            {remainingSeconds != null ? (
              <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 font-mono text-sm font-semibold text-primary">
                <Clock className="h-4 w-4" />
                {formatClock(remainingSeconds)}
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            {(test.questions ?? []).map((q, qIdx) => (
              <div key={q.id ?? qIdx} className="rounded-xl border bg-card p-4 shadow-soft">
                <p className="mb-3 font-medium">
                  {qIdx + 1}. {q.text}
                </p>
                <RadioGroup
                  value={q.id != null ? String(answers[q.id] ?? "") : undefined}
                  onValueChange={(v) => {
                    if (q.id == null) return;
                    setAnswers((prev) => ({ ...prev, [q.id as number]: Number(v) }));
                  }}
                  className="space-y-2"
                >
                  {q.choices.map((c, cIdx) => (
                    <label
                      key={c.id ?? cIdx}
                      className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm hover:bg-accent"
                    >
                      <RadioGroupItem value={String(c.id ?? cIdx)} />
                      {c.text}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>

          {hasProblems ? (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 border-t pt-6">
                <Braces className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Masalalar</h2>
                <span className="text-xs text-muted-foreground">
                  ({problems?.length} ta, ixtiyoriy — istasangiz yechib ko'ring)
                </span>
              </div>
              {(problems ?? []).map((problem, pIdx) => (
                <CodingProblemCard
                  key={problem.id ?? pIdx}
                  index={pIdx + 1}
                  problem={problem}
                  testId={testIdNum}
                  existingSubmission={problem.id ? checkedByProblemId.get(problem.id) : undefined}
                />
              ))}
            </div>
          ) : null}

          <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-background/95 py-4 backdrop-blur">
            <Button onClick={doSubmit} disabled={submitMutation.isPending} size="lg">
              {submitMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              {t("pages.takeTest.submitTest")}
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "violated" ? (
        <ResultScreen
          icon={<ShieldAlert className="h-10 w-10 text-destructive" />}
          tone="destructive"
          title={t("pages.takeTest.violationTitle")}
          message={t("pages.takeTest.violatedMessage", { reason: violationLabel(violationReason, t) })}
          onExit={() => void navigate({ to: "/tests" })}
        />
      ) : null}

      {phase === "submitted" && result ? (
        <ResultScreen
          icon={
            result.passed ? (
              <CheckCircle2 className="h-10 w-10 text-success" />
            ) : (
              <XCircle className="h-10 w-10 text-destructive" />
            )
          }
          tone={result.passed ? "success" : "destructive"}
          title={result.passed ? t("pages.takeTest.passedTitle") : t("pages.takeTest.failedTitle")}
          message={t("pages.takeTest.resultMessage", { score: result.score })}
          onExit={() => void navigate({ to: "/tests" })}
        />
      ) : null}

      {phase === "error" ? (
        <ResultScreen
          icon={<AlertTriangle className="h-10 w-10 text-destructive" />}
          tone="destructive"
          title={t("pages.takeTest.errorTitle")}
          message={startError ?? t("pages.takeTest.errorMessage")}
          onExit={() => void navigate({ to: "/tests" })}
        />
      ) : null}
    </div>
  );
}

function IntroScreen({
  loading,
  error,
  title,
  questionCount,
  durationMinutes,
  minScore,
  onStart,
  onCancel,
}: {
  loading: boolean;
  error: boolean;
  title?: string;
  questionCount: number;
  durationMinutes?: number;
  minScore?: number;
  onStart: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-soft">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">Testni yuklab bo'lmadi.</p>
            <Button variant="outline" onClick={onCancel}>
              Ortga
            </Button>
          </div>
        ) : (
          <>
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h1 className="text-lg font-semibold">{title ?? "Test"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {questionCount} savol{durationMinutes ? ` · ${durationMinutes} daqiqa` : ""}
              {minScore ? ` · O'tish balli: ${minScore}` : ""}
            </p>

            <div className="mt-4 space-y-1.5 rounded-md bg-destructive/10 p-3 text-left text-xs text-destructive">
              <p className="font-medium">{t("pages.takeTest.rulesTitle")}</p>
              <p>• Boshqa varaq/oynaga o'tish, nusxa olish/qo'yish taqiqlanadi.</p>
              <p>• Bu qoidalar buzilsa, natijangiz avtomatik 0 ball bo'ladi.</p>
              <p>• Test to'liq ekranda ochiladi — chiqmang.</p>
            </div>

            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Bekor qilish
              </Button>
              <Button className="flex-1" onClick={onStart}>
                Testni boshlash
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultScreen({
  icon,
  tone,
  title,
  message,
  onExit,
}: {
  icon: ReactNode;
  tone: "success" | "destructive";
  title: string;
  message: string;
  onExit: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div
        className={`w-full max-w-md rounded-xl border p-6 text-center shadow-soft ${
          tone === "success" ? "bg-success/5" : "bg-destructive/5"
        }`}
      >
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-card">
          {icon}
        </div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button className="mt-5 w-full" onClick={onExit}>
          Testlar ro'yxatiga qaytish
        </Button>
      </div>
    </div>
  );
}

const DIFFICULTY_META: Record<
  string,
  { label: string; className: string }
> = {
  SIMPLE: { label: "Sodda", className: "bg-success/10 text-success" },
  MEDIUM: { label: "O'rta", className: "bg-amber-500/10 text-amber-600" },
  DEEP: { label: "Chuqur", className: "bg-destructive/10 text-destructive" },
};

const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
];

function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, { label: string; className: string }> = {
    CORRECT: { label: "To'g'ri", className: "bg-success/10 text-success" },
    PARTIAL: { label: "Qisman to'g'ri", className: "bg-amber-500/10 text-amber-600" },
    INCORRECT: { label: "Noto'g'ri", className: "bg-destructive/10 text-destructive" },
  };
  const meta = map[verdict] ?? { label: verdict, className: "bg-muted text-muted-foreground" };
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

function CodingProblemCard({
  index,
  problem,
  testId,
  existingSubmission,
}: {
  index: number;
  problem: CodingProblem;
  testId: number;
  existingSubmission?: CodingSubmission;
}) {
  const [code, setCode] = useState(existingSubmission?.code ?? problem.starterCode ?? "");
  const [language, setLanguage] = useState(existingSubmission?.language ?? "javascript");
  const [feedback, setFeedback] = useState<CodingSubmissionFeedback | null>(
    (existingSubmission?.aiFeedback as CodingSubmissionFeedback | undefined) ?? null,
  );
  const [score, setScore] = useState<number | null>(existingSubmission?.aiScore ?? null);
  // Bir marta AI bilan tekshirilgan masalani qayta o'zgartirib bo'lmaydi (backend ham
  // buni ForbiddenException bilan taqiqlaydi — bu shunchaki UI darajasidagi aks ettirish).
  const [locked, setLocked] = useState(Boolean(existingSubmission));
  const submitMutation = useSubmitCodingProblem();

  const difficultyMeta = DIFFICULTY_META[problem.difficulty] ?? {
    label: problem.difficulty,
    className: "bg-muted text-muted-foreground",
  };

  const handleCheck = () => {
    if (!problem.id || !code.trim() || locked) return;
    submitMutation.mutate(
      { problemId: problem.id, testId, code, language },
      {
        onSuccess: (res) => {
          setFeedback(res.feedback);
          setScore(res.score);
          setLocked(true);
        },
      },
    );
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {index}-masala: {problem.title}
        </p>
        <Badge className={difficultyMeta.className}>{difficultyMeta.label}</Badge>
      </div>

      <p className="whitespace-pre-line text-sm text-muted-foreground">{problem.description}</p>

      {problem.sampleInput || problem.sampleOutput ? (
        <div className="mt-3 grid gap-2 rounded-md bg-muted/50 p-3 text-xs sm:grid-cols-2">
          {problem.sampleInput ? (
            <div>
              <p className="mb-1 font-medium text-muted-foreground">Namuna kirish</p>
              <pre className="whitespace-pre-wrap">{problem.sampleInput}</pre>
            </div>
          ) : null}
          {problem.sampleOutput ? (
            <div>
              <p className="mb-1 font-medium text-muted-foreground">Namuna chiqish</p>
              <pre className="whitespace-pre-wrap">{problem.sampleOutput}</pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {problem.constraints ? (
        <p className="mt-2 text-xs text-muted-foreground">Cheklovlar: {problem.constraints}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Label className="text-xs text-muted-foreground">Til:</Label>
        {LANGUAGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => !locked && setLanguage(opt.value)}
            disabled={locked}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              language === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent"
            } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Yechimingizni shu yerga yozing..."
        className={`mt-2 min-h-[160px] font-mono text-sm ${locked ? "cursor-not-allowed opacity-70" : ""}`}
        spellCheck={false}
        disabled={locked}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Bu masala tekshirilgan — endi o'zgartirib bo'lmaydi
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheck}
            disabled={submitMutation.isPending || !code.trim()}
          >
            {submitMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Braces className="mr-1.5 h-3.5 w-3.5" />
            )}
            AI bilan tekshirish
          </Button>
        )}
        {score != null ? (
          <span className="text-sm font-semibold">
            Ball: <span className="text-primary">{score}</span>/100
          </span>
        ) : null}
      </div>

      {feedback ? (
        <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex items-center gap-2">
            <VerdictBadge verdict={feedback.verdict} />
          </div>
          {feedback.summary ? <p>{feedback.summary}</p> : null}
          {feedback.strengths?.length ? (
            <div>
              <p className="text-xs font-medium text-success">Ijobiy tomonlari:</p>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {feedback.issues?.length ? (
            <div>
              <p className="text-xs font-medium text-destructive">Kamchiliklar:</p>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {feedback.issues.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {feedback.complexity ? (
            <p className="text-xs text-muted-foreground">Murakkablik: {feedback.complexity}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
