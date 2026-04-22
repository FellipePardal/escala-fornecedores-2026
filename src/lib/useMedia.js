// ─── HOOK DE MEDIA QUERY ──────────────────────────────────────────────────────
// useIsMobile() → true se viewport < 720px. Reativo ao resize.

import { useState, useEffect } from "react";

export function useMediaQuery(query) {
  const get = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = e => setMatch(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    setMatch(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, [query]);
  return match;
}

export const useIsMobile  = () => useMediaQuery("(max-width: 720px)");
export const useIsTablet  = () => useMediaQuery("(max-width: 1024px)");
