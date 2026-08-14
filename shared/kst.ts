const KST_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1000;

export function toKstIsoString(date: Date = new Date()): string {
  return new Date(date.getTime() + KST_OFFSET_MILLISECONDS)
    .toISOString()
    .replace("Z", "+09:00");
}


function assertKstDateText(dateText: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error("KST 날짜는 YYYY-MM-DD 형식이어야 합니다.");
  }

  const parsed = new Date(`${dateText}T00:00:00.000+09:00`);

  if (
    Number.isNaN(parsed.getTime()) ||
    toKstIsoString(parsed).slice(0, 10) !== dateText
  ) {
    throw new Error("유효하지 않은 KST 날짜입니다.");
  }
}

export function getKstDateStart(dateText: string): Date {
  assertKstDateText(dateText);
  return new Date(`${dateText}T00:00:00.000+09:00`);
}

export function getKstDateEnd(dateText: string): Date {
  assertKstDateText(dateText);
  return new Date(`${dateText}T23:59:59.999+09:00`);
}
