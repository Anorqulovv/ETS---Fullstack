import { Entity, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Student } from './student.entity';
import { BaseEntity } from './Base.entity';

@Entity('parents')
export class Parent extends BaseEntity {
  @Column()
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Ikkinchi (qo'shimcha) telefon raqami — ixtiyoriy
  @Column({ nullable: true })
  phone2?: string;

  @OneToMany(() => Student, (student) => student.parent)
  students: Student[];
}