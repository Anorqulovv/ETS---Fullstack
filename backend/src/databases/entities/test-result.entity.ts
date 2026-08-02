import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Test } from './test.entity';
import { Student } from '../entities/student.entity'; 
import { BaseEntity } from './Base.entity';

@Entity('test_results')
export class TestResult extends BaseEntity {

  @Column({ type: 'float' })
  score: number; 

  @Column()
  testId: number;

  @ManyToOne(() => Test, (test) => test.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testId' })
  test: Test;

  @Column()
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  // Urinish raqami — reset qilingan natijalar ham saqlanib qoladi
  @Column({ default: 1 })
  attempt: number;

  // true = faol (eng so'nggi) urinish, false = o'chirilgan (arxiv)
  @Column({ default: true })
  isCurrent: boolean;

  @Column({ type: 'jsonb', nullable: true })
  answers?: Record<string, number>;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt?: Date;

  @Column({ nullable: true })
  timeSpentSeconds?: number;

  @Column({ default: false })
  forceScoreZero: boolean;

  @Column({ nullable: true })
  violationReason?: string;
}
