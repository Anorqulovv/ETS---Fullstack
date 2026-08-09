import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Test } from './test.entity';
import { ProblemDifficulty } from '../../common/enums/problem-difficulty.enum';
import { CodingSubmission } from './coding-submission.entity';

// LeetCode uslubidagi masala. Testning oddiy (variantli) savollaridan alohida saqlanadi
// va o'quvchiga alohida bo'lim sifatida ko'rsatiladi.
@Entity()
export class CodingProblem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  // Masala shart matni (to'liq tavsif)
  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ProblemDifficulty, default: ProblemDifficulty.MEDIUM })
  difficulty: ProblemDifficulty;

  @Column({ type: 'text', nullable: true })
  starterCode?: string;

  @Column({ type: 'text', nullable: true })
  sampleInput?: string;

  @Column({ type: 'text', nullable: true })
  sampleOutput?: string;

  @Column({ type: 'text', nullable: true })
  constraints?: string;

  // AI tekshiruvida yordamchi sifatida ishlatiladi, o'quvchiga hech qachon yuborilmaydi
  @Column({ type: 'text', nullable: true })
  referenceSolution?: string;

  @Column({ nullable: true })
  testId?: number;

  @ManyToOne(() => Test, (test) => test.problems, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testId' })
  test: Test;

  @Column({ default: 'AI' })
  generatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => CodingSubmission, (submission) => submission.problem)
  submissions: CodingSubmission[];
}
