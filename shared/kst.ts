const KST_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1000;

export function toKstIsoString(date: Date = new Date()): string {
  return new Date(date.getTime() + KST_OFFSET_MILLISECONDS)
    .toISOString()
    .replace("Z", "+09:00");
}
