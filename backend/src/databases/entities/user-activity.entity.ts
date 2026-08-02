import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { User } from './user.entity';

@Entity('user_activities')
export class UserActivity extends BaseEntity {
  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 30 })
  method: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'text', nullable: true })
  action: string;

  @Column({ type: 'int', nullable: true })
  statusCode: number;

  @Column({ type: 'text', nullable: true })
  ip: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;
}
