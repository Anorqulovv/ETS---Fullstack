import type { Role } from "@/lib/roles";

export type Gender = "MALE" | "FEMALE";

export interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
}

export interface Direction {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  /** Full course price in so'm, before any discount. */
  price?: number;
  /** Course length in months — monthly installment = price / durationMonths. */
  durationMonths?: number;
}

export interface Teacher {
  id: number;
  fullName: string;
  username?: string;
  phone?: string;
  gender?: Gender;
  /** Write-only: required by the backend on create, never returned in responses. */
  password?: string;
  /** Legacy single "primary" direction — kept in sync with directionIds[0] by the backend. */
  directionId?: number;
  /** Every direction this teacher can be assigned to (backend: `directionIds` simple-array column). */
  directionIds?: number[];
  branchId?: number;
  groupsCount?: number;
  isActive?: boolean;
  /** Monthly salary — write-only from the admin's side; the backend strips it from list/detail reads (colleagues shouldn't see each other's pay). */
  salary?: number;
  /** "FIXED" (flat monthly) or "PER_LESSON" (lessons held x rate) — see /salary endpoints. */
  salaryMode?: "FIXED" | "PER_LESSON";
  perLessonRate?: number;
}

export type GroupStatus = "ACTIVE" | "PAUSED" | "FINISHED";

export interface Group {
  id: number;
  name: string;
  directionId?: number;
  branchId?: number;
  teacherId?: number;
  supportId?: number;
  studentsCount?: number;
  startDate?: string;
  endDate?: string;
  status: GroupStatus;
  lessonDays?: string[];
  lessonTime?: string;
  lessonDuration?: number;
}

export interface Student {
  id: number;
  fullName: string;
  cardId?: string;
  username?: string;
  phone?: string;
  gender?: Gender;
  groupId?: number;
  createdAt?: string;
  parentId?: number;
  /** Display-only, derived from the parent relation — never sent back on save. */
  parentName?: string;
  /** Write-only: required by the backend on create, never returned in responses. */
  password?: string;
  /** Per-student discount overrides — SUPERADMIN-only, set via PATCH /payments/student-discount/:id. */
  fullPaymentDiscountPercent?: number;
  monthlyDiscountPercent?: number;
}

export interface Parent {
  id: number;
  fullName: string;
  username?: string;
  phone?: string;
  gender?: Gender;
  childrenCount?: number;
  telegramId?: string;
  /** Write-only: required by the backend on create, never returned in responses. */
  password?: string;
}

export type PaymentMethod = "CASH" | "CARD" | "CLICK" | "PAYME" | "TRANSFER";
export type PaymentStatus = "PAID" | "UNPAID" | "PARTIAL";
export type PaymentKind = "MANUAL" | "FULL" | "MONTHLY" | "REMAINDER";

export interface Payment {
  id: number;
  studentId: number;
  studentName?: string; // derived client-side from the nested student.user relation
  groupId?: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  kind?: PaymentKind;
  discountPercent?: number;
  month?: string; // "YYYY-MM"
  monthsCovered?: string[];
  paidAt?: string;
  comment?: string;
  createdAt?: string;
}

/** GET /payments/balance/:studentId or /payments/my-balance */
export interface StudentBalance {
  studentId: number;
  groupId?: number | null;
  hasCoursePricing: boolean;
  message?: string;
  direction?: { id: number; name: string; price: number; durationMonths: number };
  monthlyAmount?: number;
  discountedMonthlyAmount?: number;
  fullPaymentDiscountPercent?: number;
  monthlyDiscountPercent?: number;
  discountedFullPrice?: number;
  totalPaid?: number;
  fullyPaid?: boolean;
  hasDebt?: boolean;
  debtAmount?: number;
  unpaidDueMonths?: string[];
  remainingUnpaidMonths?: string[];
  canPayRemainder?: boolean;
}

export interface SalaryInfo {
  userId: number;
  fullName?: string;
  role?: string;
  month: string;
  mode: "FIXED" | "PER_LESSON";
  lessonsCount: number;
  perLessonRate: number;
  computedTotal?: number;
  fixedSalary: number;
  payableAmount: number;
  groupsCount?: number;
}

export interface SalarySettingsT {
  teacherPerLessonRate: number;
  supportPerLessonRate: number;
}

/** GET /students/:id — the rich single-record view (list rows only carry the flat Student shape). */
export interface StudentDetail {
  id: number;
  cardId?: string;
  points?: number;
  createdAt?: string;
  user?: { id: number; fullName: string; username?: string; phone?: string; gender?: Gender; avatar?: string };
  parent?: { id: number; phone2?: string; user?: { fullName: string; phone?: string; username?: string } };
  group?: {
    id: number;
    name: string;
    status?: string;
    lessonDays?: string[];
    lessonTime?: string;
    teacher?: { id: number; fullName: string };
    direction?: { id: number; name: string };
  };
  attendance?: { id: number; isPresent: boolean; type?: string; timestamp?: string }[];
  results?: {
    id: number;
    score: number;
    attempt: number;
    isCurrent: boolean;
    submittedAt?: string;
    test?: { id: number; title: string; minScore?: number };
  }[];
  stats?: {
    totalTests: number;
    avgScore: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
  };
}

export interface ShopItem {
  id: number;
  name: string;
  description?: string;
  cost: number;
  imageUrl?: string;
  stock?: number;
  isActive?: boolean;
}

export interface PaymentSettings {
  fullPaymentDiscountPercent: number;
}

