import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Role } from "@/lib/roles";
import {
  apiCreate,
  apiGet,
  apiList,
  apiRemove,
  apiRequest,
  apiUpdate,
  type ListParams,
  type Paginated,
} from "./client";
import type {
  AttendanceRecord,
  Branch,
  DashboardData,
  Direction,
  Group,
  NotificationItem,
  Parent,
  Payment,
  PaymentsSummary,
  PaymentSettings as PaymentSettingsT,
  StudentBalance,
  ShopItem,
  SalaryInfo,
  SalarySettingsT,
  Student,
  StudentDetail,
  StartTestResponse,
  SubmitTestResponse,
  Teacher,
  Test,
  TestQuestion,
  User,
  CodingProblem,
  CodingSubmission,
  SubmitCodingProblemResponse,
  MyCodingResultsResponse,
  ProblemDifficulty,
  CodingSubmissionFeedback,
} from "./types";

/**
 * REST paths on the Edu-backend NestJS API (global prefix "/api" is already
 * part of VITE_API_BASE_URL, see src/lib/api/client.ts). These match the
 * controllers actually wired into AppModule — see src/app.module.ts in the
 * backend. "/payments" and "/activity" ARE real backend modules now
 * (PaymentsModule, ActivityModule in app.module.ts), and so is "/users" —
 * a real, role-agnostic directory (GET /users?role=X, PATCH /users/:id)
 * that used to be dead code (UsersModule was never imported into AppModule).
 */
const RESOURCES = {
  branches: "/branches",
  directions: "/directions",
  teachers: "/teachers",
  groups: "/groups",
  students: "/students",
  parents: "/parents",
  payments: "/payments",
  attendance: "/attendance",
  tests: "/tests",
  notifications: "/notifications",
  users: "/users",
  supportTeachers: "/supports",
  activity: "/activity", // SUPERADMIN-only (see ActivityController)
} as const;

function createCrudHooks<T extends { id?: number | string }>(
  resource: string,
  queryKey: string,
  extraParams?: ListParams,
  /**
   * Some backend resources (Student, Parent) live in their own table and nest
   * personal info under a `user` relation instead of having it flat on the
   * record — e.g. `{ id, cardId, user: { fullName, phone, username } }`
   * instead of `{ id, cardId, fullName, phone, username }`. The rest of the
   * UI (tables, avatars, dashboard widgets) is written against the flat
   * shape, so this reshapes every record right after it comes back from the
   * API, in one place, instead of every call site needing to know about `.user`.
   */
  transform?: (raw: unknown) => T,
  /**
   * Create/update forms (see CrudPage.openEdit) seed their form state from a LIST row, not a
   * blank object — and list rows often carry eager-loaded relation objects the backend never
   * declared on the write DTO (e.g. a Group row has both `teacherId` *and* a full nested
   * `teacher: {...}` object; User-based rows — teachers/admins/supports — eager-load `direction`
   * and `branch` objects the same way). The global ValidationPipe rejects any unknown field
   * (forbidNonWhitelisted), so submitting the untouched row as-is 422s. Passing the DTO's real
   * field names here strips everything else before every create/update request.
   */
  allowedFields?: (keyof T)[],
) {
  // Every create/update DTO on this backend is generated from the entity minus its
  // auto-managed columns — none of them accept `id`/`createdAt`/`updatedAt` in the body (id
  // comes from the URL, the timestamps are server-set) — yet CrudPage's edit form starts from
  // a full list row (see openEdit in crud-page.tsx), which has all three. Strip them
  // unconditionally so an untouched save never 422s, even for resources with no explicit
  // allowlist below.
  const ALWAYS_STRIPPED = ["id", "createdAt", "updatedAt"] as const;

  function pick(payload: Partial<T>): Partial<T> {
    const base: Partial<T> = { ...payload };
    for (const key of ALWAYS_STRIPPED) {
      delete (base as Record<string, unknown>)[key];
    }
    // "" almost always means "the user didn't touch this optional field", not "explicitly clear
    // it" — and several DTOs run format validators (e.g. the +998 phone regex) that reject an
    // empty string outright (whitelist/forbidNonWhitelisted still lets it through the gate, but
    // the field-level validator then 400s). Treat "" like "not provided" everywhere.
    for (const key of Object.keys(base) as (keyof T)[]) {
      if (base[key] === "") delete base[key];
    }
    if (!allowedFields) return base;
    const out: Partial<T> = {};
    for (const key of allowedFields) {
      if (key in base) out[key] = base[key];
    }
    return out;
  }

  function useList(params: ListParams = {}) {
    return useQuery({
      queryKey: [queryKey, "list", params],
      queryFn: async () => {
        const result = await apiList<T>(resource, { ...extraParams, ...params });
        if (!transform) return result;
        return { ...result, data: result.data.map((item) => transform(item)) };
      },
      placeholderData: (prev) => prev,
    });
  }

  function useCreate(onDone?: () => void) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (payload: Partial<T>) => apiCreate<T>(resource, pick(payload)),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: [queryKey] });
        toast.success("Created successfully");
        onDone?.();
      },
      onError: (error: unknown) => {
        toast.error(errorMessage(error, "Failed to create"));
      },
    });
  }

  function useUpdate(onDone?: () => void) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, payload }: { id: number | string; payload: Partial<T> }) =>
        apiUpdate<T>(resource, id, pick(payload)),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: [queryKey] });
        toast.success("Updated successfully");
        onDone?.();
      },
      onError: (error: unknown) => {
        toast.error(errorMessage(error, "Failed to update"));
      },
    });
  }

  function useRemove(onDone?: () => void) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: number | string) => apiRemove(resource, id),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: [queryKey] });
        toast.success("Deleted successfully");
        onDone?.();
      },
      onError: (error: unknown) => {
        toast.error(errorMessage(error, "Failed to delete"));
      },
    });
  }

  return { useList, useCreate, useUpdate, useRemove };
}

