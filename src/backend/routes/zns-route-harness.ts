/**
 * Bộ giả lập dùng chung cho các spec supertest của zns.routes.ts (Đợt 0A: zns.routes.lock.spec.ts, zns.routes.config.spec.ts,
 * zns.routes.payment-gate.spec.ts). Chỉ nhập từ spec, và nhập TRƯỚC `./zns.routes`.
 * Toàn bộ trạng thái nằm trong vi.hoisted để các factory vi.mock bên dưới (được kéo lên đầu tệp) luôn thấy nó.
 * Tệp harness phải nằm ngay trong `src/backend/routes/` (các đường `vi.mock('../config/supabase.admin')`, `'../services/…'` tính từ
 * vị trí tệp harness; chuyển nó vào thư mục con là mock trỏ sai đường và lặng lẽ mất hiệu lực).
 * Spec KHÔNG vi.mock lại một mô-đun mà tệp này đã giả lập: sổ mock lấy lần đăng ký sau cùng và tệp này đăng ký SAU các vi.mock đã kéo
 * lên đầu spec, nên bản của spec bị đè lặng lẽ — cần giả lập thêm thì đưa nó vào znsHarness.
 */
import { vi } from 'vitest';

const znsHarness = vi.hoisted(() => {
  const whereCalls: unknown[][] = [];
  const docFixtures: Record<string, Record<string, unknown>> = {};
  const docSetCalls: Array<{ path: string; data: Record<string, unknown>; options?: unknown }> = [];
  const docUpdateCalls: Array<{ path: string; data: Record<string, unknown> }> = [];
  const executeMock = vi.fn();
  const resilientFetchMock = vi.fn();
  const zaloTokenManagerMock = {
    getCredentials: vi.fn(),
    refreshTokenDirect: vi.fn(),
    getValidAccessToken: vi.fn(),
  };
  const makeDoc = (collection: string, id: string) => {
    const path = `${collection}/${id}`;
    return {
      id,
      get: vi.fn(async () => (docFixtures[path]
        ? { exists: true, id, data: () => docFixtures[path] }
        : { exists: false, id, data: () => undefined })),
      update: vi.fn(async (data: Record<string, unknown>) => { docUpdateCalls.push({ path, data }); }),
      set: vi.fn(async (data: Record<string, unknown>, options?: unknown) => { docSetCalls.push({ path, data, options }); }),
    };
  };
  const makeQuery = (collection: string): any => ({
    where: vi.fn((...args: unknown[]) => { whereCalls.push(args); return makeQuery(collection); }),
    limit: vi.fn(() => makeQuery(collection)),
    orderBy: vi.fn(() => makeQuery(collection)),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    doc: vi.fn((id?: string) => makeDoc(collection, id || 'new-id')),
  });
  const fakeAdminDb = { collection: vi.fn((name: string) => makeQuery(name)), batch: vi.fn(), runTransaction: vi.fn() };
  const loggerMock = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  // vi.clearAllMocks() chỉ xóa lịch sử gọi: mockImplementation và các giá trị *Once còn xếp hàng vẫn rò sang ca sau. Vì vậy reset()
  // mockReset() từng mock lộ ra qua znsHarness rồi mới đặt lại mặc định; vi.fn(impl) trở về impl gốc (collection → makeQuery).
  const sharedMocks = [executeMock, resilientFetchMock, ...Object.values(zaloTokenManagerMock), ...Object.values(fakeAdminDb), ...Object.values(loggerMock)];
  const reset = () => {
    for (const m of sharedMocks) m.mockReset();
    vi.clearAllMocks();
    whereCalls.length = 0;
    docSetCalls.length = 0;
    docUpdateCalls.length = 0;
    for (const k of Object.keys(docFixtures)) delete docFixtures[k];
    executeMock.mockResolvedValue({ status: 'SENT_WAITING', messageId: 'msg-1' });
    zaloTokenManagerMock.getCredentials.mockResolvedValue({});
    zaloTokenManagerMock.getValidAccessToken.mockResolvedValue(null);
    zaloTokenManagerMock.refreshTokenDirect.mockResolvedValue({ success: true, expiresAt: 1_800_000_000_000 });
  };
  reset();
  return { whereCalls, docFixtures, docSetCalls, docUpdateCalls, executeMock, resilientFetchMock, zaloTokenManagerMock, fakeAdminDb, loggerMock, reset };
});

vi.mock('../config/supabase.admin', () => ({
  adminDb: znsHarness.fakeAdminDb,
  adminAuth: { verifyIdToken: vi.fn() },
  toTableName: (name: string) => name,
  isSupabaseAdminConfigured: false,
  supabaseAdmin: {},
}));
vi.mock('../../modules/messaging/application/use-cases/SendZnsMessage', () => ({
  SendZnsMessageUseCase: class { execute = znsHarness.executeMock; },
}));
vi.mock('../../modules/messaging/infrastructure/ZnsRepoSupabase', () => ({
  znsRepository: { findById: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../modules/messaging/infrastructure/MultiProviderZnsVendor', () => ({ multiProviderZnsVendor: {} }));
vi.mock('../../modules/messaging/application/handlers/EntityEventsHandler', () => ({}));
vi.mock('../services/zns/zalo-token-manager.service', () => ({ zaloTokenManager: znsHarness.zaloTokenManagerMock }));
vi.mock('../services/zns/vendor-webhook.handler', () => ({ vendorWebhookHandler: { handleResult: vi.fn() } }));
// Hàng rào của lô 1 giữ nguyên: zns.routes.ts không được nhập outbound-helpers (gửi hàng loạt đã khóa).
vi.mock('../services/zns/outbound-helpers', () => { throw new Error('zns.routes.ts không được nhập outbound-helpers (Đợt 0A Z0.1: gửi ZNS hàng loạt đã khóa)'); });
vi.mock('../services/zns/zns-payload.builder', () => ({
  znsPayloadBuilder: {},
  sanitizeZnsCustomerName: (s: string) => s,
  sanitizeZnsPersonName: (s: string) => s,
}));
vi.mock('../lib/resilient-transport', () => ({ resilientFetch: znsHarness.resilientFetchMock }));
vi.mock('../lib/logger', () => ({ logger: znsHarness.loggerMock }));

// vitest 4 từ chối `export const … = vi.hoisted(…)` ("Cannot export hoisted variable") nên xuất ở cuối tệp.
export { znsHarness };
