import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { HomeworkAssignment } from './homework-assignment.entity';
import { Student } from './student.entity';
import { HomeworkSubmissionStatus } from 'src/common/enums/homework-status.enum';

@Entity('homework_submissions')
export class HomeworkSubmission extends BaseEntity {
  @Index()
  @Column()
  assignmentId: number;

  @ManyToOne(() => HomeworkAssignment, (a) => a.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment: HomeworkAssignment;

  @Index()
  @Column()
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'int', default: 1 })
  attempt: number;

  @Column({ type: 'boolean', default: true })
  isCurrent: boolean;

  @Column({ type: 'text', nullable: true })
  textContent?: string;

  @Column({ type: 'text', nullable: true })
  fileName?: string;

  // ESKI YO'L (dev fallback): S3 sozlanmagan bo'lsa, fayl shu yerga base64 sifatida
  // saqlanadi — xuddi avvalgidek. S3 sozlangan production'da bu ustun bo'sh qoladi.
  @Column({ type: 'text', nullable: true })
  fileData?: string;

  // YANGI YO'L: S3 (yoki S3-mos xizmat)ga yuklangan fayl URL'i — production'da
  // asosiy maydon shu bo'ladi, StorageService orqali to'ldiriladi.
  @Column({ type: 'text', nullable: true })
  fileUrl?: string;

  // S3 bucket ichidagi object key — faqat purgeExpiredFiles/o'chirish uchun kerak,
  // frontend'ga hech qachon qaytarilmaydi.
  @Column({ type: 'text', nullable: true })
  fileKey?: string;

  @Column({ type: 'int', nullable: true })
  fileSizeBytes?: number;

  @Column({ type: 'boolean', default: false })
  fileExpired: boolean;

  @Column({ type: 'enum', enum: HomeworkSubmissionStatus, default: HomeworkSubmissionStatus.SUBMITTED })
  status: HomeworkSubmissionStatus;

  @Column({ type: 'float', nullable: true })
  score?: number;

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'timestamptz', nullable: true })
  gradedAt?: Date;

  @Column({ nullable: true })
  gradedById?: number;

  @Column({ type: 'timestamptz' })
  submittedAt: Date;
}