/** Flattens `{ id, cardId, groupId, parentId, user: {...} }` -> flat Student. */
function flattenStudent(raw: unknown): Student {
  const r = (raw ?? {}) as Record<string, unknown> & {
    user?: Record<string, unknown>;
    parent?: { id?: number; user?: { fullName?: string } };
  };
  const user = r.user ?? {};
  return {
    id: r.id as number,
    fullName: (user.fullName as string) ?? (r.fullName as string) ?? "—",
    cardId: (r.cardId as string) ?? undefined,
    username: (user.username as string) ?? (r.username as string) ?? undefined,
    phone: (user.phone as string) ?? (r.phone as string) ?? undefined,
    groupId: (r.groupId as number) ?? undefined,
    createdAt: (r.createdAt as string) ?? undefined,
    parentId: (r.parentId as number) ?? r.parent?.id ?? undefined,
    parentName: r.parent?.user?.fullName ?? undefined,
  };
}

/** Flattens `{ id, phone2, user: {...} }` -> flat Parent. */
function flattenParent(raw: unknown): Parent {
  const r = (raw ?? {}) as Record<string, unknown> & { user?: Record<string, unknown> };
  const user = r.user ?? {};
  return {
    id: r.id as number,
    fullName: (user.fullName as string) ?? (r.fullName as string) ?? "—",
    username: (user.username as string) ?? (r.username as string) ?? undefined,
    phone: (user.phone as string) ?? (r.phone2 as string) ?? (r.phone as string) ?? undefined,
    childrenCount: Array.isArray(r.students) ? (r.students as unknown[]).length : undefined,
    telegramId: (user.telegramId as string) ?? (r.telegramId as string) ?? undefined,
  };
}

/** Flattens `{ id, studentId, amount, ..., student: { user: {...} } }` -> Payment with studentName. */
function flattenPayment(raw: unknown): Payment {
  const r = (raw ?? {}) as Payment & {
    student?: { user?: { fullName?: string } };
  };
  return {
    ...r,
    studentName: r.student?.user?.fullName ?? r.studentName ?? "—",
  };
}
/** Backend includes the student.user relation but not a flat name — derive it (see AttendanceController's `relations: ['student', 'student.user', ...]`). */
function flattenAttendance(raw: unknown): AttendanceRecord {
  const r = (raw ?? {}) as AttendanceRecord & {
    student?: { user?: { fullName?: string } };
  };
  return {
    ...r,
    studentName: r.student?.user?.fullName ?? r.studentName,
  };
}
function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as { response?: { data?: { message?: string } } }).response;
    if (resp?.data?.message) return resp.data.message;
  }
  return fallback;
}

export const branchesQ = createCrudHooks<Branch>(RESOURCES.branches, "branches");
export const directionsQ = createCrudHooks<Direction>(RESOURCES.directions, "directions");
/**
 * TypeORM's `simple-array` column (see User.directionIds) hydrates as an array of *strings*
 * (it's just `value.split(',')`) no matter what the entity's TS type annotation says — so
 * `directionIds` comes back over the wire as e.g. `["1","2"]`, not `[1,2]`. Left alone, every
 * `directionIds.includes(direction.id)` check in the UI silently fails (string !== number) and
 * a teacher's saved directions never show as checked. Coerce to numbers once, here.
 */
function flattenTeacher(raw: unknown): Teacher {
  const r = (raw ?? {}) as Teacher;
  return {
    ...r,
    directionIds: r.directionIds?.length ? r.directionIds.map(Number) : r.directionIds,
  };
}
export const teachersQ = createCrudHooks<Teacher>(RESOURCES.teachers, "teachers", undefined, flattenTeacher, [
  "fullName",
  "username",
  "phone",
  "password",
  "directionId",
  "directionIds",
  "branchId",
  "salary",
  "gender",
]);
/** Backend returns the full `students` relation array, not a `studentsCount` number — derive it. */
function flattenGroup(raw: unknown): Group {
  const r = (raw ?? {}) as Group & { students?: unknown[] };
  return {
    ...r,
    studentsCount: Array.isArray(r.students) ? r.students.length : r.studentsCount,
  };
}

export const groupsQ = createCrudHooks<Group>(RESOURCES.groups, "groups", undefined, flattenGroup, [
  "name",
  "status",
  "teacherId",
  "directionId",
  "startDate",
  "endDate",
  "supportId",
  "lessonDays",
  "lessonTime",
  "lessonDuration",
  "branchId",
]);

export interface CancelledLesson {
  id: number;
  groupId: number;
  date: string;
  reason?: string;
  createdAt?: string;
}

/** GET /groups/:id/cancelled-lessons */
export function useCancelledLessons(groupId?: number) {
  return useQuery({
    queryKey: ["groups", groupId, "cancelled-lessons"],
    queryFn: () =>
      apiRequest<CancelledLesson[]>({ url: `${RESOURCES.groups}/${groupId}/cancelled-lessons`, method: "GET" }),
    enabled: !!groupId,
  });
}

