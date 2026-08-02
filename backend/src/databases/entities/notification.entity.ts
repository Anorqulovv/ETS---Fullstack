import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { User } from './user.entity';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ nullable: true })
  senderId?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender?: User;

  @Column()
  recipientId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ type: 'varchar', default: 'MESSAGE' })
  type: string;

  @Column({ type: 'varchar', default: 'Xabar' })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt?: Date;
}
