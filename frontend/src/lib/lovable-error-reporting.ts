// Minimal client-side error reporter used by the root route's error
// boundary. Not wired to any external telemetry service — it just logs, so
// nothing is sent off-device. Replace with a real reporting call if needed.
export function reportLovableError(error: unknown, meta?: Record<string, unknown>) {
  console.error("[edu-crm] unhandled UI error", error, meta);
}
