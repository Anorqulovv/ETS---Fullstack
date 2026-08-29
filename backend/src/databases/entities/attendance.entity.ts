import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Student } from './student.entity';
import { BaseEntity } from './Base.entity';

@Entity('attendance')
export class Attendance extends BaseEntity {
  // Har bir davomat ro'yxati/statistika so'rovi studentId bo'yicha filtrlaydi —
  // index bo'lmasa, o'quvchilar ko'paygani sari bu full table scan'ga aylanadi.
  @Index()
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