import { Entity, Column } from 'typeorm';
import { BaseEntity } from './Base.entity';

/** Something a student can redeem their gamification points for — SUPERADMIN/ADMIN managed. */
@Entity('shop_items')
export class ShopItem extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int' })
  cost: number;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  /** null = unlimited stock. */
  @Column({ type: 'int', nullable: true })
  stock?: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
