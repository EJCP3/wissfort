import { useEffect, useRef, useState } from 'react';
import { toaster } from '../vanilla';
import { subscribeHistory } from '../core';
import type { WissConfig } from '../core/types';

/**
 * React wrapper for the wissfort toast system.
 *
 * Drop this component once at the root of your app. It renders nothing
 * visible — it just boots the toaster container and keeps it in sync
 * with the props you pass.
 *
 * ```tsx
 * import { Toaster } from 'wissfort/react';
 * import { toast } from 'wissfort';
 *
 * function App() {
 *   return (
 *     <>
 *       <Toaster position="bottom-right" theme="dark" />
 *       <button onClick={() => toast.success('¡Hecho!')}>Notify</button>
 *     </>
 *   );
 * }
 * ```
 */
export function Toaster(props: WissConfig): null {
  // Serialize props so we can detect real changes without requiring
  // the consumer to memoize the config object.
  const serialized = JSON.stringify(props);
  const prevRef = useRef(serialized);

  // First mount — always init.
  useEffect(() => {
    toaster(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-init only when config actually changes.
  useEffect(() => {
    if (serialized !== prevRef.current) {
      prevRef.current = serialized;
      toaster(props);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  return null;
}

export function useToastHistory(): import('../core/types').Toast[] {
  const [history, setHistory] = useState<import('../core/types').Toast[]>([]);
  
  useEffect(() => {
    return subscribeHistory(setHistory);
  }, []);
  
  return history;
}

export type { Position, Theme, WissConfig } from '../core/types';
