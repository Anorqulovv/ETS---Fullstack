import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Question } from './question.entity';

@Entity('choices')
export class Choice extends BaseEntity {
  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', nullable: true })
  textEn?: string;

  @Column({ type: 'text', nullable: true })
  textRu?: string;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @Column()
  questionId: number;

  @ManyToOne(() => Question, (question) => question.choices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: Question;
}
