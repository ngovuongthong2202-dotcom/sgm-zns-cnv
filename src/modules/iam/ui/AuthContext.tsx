import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usersRepo } from '@/src/data/repositories/users.repo';
import { supabase, isSupabaseConfigured } from '@/src/shared/config/supabase.client';
import { logger } from '@/src/shared/lib/logger';

export interface UserData {
  role?: 'Chuyên viên' | 'Ban Giám Đốc' | 'Administrator';
  onboarded?: boolean;
  displayName?: string;
  department?: string;
  position?: string;
  password?: string;
  username?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface CustomUser {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export interface AuthContextType {
  user: CustomUser | null;
  userData: UserData | null;
  loading: boolean;
  login: (username?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
  switchRole: (role: 'Chuyên viên' | 'Ban Giám Đốc' | 'Administrator') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'sgm_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Restore persistent real user session from localStorage
  const [user, setUser] = useState<CustomUser | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.user || null;
      }
    } catch (e) {
      logger.warn('Failed to parse stored session:', e);
    }
    return null;
  });

  const [userData, setUserData] = useState<UserData | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.userData || null;
      }
    } catch (e) {
      logger.warn('Failed to parse stored user data:', e);
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  // Background session verification against live Supabase database
  useEffect(() => {
    let mounted = true;
    if (user?.username) {
      usersRepo.getUser(user.username).then(liveData => {
        if (!mounted) return;
        if (liveData) {
          const updatedUser: CustomUser = {
            uid: liveData.id || liveData.username,
            username: liveData.username,
            displayName: liveData.displayName || liveData.username,
            email: (liveData as any).email || `${liveData.username}@sgm.vn`,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(liveData.displayName || liveData.username)}&background=2563EB&color=fff`
          };
          const updatedData: UserData = {
            ...liveData,
            role: liveData.role || 'Chuyên viên',
            onboarded: true
          };
          setUser(updatedUser);
          setUserData(updatedData);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: updatedUser, userData: updatedData }));
        }
      }).catch(err => {
        logger.debug('Background session verification error:', err);
      });
    }
    return () => {
      mounted = false;
    };
  }, [user?.username]);

  const handleLogin = async (username?: string, password?: string): Promise<boolean> => {
    if (!username || !username.trim()) return false;
    const uId = username.toLowerCase().trim();
    const pwd = (password || '').trim();

    try {
      // 1. Fetch user account from real Supabase users table
      const data = await usersRepo.getUser(uId);

      if (data) {
        // Password verification:
        // Default admin allows 'admin' or stored password; other users must match stored password
        const expectedPwd = data.password || (uId === 'admin' ? 'admin' : '');
        const isValid = expectedPwd === pwd || (uId === 'admin' && pwd === 'admin');

        if (isValid) {
          const authUser: CustomUser = {
            uid: data.id || data.username,
            username: data.username,
            displayName: data.displayName || data.username,
            email: (data as any).email || `${data.username}@sgm.vn`,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || data.username)}&background=2563EB&color=fff`
          };
          const fullData: UserData = {
            ...data,
            role: data.role || (uId === 'admin' ? 'Administrator' : 'Chuyên viên'),
            onboarded: true
          };

          setUser(authUser);
          setUserData(fullData);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: authUser, userData: fullData }));
          logger.info(`User ${uId} logged in successfully with role: ${fullData.role}`);
          return true;
        }
      }

      // 2. Try Supabase Auth password login as secondary standard provider
      if (isSupabaseConfigured) {
        try {
          const email = uId.includes('@') ? uId : `${uId}@sgm.vn`;
          const { data: authResult, error } = await supabase.auth.signInWithPassword({
            email,
            password: pwd
          });
          if (!error && authResult?.user) {
            const authUser: CustomUser = {
              uid: authResult.user.id,
              username: uId,
              displayName: authResult.user.user_metadata?.display_name || uId,
              email: authResult.user.email || email,
              photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(uId)}&background=2563EB&color=fff`
            };
            const fullData: UserData = {
              username: uId,
              role: (authResult.user.user_metadata?.role as any) || 'Chuyên viên',
              onboarded: true
            };
            setUser(authUser);
            setUserData(fullData);
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: authUser, userData: fullData }));
            return true;
          }
        } catch {
          // Continue to return false
        }
      }

      return false;
    } catch (err) {
      logger.error('Login error:', err);
      return false;
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('sgm_active_role');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        logger.debug('Supabase signOut error:', e);
      }
    }
    setUser(null);
    setUserData(null);
    logger.info('User logged out successfully.');
  };

  const updateUserData = async (data: Partial<UserData>) => {
    if (!user) return;
    const merged = { ...(userData || {}), ...data };
    setUserData(merged);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, userData: merged }));
    await usersRepo.setUser(user.uid, data as any, true);
  };

  const switchRole = useCallback((role: 'Chuyên viên' | 'Ban Giám Đốc' | 'Administrator') => {
    if (!userData) return;
    const updated = { ...userData, role };
    setUserData(updated);
    if (user) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, userData: updated }));
    }
    logger.info(`Updated user active role to: ${role}`);
  }, [user, userData]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      login: handleLogin, 
      logout: handleLogout, 
      updateUserData,
      switchRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
