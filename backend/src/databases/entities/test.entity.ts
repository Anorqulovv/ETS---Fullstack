// test.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Question } from './question.entity';
import { TestResult } from './test-result.entity';
import { TestType } from 'src/common/enums/test.enum';
import { TestStatus } from 'src/common/enums/testStatus.enum';
import { Direction } from './direction.entity';
import { Group } from './group.entity';
import { User } from './user.entity';

@Entity()
export class Test {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: TestType })
  type: TestType;

  @Column({ type: 'enum', enum: TestStatus, default: TestStatus.ACTIVE })
  status: TestStatus;

  @Column({ nullable: true })
  minScore?: number;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date;

  // O'quvchi testni boshlagandan keyin qancha vaqt ichida ishlashi kerak
  @Column({ nullable: true })
  durationMinutes?: number;

  @Column({ nullable: true })
  directionId?: number;

  @ManyToOne(() => Direction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'directionId' })
  direction: Direction;

  @Column({ nullable: true })
  groupId?: number;

  // 1 oylik modul ichidagi dars raqami: 1 dan 12 gacha
  @Column({ nullable: true })
  lessonNumber?: number;

  // Har 3 ta darsdan keyingi haftalik test raqami: 1 dan 4 gacha
  @Column({ nullable: true })
  weekNumber?: number;

  // Keyinchalik bir nechta oy/modul uchun ishlatish mumkin
  @Column({ nullable: true, default: 1 })
  monthNumber?: number;

  @ManyToOne(() => Group, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ nullable: true })
  createdById?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Question, (question) => question.test, { cascade: true })
  questions: Question[];

  @OneToMany(() => TestResult, (result) => result.test)
  results: TestResult[];
}
