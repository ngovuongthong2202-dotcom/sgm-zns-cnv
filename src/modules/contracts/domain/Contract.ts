import { AggregateRoot } from '../../../platform/domain/AggregateRoot';
import { Result } from '../../../platform/domain/Result';
import { ContractSigned, ZnsRequested } from '../../../platform/events/WorkflowEvents';

export interface ProductItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface ContractProps {
  soHopDong: string;
  soDonHang?: string;
  customerId: string;
  quotationId: string;
  maKh?: string;
  
  tenKhachHang?: string;
  nguoiDaiDien?: string;
  sdt?: string;
  soPhieuBaoGia?: string;
  ngayBaoGia?: string;
  
  ngayKy?: string;
  nguoiPhuTrach?: string;
  products?: ProductItem[];
  deliveredQuantities?: Record<string, number>;
  danhSachMaMay?: string[];
  slMay?: number;
  dvt?: string;
  loai?: string;
  loaiSanPham?: string;
  loaiBaoGia?: string;
  soNgayDuKienHoanThanh?: number;
  
  subTotal?: number;
  vatRate?: number;
  vatAmount?: number;
  discountRate?: number;
  discountAmount?: number;
  totalAmount?: number;
  
  trangThaiGuiTinBaoGia?: string | null;
  thongTinGuiZnsKyHopDong?: Record<string, unknown>;
  trangThaiGuiTinHopDong?: string | null;
  tinhTrangHopDong?: string;
  logTomTat?: string;
  
  [key: string]: unknown; // fallback for legacy
}

export class Contract extends AggregateRoot<ContractProps> {
  private constructor(props: ContractProps, id: string) {
    super(props, id);
  }

  public static create(props: ContractProps, id: string): Result<Contract> {
    const contract = new Contract(props, id);
    return Result.ok(contract);
  }

  public canBeDeleted(linkedDeliveriesCount: number, linkedPaymentsCount: number): Result<void> {
    const blockingDocs: string[] = [];
    if (linkedPaymentsCount > 0) blockingDocs.push(`Thanh toán (${linkedPaymentsCount})`);
    if (linkedDeliveriesCount > 0) blockingDocs.push(`Giao hàng (${linkedDeliveriesCount})`);

    if (blockingDocs.length > 0) {
      return Result.fail(`Hợp đồng đã phát sinh chứng từ liên kết, không thể xoá. (${blockingDocs.join(', ')})`);
    }

    return Result.ok();
  }

  public markAsSigned(payload: Record<string, unknown>): void {
    this.addDomainEvent(new ContractSigned(this.id, payload));
  }

  public requestZns(): void {
    this.addDomainEvent(new ZnsRequested(this.id, {
        documentType: 'CONTRACT',
        customerId: this.props.customerId,
    }));
  }
}
