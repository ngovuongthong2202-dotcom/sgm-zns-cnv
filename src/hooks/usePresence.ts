import { useEffect, useState } from 'react';
import { presenceRepo } from '@/src/data/repositories/system.repo';
import { useAuth } from '@/src/modules/iam';

export interface PresenceInfo {
  userId: string;
  userEmail: string;
  displayName: string;
  photoURL?: string;
  currentRoute: string;
  currentEntityId: string | null;
  currentEntityType: string | null;
  lastSeenAt: number;
  expiresAt: number;
}

export function usePresence(currentEntityId?: string | null, currentEntityType?: string | null) {
  const [activeUsers, setActiveUsers] = useState<PresenceInfo[]>([]);
  const [presenceData, setPresenceData] = useState<PresenceInfo[]>([]);
  const { user } = useAuth();
  const authReady = Boolean(user);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid || 'admin';
    const email = user.email || 'admin@sgm.vn';
    
    const updatePresence = () => {
      presenceRepo.set(uid, {
        userId: uid,
        userEmail: email,
        displayName: user.displayName || 'Admin',
        photoURL: user.photoURL || '',
        currentRoute: window.location.pathname,
        currentEntityId: currentEntityId || null,
        currentEntityType: currentEntityType || null,
        lastSeenAt: Date.now(),
        expiresAt: Date.now() + 30000 // 30s
      }).catch(console.warn);
    };

    updatePresence();
    const interval = setInterval(updatePresence, 20000);

    const handleBeforeUnload = () => {
       presenceRepo.set(uid, { expiresAt: 0 }).catch(console.warn);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      presenceRepo.set(uid, { 
        expiresAt: 0, 
        currentEntityId: null, 
        currentEntityType: null 
      }).catch(console.warn);
    };
  }, [currentEntityId, currentEntityType, user]);

  useEffect(() => {
    if (!authReady || !currentEntityId || !currentEntityType) return;
    const unsub = presenceRepo.subscribe({ fkField: 'currentEntityId', fkId: currentEntityId, limit: 100 }, (data) => {
      setPresenceData(data as unknown as PresenceInfo[]);
    }, console.error);
    return () => unsub();
  }, [currentEntityId, currentEntityType, authReady]);

  useEffect(() => {
     if (!currentEntityId || !currentEntityType) {
         setActiveUsers([]);
         return;
     }
     const now = Date.now();
     const users = presenceData.filter(u => u.expiresAt > now && u.userId !== user?.uid && u.currentEntityType === currentEntityType);
     setActiveUsers(users);
  }, [presenceData, currentEntityId, currentEntityType, user]);

  return { activeUsers };
}

export function useGlobalPresence(entityType?: string) {
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceInfo[]>>({});
  const [globalData, setGlobalData] = useState<PresenceInfo[]>([]);
  const { user } = useAuth();
  const authReady = Boolean(user);

  useEffect(() => {
    if (!authReady || !entityType) return;
    const unsub = presenceRepo.subscribe({ fkField: 'currentEntityType', fkId: entityType, limit: 500 }, (data) => {
      setGlobalData(data as unknown as PresenceInfo[]);
    }, console.error);
    return () => unsub();
  }, [entityType, authReady]);

  useEffect(() => {
    if (!user || !entityType) return;
    const now = Date.now();
    const newMap: Record<string, PresenceInfo[]> = {};
    for (const u of globalData) {
      if (u.expiresAt > now && u.userId !== user.uid && u.currentEntityId) {
        if (!newMap[u.currentEntityId]) newMap[u.currentEntityId] = [];
        newMap[u.currentEntityId].push(u);
      }
    }
    setPresenceMap(newMap);
  }, [globalData, entityType, user]);

  return { presenceMap };
}

export function useAllOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceInfo[]>([]);
  const [allData, setAllData] = useState<PresenceInfo[]>([]);
  const { user } = useAuth();
  const authReady = Boolean(user);

  useEffect(() => {
    if (!authReady) return;
    const unsub = presenceRepo.subscribe(100, (data) => {
      setAllData(data as unknown as PresenceInfo[]);
    }, console.error);
    return () => unsub();
  }, [authReady]);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    const users = allData.filter(u => u.expiresAt > now && u.userId !== user.uid);
    setOnlineUsers(users);
  }, [allData, user]);

  return { onlineUsers };
}
