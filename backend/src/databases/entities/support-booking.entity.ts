import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { User } from './user.entity';
import { Student } from './student.entity';

/** O'quvchi support ustozning bo'sh vaqt oynasidan band qilgan bitta slot. */
@Entity('support_bookings')
export class SupportBooking extends BaseEntity {
  @Column()
  supportId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supportId' })
  support: User;

  @Column()
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'date' })
  date: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column()
  durationMinutes: number;
}
