import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/src/modules/iam';
import { draftsRepo } from '@/src/data/repositories/drafts.repo';

function removeUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const newObj: Record<string, unknown> = {};
    for (const key in obj) {
      if ((obj as Record<string, unknown>)[key] !== undefined) {
        newObj[key] = removeUndefined((obj as Record<string, unknown>)[key]);
      }
    }
    return newObj;
  }
  return obj;
}

export function useDraft<T extends Record<string, unknown>>(entityType: string, id: string = 'new') {
  const { user } = useAuth();
  const [draft, setDraft] = useState<T | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const loadingRef = useRef(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDraft = async () => {
      if (!user) {
        loadingRef.current = false;
        return;
      }
      try {
        const data = await draftsRepo.getDraft<Record<string, unknown>>(user.uid, entityType, id);
        if (!isMounted) return;
        if (data) {
          if (data._lastSavedAt) {
             setLastSavedAt(new Date(data._lastSavedAt as string | number));
          }
          const { _lastSavedAt, ...rest } = data;
          setDraft(rest as T);
          setIsRestored(true);
        }
      } catch (e) {
        console.error("Draft read error", e);
      } finally {
        if (isMounted) {
          loadingRef.current = false;
        }
      }
    };
    fetchDraft();
    return () => {
      isMounted = false;
    };
  }, [entityType, id, user]);

  const saveDraft = async (data: T) => {
    if (!user || loadingRef.current) return;
    try {
      const sanitized = removeUndefined(data);
      await draftsRepo.saveDraft(user.uid, entityType, id, sanitized as any);
      setLastSavedAt(new Date());
    } catch (e) {
      console.error("Draft save error", e);
    }
  };

  const clearDraft = async () => {
    if (!user) return;
    try {
      await draftsRepo.clearDraft(user.uid, entityType, id);
      setDraft(null);
      setLastSavedAt(null);
      setIsRestored(false);
    } catch (e) {
      console.error("Draft clear error", e);
    }
  };

  return { draft, lastSavedAt, saveDraft, clearDraft, isRestored };
}
