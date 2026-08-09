import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { CodingProblem } from './coding-problem.entity';
import { Student } from './student.entity';
import { TestResult } from './test-result.entity';
import { CodingSubmissionStatus } from '../../common/enums/problem-difficulty.enum';

@Entity('coding_submissions')
export class CodingSubmission extends BaseEntity {
  @Column()
  problemId: number;

  @ManyToOne(() => CodingProblem, (problem) => problem.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'problemId' })
  problem: CodingProblem;

  @Column()
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  // Ushbu masala qaysi test urinishiga (attempt) tegishli ekanini bog'lash uchun
  @Column({ nullable: true })
  testResultId?: number;

  @ManyToOne(() => TestResult, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testResultId' })
  testResult?: TestResult;

  @Column({ type: 'text' })
  code: string;

  @Column({ default: 'javascript' })
  language: string;

  @Column({ type: 'enum', enum: CodingSubmissionStatus, default: CodingSubmissionStatus.PENDING })
  status: CodingSubmissionStatus;

  // 0-100 oralig'ida AI bergan ball
  @Column({ type: 'float', nullable: true })
  aiScore?: number;

  // AI tahlili: { summary, strengths, issues, complexity, verdict }
  @Column({ type: 'jsonb', nullable: true })
  aiFeedback?: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  checkedAt?: Date;
}
