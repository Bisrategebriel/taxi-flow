// FR-RS-07

export interface RecentSearch {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  ts: number;
}

const KEY = "taxiflow_recent_searches";
const MAX = 5;

export function useRecentSearches() {
  function getAll(): RecentSearch[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  function add(entry: Omit<RecentSearch, "ts">) {
    const existing = getAll().filter(
      (s) => !(s.fromId === entry.fromId && s.toId === entry.toId)
    );
    const next = [{ ...entry, ts: Date.now() }, ...existing].slice(0, MAX);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }

  return { getAll, add };
}
