export enum SalaryMode {
  /** The flat User.salary field (existing behaviour) is what's paid, unrelated to lessons held. */
  FIXED = 'FIXED',
  /** Salary = (lessons actually held this month across their groups) x per-lesson rate. */
  PER_LESSON = 'PER_LESSON',
}