/** POST /groups/:id/cancel-lesson — cancels a lesson day and pushes the group's endDate out by one lesson slot. */
export function useCancelLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, ...payload }: { groupId: number; date: string; reason?: string }) =>
      apiRequest<{ cancelledDate: string; newEndDate: string }>({
        url: `${RESOURCES.groups}/${groupId}/cancel-lesson`,
        method: "POST",
        data: payload,
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["groups", variables.groupId, "cancelled-lessons"] });
      toast.success("Dars bekor qilindi, kursga bitta dars qo'shildi");
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Darsni bekor qilib bo'lmadi")),
  });
}

export const studentsQ = createCrudHooks<Student>(
  RESOURCES.students,
  "students",
  undefined,
  flattenStudent,
  ["fullName", "username", "phone", "cardId", "groupId", "parentId", "password", "gender"],
);

/** GET /students/:id — full detail (group/teacher/direction, attendance, test results, stats). */
export function useStudentDetail(id?: number | string) {
  return useQuery({
    queryKey: ["students", id, "detail"],
    queryFn: () => apiRequest<StudentDetail>({ url: `${RESOURCES.students}/${id}`, method: "GET" }),
    enabled: id != null,
  });
}

export const parentsQ = createCrudHooks<Parent>(
  RESOURCES.parents,
  "parents",
  undefined,
  flattenParent,
  ["fullName", "username", "phone", "password", "telegramId", "gender"],
);
/** GET /payments/my — STUDENT's own payment history. */
export function useMyPayments() {
  return useQuery({
    queryKey: ["payments", "my"],
    queryFn: async () => {
      const raw = await apiRequest<(Payment & { group?: { id: number; name: string } })[]>({
        url: `${RESOURCES.payments}/my`,
        method: "GET",
      });
      return raw;
    },
  });
}

/** GET /payments/children — PARENT's children's payment history. */
export function useChildrenPayments() {
  return useQuery({
    queryKey: ["payments", "children"],
    queryFn: () =>
      apiRequest<(Payment & { studentName?: string; student?: { user?: { fullName?: string } } })[]>({
        url: `${RESOURCES.payments}/children`,
        method: "GET",
      }),
  });
}

/** GET /payments/children-debt — real qarzdorlik (kurs narxi/chegirma asosida), ota-ona uchun. */
export function useChildrenDebt() {
  return useQuery({
    queryKey: ["payments", "children-debt"],
    queryFn: () =>
      apiRequest<{ totalDebt: number; childrenWithDebt: number; childrenCount: number }>({
        url: `${RESOURCES.payments}/children-debt`,
        method: "GET",
      }),
  });
}

export const paymentsQ = createCrudHooks<Payment>(
  RESOURCES.payments,
  "payments",
  undefined,
  flattenPayment,
  ["studentId", "groupId", "amount", "method", "status", "month", "paidAt", "comment"],
);
export const attendanceQ = createCrudHooks<AttendanceRecord>(RESOURCES.attendance, "attendance", undefined, flattenAttendance);
/**
 * CreateTestDto/UpdateTestDto's nested question/choice DTOs don't have an `id` field and the
 * global ValidationPipe uses forbidNonWhitelisted — so sending back the `id`s that GET /tests/:id
 * included (when editing an existing test) would 422. Strip them before every create/update.
 */
function sanitizeTestQuestions(questions?: TestQuestion[]) {
  if (!questions) return questions;
  return questions.map((q) => ({
    text: q.text,
    choices: q.choices.map((c) => ({ text: c.text, isCorrect: !!c.isCorrect })),
  }));
}

/** Same reasoning as sanitizeTestQuestions — strip `id`s and any extra fields before sending. */
function sanitizeCodingProblems(problems?: CodingProblem[]) {
  if (!problems) return problems;
  return problems
    .filter((p) => p.title?.trim() && p.description?.trim())
    .map((p) => ({
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      starterCode: p.starterCode || undefined,
      sampleInput: p.sampleInput || undefined,
      sampleOutput: p.sampleOutput || undefined,
      constraints: p.constraints || undefined,
      referenceSolution: p.referenceSolution || undefined,
    }));
}

/**
 * The edit form's payload starts from a list row (see CrudPage.openEdit), which — unlike a
 * fresh create form — also carries fields GET /tests never accepts back: nested `direction`/
 * `group` objects, `id`, `createdAt`, `results`, etc. Sending those through crashed every save
 * with a 422 (forbidNonWhitelisted). Only pass along what CreateTestDto/UpdateTestDto actually
 * declare.
 */
function pickTestDtoFields(payload: Partial<Test>) {
  const {
    title,
    type,
    status,
    groupId,
    directionId,
    minScore,
    startsAt,
    endsAt,
    durationMinutes,
    lessonNumber,
    weekNumber,
    monthNumber,
    questions,
    problemCount,
    problemDifficultyMix,
    problems,
  } = payload;
  return {
    title,
    type,
    status,
    groupId,
    directionId,
    minScore,
    startsAt,
    endsAt,
    durationMinutes,
    lessonNumber,
    weekNumber,
    monthNumber,
    questions: sanitizeTestQuestions(questions),
    problemCount,
    problemDifficultyMix,
    problems: sanitizeCodingProblems(problems),
  };
}

export function useCreateTest(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Test>) => apiCreate<Test>(RESOURCES.tests, pickTestDtoFields(payload)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tests"] });
      toast.success("Created successfully");
      onDone?.();
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Failed to create")),
  });
}

export function useUpdateTest(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Partial<Test> }) =>
      apiUpdate<Test>(RESOURCES.tests, id, pickTestDtoFields(payload)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tests"] });
      toast.success("Updated successfully");
      onDone?.();
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Failed to update")),
  });
}

