import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Group } from './group.entity';
import { User } from './user.entity';

/**
 * A lesson day cancelled for a group (e.g. a public holiday). Recording one pushes the group's
 * endDate out by one lesson slot — see GroupsService.cancelLesson.
 */
@Entity('cancelled_lessons')
export class CancelledLesson extends BaseEntity {
  @Column()
  groupId: number;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  // Bekor qilingan dars sanasi, masalan "2026-03-21" (Navro'z)
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ nullable: true })
  createdById?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;
}
