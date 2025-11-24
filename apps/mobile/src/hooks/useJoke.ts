import { useQuery } from "@tanstack/react-query";
import { fetchJoke } from "../services/jokes";

export function useJoke() {
  return useQuery({
    queryKey: ["jokes", "random"],
    queryFn: fetchJoke,
    staleTime: 60_000,
  });
}
