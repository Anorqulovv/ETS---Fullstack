import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Student } from './student.entity';

export enum PointsSource {
  ATTENDANCE = 'ATTENDANCE',
  TEST = 'TEST',
  /** Uyga vazifa baholanganda — see GamificationService.awardForHomework. */
  HOMEWORK = 'HOMEWORK',
  /** Awarded directly by SUPERADMIN/ADMIN/TEACHER, any reason — see GamificationService.award. */
  MANUAL = 'MANUAL',
  /** Spent on a shop item — amount is negative. refId is the ShopItem id. */
  SHOP = 'SHOP',
}

@Entity('points_logs')
export class PointsLog extends BaseEntity {
  @Index()
  @Column()
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'enum', enum: PointsSource })
  source: PointsSource;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  /** i18n key for translating `note` client-side (e.g. "gamification.attendance"). Null on
   *  legacy rows and free-text MANUAL/SHOP notes — those fall back to the raw `note` text. */
  @Column({ type: 'varchar', nullable: true })
  noteKey: string;

  /** Params to interpolate into the noteKey translation (e.g. { attempt: 2, percent: 70 }). */
  @Column({ type: 'jsonb', nullable: true })
  noteParams: Record<string, unknown>;

  /** attendanceId or testResultId this entry came from — for audit/debug, not enforced as an FK. */
  @Column({ nullable: true })
  refId: number;
}
