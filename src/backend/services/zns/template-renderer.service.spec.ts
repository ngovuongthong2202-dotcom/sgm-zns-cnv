 
 
import { expect, vi, describe, beforeEach, it } from 'vitest';
import { templateRendererService } from './template-renderer.service';

vi.mock('../../config/supabase.admin', () => {
  const docMock = vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ customerId: 'cust-1', tenKhachHang: 'Mock Related Co.' })
    })
  });
  const collectionMock = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    onSnapshot: vi.fn().mockReturnValue(vi.fn()), // onSnapshot returns an unsubscribe function
    get: vi.fn(),
    doc: docMock
  });
  return {
    adminDb: {
      collection: collectionMock,
    }
  };
});

describe('TemplateRendererService TRUTHFUL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (templateRendererService as any).cache.clear();
  });

  it('KHÔNG auto-fill today date khi format=date rỗng', async () => {
    vi.spyOn(templateRendererService, 'getTemplate').mockResolvedValue({
      templateKey: 'BAOGIA', label: 'BG', entityType: 'QUOTATION', version: 1, isActive: true, createdAt: '', updatedAt: '', updatedBy: '',
      variables: [{ name:'ngay_bao_gia', label: 'Ngay', sourceField:'ngayBaoGia', sourceEntity: 'SELF', format:'date' }]
    });
    const out = await templateRendererService.render('BAOGIA', { ngayBaoGia: '' });
    expect(out.ngay_bao_gia).toBe('');  // ← KHÔNG today
  });
  
  it('KHÔNG auto-fill "0" khi format=number rỗng', async () => {
    vi.spyOn(templateRendererService, 'getTemplate').mockResolvedValue({
      templateKey: 'BAOGIA', label: 'BG', entityType: 'QUOTATION', version: 1, isActive: true, createdAt: '', updatedAt: '', updatedBy: '',
      variables: [{ name:'sl_may', label: 'SL', sourceField:'slMay', sourceEntity: 'SELF', format:'number' }]
    });
    const out = await templateRendererService.render('BAOGIA', { slMay: null });
    expect(out.sl_may).toBe('');
  });
  
  it('Explicit fallback từ user thì DÙNG', async () => {
    vi.spyOn(templateRendererService, 'getTemplate').mockResolvedValue({
      templateKey: 'BAOGIA', label: 'BG', entityType: 'QUOTATION', version: 1, isActive: true, createdAt: '', updatedAt: '', updatedBy: '',
      variables: [{ name:'sl_may', label: 'SL', sourceField:'slMay', sourceEntity: 'SELF', format:'number', fallback:'1' }]
    });
    const out = await templateRendererService.render('BAOGIA', { slMay: null });
    expect(out.sl_may).toBe('1');
  });
  
  it('validate() trả missing list', async () => {
    vi.spyOn(templateRendererService, 'getTemplate').mockResolvedValue({
      templateKey: 'BAOGIA', label: 'BG', entityType: 'QUOTATION', version: 1, isActive: true, createdAt: '', updatedAt: '', updatedBy: '',
      variables: [
        { name:'customer_name', label: 'Cus', sourceField:'cusName', sourceEntity: 'SELF', format:'raw' },
        { name:'soPhieuBaoGia', label: 'BG', sourceField:'soPhieu', sourceEntity: 'SELF', format:'raw' },
      ]
    });
    const result = await templateRendererService.validate('BAOGIA', { soPhieu:'BG-001' });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('customer_name');
    expect(result.resolved.customer_name.source).toBe('empty');
    expect(result.resolved.soPhieuBaoGia.value).toBe('BG-001');
  });

  it('SELF snapshot win when both SELF and related have value', async () => {
    vi.spyOn(templateRendererService, 'getTemplate').mockResolvedValue({
      templateKey: 'BAOGIA', label: 'BG', entityType: 'QUOTATION', version: 1, isActive: true, createdAt: '', updatedAt: '', updatedBy: '',
      variables: [{ name: 'customer_name', label: 'Customer', sourceField: 'tenKhachHang', sourceEntity: 'CUSTOMER', format: 'raw' }]
    });
    const out = await templateRendererService.render('BAOGIA', { tenKhachHang: 'Snapshot Co.', customerId: 'cust-1' });
    expect(out.customer_name).toBe('Snapshot Co.');
  });

  it('truthful: rỗng cả 2 → empty string', async () => {
    vi.spyOn(templateRendererService, 'getTemplate').mockResolvedValue({
      templateKey: 'BAOGIA', label: 'BG', entityType: 'QUOTATION', version: 1, isActive: true, createdAt: '', updatedAt: '', updatedBy: '',
      variables: [{ name: 'customer_name', label: 'Customer', sourceField: 'tenKhachHang', sourceEntity: 'CUSTOMER', format: 'raw' }]
    });
    const out = await templateRendererService.render('BAOGIA', { tenKhachHang: '' });
    expect(out.customer_name).toBe('');
  });

  it('render parses array values', async () => {
    vi.spyOn(templateRendererService, 'getTemplate').mockResolvedValue({
        templateKey: 'MOCK', label: 'Mock', entityType: 'CUSTOMER', version: 1, isActive: true, createdAt: '', updatedAt: '', updatedBy: '',
        variables: [{ name: 'items', label: 'Items', sourceField: 'products[].name', sourceEntity: 'SELF', format: 'raw' }]
    });

    const result = await templateRendererService.render('MOCK', { products: [{ name: 'P1' }, { name: 'P2' }] });
    expect(result.items).toBe('P1 | P2');
  });

  it('render formats values correctly', async () => {
    vi.spyOn(templateRendererService, 'getTemplate').mockResolvedValue({
        templateKey: 'MOCK', label: 'Mock', entityType: 'CUSTOMER', version: 1, isActive: true, createdAt: '', updatedAt: '', updatedBy: '',
        variables: [
            { name: 'dateStr', label: 'Date', sourceField: 'd1', sourceEntity: 'SELF', format: 'date' },
            { name: 'dateTs', label: 'Date Ts', sourceField: 'd2', sourceEntity: 'SELF', format: 'date' },
            { name: 'num', label: 'Number', sourceField: 'n1', sourceEntity: 'SELF', format: 'number' },
            { name: 'cur', label: 'Currency', sourceField: 'n2', sourceEntity: 'SELF', format: 'currency' }
        ]
    });

    const result = await templateRendererService.render('MOCK', {
        d1: '2024-05-13T00:00:00Z',
        d2: { _seconds: 1715558400 }, // timestamp mock
        n1: 1234.56,
        n2: 5000000
    });
    expect(result.dateStr).toBe('13/05/2024');
    expect(result.dateTs).toBe('13/05/2024'); // timezone independent assuming local node time
    expect(result.num).toBe('1234.56');
    expect(result.cur).toBe('5.000.000');
  });
});
