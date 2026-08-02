import { 
  Entity, 
  Column, 
  OneToOne, 
  ManyToOne, 
  OneToMany, 
  JoinColumn 
} from 'typeorm';
import { User } from './user.entity';
import { Parent } from './parent.entity';
import { Group } from '../entities/group.entity'; 
import { Attendance } from './attendance.entity';
import { TestResult } from '../entities/test-result.entity';
import { BaseEntity } from './Base.entity';

@Entity('students')
export class Student extends BaseEntity {

  @Column({ unique: true, nullable: true })
  cardId: string;

  @Column()
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  parentId?: number;

  @ManyToOne(() => Parent, (parent) => parent.students, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: Parent;

  @Column({ nullable: true })
  groupId?: number;

  @ManyToOne(() => Group, (group) => group.students, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @OneToMany(() => Attendance, (attendance) => attendance.student)
  attendance: Attendance[];

  @OneToMany(() => TestResult, (result) => result.student)
  results: TestResult[];

  /** Gamification running total — see GamificationService, which is the only writer of this. */
  @Column({ type: 'int', default: 0 })
  points: number;

  /**
   * Per-student discount overrides, set by SUPERADMIN (see PaymentsService.setStudentDiscount).
   * When null, the course-wide default (PaymentSettings.fullPaymentDiscountPercent) applies to
   * a lump-sum full payment, and 0 applies to monthly installments.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  fullPaymentDiscountPercent?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  monthlyDiscountPercent?: number;
}