export interface PaymentsSummary {
  totalAmount: number;
  totalPayments: number;
  byStatus: { PAID: number; UNPAID: number; PARTIAL: number };
  /** Real qarzdorlik — unpaid due months x rate across every enrolled student (see
   * PaymentsService.getDebtTotals), not the legacy manual PaymentStatus counts above. */
  totalDebt?: number;
  studentsWithDebt?: number;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

// Mirrors the backend `Attendance` entity exactly: { id, studentId, isPresent, type, timestamp }.
// There is no groupId/date/status/note on the backend — the UI derives a display status from
// isPresent + type, and groupId is only used client-side to filter the student picker.
export interface AttendanceRecord {
  id: number;
  studentId: number;
  /** Derived client-side from the nested student.user relation (see flattenAttendance). */
  studentName?: string;
  isPresent: boolean;
  type?: string;
  timestamp?: string;
}

export type TestType = "DAILY" | "WEEKLY" | "MONTHLY";
export type TestStatus = "ACTIVE" | "IN_PROGRESS" | "NOACTIVE" | "PAUSED" | "FINISHED";

export interface TestChoice {
  id?: number;
  text: string;
  /** Absent when this test was fetched by a STUDENT — the backend strips it (see tests.service.ts findOne). */
  isCorrect?: boolean;
}

export interface TestQuestion {
  id?: number;
  text: string;
  choices: TestChoice[];
}

export interface TestResultItem {
  id: number;
  testId: number;
  studentId: number;
  studentName?: string;
  score: number;
  attempt: number;
  isCurrent: boolean;
  startedAt?: string;
  submittedAt?: string;
  timeSpentSeconds?: number;
  forceScoreZero?: boolean;
  violationReason?: string;
}

export type ProblemDifficulty = "SIMPLE" | "MEDIUM" | "DEEP";

/** Ustoz test yaratganda ixtiyoriy ravishda biriktiradigan masala. */
export interface CodingProblem {
  id?: number;
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  starterCode?: string;
  sampleInput?: string;
  sampleOutput?: string;
  constraints?: string;
  /** Faqat teacher/admin javobida keladi — studentga hech qachon yuborilmaydi. */
  referenceSolution?: string;
  generatedBy?: string;
}

export interface CodingSubmissionFeedback {
  verdict: "CORRECT" | "PARTIAL" | "INCORRECT" | string;
  summary: string;
  strengths: string[];
  issues: string[];
  complexity?: string;
}

export interface CodingSubmission {
  id: number;
  problemId: number;
  studentId: number;
  testResultId?: number;
  code: string;
  language: string;
  status: "PENDING" | "CHECKING" | "CHECKED" | "FAILED";
  aiScore?: number;
  aiFeedback?: CodingSubmissionFeedback;
  checkedAt?: string;
  createdAt?: string;
}

export interface SubmitCodingProblemResponse {
  submissionId: number;
  problemId: number;
  score: number;
  feedback: CodingSubmissionFeedback;
}

export interface Test {
  id: number;
  title: string;
  type: TestType;
  status?: TestStatus;
  groupId?: number;
  directionId?: number;
  minScore?: number;
  startsAt?: string;
  endsAt?: string;
  durationMinutes?: number;
  lessonNumber?: number;
  weekNumber?: number;
  monthNumber?: number;
  createdAt?: string;
  questions?: TestQuestion[];
  questionsCount?: number;
  results?: TestResultItem[];
  direction?: { id: number; name: string };
  group?: { id: number; name: string };
  /** Ixtiyoriy — ustoz belgilagan masalalar soni. 0/undefined bo'lsa testda masala yo'q. */
  problemCount?: number;
  problemDifficultyMix?: Record<string, number>;
  problems?: CodingProblem[];
}

export interface StartTestResponse {
  resultId: number;
  testId: number;
  studentId: number;
  startedAt: string;
  durationMinutes: number | null;
  serverNow: string;
  endsAt: string | null;
}

export interface SubmitTestResponse {
  testId: number;
  studentId: number;
  score: number;
  passed: boolean;
  attempt: number;
  message: string;
}

export interface MyCodingResultsResponse {
  testResultId: number | null;
  problemsScore: number | null;
  problemsChecked: boolean;
  submissions: CodingSubmission[];
}

export type NotificationType = "SYSTEM" | "PAYMENT" | "ATTENDANCE" | "TEST" | "GENERAL" | "MESSAGE";

// Mirrors backend `Notification` entity. The backend only exposes read endpoints for the
// signed-in user (GET /notifications/my) — there's no admin "compose/broadcast" REST endpoint,
// so there's no `audience`/`readCount`/create/delete here.
export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt?: string;
  createdAt?: string;
  sender?: { id: number; fullName: string } | null;
}

export interface User {
  id: number;
  fullName: string;
  username?: string;
  phone?: string;
  role: Role;
  gender?: Gender;
  isActive?: boolean;
  /** Write-only: required by the backend on create, never returned in responses. */
  password?: string;
  /** Monthly salary — settable by SUPERADMIN/ADMIN, never sent back on list/detail reads. */
  salary?: number;
}

export interface DashboardStats {
  students: number;
  teachers: number;
  groups: number;
  activeGroups: number;
  revenue: number;
  /** Month-over-month % change, computed from the last two points of `enrollment`/`revenue`. null when there isn't enough history yet (e.g. a brand-new org). */
  enrollmentDeltaPct: number | null;
  revenueDeltaPct: number | null;
}

export interface DashboardData {
  stats: DashboardStats;
  enrollment: { month: string; students: number }[];
  attendance: { day: string; rate: number }[];
  revenue: { month: string; revenue: number }[];
  activity: { id: number | string; who: string; action: string; at: string }[];
}
