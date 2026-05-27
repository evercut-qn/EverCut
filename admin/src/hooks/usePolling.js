'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook to trigger an asynchronous query function at regular intervals.
 * Automatically skips triggers if the active page is running in the background.
 *
 * @param {() => Promise<void>} callback - Async fetch action
 * @param {number} delay - Interval delay in milliseconds
 */
export function usePolling(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || delay === undefined) return;

    async function tick() {
      if (document.hidden) return; // Prevent unnecessary backend load
      await savedCallback.current();
    }

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
export default usePolling;
