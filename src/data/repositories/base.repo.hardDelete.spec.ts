import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRepository, HARD_DELETE_FORBIDDEN_TABLES } from '@/src/platform/data/base.repo';
import { supabase } from '@/src/shared/config/supabase.client';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { GROUP_A, GROUP_B } from '@/src/tests/db-migrations/sql-grants';

vi.mock('@/src/shared/config/supabase.client', () => {
  const fromMock = vi.fn();
  return {
    isSupabaseConfigured: true,
    supabase: { from: fromMock, channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({}) })), removeChannel: vi.fn() },
  };
});

const deleteChain = (result: { error: unknown }) => {
  const eq = vi.fn().mockResolvedValue(result);
  return { chain: { delete: vi.fn(() => ({ eq })) }, eq };
};

describe('BaseRepository.hardDelete – Đợt 0A (B0c): không xóa cứng bảng nghiệp vụ từ trình duyệt; lỗi bị từ chối phải hiện ra', () => {
  beforeEach(() => { vi.clearAllMocks(); entityCachePool.clear(); });

  it('quotations: ném lỗi tiếng Việt, không gọi supabase.from, cache vẫn giữ bản ghi (rào đứng trước xóa cache)', async () => {
    const repo = new BaseRepository<any>('quotations');
    entityCachePool.set('quotations', { id: 'q1', soPhieuBaoGia: 'BG-1' });
    await expect(repo.hardDelete('q1')).rejects.toThrow('Không được xóa cứng dữ liệu bảng "quotations" từ trình duyệt');
    expect(supabase.from).not.toHaveBeenCalled();
    expect(entityCachePool.get('quotations', 'q1')).toBeTruthy();
  });

  it.each(['customers', 'contracts', 'payments', 'deliveries', 'auditLogs', 'znsMessages', 'counters', 'znsCallbacks', 'workflowEvents', 'quotation', 'payment'])(
    '%s (kể cả bí danh số ít) bị từ chối, không gọi mạng', async (collection) => {
      const repo = new BaseRepository<any>(collection);
      await expect(repo.hardDelete('x')).rejects.toThrow(/Không được xóa cứng/);
      expect(supabase.from).not.toHaveBeenCalled();
    }
  );

  it('systemLocks (bảng settings) với id quotations_abc → from("settings").delete().eq("id","quotations_abc") một lần và resolve (trả khóa chỉnh sửa như cũ)', async () => {
    const { chain, eq } = deleteChain({ error: null });
    (supabase.from as any).mockReturnValueOnce(chain);
    const repo = new BaseRepository<any>('systemLocks');
    await expect(repo.hardDelete('quotations_abc')).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith('settings');
    expect(chain.delete).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith('id', 'quotations_abc');
  });

  it('PostgREST trả lỗi 42501 → hardDelete ném (không còn coi là đã xóa)', async () => {
    const { chain } = deleteChain({ error: { code: '42501', message: 'permission denied for table settings' } });
    (supabase.from as any).mockReturnValueOnce(chain);
    const repo = new BaseRepository<any>('settings');
    await expect(repo.hardDelete('zns_config')).rejects.toThrow(/permission denied for table settings/);
  });

  it('users và drafts vẫn xóa cứng được (đường của Cài đặt › Người dùng và bản nháp; B1/B4a xử lý sau)', async () => {
    for (const collection of ['users', 'drafts']) {
      const { chain } = deleteChain({ error: null });
      (supabase.from as any).mockReturnValueOnce(chain);
      await expect(new BaseRepository<any>(collection).hardDelete('x')).resolves.toBeUndefined();
    }
  });

  it('danh sách cấm đúng 17 bảng nhóm A + B; softDelete của quotations vẫn đi qua update (không đụng hardDelete)', async () => {
    expect([...HARD_DELETE_FORBIDDEN_TABLES].sort()).toEqual(['audit_logs', 'contracts', 'counters', 'cross_entity_sync_jobs', 'customers', 'deliveries', 'idempotency_keys', 'job_heartbeats', 'metrics_rollup', 'payments', 'quotations', 'system_locks', 'telegram_sent_log', 'workflow_events', 'zns_callbacks', 'zns_dead_letters', 'zns_messages']);
    // Đối chiếu với ma trận SQL của db/migrations/0001: rào ở trình duyệt và quyền trong CSDL không được lệch nhau
    expect([...HARD_DELETE_FORBIDDEN_TABLES].sort()).toEqual([...GROUP_A, ...GROUP_B].sort());
    const repo = new BaseRepository<any>('quotations');
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue(undefined as any);
    await repo.softDelete('q1');
    expect(updateSpy).toHaveBeenCalledWith('q1', expect.objectContaining({ deletedAt: expect.any(String) }));
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