export interface TestReview {
  testId: number;
  testTitle: string;
  studentId: number;
  studentName?: string;
  attempts: {
    resultId: number;
    score: number;
    attempt: number;
    isCurrent: boolean;
    createdAt?: string;
    questions: {
      questionId: number;
      questionText: string;
      selectedChoiceId: number | null;
      selectedChoiceText: string | null;
      correctChoiceId: number | null;
      correctChoiceText: string | null;
      isCorrect: boolean;
    }[];
    wrongQuestions: unknown[];
    problemsScore: number | null;
    problemsChecked: boolean;
    problems: {
      problemId: number;
      title: string;
      difficulty: ProblemDifficulty;
      code: string | null;
      language: string | null;
      status: "PENDING" | "CHECKING" | "CHECKED" | "FAILED" | "NOT_SUBMITTED";
      aiScore: number | null;
      aiFeedback: CodingSubmissionFeedback | null;
    }[];
  }[];
}

/** GET /tests/:testId/student/:studentId/review — per-question right/wrong breakdown, every attempt. */
export function useTestReview(testId: number | null, studentId: number | null) {
  return useQuery({
    queryKey: ["tests", "review", testId, studentId],
    queryFn: () =>
      apiRequest<TestReview>({
        url: `${RESOURCES.tests}/${testId}/student/${studentId}/review`,
        method: "GET",
      }),
    enabled: testId != null && studentId != null,
  });
}

/**
 * DELETE /tests/:testId/reset/:studentId — archives the student's current attempt and lets them
 * start the test again (see resetTestAttempt / the "Ustoz o'quvchiga testni qayta ishlashga
 * ruxsat beradi" comment in the backend).
 */
export function useResetTestAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ testId, studentId }: { testId: number; studentId: number }) =>
      apiRequest<{ message: string }>({
        url: `${RESOURCES.tests}/${testId}/reset/${studentId}`,
        method: "DELETE",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tests"] });
      toast.success("Qayta ishlashga ruxsat berildi");
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Failed")),
  });
}

export interface PointsLogEntry {
  id: number;
  source: "ATTENDANCE" | "TEST";
  amount: number;
  note?: string;
  createdAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: number;
  fullName: string;
  points: number;
}

/** GET /gamification/my — STUDENT only: their points total + recent history. */
export function useMyPoints() {
  return useQuery({
    queryKey: ["gamification", "my"],
    queryFn: () =>
      apiRequest<{ points: number; logs: PointsLogEntry[] }>({
        url: "/gamification/my",
        method: "GET",
      }),
    retry: 1,
  });
}

/** GET /gamification/leaderboard — top students by points, optionally scoped to one group. */
export function useLeaderboard(groupId?: number, limit = 10) {
  return useQuery({
    queryKey: ["gamification", "leaderboard", groupId, limit],
    queryFn: () =>
      apiRequest<LeaderboardEntry[]>({
        url: "/gamification/leaderboard",
        method: "GET",
        params: { groupId, limit },
      }),
  });
}

/** POST /gamification/award — SUPERADMIN/ADMIN/TEACHER give (or dock) a student points. */
export function useAwardPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { studentId: number; amount: number; note?: string }) =>
      apiRequest<{ studentId: number; points: number }>({
        url: "/gamification/award",
        method: "POST",
        data: payload,
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["gamification"] });
      toast.success(variables.amount < 0 ? "Ball ayirildi" : "Ball qo'shildi");
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Ball qo'shib bo'lmadi")),
  });
}

/** GET /gamification/shop. Pass all=true (staff only) to also see inactive items. */
export function useShopItems(all = false) {
  return useQuery({
    queryKey: ["gamification", "shop", all],
    queryFn: () =>
      apiRequest<ShopItem[]>({ url: "/gamification/shop", method: "GET", params: { all: all ? "true" : undefined } }),
  });
}

export function useCreateShopItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ShopItem>) =>
      apiRequest<ShopItem>({ url: "/gamification/shop", method: "POST", data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["gamification", "shop"] });
      toast.success(toastCreated());
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Mahsulot qo'shib bo'lmadi")),
  });
}

export function useUpdateShopItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<ShopItem> & { id: number }) =>
      apiRequest<ShopItem>({ url: `/gamification/shop/${id}`, method: "PATCH", data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["gamification", "shop"] });
      toast.success(toastUpdated());
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Mahsulotni yangilab bo'lmadi")),
  });
}

export function useDeleteShopItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest({ url: `/gamification/shop/${id}`, method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["gamification", "shop"] });
      toast.success(toastDeleted());
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Mahsulotni o'chirib bo'lmadi")),
  });
}

/** POST /gamification/shop/:id/purchase — STUDENT spends points on an item. */
export function usePurchaseShopItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      apiRequest<{ studentId: number; points: number; item: string }>({
        url: `/gamification/shop/${itemId}/purchase`,
        method: "POST",
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["gamification"] });
      toast.success(`${data?.item ?? "Mahsulot"} xarid qilindi!`);
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Xarid qilib bo'lmadi")),
  });
}

// ==================== OYLIK (dars kuni/soati asosida) ====================

/** GET /salary/settings — 1-dars uchun standart narxlar (o'qituvchi/support). */
export function useSalarySettings() {
  return useQuery({
    queryKey: ["salary", "settings"],
    queryFn: () => apiRequest<SalarySettingsT>({ url: "/salary/settings", method: "GET" }),
  });
}

export function useUpdateSalarySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SalarySettingsT) =>
      apiRequest<SalarySettingsT>({ url: "/salary/settings", method: "PATCH", data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["salary"] });
      toast.success("Standart narxlar yangilandi");
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Saqlab bo'lmadi")),
  });
}

