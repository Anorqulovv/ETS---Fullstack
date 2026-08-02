// These used to hold demo data for offline/no-backend usage. Now that the
// app talks to the real API (edu-najottalim.uz), they're kept only as empty
// typed fallbacks so `?? mockX` expressions in the UI don't crash while a
// request is still loading.
import type { Branch, Direction, Group, Payment, Student, Teacher, User } from "./types";

export const mockGroups: Group[] = [];
export const mockStudents: Student[] = [];
export const mockTeachers: Teacher[] = [];
export const mockBranches: Branch[] = [];
export const mockDirections: Direction[] = [];
export const mockSupports: User[] = [];
export const mockPayments: Payment[] = [];
