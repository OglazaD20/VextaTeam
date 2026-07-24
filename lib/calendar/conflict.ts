/**
 * Two-way sync conflict resolution — pure, no I/O. `externalUpdatedAt` is the
 * Google `updated` timestamp we last reconciled to; comparing both sides'
 * current timestamps against that baseline tells us who changed since.
 *
 * A small tolerance absorbs clock skew between our DB and Google's, and the
 * fact that pushing a change writes back external_updated_at in the same
 * update as the local edit — those two timestamps are milliseconds apart,
 * not identical, and shouldn't be misread as "local changed again."
 */

const CONFLICT_TOLERANCE_MS = 5000;

export type ConflictResolution = "use_remote" | "use_local" | "no_change";

export interface ConflictInput {
  localUpdatedAt: Date;
  /** Null when this item has never been synced with Google before. */
  externalUpdatedAt: Date | null;
  remoteUpdatedAt: Date;
}

export function resolveConflict(input: ConflictInput): ConflictResolution {
  const baseline = input.externalUpdatedAt ?? new Date(0);
  const remoteChanged = input.remoteUpdatedAt.getTime() - baseline.getTime() > CONFLICT_TOLERANCE_MS;
  const localChanged = input.localUpdatedAt.getTime() - baseline.getTime() > CONFLICT_TOLERANCE_MS;

  if (!remoteChanged && !localChanged) return "no_change";
  if (remoteChanged && !localChanged) return "use_remote";
  if (!remoteChanged && localChanged) return "use_local";

  return input.remoteUpdatedAt.getTime() >= input.localUpdatedAt.getTime()
    ? "use_remote"
    : "use_local";
}
