import type { IncidentWindow } from "../lib/types";

export function inWindow(at: string | number | Date, window: IncidentWindow): boolean {
  const t = new Date(at).getTime();
  return t >= new Date(window.from).getTime() && t <= new Date(window.to).getTime();
}

export function toIso(at: string | number | Date): string {
  return new Date(at).toISOString();
}

export function firstLine(text: string, max = 120): string {
  const line = text.split("\n")[0] ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/** Read-only GET with a bearer token. Throws with the status on failure. */
export async function getJson<T>(url: string, token: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...headers } });
  if (!res.ok) throw new Error(`GET ${new URL(url).pathname} failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export function requireEnv(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
