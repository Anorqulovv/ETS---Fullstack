import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { User } from './user.entity';

// Har bir user'ning bildirishnoma ro'yxati va o'qilmagan sonini hisoblash
// recipientId + isRead bo'yicha filtrlaydi — composite index shu ikkalasini birga qamraydi.
@Index(['recipientId', 'isRead'])
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
