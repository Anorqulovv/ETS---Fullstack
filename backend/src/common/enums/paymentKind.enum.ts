export enum PaymentKind {
  /** A single manual entry — the original, freeform behaviour (still fully supported). */
  MANUAL = 'MANUAL',
  /** The whole (discounted) course price paid in one go, up front. */
  FULL = 'FULL',
  /** One month's installment. */
  MONTHLY = 'MONTHLY',
  /** Paying off all remaining months at once (only offered when <= 3 months remain unpaid). */
  REMAINDER = 'REMAINDER',
}
