export interface Customer {
  id: string;
  createdAt?: string;
  tinhThanh?: string;
  nguoiPhuTrachId?: string;
  name?: string;
  tenKhachHang?: string;
}

export interface Quotation {
  id: string;
  createdAt?: string;
  customerId?: string;
  loai?: string;
  price?: number;
  products?: Array<{ productName: string; unit?: string; quantity: number; price?: number }>;
  ngayBaoGia?: string;
  tongTienValue?: number;
  workflow?: { status: string };
  nguoiPhuTrach?: string;
  soBaoGia?: string;
}

export interface Contract {
  id: string;
  createdAt?: string;
  customerId?: string;
  status?: string;
  ngayKy?: string;
  isOverdueDeadline?: boolean;
  ngayBanGiaoThucTe?: string;
  soNgayDuKienHoanThanh?: number;
  nguoiPhuTrach?: string;
  ngayBanGiaoDuKien?: string;
}

export interface Payment {
  id: string;
  createdAt?: string;
  customerId?: string;
  contractId?: string;
  quotationId?: string;
  tinhTrangThanhToan?: string;
  soTienThanhToanValue?: number;
  workflow?: { status: string };
  soTien?: number;
  totalAmount?: number;
  tongTienThanhToan?: string;
  ngayThanhToan?: string;
}

export interface Delivery {
  id: string;
  createdAt?: string;
  customerId?: string;
  contractId?: string;
  quotationId?: string;
  ngayGiaoDuKien?: string;
  ngayGiaoThucTe?: string;
  trangThaiGiaoHang?: string;
  workflow?: { status: string };
  ngayGiaoMay?: string;
  ngayGiaoThucTe30d?: string;
  soPhieuXuat?: string;
  deliveryId?: string;
}

export interface ZnsMessage {
  id: string;
  createdAt?: string;
  customerId?: string;
  status?: string;
  trangThai?: string;
  errorLog?: string;
  templateId?: string;
  soDienThoai?: string;
  tenThaoTac?: string;
}

export interface ActionItem {
  type: string;
  entityName: string;
  status: string;
  time: string;
  link: string;
}
