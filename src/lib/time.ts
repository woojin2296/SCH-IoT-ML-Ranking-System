export function getSeoulTimestamp(): string {
  const nowUtc = Date.now();
  const offsetMs = 9 * 60 * 60 * 1000; // +09:00
  const seoulDate = new Date(nowUtc + offsetMs);
  return seoulDate.toISOString().replace("Z", "+09:00");
}
