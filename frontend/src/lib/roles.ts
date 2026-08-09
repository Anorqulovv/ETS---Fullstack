// Roles supported by the backend. Adjust this list if edu-najottalim.uz uses
// different role codes — these strings are sent/received as-is in API payloads.
export const ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "TEACHER",
  "SUPPORT",
  "STUDENT",
  "PARENT",
  "MANAGER",
  "MARKETING",
  "SALES",
  "FINANCE",
  "HR",
] as const;

export type Role = (typeof ROLES)[number];

export type NavKey =
  | "dashboard"
  | "directions"
  | "branches"
  | "groups"
  | "teachers"
  | "students"
  | "supportTeachers"
  | "parents"
  | "attendance"
  | "tests"
  | "payments"
  | "notifications"
  | "users"
  | "managers"
  | "marketing"
  | "sales"
  | "finance"
  | "hr"
  | "permissions"
  | "gamification"
  | "salary"
  | "activity"
  | "settings"
  | "profile";

const ALL_KEYS: NavKey[] = [
  "dashboard",
  "directions",
  "branches",
  "groups",
  "teachers",
  "students",
  "supportTeachers",
  "parents",
  "attendance",
  "tests",
  "payments",
  "notifications",
  "users",
  "managers",
  "marketing",
  "sales",
  "finance",
  "hr",
  "permissions",
  "gamification",
  "salary",
  "activity",
  "settings",
  "profile",
];

// Which sidebar/nav sections each role is allowed to see. Each role's dashboard renders
// differently too (see routes/_app.dashboard.tsx) — this list is also what makes the whole
// app feel different per role, since a role simply never sees nav items outside its scope.
export const ROLE_NAV: Record<Role, NavKey[]> = {
  SUPERADMIN: ALL_KEYS,
  // GET /activity/logs is SUPERADMIN-only on the backend (@AccessRoles(SUPERADMIN) on the whole
  // ActivityController) — showing the nav link to ADMIN would just 403 every request.
  ADMIN: ALL_KEYS.filter((k) => k !== "users" && k !== "permissions" && k !== "activity"),
  TEACHER: [
    "dashboard",
    "groups",
    "students",
    "attendance",
    "tests",
    "gamification",
    "notifications",
    "profile",
  ],
  SUPPORT: [
    "dashboard",
    "groups",
    "students",
    "attendance",
    "notifications",
    "profile",
  ],
  STUDENT: ["dashboard", "attendance", "tests", "payments", "gamification", "notifications", "profile"],
  PARENT: ["dashboard", "payments", "attendance", "notifications", "profile"],
  // Operational oversight: groups/teachers/students, no finances, no user/permission management.
  MANAGER: [
    "dashboard",
    "groups",
    "teachers",
    "students",
    "attendance",
    "gamification",
    "notifications",
    "profile",
  ],
  // Enrollment & lead-facing: directions (offerings) and student growth, not attendance/finances.
  MARKETING: ["dashboard", "directions", "students", "notifications", "profile"],
  // Enrollment + payment intake, no attendance/academic data.
  SALES: ["dashboard", "students", "payments", "notifications", "profile"],
  // Pure financial view.
  FINANCE: ["dashboard", "payments", "notifications", "profile"],
  // Personnel management: teacher/support/staff roster visibility, no attendance grading or
  // finances — mirrors what's granted on the backend (teacher/support/student/group/direction
  // findAll now include HR, see teacher.controller.ts etc).
  HR: [
    "dashboard",
    "teachers",
    "supportTeachers",
    "students",
    "groups",
    "notifications",
    "profile",
  ],
};

