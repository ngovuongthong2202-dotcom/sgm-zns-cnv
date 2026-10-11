import { supabase, isSupabaseConfigured } from '@/src/shared/config/supabase.client';

export interface UserAccount {
  id: string; // username
  username: string;
  /** Chỉ dùng khi GHI (setUser). Đợt 0A (BM03): không hàm đọc nào của repo trả trường này. */
  password?: string;
  displayName: string;
  department: string;
  position: string;
  role: 'Chuyên viên' | 'Ban Giám Đốc' | 'Administrator';
  createdAt?: string;
}

// Tài khoản quản trị dựng sẵn (K-SEC-3/P1): GỠ Ở VIỆC 29 sau khi chủ sở hữu xác nhận A2. Việc 11 chỉ gom mọi chỗ dùng về đây.
const defaultAdminAccount: UserAccount = {
  id: 'admin',
  username: 'admin',
  password: 'admin',
  displayName: 'Ngô Vương Thông',
  department: 'Ban Giám Đốc',
  position: 'Administrator',
  role: 'Administrator',
  createdAt: '2026-09-23T00:00:00.000Z'
};

/** Rào tên đăng nhập trước khi truy vấn (BM06): chữ thường, số, ".", "_", "-", tối đa 64 ký tự — rộng hơn luật tạo tài khoản ở UserCreateModal.tsx:37 (/^[a-z0-9_.]+$/), không thay luật đó. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{1,64}$/;

function withoutPassword(account: UserAccount): UserAccount {
  const copy: UserAccount = { ...account };
  delete copy.password;
  return copy;
}

function toAccount(row: Record<string, any>): UserAccount {
  const extra: Record<string, unknown> = { ...((row.data as Record<string, unknown>) || {}) };
  delete extra.password; // Đợt 0A (BM03): mật khẩu không bao giờ rời khỏi repo qua đường đọc
  return {
    id: row.id || row.username,
    username: row.username,
    displayName: row.display_name || row.displayName,
    department: row.department,
    position: row.position,
    role: row.role,
    createdAt: row.created_at || row.createdAt,
    ...extra
  } as UserAccount;
}

export class UsersRepository {
  private tableName = 'users';

  isValidUsername(username: unknown): username is string {
    return typeof username === 'string' && USERNAME_PATTERN.test(username);
  }

  async getAll(): Promise<UserAccount[]> {
    if (!isSupabaseConfigured) {
      return [withoutPassword(defaultAdminAccount)];
    }
    const { data, error } = await supabase.from(this.tableName).select('*');
    if (error || !data) {
      return [withoutPassword(defaultAdminAccount)];
    }
    return (data || []).map((row: any) => toAccount(row));
  }

  async getUser(username: string): Promise<UserAccount | null> {
    if (!this.isValidUsername(username)) return null;
    if (!isSupabaseConfigured) {
      return username === 'admin' ? withoutPassword(defaultAdminAccount) : null;
    }

    // BM06: hai lệnh .eq() riêng thay cho .or() ghép chuỗi
    let { data, error } = await supabase.from(this.tableName).select('*').eq('username', username).maybeSingle();
    if (!error && !data) {
      ({ data, error } = await supabase.from(this.tableName).select('*').eq('id', username).maybeSingle());
    }
    if (error || !data) {
      return username === 'admin' ? withoutPassword(defaultAdminAccount) : null;
    }
    return toAccount(data);
  }

  /**
   * Đợt 0A (BM03): so mật khẩu ngay trong repo, chỉ đọc cột data, không trả giá trị ra ngoài.
   * Cặp tài khoản dựng sẵn vẫn được chấp nhận ở đây (quy tắc cũ của AuthContext.tsx:114-115 dời về một chỗ) — GỠ Ở VIỆC 29.
   */
  async verifyPassword(username: string, candidate: string): Promise<boolean> {
    if (!this.isValidUsername(username) || typeof candidate !== 'string' || !candidate) return false;
    if (username === defaultAdminAccount.id && candidate === defaultAdminAccount.password) return true;
    if (!isSupabaseConfigured) return false;

    const { data, error } = await supabase.from(this.tableName).select('data').eq('username', username).maybeSingle();
    if (error || !data) return false;
    const stored = ((data as { data?: Record<string, unknown> | null }).data || {}).password;
    return typeof stored === 'string' && stored.length > 0 && stored === candidate;
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

    if (!this.isValidUsername(username)) {
      cb(null);
      return () => { isSubscribed = false; };
    }

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
            cb(toAccount(payload.new as Record<string, any>));
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
        if (isSubscribed) cb([withoutPassword(defaultAdminAccount)]);
        return;
      }

      const { data, error } = await supabase.from(this.tableName).select('*');
      if (error) {
        if (errCb) errCb(error as any);
        return;
      }

      const users: UserAccount[] = (data || []).map((row: any) => toAccount(row));

      // Ensure admin exists in list (gỡ ở Việc 29)
      if (!users.some(u => u.username === 'admin')) {
        users.unshift(withoutPassword(defaultAdminAccount));
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
