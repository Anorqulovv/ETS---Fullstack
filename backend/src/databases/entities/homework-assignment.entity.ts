import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Group } from './group.entity';
import { User } from './user.entity';
import { HomeworkSubmission } from './homework-submission.entity';

/** Ustoz/support/admin tomonidan bitta guruhga beriladigan uyga vazifa. */
@Entity('homework_assignments')
export class HomeworkAssignment extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column()
  groupId: number;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column()
  createdById: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @Column({ type: 'timestamptz', nullable: true })
  deadline?: Date;

  @OneToMany(() => HomeworkSubmission, (s) => s.assignment)
  submissions: HomeworkSubmission[];
}
