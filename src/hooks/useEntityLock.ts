import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/src/modules/iam';
import { logger } from '@/src/shared/lib/logger';
import { systemLocksRepo } from '@/src/data/repositories/system.repo';

export interface EntityLockInfo {
  userId: string;
  userEmail: string | null;
  lockedAt: number;
  expiresAt: number;
}

export function useEntityLock(entityType: string, entityId: string | null | undefined) {
  const { user } = useAuth();
  const [lockInfo, setLockInfo] = useState<EntityLockInfo | null>(null);
  const [isLockedByMe, setIsLockedByMe] = useState(false);
  const [isLockedByOther, setIsLockedByOther] = useState(false);

  const isLockedByMeRef = useRef(isLockedByMe);
  const isLockedByOtherRef = useRef(isLockedByOther);
  const lockInfoRef = useRef(lockInfo);

  useEffect(() => {
    isLockedByMeRef.current = isLockedByMe;
  }, [isLockedByMe]);

  useEffect(() => {
    isLockedByOtherRef.current = isLockedByOther;
  }, [isLockedByOther]);

  useEffect(() => {
    lockInfoRef.current = lockInfo;
  }, [lockInfo]);

  useEffect(() => {
    let isMounted = true;
    const userId = user?.uid;
    if (!entityId || !userId) {
      setLockInfo(null);
      setIsLockedByMe(false);
      setIsLockedByOther(false);
      return;
    }

    const lockId = `${entityType}_${entityId}`;
    
    // Subscribe to lock changes
    const unsubscribe = systemLocksRepo.subscribeById(lockId, (rawData) => {
      const data = rawData as unknown as EntityLockInfo;
      if (!isMounted) return;
      if (data) {
        const now = Date.now();
        if (data.expiresAt > now) {
          setLockInfo(data);
          const byMe = data.userId === userId;
          setIsLockedByMe(byMe);
          setIsLockedByOther(!byMe);
        } else {
          // Lock expired in our view -> Evict zombie lock from DB asynchronously
          systemLocksRepo.hardDelete(lockId).catch(() => {});
          setLockInfo(null);
          setIsLockedByMe(false);
          setIsLockedByOther(false);
        }
      } else {
        setLockInfo(null);
        setIsLockedByMe(false);
        setIsLockedByOther(false);
      }
    }, (err) => {
      logger.warn(`Could not subscribe to lock ${lockId}:`, err);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [entityType, entityId, user?.uid]);

  const lastInteractionRef = useRef(Date.now());

  const acquireLock = useCallback(async (isRenew: boolean = false) => {
    if (!entityId || !user?.uid) return false;
    
    // If already locked by me and not an explicit renewal, avoid redundant database writes
    if (isLockedByMeRef.current && !isRenew) return true;

    // Safety check if already locked by other and not expired
    if (!isRenew && isLockedByOtherRef.current && lockInfoRef.current && lockInfoRef.current.expiresAt > Date.now()) {
      return false;
    }

    const lockId = `${entityType}_${entityId}`;
    const now = Date.now();
    const newLock: EntityLockInfo = {
      userId: user.uid,
      userEmail: user.email || null,
      lockedAt: now,
      expiresAt: now + 15 * 60 * 1000, // 15 minutes TTL
    };
    
    try {
      await systemLocksRepo.set(lockId, newLock as unknown as Partial<Record<string, unknown>>);
      setIsLockedByMe(true);
      setIsLockedByOther(false);
      setLockInfo(newLock);
      return true;
    } catch (e) {
      logger.error('Failed to acquire lock', e);
      return false;
    }
  }, [entityType, entityId, user?.uid, user?.email]);

  const releaseLock = useCallback(async (force: boolean = false) => {
    if (!entityId || (!isLockedByMeRef.current && !force)) return;
    const lockId = `${entityType}_${entityId}`;
    try {
      await systemLocksRepo.hardDelete(lockId);
      setIsLockedByMe(false);
      setIsLockedByOther(false);
      setLockInfo(null);
    } catch (e) {
      logger.error('Failed to release lock', e);
    }
  }, [entityType, entityId]);

  // Heartbeat to keep lock alive if acquired, with idle threshold checking
  useEffect(() => {
    if (!isLockedByMe) return;
    
    const handleInteraction = () => {
      lastInteractionRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('scroll', handleInteraction);

    const interval = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastInteractionRef.current;
      const IDLE_LIMIT = 15 * 60 * 1000; // 15 minutes

      if (idleTime > IDLE_LIMIT) {
        logger.warn(`[useEntityLock] Idle for more than 15 minutes. Releasing lock on ${entityType}_${entityId}`);
        releaseLock(); 
      } else {
        acquireLock(true); // Renew expiration (extends TTL by 15 mins)
      }
    }, 60 * 1000); // Every 1 minute
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      releaseLock(); 
    };
  }, [isLockedByMe, entityType, entityId]);

  return {
    isLockedByMe,
    isLockedByOther,
    lockInfo,
    acquireLock,
    releaseLock
  };
}
