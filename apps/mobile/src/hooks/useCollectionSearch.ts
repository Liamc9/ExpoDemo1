// hooks/useCollection.ts
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getDocById, queryPage, subscribeList, PageArgs } from "../services/fs";

// Debounce helper (so typing doesn't spam queries)
function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

// One-shot list
export function useCollection<T = any>(args: Omit<PageArgs, "cursor" | "pageSize"> & { pageSize?: number }) {
  const debounced = args.search?.text ? { ...args, search: { ...args.search, text: useDebounce(args.search.text) } } : args;

  return useQuery({
    queryKey: ["fs:list", debounced],
    queryFn: () => queryPage<T>({ ...debounced, pageSize: debounced.pageSize ?? 50 }),
    select: (res) => res.items,
    staleTime: 60_000,
  });
}

// Infinite (pagination)
export function useInfiniteCollection<T = any>(args: Omit<PageArgs, "cursor">) {
  const debounced = args.search?.text ? { ...args, search: { ...args.search, text: useDebounce(args.search.text) } } : args;

  return useInfiniteQuery<{ items: T[]; nextCursor?: PageArgs["cursor"] | null }, Error>({
    queryKey: ["fs:infinite", debounced],
    queryFn: ({ pageParam }) => queryPage<T>({ ...debounced, cursor: (pageParam as PageArgs["cursor"]) ?? null }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 60_000,
    initialPageParam: null,
  });
}

// Single doc
export function useDoc<T = any>(path: string, id?: string) {
  return useQuery({
    queryKey: ["fs:doc", path, id],
    queryFn: () => getDocById<T>(path, id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// Live list (realtime)
export function useLiveCollection<T = any>(args: Omit<PageArgs, "cursor" | "pageSize">) {
  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Debounce search text for live too
  const s = args.search?.text ? useDebounce(args.search.text) : undefined;
  const liveArgs = s ? { ...args, search: { field: args.search!.field, text: s } } : args;

  useEffect(() => {
    const unsub = subscribeList<T>(liveArgs, setData, (e) => setError(e));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(liveArgs)]);

  return { data, error, loading: !data && !error };
}
