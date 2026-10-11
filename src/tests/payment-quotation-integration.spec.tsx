/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, act, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MotionGlobalConfig } from 'motion/react';
import { PaymentRecordDrawer } from '@/src/modules/billing/ui/components/PaymentRecordDrawer';
import { buildContractPaymentPrefill } from '@/src/modules/billing/ui/utils/payment-prefill';

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;

MotionGlobalConfig.skipAnimations = true;

// Mock dependencies
global.fetch = vi.fn(() => Promise.resolve({
  json: () => Promise.resolve({ success: true, code: 'PT-2026-0001' }),
  headers: new Headers(),
  status: 200,
  ok: true
})) as any;

vi.mock('@/src/shared/config/supabase.client', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
  default: {},
}));

vi.mock('swr', () => ({
  default: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/src/data/realtime-store', () => ({
  useRealtimeCollection: () => ({ data: [], isLoading: false }),
  realtimeStore: {
    subscribe: vi.fn(),
  }
}));

vi.mock('@/src/modules/iam/ui/AuthContext', () => ({
  useAuth: () => ({ user: { uid: '123' }, hasRole: () => true }),
}));

vi.mock('@/src/design-system/Confirm', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
  ConfirmHost: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/src/platform/ui/design-system/Confirm', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
  ConfirmHost: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/src/contexts/DrawerStackContext', () => ({
  useDrawerStack: () => ({ pushDrawer: vi.fn(), popDrawer: vi.fn() }),
  DrawerStackProvider: ({ children }: any) => <div>{children}</div>
}));

// Cảnh báo khóa bản ghi chỉ được dựng khi sửa phiếu đã có id; nó ghi/xóa khóa qua kho dữ liệu và in nhật ký. Không liên quan điều đang kiểm → thay bằng khối rỗng.
vi.mock('@/src/widgets/EntityLockWarning', () => ({
  EntityLockWarning: () => null,
}));

// ---- Dùng chung cho các ca "phiếu CHƯA LƯU" (vòng sửa 1, Đợt 0A TT04) ----
type DrawerProps = React.ComponentProps<typeof PaymentRecordDrawer>;

async function openDrawer(props: Partial<DrawerProps>): Promise<HTMLElement> {
  let container!: HTMLElement;
  await act(async () => {
    const res = render(
      <MemoryRouter>
        <PaymentRecordDrawer isOpen={true} payment={null} contracts={[]} allDeliveries={[]} onClose={() => {}} onSave={async () => {}} {...props} />
      </MemoryRouter>
    );
    container = res.container;
  });
  return container;
}

// Cùng ba bộ chọn với ca đầu tiên: ô trạng thái là <select aria-label>, ô "Thực thu" là input placeholder "0 đ", dòng gợi ý theo data-testid
const statusSelectOf = (c: HTMLElement) => c.querySelector('select[aria-label="Tình trạng thanh toán"]') as HTMLSelectElement | null;
const amountInputOf = (c: HTMLElement) => c.querySelector('input[placeholder="0 đ"]') as HTMLInputElement | null;
const hintOf = (c: HTMLElement) => c.querySelector('[data-testid="con-phai-thu"]') as HTMLElement | null;

// Báo giá dịch vụ tổng 2.832.840 (cùng số liệu với ca đầu tiên)
const quotationFixture = {
  id: 'QUO-BGDV-0151', soPhieuBaoGia: 'BGDV-2026-0151', loai: 'Dịch vụ', phanLoai: 'Dịch vụ',
  customerId: 'CUST-001', maKh: 'KH-001', tenKhachHang: 'Cửa Hàng Minh Ánh', sdt: '0901234567',
  subTotal: 2623000, vatRate: 8, vatAmount: 209840, discountRate: 0, discountAmount: 0, totalAmount: 2832840,
  products: [{ id: 'p1', productName: 'Dịch vụ bảo dưỡng máy CNC', unit: 'Gói', quantity: 1, price: 2623000, vatRate: 8, vatAmount: 209840, discountRate: 0, discountAmount: 0, total: 2832840 }],
};
// Phiếu thu ĐÃ LƯU và đã thu tiền của chính báo giá trên (không xóa mềm, không hủy)
const collectedQuotationReceipt = (soTien: number, tinhTrangThanhToan: string) => ({
  id: 'PAY-OLD-1', paymentId: 'PT-2026-0001', quotationId: 'QUO-BGDV-0151', soPhieuBaoGia: 'BGDV-2026-0151',
  tinhTrangThanhToan, soTien, totalAmount: 2832840, ngayThanhToan: '2026-10-01',
});

