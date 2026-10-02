import { ProductItem } from '@/src/domain/schema/product.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { computeLineItem, aggregateProducts } from '@/src/domain/pricing/quotation-pricing';
import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';
import { QUOTATION_LOAI } from '@/src/domain/enums/quotation-loai';
import { detectProvinceFromAddress } from '@/src/shared/services/vietnamAddressParser';

export interface ErpSalesOrderItemLine {
  line_id?: string | null;
  item_id: string;
  asset_ma?: string | null;
  item_snapshot?: {
    item_code?: string;
    item_name?: string;
    unit_of_measure?: {
      display_unit?: string;
      smallest_base_unit?: string;
      conversion_factor?: number;
    };
    item_specs_snapshot?: Record<string, unknown>;
  };
  technical_requirements?: string | null;
  quantity: number;
  converted_quantity?: number;
  converted_unit_code?: string;
  unit_price: number;
  discount_rate_pct?: number;
  discount_value?: number;
  discount_amount?: number;
  discounted_unit_price?: number;
  amount_after_discount?: number;
  vat_rate_pct?: number;
  vat_amount?: number;
  subtotal_before_tax?: number;
  subtotal_after_tax?: number;
  item_attributes?: number;
  notes?: string | null;
}

export interface ErpSalesOrderFile {
  url: string;
  fileName: string;
  key?: string;
}

export interface ErpSalesOrderData {
  _id: string;
  code: string;
  company_id?: number;
  order_date?: string;
  signed_date?: string;
  content?: string;
  order_type?: number;
  source?: string;
  is_planned?: number;
  customer_id?: string;
  customer_snapshot?: {
    customer_name?: string;
    address?: string;
    phone?: string | null;
    fax?: string | null;
    email?: string | null;
    tax_code?: string | null;
    representative?: string | null;
    representative_title?: string | null;
    bank?: string | null;
    bank_branch?: string | null;
    bank_account?: string | null;
  };
  our_contact_person?: string;
  signer?: string;
  signer_title?: string | null;
  company_tax_code?: string | null;
  delivery_address?: string;
  payment_method?: string;
  payment_term?: number;
  advance_rate_pct?: number;
  expected_delivery_days?: number;
  expected_delivery_date?: string;
  currency_code?: string;
  exchange_rate?: number;
  shipping_fee?: number;
  lines: ErpSalesOrderItemLine[];
  files?: ErpSalesOrderFile[];
  so_approval_status?: string;
  so_approval_workflow_name?: string;
  created_by_name?: string;
  _company?: {
    name?: string;
    short_name?: string;
    tax_code?: string;
    bank_account?: string;
    bank_name?: string;
  };
}

export interface TareDecompositionResult {
  isTareDecomposed: boolean;
  grossTotal: number;
  tareTotal: number;
  netTotal: number;
  barrels: Array<{
    name: string;
    tareKg: number;
    grossKg: number;
    netKg: number;
  }>;
  summaryNote: string;
}

/**
 * Phân tích hiện thực vật lý cân trừ bì từ nội dung ghi chú đơn hàng (ví dụ phế liệu)
 * Cú pháp: "...thùng vàng 08 ( 815kg) 6360kg..."
 */
export function parseTareDecomposition(content?: string): TareDecompositionResult {
  if (!content) {
    return { isTareDecomposed: false, grossTotal: 0, tareTotal: 0, netTotal: 0, barrels: [], summaryNote: '' };
  }

  // Regex pattern matching: [Tên thùng] ( [Tare]kg) [Gross]kg
  const barrelRegex = /([a-zA-Z0-9\sÀ-ỹ\-_]+)\s*\(\s*(\d+(?:\.\d+)?)\s*kg\s*\)\s*(\d+(?:\.\d+)?)\s*kg/gi;
  const barrels: Array<{ name: string; tareKg: number; grossKg: number; netKg: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = barrelRegex.exec(content)) !== null) {
    const rawName = match[1].trim().replace(/^[,:\s]+|[,:\s]+$/g, '');
    const tare = parseFloat(match[2]);
    const gross = parseFloat(match[3]);
    const net = Math.max(0, gross - tare);
    if (!isNaN(tare) && !isNaN(gross) && gross > 0) {
      barrels.push({
        name: rawName,
        tareKg: tare,
        grossKg: gross,
        netKg: net,
      });
    }
  }

  if (barrels.length === 0) {
    return { isTareDecomposed: false, grossTotal: 0, tareTotal: 0, netTotal: 0, barrels: [], summaryNote: '' };
  }

  const grossTotal = barrels.reduce((sum, b) => sum + b.grossKg, 0);
  const tareTotal = barrels.reduce((sum, b) => sum + b.tareKg, 0);
  const netTotal = grossTotal - tareTotal;

  const summaryNote = `[CÂN TRỪ BÌ THỰC TẾ]: Tổng gộp: ${grossTotal.toLocaleString('vi-VN')} kg | Tổng bì (${barrels.length} thùng): ${tareTotal.toLocaleString('vi-VN')} kg | Thực xuất: ${netTotal.toLocaleString('vi-VN')} kg.`;

  return {
    isTareDecomposed: true,
    grossTotal,
    tareTotal,
    netTotal,
    barrels,
    summaryNote,
  };
}

