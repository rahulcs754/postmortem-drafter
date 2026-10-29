/** "09:12 UTC" style label for an ISO time. */
export function clock(iso: string): string {
  return `${new Date(iso).toISOString().slice(11, 16)} UTC`;
}

export function day(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
