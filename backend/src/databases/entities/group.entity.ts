import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';
import { User } from './user.entity';
import { BaseEntity } from './Base.entity';
import { GroupStatus } from 'src/common/enums/groupStatus.enum';
import { Direction } from './direction.entity';

@Entity('groups')
export class Group extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: GroupStatus,
    default: GroupStatus.ACTIVE
  })
  status: GroupStatus;

  @Column()
  teacherId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column({ nullable: true })
  directionId?: number;

  @ManyToOne(() => Direction, (direction) => direction.groups, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'directionId' })
  direction: Direction;

  @OneToMany(() => Student, (student) => student.group)
  students: Student[];

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'supportId' })
  support?: User;

  @Column({ nullable: true })
  supportId?: number;

  // Dars kunlari: masalan ["Monday","Wednesday","Friday"] yoki ["Dushanba","Chorshanba"]
  @Column({ type: 'simple-array', nullable: true })
  lessonDays?: string[];

  // Dars vaqti: masalan "09:00" yoki "14:30"
  @Column({ nullable: true })
  lessonTime?: string;

  // Dars davomiyligi (daqiqalarda): masalan 90
  @Column({ type: 'int', nullable: true })
  lessonDuration?: number;

  @Column({ nullable: true })
  branchId?: number;
}