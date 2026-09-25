import { supabase, isSupabaseConfigured } from '@/src/shared/config/supabase.client';

export class DraftsRepository {
  private tableName = 'drafts';

  private buildKey(userId: string, entityType: string, id: string): string {
    return `${userId}:${entityType}:${id}`;
  }

  async getDraft<T>(userId: string, entityType: string, id: string): Promise<T | null> {
    if (!isSupabaseConfigured) return null;
    const key = this.buildKey(userId, entityType, id);
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', key)
      .maybeSingle();

    if (error || !data) return null;
    return (data.data || data) as T;
  }

  async saveDraft<T>(userId: string, entityType: string, id: string, data: Partial<T>): Promise<void> {
    if (!isSupabaseConfigured) return;
    const key = this.buildKey(userId, entityType, id);
    await supabase.from(this.tableName).upsert({
      id: key,
      user_id: userId,
      entity_type: entityType,
      data: {
        ...data,
        _lastSavedAt: Date.now()
      },
      updated_at: new Date().toISOString()
    });
  }

  async clearDraft(userId: string, entityType: string, id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const key = this.buildKey(userId, entityType, id);
    await supabase.from(this.tableName).delete().eq('id', key);
  }
}

export const draftsRepo = new DraftsRepository();
