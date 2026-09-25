import { AggregateRoot } from '../../../platform/domain/AggregateRoot';
import { Result } from '../../../platform/domain/Result';
import { ZnsRequested } from '../../../platform/events/WorkflowEvents';

export interface ProductItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  [key: string]: unknown;
}

export interface PaymentProps {
  paymentId: string;
  contractId?: string;
  quotationId?: string;
  customerId: string;
  maKh?: string;
  
  tenKhachHang?: string;
  sdt?: string;
  soHopDong?: string;
  soDonHang?: string;
  ngayKy?: string;
  
  soChungTu?: string;
  tenNguoiNop?: string;
  phuongThucThanhToan?: string;
  ngayDenHan?: string;
  tinhTrangThanhToan?: string;
  ngayThanhToan?: string;
  nguoiPhuTrach?: string;
  ghiChu?: string;
  
  soTien?: number;
  subTotal?: number;
  vatRate?: number;
  vatAmount?: number;
  discountRate?: number;
  discountAmount?: number;
  totalAmount?: number;
  giaTriHopDong?: number;
  
  products?: ProductItem[];
  danhSachMaMay?: string[];
  slMay?: number;
  dvt?: string;
  loai?: string;
  loaiBaoGia?: string;
  
  trangThaiGuiTinHopDong?: string | null;
  thongTinGuiZnsThanhToan?: Record<string, unknown>;
  trangThaiGuiTinThanhToan?: string | null;
  trangThaiNhacHan?: string | null;
  nhacHanLan1At?: string;
  nhacHanLan2At?: string;
  logTomTat?: string;
  createdAt?: string;

  [key: string]: unknown;
}

export class Payment extends AggregateRoot<PaymentProps> {
  private constructor(props: PaymentProps, id: string) {
    super(props, id);
  }

  public static create(props: PaymentProps, id: string): Result<Payment> {
    const pm = new Payment(props, id);
    return Result.ok(pm);
  }

  public updateFields(updates: Partial<PaymentProps>): void {
    Object.assign(this.props, updates);
  }

  public canBeDeleted(linkedDeliveriesCount: number): Result<void> {
    if (this.props.tinhTrangThanhToan === 'ĐÃ THANH TOÁN' || this.props.tinhTrangThanhToan === 'Tất toán') {
      return Result.fail(`Phiếu thanh toán ${this.props.paymentId || '(không rõ mã)'} đã xác nhận / đối soát (Đã thanh toán hoặc Tất toán) thì không được xóa!`);
    }

    if (linkedDeliveriesCount > 0) {
      return Result.fail(`Phiếu thanh toán đã phát sinh chứng từ liên kết, không thể xoá. (Giao hàng (${linkedDeliveriesCount}))`);
    }

    return Result.ok();
  }

  public requestZns(messageType: string): void {
    this.addDomainEvent(new ZnsRequested(this.id, {
        documentType: 'PAYMENT',
        customerId: this.props.customerId,
        messageType
    }));
  }
}
