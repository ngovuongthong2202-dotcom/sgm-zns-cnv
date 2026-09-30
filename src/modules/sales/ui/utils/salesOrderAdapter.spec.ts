import { describe, it, expect } from 'vitest';
import {
  parseTareDecomposition,
  resolveCustomerFromErp,
  convertErpLinesToProductItems,
  adaptSalesOrderToQuotation,
  ErpSalesOrderData,
} from './salesOrderAdapter';
import { Customer } from '@/src/domain/schema/customer.schema';
import { QUOTATION_LOAI } from '@/src/domain/enums/quotation-loai';

describe('salesOrderAdapter', () => {
  const sampleContent =
    'Xuất bán phế liệu lô 33-3 : thùng vàng 08 ( 815kg) 6360kg , thùng HHG xanh (620kg) 6370kg, thùng vàngkhông số (880kg) 11625kg, thùng đen số 2 ( 740kg) 3190kg,thùng đen 33 (735kg) 6695kg, thùng lô 33 (100kg) 1580kg, đã trừ  khối lượng thùng.';

  const mockErpData: ErpSalesOrderData = {
    _id: 'SO:128437',
    code: '11-KDDH2609-019',
    order_date: '2026-09-15T00:00:00.000Z',
    content: sampleContent,
    customer_id: '0309411220',
    customer_snapshot: {
      customer_name: 'Công ty TNHH Thép Huy Hoàng Gia',
      address: 'Số 1 đường số 10, KP15, P. Bình Hưng Hòa A, Q.Bình Tân -Tp.HCM',
      phone: null,
      tax_code: '0309411220',
    },
    our_contact_person: '0822041576',
    delivery_address: 'Số 1 đường số 10, KP15, P. Bình Hưng Hòa A, Q.Bình Tân -Tp.HCM',
    payment_method: 'CK',
    lines: [
      {
        item_id: '70407000108400000000',
        item_snapshot: {
          item_code: '70407000108400000000',
          item_name: 'Sắt thép vụn phế liệu (sau khi cắt sắt) SGM VN',
          unit_of_measure: {
            display_unit: 'kg',
            smallest_base_unit: 'kg',
            conversion_factor: 1,
          },
        },
        quantity: 31930,
        unit_price: 8000,
        discount_rate_pct: 0,
        discount_amount: 0,
        vat_rate_pct: 10,
        vat_amount: 25544000,
        subtotal_before_tax: 255440000,
        subtotal_after_tax: 280984000,
      },
    ],
    files: [
      {
        url: 'https://erpsgm.vietnamai.com.vn/sales-orders/attachments/thng-en-02-3190kg.jpg',
        fileName: 'Thùng đen 02 (3190kg).jpg',
      },
      {
        url: 'https://erpsgm.vietnamai.com.vn/sales-orders/attachments/bng-xc-nhn-ph-liu.pdf',
        fileName: 'bảng xác nhận phế liệu.pdf',
      },
    ],
    so_approval_status: 'approved',
  };

  it('phân giải chính xác công thức cân trừ bì (Gross - Tare = Net)', () => {
    const tare = parseTareDecomposition(sampleContent);
    expect(tare.isTareDecomposed).toBe(true);
    expect(tare.barrels.length).toBe(6);
    expect(tare.grossTotal).toBe(35820);
    expect(tare.tareTotal).toBe(3890);
    expect(tare.netTotal).toBe(31930);
    expect(tare.summaryNote).toContain('Tổng gộp: 35.820 kg');
    expect(tare.summaryNote).toContain('Thực xuất: 31.930 kg');
  });

  it('định danh khách hàng kép: ưu tiên khớp theo Mã Số Thuế', () => {
    const existingCustomers: Customer[] = [
      {
        id: 'cust-123',
        maKh: 'KH-2026-0042',
        tenKhachHang: 'Công Ty Thép Huy Hoàng Gia',
        maSoThue: '0309411220',
        sdt: '0909123456',
      } as any,
      {
        id: 'cust-999',
        maKh: 'KH-2026-0099',
        tenKhachHang: 'Công ty Cơ khí Khác',
        maSoThue: '0301112233',
        sdt: '0822041576',
      } as any,
    ];

    const resolution = resolveCustomerFromErp(mockErpData, existingCustomers);
    expect(resolution.matchedCustomer?.id).toBe('cust-123');
    expect(resolution.matchType).toBe('TAX_CODE');
  });

  it('chuyển đổi danh sách 9 trường và tính toán chuẩn float quantity', () => {
    const items = convertErpLinesToProductItems(mockErpData.lines);
    expect(items.length).toBe(1);
    const item = items[0];

    expect(item.productId).toBe('70407000108400000000');
    expect(item.item_code).toBe('70407000108400000000');
    expect(item.productName).toBe('Sắt thép vụn phế liệu (sau khi cắt sắt) SGM VN');
    expect(item.unit).toBe('kg');
    expect(item.quantity).toBe(31930);
    expect(item.price).toBe(8000);
    expect(item.discountPct).toBe(0);
    expect(item.discountAmount).toBe(0);
    expect(item.vatPct).toBe(10);
    expect(item.taxAmount).toBe(25544000);
    expect(item.subtotalBeforeTax).toBe(255440000);
    expect(item.subtotalAfterTax).toBe(280984000);
    expect(item.itemType).toBe('MATERIAL');
  });

  it('chuyển đổi toàn diện Đơn Hàng ERP thành Báo Giá hoàn chỉnh với phả hệ và tệp đính kèm', () => {
    const matchedCustomer: Customer = {
      id: 'cust-123',
      maKh: 'KH-2026-0042',
      tenKhachHang: 'Công ty TNHH Thép Huy Hoàng Gia',
      sdt: '0909123456',
      diaChi: 'Số 1 đường số 10, Bình Tân',
    } as any;

    const quotation = adaptSalesOrderToQuotation(mockErpData, matchedCustomer, 'BGVT-2026-0088', 'Nguyễn Văn A');

    expect(quotation.soPhieuBaoGia).toBe('BGVT-2026-0088');
    expect(quotation.soDonHangErp).toBe('11-KDDH2609-019');
    expect(quotation.customerId).toBe('cust-123');
    expect(quotation.loai).toBe(QUOTATION_LOAI.VAT_TU);
    expect(quotation.ngayBaoGia).toBe('2026-09-15');
    expect(quotation.totalAmount).toBe(280984000);
    expect(quotation.sourceRef?.origin).toBe('ERP_SALES_ORDER');
    expect(quotation.sourceRef?.code).toBe('11-KDDH2609-019');
    expect(quotation.attachments?.length).toBe(2);
    expect(quotation.attachments?.[0].name).toBe('Thùng đen 02 (3190kg).jpg');
  });

  it('tự động nhận diện Tỉnh/Thành và không lấy nhầm số điện thoại bên bán our_contact_person', () => {
    // Trường hợp khách hàng mới hoàn toàn, phone trong ERP là null
    const quotation = adaptSalesOrderToQuotation(mockErpData, null, 'BGVT-2026-0089', 'dung.ntt3');

    // Không được lấy our_contact_person (0822041576) gán cho khách
    expect(quotation.sdt).toBe('');
    // Tự động geocoding từ 'Số 1 đường số 10, KP15, P. Bình Hưng Hòa A, Q.Bình Tân -Tp.HCM'
    expect((quotation as any).tinhThanh).toBe('TP Hồ Chí Minh');
    expect(quotation.nguoiPhuTrach).toBe('dung.ntt3');
  });
});