/** GET /salary/overview — barcha o'qituvchi/support'larning shu oygi oyligi (SUPERADMIN/ADMIN). */
export function useSalaryOverview(month?: string) {
  return useQuery({
    queryKey: ["salary", "overview", month],
    queryFn: () => apiRequest<SalaryInfo[]>({ url: "/salary/overview", method: "GET", params: { month } }),
  });
}

/** GET /salary/my — TEACHER/SUPPORT o'zining oyligi. Pass enabled=false for other roles, since
 * this endpoint 403s for anyone but TEACHER/SUPPORT. */
export function useMySalary(month?: string, enabled = true) {
  return useQuery({
    queryKey: ["salary", "my", month],
    queryFn: () => apiRequest<SalaryInfo>({ url: "/salary/my", method: "GET", params: { month } }),
    enabled,
  });
}

/** PATCH /salary/rate/:userId — SUPERADMIN, bitta xodimning rejimi/narxini belgilaydi. */
export function useSetUserSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      ...payload
    }: {
      userId: number;
      salaryMode?: "FIXED" | "PER_LESSON";
      perLessonRate?: number;
      salary?: number;
    }) => apiRequest<Teacher>({ url: `/salary/rate/${userId}`, method: "PATCH", data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["salary"] });
      toast.success("Saqlandi");
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Saqlab bo'lmadi")),
  });
}

function toastCreated() {
  return "Muvaffaqiyatli yaratildi";
}
function toastUpdated() {
  return "Muvaffaqiyatli yangilandi";
}
function toastDeleted() {
  return "Muvaffaqiyatli o'chirildi";
}

export const testsQ = createCrudHooks<Test>(RESOURCES.tests, "tests");

export interface AiGenerateTestPayload {
  directionId: number;
  groupId?: number;
  type: Test["type"];
  topic: string;
  lessonNumber?: number;
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
  /** Ixtiyoriy — berilmasa yoki 0 bo'lsa, AI umuman masala qo'shmaydi. */
  problemCount?: number;
  problemDifficultyMix?: Record<string, number>;
}

/**
 * POST /tests/ai-generate — asks Gemini to draft a title + question/choice set for the given
 * topic. This does NOT save anything (no test is created); the backend just returns a draft
 * object with the same shape as CreateTestDto for the form to prefill, review, edit, and then
 * save via the normal testsQ.useCreate. Requires AI_TEST_GENERATION_ENABLED + GEMINI_API_KEY to
 * be configured on the backend — if they aren't, this throws and the UI should show that error.
 */
export function useAiGenerateTest() {
  return useMutation({
    mutationFn: (payload: AiGenerateTestPayload) =>
      apiRequest<Partial<Test>>({
        url: `${RESOURCES.tests}/ai-generate`,
        method: "POST",
        data: payload,
      }),
    onError: (error: unknown) => {
      toast.error(errorMessage(error, "AI generation failed"));
    },
  });
}

/** GET /tests/:id — single test. For a STUDENT this is pre-sanitized server-side (no isCorrect). */
export function useTest(id: number | string | undefined) {
  return useQuery({
    queryKey: ["tests", "detail", id],
    queryFn: async () => {
      const raw = await apiGet<Test>(RESOURCES.tests, id as number | string);
      const results = (raw.results ?? []).map((r) => {
        const withStudent = r as typeof r & { student?: { user?: { fullName?: string } } };
        return { ...r, studentName: withStudent.student?.user?.fullName ?? r.studentName };
      });
      return { ...raw, results };
    },
    enabled: id != null,
  });
}

/** POST /tests/:testId/start — begins (or resumes) the student's attempt. */
export function useStartTest() {
  return useMutation({
    mutationFn: (testId: number) =>
      apiRequest<StartTestResponse>({ url: `${RESOURCES.tests}/${testId}/start`, method: "POST" }),
  });
}

/** POST /tests/submit — grades immediately and notifies the student + parent via Telegram. */
export function useSubmitTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { testId: number; answers: Record<number, number> }) =>
      apiRequest<SubmitTestResponse>({ url: `${RESOURCES.tests}/submit`, method: "POST", data: payload }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tests"] }),
  });
}

/**
 * POST /tests/:testId/violation — reports a rule break (left the tab, exited fullscreen, tried
 * to navigate away, ...). The backend force-sets the score to 0 and notifies the parent.
 */
export function useMarkViolation() {
  return useMutation({
    mutationFn: ({ testId, reason }: { testId: number; reason: string }) =>
      apiRequest<{ message: string; score: number; reason?: string }>({
        url: `${RESOURCES.tests}/${testId}/violation`,
        method: "POST",
        data: { reason },
      }),
  });
}

// ==================== MASALALAR (coding problems) ====================

/** GET /tests/:testId/problems — testga biriktirilgan masalalar (student uchun sanitized). */
export function useTestProblems(testId: number | string | undefined) {
  return useQuery({
    queryKey: ["tests", "problems", testId],
    queryFn: () => apiRequest<CodingProblem[]>({ url: `${RESOURCES.tests}/${testId}/problems`, method: "GET" }),
    enabled: testId != null,
  });
}

/** POST /tests/problems/submit — kodni yuboradi, AI daraja bo'yicha tekshirib natija qaytaradi. */
export function useSubmitCodingProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { problemId: number; testId: number; code: string; language?: string }) =>
      apiRequest<SubmitCodingProblemResponse>({
        url: `${RESOURCES.tests}/problems/submit`,
        method: "POST",
        data: payload,
      }),
    onSuccess: (_data, variables) =>
      void qc.invalidateQueries({ queryKey: ["tests", "problems", "my-results", variables.testId] }),
    onError: (error: unknown) => {
      toast.error(errorMessage(error, "Masalani tekshirishda xatolik"));
    },
  });
}

