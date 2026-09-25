import { describe, expect, it, vi, beforeEach } from 'vitest';
import { znsPayloadBuilder } from './zns-payload.builder';
import { ZnsMessage } from '../../../domain/schema/workflow.schema';
import { templateRendererService } from './template-renderer.service';

vi.mock('./template-renderer.service', () => ({
  templateRendererService: {
    render: vi.fn(),
  }
}));

describe('ZnsPayloadBuilder TRUTHFUL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('payload CHỈ chứa system + template variables, KHÔNG spray', async () => {
    vi.mocked(templateRendererService.render).mockResolvedValue({
      __version: 1,
      customer_name: 'Cty ABC',
      phone: '0912345678'
    });

    const message: ZnsMessage = {
      id: 'test-id',
      entityId: 'E1',
      entityType: 'CUSTOMER',
      attemptBucket: 0,
      status: 'INIT',
      retryCount: 0,
      trackingId: 'T1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phone: '0912345678',
      messageType: 'CUSTOMER_PRE_QUOTE',
      payload: { tenKhachHang: 'Cty ABC', sdt: '0912345678' }
    };
    const payload = await znsPayloadBuilder.buildPayload(message, 'key123');
    
    const keys = Object.keys(payload.newValues as any);
    // System fields 
    expect(keys).toContain('request_id');
    expect(keys).toContain('stt');
    expect(keys).toContain('so_dien_thoai_raw');
    expect(keys).toContain('phone');
    expect(keys).toContain('message_type');
    expect(keys).toContain('hanh_dong_gui_zns_pre_quote');
    expect(keys).toContain('Gửi tin ZNS (Trước báo giá)');
    expect(keys).toContain('row_data');
    
    // Template variables
    expect(keys).toContain('customer_name');
    
    // CẤM có hardcoded fields
    expect(keys).not.toContain('order_code');
    expect(keys).not.toContain('so_phieu_bao_gia');
    expect(keys).not.toContain('ngay_ky');
    expect(keys).not.toContain('so_tien');
    expect(keys).not.toContain('nhan_vien');
    expect(keys).not.toContain('dvt');
    expect(keys).not.toContain('danh_sach_ma_may');
  });
  
  it('strict mode throw khi thiếu biến', async () => {
    vi.mocked(templateRendererService.render).mockResolvedValue({
      __version: 1,
      customer_name: ''
    });

    const message: ZnsMessage = {
      id: 'test-id',
      entityId: 'E1',
      entityType: 'QUOTATION',
      attemptBucket: 0,
      status: 'INIT',
      retryCount: 0,
      trackingId: 'T1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phone: '0912345678',
      messageType: 'BAOGIA',
      payload: {}
    };
    await expect(znsPayloadBuilder.buildPayload(message, 'key1', { strictMode: true }))
      .rejects.toThrow(/STRICT MODE/);
  });
  
  it('non-strict: rỗng biến → empty string, KHÔNG fallback hardcoded', async () => {
    vi.mocked(templateRendererService.render).mockResolvedValue({
      __version: 1,
      customer_name: 'Có tên',
      phone: '0912000000'
    });

    const message: ZnsMessage = {
      id: 'test-id',
      entityId: 'E1',
      entityType: 'CUSTOMER',
      attemptBucket: 0,
      status: 'INIT',
      retryCount: 0,
      trackingId: 'T1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phone: '0912345678',
      messageType: 'CUSTOMER_PRE_QUOTE',
      payload: { tenKhachHang: '' }
    };
    const payload = await znsPayloadBuilder.buildPayload(message, 'key1');
    expect((payload.newValues as any).customer_name).toBe('Có tên');
    expect(Object.keys(payload.newValues as any)).not.toContain('order_code');
  });

  it('PRE-FLIGHT block: customer_name empty → throw with hint', async () => {
    const message = {
      entityType: 'QUOTATION', messageType: 'BAOGIA',
      payload: { tenKhachHang: '', sdt: '0912345678' }
    } as any;
    vi.mocked(templateRendererService.render).mockResolvedValue({
      __version: 1,
      customer_name: '' // Giả lập template render ra rỗng
    });
    const result = znsPayloadBuilder.buildPayload(message, 'k1');
    await expect(result).rejects.toThrow(/customer_name/);
    await expect(result).rejects.toHaveProperty('code', 'ZALO_REQUIRED_VARS_EMPTY');
  });

  it('PRE-FLIGHT pass: all required filled → returns payload', async () => {
    const message = {
      entityType: 'QUOTATION', messageType: 'BAOGIA',
      payload: { tenKhachHang: 'Cty ABC', sdt: '0912345678', soPhieuBaoGia:'BG-001', 
                ngayBaoGia:'2026-01-01', ngayHetHan:'2026-01-08', slMay: 5, nguoiPhuTrach:'NV A' }
    } as any;
    vi.mocked(templateRendererService.render).mockResolvedValue({
      __version: 1,
      customer_name: 'Cty ABC',
      so_phieu_bao_gia: 'BG-001', ngay_bao_gia: '2026-01-01', ngay_het_han: '2026-01-08', sl_may: 5, nguoi_phu_trach: 'NV A'
    });
    const payload = await znsPayloadBuilder.buildPayload(message, 'k1');
    expect((payload.newValues as any).customer_name).toBe('Cty ABC');
  });
});