/**
 * Định danh khách hàng kép: So khớp khách hàng trong CRM theo MST -> SĐT -> Mã KH -> Tên
 */
export function resolveCustomerFromErp(
  erpData: ErpSalesOrderData,
  customers: Customer[]
): {
  matchedCustomer: Customer | null;
  matchType: 'TAX_CODE' | 'PHONE' | 'CODE' | 'NAME' | null;
} {
  const snapshot = erpData.customer_snapshot || {};
  const erpTaxCode = (snapshot.tax_code || erpData.customer_id || '').trim().replace(/[\s\-_]/g, '');
  const erpPhone = (snapshot.phone || '').trim().replace(/[\s\-_]/g, '');
  const erpName = (snapshot.customer_name || '').trim().toLowerCase();

  if (!Array.isArray(customers) || customers.length === 0) {
    return { matchedCustomer: null, matchType: null };
  }

  // 1. Ưu tiên cao nhất: Mã Số Thuế
  if (erpTaxCode && erpTaxCode.length >= 8) {
    const matched = customers.find((c) => {
      const cTax = (c.maSoThue || '').trim().replace(/[\s\-_]/g, '');
      return cTax && cTax === erpTaxCode;
    });
    if (matched) return { matchedCustomer: matched, matchType: 'TAX_CODE' };
  }

  // 2. Ưu tiên 2: Số điện thoại
  if (erpPhone && erpPhone.length >= 9) {
    const matched = customers.find((c) => {
      const cPhone = (c.sdt || '').trim().replace(/[\s\-_]/g, '');
      const contactPhone = (c.contacts?.[0]?.sdt || '').trim().replace(/[\s\-_]/g, '');
      return cPhone === erpPhone || contactPhone === erpPhone;
    });
    if (matched) return { matchedCustomer: matched, matchType: 'PHONE' };
  }

  // 3. Ưu tiên 3: Mã khách hàng khớp customer_id
  if (erpData.customer_id) {
    const matched = customers.find((c) => c.maKh === erpData.customer_id);
    if (matched) return { matchedCustomer: matched, matchType: 'CODE' };
  }

  // 4. Ưu tiên 4: Tên pháp nhân khớp chính xác
  if (erpName && erpName.length >= 4) {
    const matched = customers.find((c) => (c.tenKhachHang || '').trim().toLowerCase() === erpName);
    if (matched) return { matchedCustomer: matched, matchType: 'NAME' };
  }

  return { matchedCustomer: null, matchType: null };
}

/**
 * Chuyển đổi danh sách dòng sản phẩm từ ERP sang mảng ProductItem của SGM
 * Đảm bảo đủ 9 trường và tính toán chuẩn xác số thực (float quantity)
 */
export function convertErpLinesToProductItems(lines: ErpSalesOrderItemLine[], tareInfo?: TareDecompositionResult, defaultItemType: 'MACHINE' | 'MATERIAL' | 'SERVICE' = 'MATERIAL'): ProductItem[] {
  if (!Array.isArray(lines) || lines.length === 0) return [];

  return lines.map((line, idx) => {
    const snapshot = line.item_snapshot || {};
    const itemCode = (snapshot.item_code || line.item_id || '').trim();
    const itemName = (snapshot.item_name || 'Vật tư đơn hàng ERP').trim();
    const unit = (snapshot.unit_of_measure?.display_unit || line.converted_unit_code || 'kg').trim();
    const quantity = Number(line.quantity) || 1;
    const price = Number(line.unit_price) || 0;
    const discountPct = line.discount_rate_pct !== undefined ? Number(line.discount_rate_pct) : 0;
    const discountAmount = line.discount_amount !== undefined ? Number(line.discount_amount) : 0;
    const vatPct = line.vat_rate_pct !== undefined ? Number(line.vat_rate_pct) : 10;
    const taxAmount = line.vat_amount !== undefined ? Number(line.vat_amount) : undefined;
    
    // Ghi chú & quy cách chi tiết
    let noteText = line.notes || '';
    if (tareInfo?.isTareDecomposed && idx === 0) {
      noteText = noteText ? `${noteText}. ${tareInfo.summaryNote}` : tareInfo.summaryNote;
    }

    const detectedType = detectItemType(itemName, unit, defaultItemType, itemCode);

    const rawItem: ProductItem = {
      id: crypto.randomUUID(),
      stt: idx + 1,
      productId: itemCode,
      item_code: itemCode,
      productName: itemName,
      unit,
      quantity,
      price,
      discountPct,
      discountAmount,
      vatPct,
      taxAmount,
      ghiChu: noteText,
      note: noteText,
      itemType: detectedType,
      quyCach: tareInfo?.isTareDecomposed ? `Trừ bì ${tareInfo.barrels.length} thùng (${tareInfo.tareTotal.toLocaleString('vi-VN')} kg)` : undefined,
    };

    return computeLineItem(rawItem);
  });
}

