import { supabase, isSupabaseConfigured } from '@/src/shared/config/supabase.client';

export interface UserAccount {
  id: string; // username
  username: string;
  password?: string;
  displayName: string;
  department: string;
  position: string;
  role: 'Chuyên viên' | 'Ban Giám Đốc' | 'Administrator';
  createdAt?: string;
}

const defaultAdminAccount: UserAccount = {
  id: 'admin',
  username: 'admin',
  password: 'admin',
  displayName: 'Mạnh Hùng (Admin)',
  department: 'Ban Giám Đốc',
  position: 'Administrator',
  role: 'Administrator',
  createdAt: '2026-09-23T00:00:00.000Z'
};

export class UsersRepository {
  private tableName = 'users';

  async getUser(username: string): Promise<UserAccount | null> {
    if (!isSupabaseConfigured) {
      return username === 'admin' ? defaultAdminAccount : null;
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .or(`username.eq.${username},id.eq.${username}`)
      .maybeSingle();

    if (error || !data) {
      return username === 'admin' ? defaultAdminAccount : null;
    }
    return {
      id: data.id || data.username,
      username: data.username,
      displayName: data.display_name || data.displayName,
      department: data.department,
      position: data.position,
      role: data.role,
      createdAt: data.created_at || data.createdAt,
      ...((data.data as Record<string, unknown>) || {})
    } as UserAccount;
  }

  async setUser(username: string, data: Partial<UserAccount>, merge = true): Promise<void> {
    if (!isSupabaseConfigured) return;

    const payload = {
      id: username,
      username,
      display_name: data.displayName,
      role: data.role,
      department: data.department,
      position: data.position,
      data: data as Record<string, unknown>,
      updated_at: new Date().toISOString()
    };

    await supabase.from(this.tableName).upsert(payload);
  }

  async deleteUser(username: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from(this.tableName).delete().eq('username', username);
  }

  subscribeUser(username: string, cb: (user: UserAccount | null) => void, errCb?: (err: Error) => void): () => void {
    let isSubscribed = true;

    this.getUser(username).then(user => {
      if (isSubscribed) cb(user);
    }).catch(err => {
      if (isSubscribed && errCb) errCb(err);
    });

    if (!isSupabaseConfigured) {
      return () => { isSubscribed = false; };
    }

    const channelName = `realtime:user:${username}:${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this.tableName, filter: `username=eq.${username}` },
        payload => {
          if (!isSubscribed) return;
          if (payload.eventType === 'DELETE') {
            cb(null);
          } else {
            const data: any = payload.new;
            cb({
              id: data.id || data.username,
              username: data.username,
              displayName: data.display_name || data.displayName,
              department: data.department,
              position: data.position,
              role: data.role,
              createdAt: data.created_at,
              ...((data.data as Record<string, unknown>) || {})
            } as UserAccount);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }

  subscribeAll(cb: (users: UserAccount[]) => void, errCb?: (err: Error) => void): () => void {
    let isSubscribed = true;

    const fetchAll = async () => {
      if (!isSupabaseConfigured) {
        if (isSubscribed) cb([defaultAdminAccount]);
        return;
      }

      const { data, error } = await supabase.from(this.tableName).select('*');
      if (error) {
        if (errCb) errCb(error as any);
        return;
      }

      const users: UserAccount[] = (data || []).map((row: any) => ({
        id: row.id || row.username,
        username: row.username,
        displayName: row.display_name || row.displayName,
        department: row.department,
        position: row.position,
        role: row.role,
        createdAt: row.created_at,
        ...((row.data as Record<string, unknown>) || {})
      }));

      // Ensure admin exists in list
      if (!users.some(u => u.username === 'admin')) {
        users.unshift(defaultAdminAccount);
      }

      if (isSubscribed) cb(users);
    };

    fetchAll();

    if (!isSupabaseConfigured) {
      return () => { isSubscribed = false; };
    }

    const channelName = `realtime:users:all:${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this.tableName },
        () => {
          if (isSubscribed) fetchAll();
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }
}

export const usersRepo = new UsersRepository();
