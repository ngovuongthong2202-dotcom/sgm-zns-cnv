import { ProductItem } from '@/src/domain/schema/product.schema';

export type ItemSemanticType = 'MACHINE' | 'MATERIAL' | 'SERVICE';

export interface SemanticConfig {
  type: ItemSemanticType;
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
  description: string;
}

export const ITEM_SEMANTIC_CONFIG: Record<ItemSemanticType, SemanticConfig> = {
  MACHINE: {
    type: 'MACHINE',
    label: 'Máy móc / Dây chuyền',
    shortLabel: 'Máy',
    icon: '⚙️',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    description: 'Thiết bị chính có số serial/mã máy và điều khoản bảo hành'
  },
  MATERIAL: {
    type: 'MATERIAL',
    label: 'Vật tư / Phụ tùng',
    shortLabel: 'Vật tư',
    icon: '📦',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
    description: 'Linh kiện thay thế, dao cắt, trục, tôn tấm, ốc vít...'
  },
  SERVICE: {
    type: 'SERVICE',
    label: 'Dịch vụ / Nhân công',
    shortLabel: 'Dịch vụ',
    icon: '🛠️',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    description: 'Lắp đặt, cân chỉnh máy, đào tạo chuyển giao, bảo dưỡng...'
  }
};

/**
 * 5-Tier Contextual Deduction Engine (Thay thế hoàn toàn regex thủ công)
 * 
 * Tầng 1: Quyền lực Ngữ cảnh Báo Giá (Context-First Axiom)
 * Tầng 2: Đơn vị tính đặc thù (Unit-of-Measure Determinism)
 * Tầng 3: Taxonomy Mã hàng hóa ERP (Item Code Prefix Pattern)
 * Tầng 4: Nhận diện Máy móc theo Tập Hữu Hạn & Khấu trừ Linh kiện (Finite Machine Subtraction)
 * Tầng 5: Học tập Thích ứng & Fallback Ngữ cảnh
 */
export function detectItemType(
  productName: string = '',
  unitOrDefault?: string | ItemSemanticType,
  defaultType: ItemSemanticType = 'MACHINE',
  itemCode?: string
): ItemSemanticType {
  let resolvedUnit: string | undefined;
  let resolvedDefault: ItemSemanticType = defaultType;

  if (unitOrDefault === 'MACHINE' || unitOrDefault === 'MATERIAL' || unitOrDefault === 'SERVICE') {
    resolvedDefault = unitOrDefault;
  } else if (typeof unitOrDefault === 'string') {
    resolvedUnit = unitOrDefault;
  }

  const normName = (productName || '').trim().toLowerCase();
  const normUnit = (resolvedUnit || '').trim().toLowerCase();
  const normCode = (itemCode || '').trim().toUpperCase();

  // Fallback nhanh cho chuỗi rỗng
  if (!normName) {
    return resolvedDefault;
  }

  // ----------------------------------------------------
  // BẬC 2a: DỊCH VỤ / NHÂN CÔNG / CHI PHÍ ĐẶC THÙ
  // Nếu bắt đầu bằng từ chỉ dịch vụ/chi phí hoặc mã 705/DV hoặc ĐVT dịch vụ
  // ----------------------------------------------------
  const isServiceCode = /^(705|DV)/i.test(normCode);
  const isServiceUnit = /^(gói|goi|lần|lan|chuyến|chuyen|ngày|ngay|giờ|gio|ca|tháng|thang|năm|nam|buổi|buoi|đợt|dot|hợp đồng|hop dong|công|cong)$/i.test(normUnit);
  const isDedicatedServicePrefix = /^(dịch vụ|dich vu|chi phí|chi phi|cước|cuoc|nhân công|nhan cong|chuyển giao|chuyen giao|hướng dẫn|huong dan|bảo dưỡng|bao duong|bảo trì|bao tri|sửa chữa|sua chua|cải tạo|cai tao|lắp đặt|lap dat|cân chỉnh|can chinh|vận chuyển|van chuyen|bốc xếp|boc xep|phí ship|phi ship)/i.test(normName);

  if (isServiceCode || isServiceUnit || isDedicatedServicePrefix || resolvedDefault === 'SERVICE') {
    return 'SERVICE';
  }

  // ----------------------------------------------------
  // BẬC 2b: VẬT TƯ / PHỤ TÙNG THEO MÃ ERP HOẶC TỪ KHÓA LINH KIỆN ĐỨNG ĐẦU
  // Khấu trừ linh kiện (Dao cắt, Trục, Bánh răng, Lò xo, Bạc đạn...) để không bị nhận nhầm
  // khi tên chứa tên máy lắp ráp (Ví dụ: "Dao cắt tôn máy xà gồ SKD11")
  // ----------------------------------------------------
  const isMaterialCode = /^(152|VT)/i.test(normCode);
  const isSparePartPrefix = /^(dao|lưỡi dao|luoi dao|trục|truc|bánh răng|banh rang|lò xo|lo xo|bạc đạn|bac dan|vòng bi|vong bi|con lăn|con lan|phe cài|phe cai|cốc bi|coc bi|bản mã|ban ma|thép|thep|ốc|oc|bulong|bu lông|bu-long|ty ren|dầu|dau|nhớt|nhot|xích|xich|dây curoa|day curoa|puly|khớp nối|khop noi|khuôn|khuon)/i.test(normName);

  if (isMaterialCode || isSparePartPrefix) {
    return 'MATERIAL';
  }

  // ----------------------------------------------------
  // BẬC 1: MÁY MÓC THIẾT BỊ HOÀN CHỈNH (MACHINE)
  // Tên chứa từ "máy" (không phân biệt hoa/thường) hoặc cụm máy hoàn chỉnh SGM
  // ----------------------------------------------------
  const isMachineCode = /^(TP|MAY|M_|CT|XG|DVOM)/i.test(normCode);
  const isMachineUnit = /^(máy|may|dây chuyền|day chuyen|dàn|dan|cụm máy|cum may)$/i.test(normUnit);
  const isMachineName = /\bmáy\b|máy|dây chuyền|day chuyen|hệ thống|he thong|khung dập|khung dap|bộ cán|bo can|cụm máy|cum may/i.test(normName);

  if (isMachineCode || isMachineUnit || isMachineName) {
    return 'MACHINE';
  }

  // ----------------------------------------------------
  // BẬC 2c: CÁC TỪ KHÓA DỊCH VỤ CÒN LẠI TRONG TÊN
  // ----------------------------------------------------
  const isServiceKeyword = /chi phí|chi phi|dịch vụ|dich vu|kiểm tra|kiem tra|vệ sinh|ve sinh|sửa chữa|sua chua|sữa chữa|cải tạo|cai tao|lắp đặt|lap dat|vận hành|van hanh|bảo dưỡng|bao duong|bảo trì|bao tri|cân chỉnh|can chinh|chuyển giao|chuyen giao|vận chuyển|van chuyen|cước xe|cuoc xe|xe cẩu|xe cau|xe tải|xe tai|đầu kéo|dau keo|bốc xếp|boc xep|giao nhận|giao nhan|phí ship|phi ship|chở hàng|cho hang|nhân công|nhan cong|thi công|thi cong|hướng dẫn|huong dan/i.test(normName);

  if (isServiceKeyword) {
    return 'SERVICE';
  }

  // ----------------------------------------------------
  // BẬC 3: TẤT CẢ SẢN PHẨM CÒN LẠI -> VẬT TƯ (MATERIAL)
  // ----------------------------------------------------
  return 'MATERIAL';
}