// Which roles are allowed to create/edit/delete records on a given nav
// section. This mirrors each backend controller's @AccessRoles(...) on its
// POST/PATCH endpoints (see src/modules/*/*.controller.ts) — SUPERADMIN and
// ADMIN can mutate everywhere by default, a couple of resources also let
// TEACHER create/edit (attendance, tests — their own day-to-day teaching
// duties), and a couple are restricted to SUPERADMIN only (users, branches).
// This only controls whether the UI *shows* create/edit buttons; the
// backend's own RolesGuard is still the real enforcement, so getting this
// slightly conservative is safe — getting it too permissive just means a
// disabled request, not a security hole.
const DEFAULT_MUTATE_ROLES: Role[] = ["SUPERADMIN", "ADMIN"];
const MUTATE_ROLES_BY_NAV: Partial<Record<NavKey, Role[]>> = {
  // Creating/editing a whole group (teacher/branch/direction/dates) is an admin operation, not
  // something a teacher should self-serve — see GroupsController on the backend
  // (@AccessRoles(SUPERADMIN, ADMIN) on POST/PATCH /groups). Teachers still get a "cancel a
  // lesson" action for their own groups, which doesn't go through this generic CRUD gate.
  attendance: ["SUPERADMIN", "ADMIN", "TEACHER"],
  payments: ["SUPERADMIN", "ADMIN", "SUPPORT", "SALES"],
  tests: ["SUPERADMIN", "ADMIN", "TEACHER"],
  // Only SUPERADMIN can create/edit/delete admin accounts — see AdminController in the backend
  // (@AccessRoles(SUPERADMIN) on POST/PATCH/DELETE /admins). Showing ADMIN an edit button here
  // that always 403s was the actual bug — this hides it for anyone but SUPERADMIN.
  users: ["SUPERADMIN"],
  // Same story for branches — BranchesController restricts POST/PATCH/DELETE to SUPERADMIN only
  // on the backend (physical locations are high-stakes, rarely-changed structural data), but the
  // default here would have shown ADMIN a working-looking button that 403s on every submit.
  branches: ["SUPERADMIN"],
};

// Delete is sometimes MORE restrictive than create/edit on the backend — e.g. deleting a
// managers/marketing/sales/finance staff account is SUPERADMIN-only
// (@AccessRoles(SUPERADMIN) on DELETE /managers|marketing|sales|finance/:id in
// StaffController), even though ADMIN can create/edit those same accounts. Falls back to the
// mutate roles above when a nav key isn't listed here (create/edit/delete all the same).
const DELETE_ROLES_BY_NAV: Partial<Record<NavKey, Role[]>> = {
  managers: ["SUPERADMIN"],
  marketing: ["SUPERADMIN"],
  sales: ["SUPERADMIN"],
  finance: ["SUPERADMIN"],
  hr: ["SUPERADMIN"],
};

export function canMutate(role: Role, navKey: NavKey): boolean {
  return (MUTATE_ROLES_BY_NAV[navKey] ?? DEFAULT_MUTATE_ROLES).includes(role);
}

export function canDelete(role: Role, navKey: NavKey): boolean {
  return (DELETE_ROLES_BY_NAV[navKey] ?? MUTATE_ROLES_BY_NAV[navKey] ?? DEFAULT_MUTATE_ROLES).includes(role);
}

// A role can act with the extra permissions a superadmin granted it (see the Permissions page /
// PATCH /permissions/users/:id on the backend) — e.g. a SUPPORT account granted "TEACHER" should
// also see teacher-only nav items and mutate buttons. `grantedRoles` comes from the JWT/'/auth/me'.
export function effectiveNavKeys(role: Role, grantedRoles: Role[] = []): NavKey[] {
  const keys = new Set(ROLE_NAV[role] ?? []);
  for (const r of grantedRoles) {
    for (const k of ROLE_NAV[r] ?? []) keys.add(k);
  }
  return Array.from(keys);
}

export function effectiveCanMutate(role: Role, navKey: NavKey, grantedRoles: Role[] = []): boolean {
  if (canMutate(role, navKey)) return true;
  return grantedRoles.some((r) => canMutate(r, navKey));
}

export function effectiveCanDelete(role: Role, navKey: NavKey, grantedRoles: Role[] = []): boolean {
  if (canDelete(role, navKey)) return true;
  return grantedRoles.some((r) => canDelete(r, navKey));
}
