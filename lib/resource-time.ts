const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function isResourceNew(createdAt: string, nowMs = Date.now()): boolean {
  const createdMs = Date.parse(createdAt);

  if (Number.isNaN(createdMs)) {
    return false;
  }

  const age = nowMs - createdMs;
  return age >= 0 && age <= DAY_IN_MS;
}
