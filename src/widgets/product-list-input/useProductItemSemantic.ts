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
 * Heuristic Context-Aware Semantic Detector
 * Detects whether a line item is a MACHINE, MATERIAL, or SERVICE based on name pattern and unit
 * Supports context-aware defaultType (e.g. from Quotation/Contract classification)
 */
export function detectItemType(
  productName: string = '',
  unitOrDefault?: string | ItemSemanticType,
  defaultType: ItemSemanticType = 'MACHINE'
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

  // 1. Kiểm tra đơn vị tính đặc thù của Dịch vụ
  if (/^(gói|goi|lần|lan|chuyến|chuyen|ngày|ngay|giờ|gio|ca|tháng|thang|năm|nam|buổi|buoi|hợp đồng|hop dong)$/i.test(normUnit)) {
    return 'SERVICE';
  }

  // 1b. Kiểm tra đơn vị tính đặc thù của Vật tư / Kim loại / Phế liệu
  if (/^(kg|g|tấn|tan|tạ|ta|yến|yen|mét|met|m|m2|m3|lít|lit|cuộn|cuon|tấm|tam|cây|cay|thanh|bịch|bich|bao)$/i.test(normUnit)) {
    return 'MATERIAL';
  }

  // 2. Nhận diện Dịch vụ, Thi công, Vận chuyển qua từ khóa tên sản phẩm (ưu tiên cao)
  if (/chi phí|chi phi|dịch vụ|dich vu|kiểm tra|kiem tra|vệ sinh|ve sinh|sửa chữa|sua chua|sữa chữa|cải tạo|cai tao|lắp đặt|lap dat|vận hành|van hanh|bảo dưỡng|bao duong|bảo trì|bao tri|cân chỉnh|can chinh|chuyển giao|chuyen giao|vận chuyển|van chuyen|cước xe|cuoc xe|xe cẩu|xe cau|xe tải|xe tai|đầu kéo|dau keo|bốc xếp|boc xep|giao nhận|giao nhan|phí ship|phi ship|chở hàng|cho hang|nhân công|nhan cong|thi công|thi cong|hướng dẫn|huong dan/i.test(normName)) {
    return 'SERVICE';
  }

  // 3. Nhận diện Máy móc / Thiết bị chế tạo (chỉ khi không phải phế liệu/vụn cắt)
  if (!/phế liệu|phe lieu|vụn|vun|bavia|mạt sắt/i.test(normName) && /máy|may|dây chuyền|day chuyen|hệ thống|he thong|dập vòm|dap vom|cán tôn|can ton|xà gồ|xa go|chấn|chan|uốn|uon|k1200|c100|z200|khung dập|khung dap|bộ cán|bo can/i.test(normName)) {
    return 'MACHINE';
  }

  // 4. Nhận diện Vật tư / Phụ kiện / Linh kiện / Kim loại / Phế liệu
  if (/lưỡi dao|luoi dao|dao cắt|dao cat|trục cán|truc can|con lăn|con lan|ốc vít|oc vit|bulong|bu lông|dầu nhớt|dau nhot|tôn cuộn|ton cuon|thép tấm|thep tam|phụ kiện|phu kien|linh kiện|linh kien|khuôn cán|khuon can|bạc đạn|bac dan|vòng bi|vong bi|xích tải|xich tai|cao su|ron|gioăng|gioang|phốt|phot|bánh răng|banh rang|phế liệu|phe lieu|sắt thép|sat thep|thép vụn|thep vun|sắt vụn|sat vun|phôi|ton phế|tôn phế|nhôm|inox|đồng|kim loại|gang/i.test(normName)) {
    return 'MATERIAL';
  }

  return resolvedDefault;
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
