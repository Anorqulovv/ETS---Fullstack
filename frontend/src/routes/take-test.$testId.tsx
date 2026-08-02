import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Clock, Loader2, ShieldAlert, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { readStoredToken, readStoredUser } from "@/lib/auth-storage";
import { useMarkViolation, useStartTest, useSubmitTest, useTest } from "@/lib/api/hooks";
import type { StartTestResponse, SubmitTestResponse } from "@/lib/api/types";

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
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitTestResponse | null>(null);
  const [violationReason, setViolationReason] = useState<string | null>(null);

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
        const totalSeconds = res.durationMinutes ? res.durationMinutes * 60 : null;
        if (totalSeconds != null && res.startedAt) {
          const elapsed = Math.floor((Date.now() - new Date(res.startedAt).getTime()) / 1000);
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
      onError: () => setPhase("error"),
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
          message={t("pages.takeTest.errorMessage")}
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
