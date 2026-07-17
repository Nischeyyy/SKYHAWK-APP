import { useEffect, useRef } from 'react';

/**
 * Polls `fn` every `intervalMs` milliseconds in the background.
 * Uses a ref so that stale closures are never an issue — always calls
 * the latest version of `fn` without resetting the timer.
 *
 * @param {() => void} fn          - The refresh function to call (usually `load`)
 * @param {number}     intervalMs  - Polling interval in ms (default 30 s)
 */
export function useAutoRefresh(fn, intervalMs = 30_000) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const t = setInterval(() => fnRef.current(), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
}
