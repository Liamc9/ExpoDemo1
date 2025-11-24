// hooks/useRapid.ts
import { useCallback, useEffect, useRef, useState } from "react";

type UseRapidOptions<T> = {
  /** Auto-run on mount/when deps change (default: true) */
  auto?: boolean;
  /** Optional initial value */
  initialData?: T | null;
  /** Called whenever an error occurs */
  onError?: (err: Error) => void;
};

export function useRapid<T>(fetcher: () => Promise<T>, deps: any[] = [], opts: UseRapidOptions<T> = {}) {
  const { auto = true, initialData = null, onError } = opts;
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!!auto);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await fetcher();
      if (mounted.current) setData(out);
      return out;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (mounted.current) {
        setError(msg);
        onError?.(e instanceof Error ? e : new Error(msg));
      }
      throw e;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (auto) {
      // Fire and forget; errors are stored in state
      run().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    error,
    refetch: run,
    setData, // handy for local optimistic updates
    setError,
  };
}
