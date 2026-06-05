/** SQLite LIKE pattern'de % ve _ karakterlerini literal yapar. */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

export function toLikePattern(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "%";
  return `%${escapeLikePattern(trimmed)}%`;
}