/**
 * Chuyển đổi toàn diện Đơn hàng ERP thành Báo giá hoàn chỉnh với Phả hệ nguồn gốc (Lineage)
 */
export function adaptSalesOrderToQuotation(
  erpData: ErpSalesOrderData,
  matchedCustomer: Customer | null,
  soPhieuBaoGia: string,
  userOfficer?: string
): Partial<Quotation> {
  const snapshot = erpData.customer_snapshot || {};
  const tareInfo = parseTareDecomposition(erpData.content);
  const products = convertErpLinesToProductItems(erpData.lines || [], tareInfo, 'MATERIAL');
  const aggs = aggregateProducts(products);

  // Phân loại báo giá tự động
  let loaiBaoGia = QUOTATION_LOAI.VAT_TU;
  const hasMachine = products.some((p) => p.itemType === 'MACHINE');
  const hasMaterial = products.some((p) => p.itemType === 'MATERIAL');
  const hasService = products.some((p) => p.itemType === 'SERVICE');
  if (hasMachine) loaiBaoGia = QUOTATION_LOAI.MAY;
  else if (hasService && !hasMaterial) loaiBaoGia = QUOTATION_LOAI.DICH_VU;
  else loaiBaoGia = QUOTATION_LOAI.VAT_TU;

  // Ngày báo giá
  let ngayBaoGia = new Date().toISOString().split('T')[0];
  if (erpData.order_date) {
    ngayBaoGia = erpData.order_date.includes('T') ? erpData.order_date.split('T')[0] : erpData.order_date.substring(0, 10);
  }

  // Tệp đính kèm phiếu cân & biên bản
  const attachments = (erpData.files || []).map((f) => ({
    name: f.fileName,
    url: f.url,
    key: f.key,
    uploadedAt: new Date().toISOString(),
    source: 'ERP_SALES_ORDER',
  }));

  // Ghi chú chi tiết kết hợp
  let noiDungGhiChu = erpData.content || '';
  if (erpData.code) {
    noiDungGhiChu = `[Số ĐH ERP: ${erpData.code}] ${noiDungGhiChu}`.trim();
  }

  return {
    soPhieuBaoGia,
    soDonHangErp: erpData.code,
    customerId: matchedCustomer?.id || '',
    maKh: matchedCustomer?.maKh || snapshot.tax_code || erpData.customer_id || '',
    tenKhachHang: matchedCustomer?.tenKhachHang || snapshot.customer_name || 'Khách hàng ERP',
    sdt: matchedCustomer?.sdt || snapshot.phone || '',
    diaChi: matchedCustomer?.diaChi || erpData.delivery_address || snapshot.address || '',
    diaChiGiaoHang: erpData.delivery_address || (matchedCustomer as any)?.diaChiGiaoHang || matchedCustomer?.diaChi || snapshot.address || '',
    tinhThanh: (matchedCustomer as any)?.tinhThanh || detectProvinceFromAddress(erpData.delivery_address || snapshot.address || '') || undefined,
    nguoiDaiDien: matchedCustomer?.nguoiDaiDien || snapshot.representative || '',
    ngayBaoGia,
    hieuLuc: erpData.expected_delivery_days || 7,
    tinhTrangBaoGia: 'MỚI',
    loai: loaiBaoGia,
    products,
    subTotal: aggs.totalGross,
    discountAmount: aggs.totalDiscount,
    vatAmount: aggs.totalVat,
    totalAmount: aggs.totalAfterTax,
    noiDungGhiChu,
    attachments,
    sourceRef: {
      origin: 'ERP_SALES_ORDER',
      code: erpData.code,
      id: erpData._id,
      orderDate: erpData.order_date,
      approvalStatus: erpData.so_approval_status || 'approved',
      syncedAt: new Date().toISOString(),
      tareFormula: tareInfo.isTareDecomposed
        ? `Gross: ${tareInfo.grossTotal}kg - Tare: ${tareInfo.tareTotal}kg = Net: ${tareInfo.netTotal}kg`
        : undefined,
    },
    nguoiPhuTrach: userOfficer || erpData.created_by_name || 'Quản trị viên',
  };
}
