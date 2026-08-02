import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';
import { BaseEntity } from './Base.entity';

@Entity('attendance')
export class Attendance extends BaseEntity {
  @Column()
  studentId: number;

  @ManyToOne(() => Student, (student) => student.attendance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ default: true })
  isPresent: boolean;

  @Column({ nullable: true })
  type: string; 

  @CreateDateColumn()
  timestamp: Date;
}