const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

export function isResourceNew(createdAt: string, nowMs = Date.now()): boolean {
  const createdMs = Date.parse(createdAt);

  if (Number.isNaN(createdMs)) {
    return false;
  }

  const age = nowMs - createdMs;
  return age >= 0 && age <= THREE_DAYS_IN_MS;
}
