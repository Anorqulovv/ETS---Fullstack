import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { User } from './user.entity';

/** Support ustoz ochgan bitta bo'sh vaqt oynasi (masalan 14:00-16:00). */
@Entity('support_availabilities')
export class SupportAvailability extends BaseEntity {
  @Column()
  supportId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supportId' })
  support: User;

  @Column({ type: 'date' })
  date: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;
}
