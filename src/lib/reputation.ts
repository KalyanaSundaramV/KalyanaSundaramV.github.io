export type ReputationState = { score: number; applied: number[] };

export type FinishedAttempt = {
  attemptId: number;
  result: "passed" | "failed";
  violations: number;
};

export const REPUTATION_KEY = "kalyan-portfolio-reputation";

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof globalThis === "undefined") return null;
  if (!("localStorage" in globalThis)) return null;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadReputation(storage?: Storage): number {
  const store = resolveStorage(storage);
  if (!store) return 0;

  try {
    const raw = store.getItem(REPUTATION_KEY);
    if (raw === null) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function saveReputation(value: number, storage?: Storage): void {
  const store = resolveStorage(storage);
  if (!store) return;

  try {
    store.setItem(REPUTATION_KEY, String(value));
  } catch {
    // Ignore write failures from restricted or unavailable storage.
  }
}

export function applyAttempt(
  state: ReputationState,
  attempt: FinishedAttempt,
): ReputationState {
  if (state.applied.includes(attempt.attemptId)) {
    return state;
  }

  const nextScore =
    attempt.result === "passed"
      ? state.score + 10
      : state.score - Math.max(5, 5 * attempt.violations);

  return {
    score: nextScore,
    applied: [...state.applied, attempt.attemptId],
  };
}

export function isLocked(score: number, minReputation?: number): string | null {
  if (minReputation === undefined || score >= minReputation) {
    return null;
  }

  return `Needs reputation ${minReputation} (you have ${score})`;
}
