export function parseDeadline(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Geçersiz son tarih");
  }
  return date;
}
