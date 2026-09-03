import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { Student } from './student.entity';
import { Group } from './group.entity';
import { BaseEntity } from './Base.entity';

export enum StudentGroupStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  LEFT = 'LEFT',
}

/**
 * Talaba <-> guruh ko'p-ko'pga bog'lanishi. Bitta talaba bir vaqtning o'zida bir nechta
 * guruhga a'zo bo'lishi mumkin (masalan bir nechta kursda o'qish). `Student.groupId` hali ham
 * mavjud — u "asosiy guruh" sifatida vaqtincha saqlanadi, orqaga moslik uchun (eski kod hali
 * shu maydonga tayanadi). Yangi funksiyalar shu jadval orqali ishlaydi.
 */
@Entity('student_groups')
@Unique(['studentId', 'groupId'])
export class StudentGroup extends BaseEntity {
  @Index()
  @Column()
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Index()
  @Column()
  groupId: number;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ type: 'date', nullable: true })
  joinedAt?: string;

  @Column({ type: 'date', nullable: true })
  leftAt?: string;

  @Column({ type: 'enum', enum: StudentGroupStatus, default: StudentGroupStatus.ACTIVE })
  status: StudentGroupStatus;
}
