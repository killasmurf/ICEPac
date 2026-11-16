import { useCallback, useState } from 'react';

export const SIDEBAR_COLLAPSED_KEY = 'icepac.sidebarCollapsed';

function read(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Desktop rail state, persisted in localStorage. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(read);
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* not persisted */
      }
      return next;
    });
  }, []);
  return [collapsed, toggle];
}
