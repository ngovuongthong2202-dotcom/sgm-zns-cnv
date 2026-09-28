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
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    description: 'Linh kiện thay thế, dao cắt, trục, tôn tấm, ốc vít...'
  },
  SERVICE: {
    type: 'SERVICE',
    label: 'Dịch vụ / Nhân công',
    shortLabel: 'Dịch vụ',
    icon: '🛠️',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    description: 'Lắp đặt, cân chỉnh máy, đào tạo chuyển giao, bảo dưỡng...'
  }
};

/**
 * Heuristic Context-Aware Semantic Detector
 * Detects whether a line item is a MACHINE, MATERIAL, or SERVICE based on name pattern
 * NEVER relies blindly on dvt (which can be 'Cái' for machines!)
 */
export function detectItemType(
  productName: string = '',
  defaultType: ItemSemanticType = 'MACHINE'
): ItemSemanticType {
  const norm = (productName || '').trim().toLowerCase();
  if (!norm) return defaultType;

  // 1. Nhận diện Dịch vụ & Phụ phí vận chuyển (ưu tiên cao vì thường có từ khóa rõ ràng)
  if (/lắp đặt|vận hành|bảo dưỡng|bảo trì|cân chỉnh|chuyển giao|vận chuyển|cước xe|cước vận chuyển|chi phí vận chuyển|xe cẩu|xe tải|đầu kéo|bốc xếp|giao nhận|phí ship|chở hàng|nhân công|dịch vụ|thi công|hướng dẫn/i.test(norm)) {
    return 'SERVICE';
  }

  // 2. Nhận diện Máy móc / Thiết bị chế tạo (ưu tiên máy móc trước vật tư đơn lẻ)
  if (/máy|dây chuyền|hệ thống|dập vòm|cán tôn|xà gồ|chấn|uốn|k1200|c100|z200|khung dập|bộ cán/i.test(norm)) {
    return 'MACHINE';
  }

  // 3. Nhận diện Vật tư / Phụ kiện / Linh kiện
  if (/lưỡi dao|dao cắt|trục cán|con lăn|ốc vít|bulong|bu lông|dầu nhớt|tôn cuộn|thép tấm|phụ kiện|linh kiện|khuôn cán|bạc đạn|vòng bi|xích tải/i.test(norm)) {
    return 'MATERIAL';
  }

  return defaultType;
}

/**
 * Calculates actual machine count strictly by summing quantity of MACHINE items only.
 * Excludes materials, spare parts, and services from machine totals.
 */
export function calculateActualMachineCount(products: (ProductItem | any)[] = []): number {
  if (!Array.isArray(products) || products.length === 0) return 0;
  return products
    .filter(p => (p.itemType || detectItemType(p.productName)) === 'MACHINE')
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
    const inferredType = p.itemType || detectItemType(p.productName);
    
    // Non-machine items should not have serials
    if (inferredType !== 'MACHINE') {
      return {
        ...p,
        itemType: inferredType,
        danhSachMaMay: []
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
