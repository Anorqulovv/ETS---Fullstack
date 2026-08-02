import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Student } from './student.entity';
import { Group } from './group.entity';
import { User } from './user.entity';
import { PaymentMethod } from 'src/common/enums/paymentMethod.enum';
import { PaymentStatus } from 'src/common/enums/paymentStatus.enum';
import { PaymentKind } from 'src/common/enums/paymentKind.enum';

@Entity('payments')
export class Payment extends BaseEntity {
  @Column()
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  // Qaysi guruh/kurs uchun to'lov qilinganini bildiradi (ixtiyoriy)
  @Column({ nullable: true })
  groupId?: number;

  @ManyToOne(() => Group, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'groupId' })
  group?: Group;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PAID,
  })
  status: PaymentStatus;

  /** Which billing action produced this row — see PaymentsService.payFull/payMonthly/payRemainder. */
  @Column({ type: 'enum', enum: PaymentKind, default: PaymentKind.MANUAL })
  kind: PaymentKind;

  /** Discount percent actually applied when this row was created (0 for MANUAL entries). */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  // To'lov qaysi oy uchun ekanligi, masalan "2026-07". MONTHLY uchun bitta oy, REMAINDER
  // uchun qamrab olingan oylarning oxirgisi (monthsCovered'da hammasi ro'yxatda turadi).
  @Column({ nullable: true })
  month?: string;

  /** REMAINDER to'lovi bir nechta oyni qamrab olganda, ularning barchasi shu yerda ("2026-07,2026-08"). */
  @Column({ type: 'simple-array', nullable: true })
  monthsCovered?: string[];

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  // To'lovni kim qayd qilgani (admin/support)
  @Column({ nullable: true })
  createdById?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;
}