/**
 * Calculates actual machine count strictly by summing quantity of MACHINE items only.
 * Excludes materials, spare parts, and services from machine totals.
 */
export function calculateActualMachineCount(products: (ProductItem | any)[] = []): number {
  if (!Array.isArray(products) || products.length === 0) return 0;
  return products
    .filter(p => (p.itemType || detectItemType(p.productName, p.unit || p.dvt)) === 'MACHINE')
    .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
}

/**
 * Smart allocation of root contract serials into machine product line items.
 * Allocates unassigned serials only to MACHINE items that have remaining quota.
 */
export function smartAllocateSerials(
  products: ProductItem[] = [],
  rootSerials: string[] = []
): ProductItem[] {
  if (!Array.isArray(products) || products.length === 0) return [];
  const cleanRootSerials = (rootSerials || []).map(s => String(s || '').trim()).filter(Boolean);

  // Collect already assigned serials across all rows to avoid duplication
  const assigned = new Set<string>();
  for (const p of products) {
    if (Array.isArray(p.danhSachMaMay)) {
      for (const sn of p.danhSachMaMay) {
        if (sn && sn.trim()) assigned.add(sn.trim());
      }
    }
  }

  // Find remaining unassigned root serials
  const availablePool = cleanRootSerials.filter(sn => !assigned.has(sn));

  return products.map(p => {
    const detectedFromText = detectItemType(p.productName, p.unit || (p as any).dvt);
    const resolvedType = p.itemType || detectedFromText;
    
    // Non-machine items should not receive root machine serials, but retain any existing serials/lot numbers
    if (resolvedType !== 'MACHINE') {
      return {
        ...p,
        itemType: resolvedType,
        danhSachMaMay: Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay : []
      };
    }

    const currentSerials = Array.isArray(p.danhSachMaMay) ? [...p.danhSachMaMay] : [];
    const targetQty = Math.max(1, Number(p.quantity) || 1);

    // If current serials already match or exceed quantity, retain them
    if (currentSerials.length >= targetQty) {
      return {
        ...p,
        itemType: 'MACHINE',
        danhSachMaMay: currentSerials
      };
    }

    // Auto-allocate from available pool up to line item quantity
    const needed = targetQty - currentSerials.length;
    const allocated = availablePool.splice(0, needed);
    const mergedSerials = [...currentSerials, ...allocated];

    return {
      ...p,
      itemType: 'MACHINE',
      danhSachMaMay: mergedSerials
    };
  });
}

/**
 * Returns available root serials that have not yet been assigned to any line item.
 * Used for Quick-Pick Serial Pool Chips.
 */
export function getAvailableRootSerials(
  products: ProductItem[] = [],
  rootSerials: string[] = []
): string[] {
  const cleanRootSerials = (rootSerials || []).map(s => String(s || '').trim()).filter(Boolean);
  const assigned = new Set<string>();
  for (const p of products) {
    if (Array.isArray(p.danhSachMaMay)) {
      for (const sn of p.danhSachMaMay) {
        if (sn && sn.trim()) assigned.add(sn.trim());
      }
    }
  }
  return cleanRootSerials.filter(sn => !assigned.has(sn));
}
