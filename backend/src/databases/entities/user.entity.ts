import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserRole } from '../../common/enums/role.enum';
import { Gender } from '../../common/enums/gender.enum';
import { SalaryMode } from '../../common/enums/salaryMode.enum';
import { BaseEntity } from './Base.entity';
import { Direction } from './direction.entity';
import { Branch } from './branch.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  phone: string;

  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ nullable: true })
  telegramId: string;

  @Column()
  fullName: string;

  // Bitta asosiy yo'nalish (orqaga muvofiqligi uchun saqlanadi)
  @ManyToOne(() => Direction, { nullable: true, eager: true })
  @JoinColumn({ name: 'directionId' })
  direction: Direction;

  @Column({ nullable: true })
  directionId: number;

  // Ko'p yo'nalishlar (o'qituvchi va support uchun). TypeORM's simple-array hydrates as
  // strings by default (it's just `value.split(',')`) regardless of the `number[]` TS type —
  // the transformer below normalizes both directions so callers always see real numbers.
  @Column({
    type: 'simple-array',
    nullable: true,
    transformer: {
      to: (value?: number[] | null) => value,
      from: (value?: string[] | null) =>
        value ? value.map((v) => Number(v)) : value,
    },
  })
  directionIds: number[];

  /**
   * SUPERADMIN can grant a user extra role-equivalent permissions on top of their real `role`
   * — e.g. a SUPPORT account can be granted TEACHER so they pass @AccessRoles(TEACHER) checks
   * too, without actually changing their role (nav, base UI, etc. still follow `role`). See
   * RolesGuard, which checks both `role` and this array. Baked into the JWT at login/refresh —
   * a change here takes effect on the user's next login or token refresh, not instantly.
   */
  @Column({ type: 'simple-array', nullable: true })
  grantedRoles: UserRole[];

  @ManyToOne(() => Branch, { nullable: true, eager: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  /** Monthly salary (UZS) — only meaningful for staff roles, shown on their own dashboard. Used
   * as-is when salaryMode is FIXED; ignored (informational only) when PER_LESSON. */
  @Column({ type: 'int', nullable: true })
  salary: number;

  /** How this person's salary is determined — see SalaryService. SUPERADMIN-settable. */
  @Column({ type: 'enum', enum: SalaryMode, default: SalaryMode.FIXED })
  salaryMode: SalaryMode;

  /** Per-lesson rate override (UZS) — when null, SalarySettings' role default is used. Only
   * meaningful when salaryMode is PER_LESSON. */
  @Column({ type: 'int', nullable: true })
  perLessonRate: number;

  @Column({ nullable: true, type: 'text' })
  avatar: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  lastLoginAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  lastSeenAt: Date;
}