/** GET /tests/:testId/problems/my-results — o'quvchining shu testdagi barcha masala natijalari. */
export function useMyCodingResults(testId: number | string | undefined) {
  return useQuery({
    queryKey: ["tests", "problems", "my-results", testId],
    queryFn: () =>
      apiRequest<MyCodingResultsResponse>({ url: `${RESOURCES.tests}/${testId}/problems/my-results`, method: "GET" }),
    enabled: testId != null,
  });
}

/** GET /tests/:testId/student/:studentId/problems — ustoz/admin uchun bitta o'quvchining yechimlari. */
export function useStudentProblemReview(testId: number | string | undefined, studentId: number | string | undefined) {
  return useQuery({
    queryKey: ["tests", "problems", "review", testId, studentId],
    queryFn: () =>
      apiRequest<CodingSubmission[]>({
        url: `${RESOURCES.tests}/${testId}/student/${studentId}/problems`,
        method: "GET",
      }),
    enabled: testId != null && studentId != null,
  });
}

export const notificationsQ = createCrudHooks<NotificationItem>(
  RESOURCES.notifications,
  "notifications",
);
export const usersQ = createCrudHooks<User>(RESOURCES.users, "users", undefined, undefined, [
  "fullName",
  "username",
  "phone",
  "password",
  "directionId",
  "salary",
  "role",
  "gender",
  "isActive",
]);
export const supportsQ = createCrudHooks<User>(
  RESOURCES.supportTeachers,
  "support-teachers",
  undefined,
  undefined,
  ["fullName", "username", "phone", "password", "directionId", "branchId", "salary", "gender"],
);

const STAFF_FIELDS = ["fullName", "username", "phone", "password", "telegramId", "branchId", "salary", "gender"] as const;
export const managersQ = createCrudHooks<User>("/managers", "managers", undefined, undefined, [
  ...STAFF_FIELDS,
]);
export const marketingQ = createCrudHooks<User>("/marketing", "marketing", undefined, undefined, [
  ...STAFF_FIELDS,
]);
export const salesQ = createCrudHooks<User>("/sales", "sales", undefined, undefined, [
  ...STAFF_FIELDS,
]);
export const financeQ = createCrudHooks<User>("/finance", "finance", undefined, undefined, [
  ...STAFF_FIELDS,
]);
export const hrQ = createCrudHooks<User>("/hr", "hr", undefined, undefined, [
  ...STAFF_FIELDS,
]);

export interface GrantableUser {
  id: number;
  fullName: string;
  username: string;
  role: Role;
  grantedRoles: Role[] | null;
}

/** GET /permissions/users — SUPERADMIN only. Every non-superadmin user with their granted roles. */
export function useGrantableUsers() {
  return useQuery({
    queryKey: ["permissions", "users"],
    queryFn: () => apiRequest<GrantableUser[]>({ url: "/permissions/users", method: "GET" }),
  });
}

/** PATCH /permissions/users/:id — SUPERADMIN only. Replaces the user's granted-roles list. */
export function useGrantRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, grantedRoles }: { userId: number; grantedRoles: Role[] }) =>
      apiRequest({ url: `/permissions/users/${userId}`, method: "PATCH", data: { grantedRoles } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["permissions"] });
      toast.success("Huquqlar yangilandi");
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Failed")),
  });
}

/**
 * POST /students expects a *nested* body — { user: {...}, student: {...}, parent?: {...} } —
 * unlike every other resource's flat create DTO (see StudentsController.create in the backend).
 * The form itself (see routes/_app.students.tsx) still collects flat fields; this hook reshapes
 * them right before the request so the shared <CrudPage> component doesn't need to know about it.
 */
export function useCreateStudent(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Student> & { username?: string; password?: string }) =>
      apiRequest<Student>({
        url: RESOURCES.students,
        method: "POST",
        data: {
          user: {
            fullName: payload.fullName,
            username: payload.username,
            phone: payload.phone,
            password: payload.password,
            gender: payload.gender,
          },
          student: {
            cardId: payload.cardId,
            groupId: payload.groupId,
            parentId: payload.parentId,
          },
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["students"] });
      toast.success("Created successfully");
      onDone?.();
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, "Failed to create"));
    },
  });
}

/**
 * POST /attendance only accepts { studentId, isPresent?, type? } (see CreateAttendanceDto in the
 * backend) — there's no groupId/date/note and no PATCH or DELETE endpoint at all, so editing or
 * removing an attendance record isn't possible against this backend yet.
 */
/**
 * POST /attendance/group/:groupId — bulk mark a whole group at once (teacher's own group, or
 * admin/superadmin for any group). Much faster than marking one student at a time.
 */
export function useMarkGroupAttendance(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      attendances,
    }: {
      groupId: number;
      attendances: { studentId: number; isPresent: boolean }[];
    }) =>
      apiRequest<{ message: string; group: string; attendances: unknown[] }>({
        url: `${RESOURCES.attendance}/group/${groupId}`,
        method: "POST",
        data: { attendances },
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(res.message);
      onDone?.();
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Failed")),
  });
}

export function useCreateAttendance(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AttendanceRecord>) =>
      apiCreate<AttendanceRecord>(RESOURCES.attendance, {
        studentId: payload.studentId,
        isPresent: payload.isPresent,
        type: payload.type,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Created successfully");
      onDone?.();
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, "Failed to create"));
    },
  });
}

