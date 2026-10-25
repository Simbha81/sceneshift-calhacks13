import { useCallback, useState } from "react";

/** Account-free, device-only list stored in localStorage. Safe when storage is unavailable. */
export function useStoredList(key: string): [string[], (next: string[]) => void] {
  const [value, setValue] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch { return []; }
  });
  const update = useCallback((next: string[]) => {
    setValue(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable: keep in memory only */ }
  }, [key]);
  return [value, update];
}