describe('PaymentRecordDrawer - Zero-Effect Financial Orchestrator (APW-ZFO)', () => {
  it('initializes from a service quotation with line items and VAT without infinite loop', async () => {
    const mockQuotation = {
      id: 'QUO-BGDV-0151',
      soPhieuBaoGia: 'BGDV-2026-0151',
      soBaoGia: 'BGDV-2026-0151',
      loai: 'Dịch vụ',
      phanLoai: 'Dịch vụ',
      customerId: 'CUST-001',
      maKh: 'KH-001',
      tenKhachHang: 'Cửa Hàng Minh Ánh',
      sdt: '0901234567',
      diaChi: '123 Nguyễn Trãi, Q5, TP.HCM',
      subTotal: 2623000,
      vatRate: 8,
      vatAmount: 209840,
      discountRate: 0,
      discountAmount: 0,
      totalAmount: 2832840,
      products: [
        {
          id: 'p1',
          productName: 'Dịch vụ bảo dưỡng máy CNC',
          unit: 'Gói',
          quantity: 1,
          price: 2623000,
          vatRate: 8,
          vatAmount: 209840,
          discountRate: 0,
          discountAmount: 0,
          total: 2832840
        }
      ]
    };

    let savedData: any = null;
    const handleSave = vi.fn(async (data: any) => {
      savedData = data;
    });

    let rootContainer: any;
    await act(async () => {
      const res = render(
        <MemoryRouter>
          <PaymentRecordDrawer
            isOpen={true}
            payment={null}
            prefillQuotation={mockQuotation as any}
            contracts={[]}
            allDeliveries={[]}
            onClose={() => {}}
            onSave={handleSave}
          />
        </MemoryRouter>
      );
      rootContainer = res.container;
    });

    // 1. Verify UI rendered customer and quotation lineage
    expect(rootContainer.textContent).toContain('Cửa Hàng Minh Ánh');
    expect(rootContainer.textContent).toContain('BGDV-2026-0151');
    expect(rootContainer.textContent).toContain('Bán lẻ / Dịch vụ trực tiếp (Không qua HĐ)');

    // 2. Verify total reference matches quotation total with VAT
    expect(rootContainer.textContent).toContain('2.832.840');

    // 3. Đợt 0A (TT04): số tiền KHÔNG điền sẵn, trạng thái "Chưa TT", có dòng "Còn phải thu" bằng tổng báo giá
    // Dòng gợi ý được buộc vào đúng phần tử [data-testid="con-phai-thu"] và so cả chuỗi (một dòng ghi "0 ₫" sẽ không qua)
    const hint = rootContainer.querySelector('[data-testid="con-phai-thu"]') as HTMLElement | null;
    expect(hint).not.toBeNull();
    expect(hint!.textContent).toBe('Còn phải thu: 2.832.840 ₫ — nhập số thực thu hoặc bấm gợi ý bên dưới');
    // Ô trạng thái là <select aria-label="Tình trạng thanh toán"> (PaymentRecordBasicFields.tsx:585-596) — KHÔNG có thuộc tính name
    const statusSelect = rootContainer.querySelector('select[aria-label="Tình trạng thanh toán"]') as HTMLSelectElement | null;
    expect(statusSelect).not.toBeNull();
    expect(statusSelect!.value).toBe('Chưa TT');
    // Ô "Thực thu" là SmartFinancialInput (input text, placeholder "0 đ", PaymentRecordBasicFields.tsx:808-820;
    // SmartFinancialInput.tsx:76-90 hiển thị chuỗi rỗng khi value là undefined) — phải TÌM THẤY ô rồi mới so giá trị
    const amountInput = rootContainer.querySelector('input[placeholder="0 đ"]') as HTMLInputElement | null;
    expect(amountInput).not.toBeNull();
    expect(amountInput!.value).toBe('');
    expect(rootContainer.textContent).not.toContain('Tất toán 100%');
  });

  // ---- Vòng sửa 1 (Đợt 0A TT04): phiếu CHƯA LƯU giữ "Chưa TT" và số tiền trống tới khi người dùng nhập số tiền ----

  it('phiếu MỚI từ báo giá đã có một phiếu thu (thu một phần): mở ở "Chưa TT", số tiền trống, "Còn phải thu" đã trừ phần đã thu; nhập số còn lại thì mới ra "Tất toán"', async () => {
    const container = await openDrawer({
      prefillQuotation: quotationFixture as any,
      payments: [collectedQuotationReceipt(1000000, 'Công nợ') as any],
    });

    const statusSelect = statusSelectOf(container);
    expect(statusSelect).not.toBeNull();
    expect(statusSelect!.value).toBe('Chưa TT');
    const amountInput = amountInputOf(container);
    expect(amountInput).not.toBeNull();
    expect(amountInput!.value).toBe('');
    expect(hintOf(container)?.textContent).toBe('Còn phải thu: 1.832.840 ₫ — nhập số thực thu hoặc bấm gợi ý bên dưới');

    // Người dùng gõ đúng số còn lại: trạng thái vẫn được suy ra như trước (đã thu 1.000.000 + 1.832.840 = đủ tổng)
    await act(async () => {
      fireEvent.change(amountInput!, { target: { value: '1832840' } });
    });
    await waitFor(() => expect(statusSelect!.value).toBe('Tất toán'));
  });

  it('phiếu MỚI từ báo giá mà các phiếu thu khác đã thu đủ tổng: vẫn mở ở "Chưa TT" với số tiền trống, không tự nhảy "Tất toán"', async () => {
    const container = await openDrawer({
      prefillQuotation: quotationFixture as any,
      payments: [collectedQuotationReceipt(2832840, 'Tất toán') as any],
    });

    const statusSelect = statusSelectOf(container);
    expect(statusSelect).not.toBeNull();
    expect(statusSelect!.value).toBe('Chưa TT');
    const amountInput = amountInputOf(container);
    expect(amountInput).not.toBeNull();
    expect(amountInput!.value).toBe('');
  });

  it('phiếu dựng sẵn từ hợp đồng (đối tượng chưa có id, truyền qua payment) giữ "Chưa TT", số tiền trống và có dòng "Còn phải thu"', async () => {
    const contract = { id: 'c1', soHopDong: 'HD-2026-0002', soDonHang: 'DH-01', customerId: 'CUST-001', maKh: 'KH-001', tenKhachHang: 'Cửa Hàng Minh Ánh', sdt: '0901234567', nguoiDaiDien: 'Anh Ánh' };
    const prefilled = buildContractPaymentPrefill(contract, { products: [], totalAmount: 5000000, subTotal: 5000000, vatRate: 0, discountRate: 0, slMay: 1, today: '2026-10-11' });
    expect(prefilled).not.toHaveProperty('id'); // tiền đề của ca này: đối tượng chưa lưu thì chưa có id

    const container = await openDrawer({
      payment: prefilled as any,
      contracts: [contract as any],
      payments: [{ id: 'PAY-OLD-1', paymentId: 'PT-2026-0001', contractId: 'c1', soHopDong: 'HD-2026-0002', tinhTrangThanhToan: 'Công nợ', soTien: 1000000, totalAmount: 5000000 } as any],
    });

    const statusSelect = statusSelectOf(container);
    expect(statusSelect).not.toBeNull();
    expect(statusSelect!.value).toBe('Chưa TT');
    const amountInput = amountInputOf(container);
    expect(amountInput).not.toBeNull();
    expect(amountInput!.value).toBe('');
    expect(hintOf(container)?.textContent).toBe('Còn phải thu: 4.000.000 ₫ — nhập số thực thu hoặc bấm gợi ý bên dưới');
  });

  it('phiếu chưa lưu: chọn "Tất toán" trước khi có chứng từ gốc rồi chọn chứng từ thì trạng thái được đưa về "Chưa TT" (số tiền vẫn chưa nhập)', async () => {
    const container = await openDrawer({ quotations: [quotationFixture as any] });
    const statusSelect = statusSelectOf(container);
    expect(statusSelect).not.toBeNull();
    await act(async () => {
      fireEvent.change(statusSelect!, { target: { value: 'Tất toán' } });
    });
    expect(statusSelect!.value).toBe('Tất toán'); // đối chứng: chưa có chứng từ gốc nên chưa có gì kéo trạng thái về

    // Chọn chứng từ gốc ở ô chọn: mở danh sách rồi bấm dòng báo giá
    const view = within(container);
    await act(async () => {
      fireEvent.click(view.getByText('Chọn chứng từ...'));
    });
    await act(async () => {
      fireEvent.click(view.getByText('BG — BGDV-2026-0151'));
    });
    await waitFor(() => expect(statusSelect!.value).toBe('Chưa TT'));
  });

  it('SỬA một phiếu đã lưu thì không hiện dòng "Còn phải thu" (dòng gợi ý chỉ dành cho lúc lập phiếu chưa lưu)', async () => {
    const container = await openDrawer({
      payment: {
        id: 'PAY-SAVED-1', paymentId: 'PT-2026-0003', quotationId: 'QUO-BGDV-0151', soPhieuBaoGia: 'BGDV-2026-0151', soHopDong: 'HD-2026-0002', soDonHang: 'DH-01',
        customerId: 'CUST-001', maKh: 'KH-001', tenKhachHang: 'Cửa Hàng Minh Ánh', sdt: '0901234567',
        subTotal: 2623000, vatRate: 8, vatAmount: 209840, discountRate: 0, discountAmount: 0, totalAmount: 2832840,
        soTien: 1000000, tinhTrangThanhToan: 'Công nợ', phuongThucThanhToan: 'Chuyển khoản', ngayThanhToan: '2026-10-11',
        products: quotationFixture.products,
      } as any,
    });

    // Đối chứng: biểu mẫu đã dựng ở chế độ sửa với tổng > 0 và số tiền đã lưu (điều kiện cũ "tổng > 0" sẽ hiện dòng gợi ý)
    expect(container.textContent).toContain('Cập nhật Phiếu TT');
    const amountInput = amountInputOf(container);
    expect(amountInput).not.toBeNull();
    expect(amountInput!.value).toContain('1.000.000');
    expect(hintOf(container)).toBeNull();
  });
});