export type NotificationAudience = "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "GROUP";

/** POST /notifications/broadcast — SUPERADMIN/ADMIN only. */
export function useBroadcastNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      message: string;
      audience: NotificationAudience;
      groupId?: number;
    }) => apiRequest<{ message: string; count: number }>({
      url: `${RESOURCES.notifications}/broadcast`,
      method: "POST",
      data: payload,
    }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`Yuborildi (${res.count} kishiga)`);
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Yuborilmadi")),
  });
}

/** GET /notifications/my — the signed-in user's own notifications (newest 50). */
export function useMyNotifications() {
  return useQuery({
    queryKey: ["notifications", "my"],
    queryFn: () =>
      apiRequest<NotificationItem[]>({ url: `${RESOURCES.notifications}/my`, method: "GET" }),
  });
}

/** GET /notifications/unread-count */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () =>
      apiRequest<{ count: number }>({
        url: `${RESOURCES.notifications}/unread-count`,
        method: "GET",
      }),
    retry: 1,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) =>
      apiRequest({ url: `${RESOURCES.notifications}/${id}/read`, method: "PATCH" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest({ url: `${RESOURCES.notifications}/read-all`, method: "PATCH" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Marked all as read");
    },
  });
}

export interface UpdateProfilePayload {
  username?: string;
  avatar?: string;
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

/**
 * PATCH /auth/profile. Note: the backend only persists `username`, `avatar`, and a password
 * change from this endpoint — `fullName`/`phone` are silently dropped server-side (see
 * AuthService.updateProfile), so this payload intentionally doesn't accept them.
 */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      apiRequest<User>({ url: "/auth/profile", method: "PATCH", data: payload }),
    onError: (error: unknown) => {
      toast.error(errorMessage(error, "Failed to update profile"));
    },
  });
}

/** GET /payments/summary — SUPERADMIN/ADMIN only. Total revenue + status breakdown. */
export function usePaymentsSummary(params: { month?: string; groupId?: number } = {}) {
  return useQuery({
    queryKey: ["payments", "summary", params],
    queryFn: () =>
      apiRequest<PaymentsSummary>({
        url: `${RESOURCES.payments}/summary`,
        method: "GET",
        params,
      }),
    retry: 1,
    throwOnError: false,
  });
}

// ==================== KURS TO'LOVI (narx/davomiylik/chegirma/qarzdorlik) ====================

/** GET /payments/balance/:studentId — staff view of one student's course billing state. */
export function useStudentBalance(studentId?: number) {
  return useQuery({
    queryKey: ["payments", "balance", studentId],
    queryFn: () =>
      apiRequest<StudentBalance>({ url: `${RESOURCES.payments}/balance/${studentId}`, method: "GET" }),
    enabled: !!studentId,
  });
}

/** GET /payments/my-balance — STUDENT's own course billing state. */
export function useMyBalance() {
  return useQuery({
    queryKey: ["payments", "my-balance"],
    queryFn: () => apiRequest<StudentBalance>({ url: `${RESOURCES.payments}/my-balance`, method: "GET" }),
  });
}

function useBillingMutation(url: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { studentId: number; groupId?: number; month?: string; method?: string }) =>
      apiRequest<Payment>({ url, method: "POST", data: payload }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["payments", "balance", variables.studentId] });
      toast.success(t_toastUpdated());
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "To'lovni amalga oshirib bo'lmadi")),
  });
}
// react-i18next's t() needs a component; this file is hooks-only, so a fixed string is used for
// this one cross-cutting toast (every other toast call in this file already does the same).
function t_toastUpdated() {
  return "Muvaffaqiyatli bajarildi";
}

export const usePayFull = () => useBillingMutation(`${RESOURCES.payments}/pay-full`);
export const usePayMonthly = () => useBillingMutation(`${RESOURCES.payments}/pay-monthly`);
export const usePayRemainder = () => useBillingMutation(`${RESOURCES.payments}/pay-remainder`);

/** GET /payments/settings — current default full-payment discount %. */
export function usePaymentSettings() {
  return useQuery({
    queryKey: ["payments", "settings"],
    queryFn: () => apiRequest<PaymentSettingsT>({ url: `${RESOURCES.payments}/settings`, method: "GET" }),
  });
}

/** PATCH /payments/settings — SUPERADMIN only. */
export function useUpdatePaymentSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentSettingsT) =>
      apiRequest<PaymentSettingsT>({ url: `${RESOURCES.payments}/settings`, method: "PATCH", data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payments", "settings"] });
      toast.success(t_toastUpdated());
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Sozlamani yangilab bo'lmadi")),
  });
}

/** PATCH /payments/student-discount/:studentId — SUPERADMIN only, per-student override. */
export function useSetStudentDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      ...payload
    }: {
      studentId: number;
      fullPaymentDiscountPercent?: number;
      monthlyDiscountPercent?: number;
    }) =>
      apiRequest<Student>({
        url: `${RESOURCES.payments}/student-discount/${studentId}`,
        method: "PATCH",
        data: payload,
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["payments", "balance", variables.studentId] });
      void qc.invalidateQueries({ queryKey: ["students"] });
      toast.success(t_toastUpdated());
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Chegirmani saqlab bo'lmadi")),
  });
}

interface ActivityLogItem {
  id: number | string;
  action: string;
  createdAt?: string;
  user?: { fullName?: string } | null;
}

