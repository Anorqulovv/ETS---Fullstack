import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * Single-row table (id is always 1) holding course-billing settings SUPERADMIN can tune —
 * currently just the default discount for paying a course in full instead of monthly.
 * Per-student overrides live on Student.fullPaymentDiscountPercent / monthlyDiscountPercent.
 */
@Entity('payment_settings')
export class PaymentSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  fullPaymentDiscountPercent: number;
}
