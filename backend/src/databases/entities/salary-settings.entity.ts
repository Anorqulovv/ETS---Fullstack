import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * Single-row table (id is always 1) holding the default per-lesson salary rates SUPERADMIN
 * controls. Individual overrides live on User.perLessonRate.
 */
@Entity('salary_settings')
export class SalarySettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ type: 'int', default: 50000 })
  teacherPerLessonRate: number;

  @Column({ type: 'int', default: 30000 })
  supportPerLessonRate: number;
}
