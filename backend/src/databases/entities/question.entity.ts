import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TestType } from 'src/common/enums/test.enum';
import { Test } from './test.entity';
import { Choice } from './choice.entity';   // agar Choice entityingiz bo'lsa

@Entity()
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  // === TO'G'RI YOZILISHI ===
  @ManyToOne(() => Test, (test) => test.questions, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testId' })
  test: Test;

  @OneToMany(() => Choice, (choice) => choice.question, { cascade: true })
  choices: Choice[];

  // Agar testId ni alohida saqlamoqchi bo'lsangiz (tavsiya qilinadi)
  @Column({ nullable: true })
  testId?: number;

  // true bo'lsa bu savol test bazasida turadi, real testga hali bog'lanmagan
  @Column({ default: false })
  isBank: boolean;

  @Column({ nullable: true })
  directionId?: number;

  // 1 dan 12 gacha dars raqami
  @Column({ nullable: true })
  lessonNumber?: number;

  @Column({ type: 'enum', enum: TestType, nullable: true })
  type?: TestType;
}