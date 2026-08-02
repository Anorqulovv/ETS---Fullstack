import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { User } from './user.entity';

@Entity('branches')
export class Branch extends BaseEntity {
  @Column({ unique: true, length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @OneToMany(() => User, (user) => user.branch)
  users: User[];
}