/** GET /activity/logs — SUPERADMIN only. */
export function useActivityLogs(limit = 8) {
  return useQuery({
    queryKey: ["activity", "logs", limit],
    queryFn: () =>
      apiRequest<ActivityLogItem[]>({
        url: `${RESOURCES.activity}/logs`,
        method: "GET",
        params: { limit },
      }),
    retry: 1,
    throwOnError: false,
  });
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("uz-UZ", { month: "short" });
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
}
function timeAgo(iso?: string) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daq oldin`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.round(hours / 24)} kun oldin`;
}

/**
 * Builds the dashboard from real backend data — there's no single /dashboard endpoint, so this
 * fans out to the resources that exist and aggregates client-side:
 *  - stat cards: counts from /teachers, /groups, /students, revenue from /payments/summary
 *  - enrollment chart: /students grouped by createdAt month (last 6 months)
 *  - attendance chart: /attendance grouped by day, % isPresent (last 14 days)
 *  - revenue chart: /payments (PAID) grouped by month (last 6 months)
 *  - activity feed: /activity/logs (SUPERADMIN only — silently empty for other roles)
 * Every fetch is wrapped in Promise.allSettled so a 403 on a role-restricted endpoint
 * (payments/summary, activity/logs) just leaves that one slice empty instead of breaking
 * the whole page.
 */
function pctChange(series: number[]): number | null {
  if (series.length < 2) return null;
  const prev = series[series.length - 2];
  const curr = series[series.length - 1];
  if (prev === 0) return curr === 0 ? 0 : null; // avoid a meaningless "Infinity%" off a zero base
  return Math.round(((curr - prev) / prev) * 1000) / 10; // one decimal place
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const [teachersR, groupsR, studentsR, attendanceR, paymentsR, summaryR, activityR] =
        await Promise.allSettled([
          apiList<Teacher>(RESOURCES.teachers, { limit: 1 }),
          apiList<Group>(RESOURCES.groups, { limit: 1000 }),
          apiList<Student>(RESOURCES.students, { limit: 1000 }),
          apiList<AttendanceRecord>(RESOURCES.attendance, { limit: 1000 }),
          apiList<Payment>(RESOURCES.payments, { limit: 500 }),
          apiRequest<PaymentsSummary>({ url: `${RESOURCES.payments}/summary`, method: "GET" }),
          apiRequest<ActivityLogItem[]>({
            url: `${RESOURCES.activity}/logs`,
            method: "GET",
            params: { limit: 8 },
          }),
        ]);

      const students = studentsR.status === "fulfilled" ? studentsR.value.data : [];
      const groups = groupsR.status === "fulfilled" ? groupsR.value.data : [];
      const attendance = attendanceR.status === "fulfilled" ? attendanceR.value.data : [];
      const payments = paymentsR.status === "fulfilled" ? paymentsR.value.data : [];

      // Enrollment: students created per month, last 6 months (chronological).
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return monthKey(d);
      });
      const enrollmentByMonth = new Map(months.map((m) => [m, 0]));
      for (const s of students) {
        if (!s.createdAt) continue;
        const key = monthKey(new Date(s.createdAt));
        if (enrollmentByMonth.has(key)) {
          enrollmentByMonth.set(key, (enrollmentByMonth.get(key) ?? 0) + 1);
        }
      }
      const enrollment = months.map((m) => ({
        month: monthLabel(m),
        students: enrollmentByMonth.get(m) ?? 0,
      }));

      // Attendance rate: % present per day, last 14 days.
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (13 - i));
        return dayKey(d);
      });
      const dayBuckets = new Map(days.map((d) => [d, { present: 0, total: 0 }]));
      for (const a of attendance) {
        if (!a.timestamp) continue;
        const key = dayKey(new Date(a.timestamp));
        const bucket = dayBuckets.get(key);
        if (bucket) {
          bucket.total += 1;
          if (a.isPresent) bucket.present += 1;
        }
      }
      const attendanceChart = days.map((d) => {
        const b = dayBuckets.get(d)!;
        return { day: dayLabel(d), rate: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0 };
      });

      // Revenue: sum of PAID payments per month, last 6 months.
      const revenueByMonth = new Map(months.map((m) => [m, 0]));
      for (const p of payments) {
        if (p.status !== "PAID") continue;
        const key = p.month ?? (p.paidAt ? monthKey(new Date(p.paidAt)) : undefined);
        if (key && revenueByMonth.has(key)) {
          revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(p.amount ?? 0));
        }
      }
      const revenue = months.map((m) => ({ month: monthLabel(m), revenue: revenueByMonth.get(m) ?? 0 }));

      const activity =
        activityR.status === "fulfilled"
          ? activityR.value.map((a) => ({
              id: a.id,
              who: a.user?.fullName ?? "—",
              action: a.action,
              at: timeAgo(a.createdAt),
            }))
          : [];

      const revenueTotal =
        summaryR.status === "fulfilled"
          ? summaryR.value.totalAmount
          : payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

      return {
        stats: {
          students: studentsR.status === "fulfilled" ? studentsR.value.total : 0,
          teachers: teachersR.status === "fulfilled" ? teachersR.value.total : 0,
          groups: groupsR.status === "fulfilled" ? groupsR.value.total : 0,
          activeGroups: groups.filter((g) => g.status === "ACTIVE").length,
          revenue: revenueTotal,
          enrollmentDeltaPct: pctChange(enrollment.map((e) => e.students)),
          revenueDeltaPct: pctChange(revenue.map((r) => r.revenue)),
        },
        enrollment,
        attendance: attendanceChart,
        revenue,
        activity,
      };
    },
    retry: 1,
    throwOnError: false,
  });
}

export type { Paginated };
