'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/services/http';

// Carrega um recurso da API ao montar; reload() busca de novo (ex.: depois de salvar)
export function useResource<T>(fetcher: () => Promise<T>, errorText: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    try {
      setData(await fetcherRef.current());
    } catch (e) {
      toast.error(errorMessage(e, errorText));
    } finally {
      setLoading(false);
    }
  }, [errorText]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}
