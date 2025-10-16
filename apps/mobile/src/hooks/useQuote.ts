import { useEffect, useState, useCallback } from "react";
import { getRandomQuote } from "../services/rapidService";

export function useQuote() {
  const [quote, setQuote] = useState<{ content: string; author: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = await getRandomQuote();
      setQuote(q);
    } catch (err: any) {
      setError(err.message || "Failed to load quote");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return { quote, loading, error, refresh: fetchQuote };
}
