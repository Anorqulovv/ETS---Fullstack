import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Group } from './group.entity';

@Entity('directions')
export class Direction extends BaseEntity {
  @Column({ unique: true, length: 100 })
  name: string;        

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Full course price in UZS (so'm), before any discount. */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price?: number;

  /** Course length in months — used to derive the monthly installment amount (price / durationMonths). */
  @Column({ type: 'int', nullable: true })
  durationMonths?: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Group, (group) => group.direction)
  groups: Group[];
}