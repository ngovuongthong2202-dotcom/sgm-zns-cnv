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

  // ----------------------------------------------------
  // TẦNG 2: ĐƠN VỊ TÍNH ĐẶC THÙ (Unit-of-Measure Determinism)
  // ----------------------------------------------------
  // ĐVT thuần Dịch vụ: thời gian, lượt, công việc
  if (/^(gói|goi|lần|lan|chuyến|chuyen|ngày|ngay|giờ|gio|ca|tháng|thang|năm|nam|buổi|buoi|đợt|dot|hợp đồng|hop dong|công|cong)$/i.test(normUnit)) {
    return 'SERVICE';
  }

  // ĐVT thuần Máy móc thiết bị hoàn chỉnh
  if (/^(máy|may|dây chuyền|day chuyen|hệ thống|he thong|cụm máy|cum may)$/i.test(normUnit)) {
    return 'MACHINE';
  }

  // ĐVT thuần Vật tư / Phụ tùng / Kim loại / Tiêu hao
  const isMaterialUnit = /^(kg|g|tấn|tan|tạ|ta|yến|yen|mét|met|m|m2|m3|lít|lit|cuộn|cuon|tấm|tam|cây|cay|thanh|bịch|bich|bao|hộp|hop|thùng|thung|ống|ong|lon|bình|binh|bộ|bo|cái|cai|chiếc|chiec)$/i.test(normUnit);

  // ----------------------------------------------------
  // TẦNG 3: TAXONOMY MÃ HÀNG HÓA ERP (Item Code Prefix Pattern)
  // ----------------------------------------------------
  if (normCode) {
    // Mã đầu 705 hoặc DV: Dịch vụ nhân công / ăn ở / di chuyển
    if (/^(705|DV)/i.test(normCode)) {
      return 'SERVICE';
    }
    // Mã đầu 628, 152, 153, VT: Vật tư, phụ tùng, linh kiện
    if (/^(628|152|153|156|VT)/i.test(normCode)) {
      return 'MATERIAL';
    }
    // Mã đầu TP, MAY, CT, XG: Thành phẩm Máy cán tôn, máy xà gồ
    if (/^(TP|MAY|M_|CT|XG|DVOM)/i.test(normCode)) {
      return 'MACHINE';
    }
  }

  // Từ khóa thuần Dịch vụ (ưu tiên cao nhất trong tên sản phẩm)
  const isServiceWord = /chi phí|chi phi|dịch vụ|dich vu|kiểm tra|kiem tra|vệ sinh|ve sinh|sửa chữa|sua chua|sữa chữa|cải tạo|cai tao|lắp đặt|lap dat|vận hành|van hanh|bảo dưỡng|bao duong|bảo trì|bao tri|cân chỉnh|can chinh|chuyển giao|chuyen giao|vận chuyển|van chuyen|cước xe|cuoc xe|xe cẩu|xe cau|xe tải|xe tai|đầu kéo|dau keo|bốc xếp|boc xep|giao nhận|giao nhan|phí ship|phi ship|chở hàng|cho hang|nhân công|nhan cong|thi công|thi cong|hướng dẫn|huong dan/i.test(normName);
  if (isServiceWord) {
    return 'SERVICE';
  }

  // ----------------------------------------------------
  // TẦNG 1: QUYỀN LỰC NGỮ CẢNH BÁO GIÁ (Context-First Axiom)
  // ----------------------------------------------------
  // Nếu Báo giá là "BG Vật tư", mọi thứ (trừ dịch vụ) MẶC NHIÊN là MATERIAL!
  if (resolvedDefault === 'MATERIAL') {
    // Chỉ trừ trường hợp hiếm hoi người dùng nhập nguyên một cái máy cán tôn hoàn chỉnh vào báo giá vật tư
    const isExplicitWholeMachine = /^(máy cán|day chuyen|dây chuyền cán|hệ thống cán|máy dập vòm|máy cán xà gồ)/i.test(normName) && !/lò xo|dao|trục|vòng bi|bạc đạn|ốc|vít|phụ tùng|linh kiện|thay thế/i.test(normName);
    if (!isExplicitWholeMachine) {
      return 'MATERIAL';
    }
  }

  // Nếu Báo giá là "BG Dịch vụ", mọi thứ MẶC NHIÊN là SERVICE!
  if (resolvedDefault === 'SERVICE') {
    return 'SERVICE';
  }

  // ----------------------------------------------------
  // TẦNG 4: NHẬN DIỆN MÁY MÓC THEO TẬP HỮU HẠN & KHẤU TRỪ LINH KIỆN
  // ----------------------------------------------------
  // Dấu hiệu nhận biết linh kiện / phụ tùng (kể cả khi tên có chữ "máy", ví dụ "Lò xo máy cán", "Dao cắt máy dập")
  const isComponentWord = /lò xo|lo xo|lưỡi dao|dao cắt|dao cat|trục cán|truc can|con lăn|con lan|ốc vít|oc vit|bulong|bu lông|dầu nhớt|dau nhot|mỡ bò|mo bo|phụ kiện|phu kien|linh kiện|linh kien|khuôn cán|khuon can|bạc đạn|bac dan|vòng bi|vong bi|xích tải|xich tai|cao su|ron|gioăng|gioang|phốt|phot|phớt|sim|bánh răng|banh rang|khớp nối|khop noi|ty ren|thanh ren|curoa|dây đai|nhông|đĩa xích|van khí|van thủy lực|xi lanh|cút nối|co nối|ống khí|ống dầu|cảm biến|sensor|encoder|rơ le|relay|contactor|khởi động từ|aptomat|cb|cầu chì|bộ nguồn|nguồn tổ ong|biến tần|inverter|plc|hmi|đèn báo|nút nhấn|công tắc|dây cáp|dây điện|terminal|cầu đấu|que hàn|đá mài|đá cắt|mực in|tem nhãn|decal|thép vụn|thep vun|sắt vụn|sat vun|phôi|ton phế|tôn phế/i.test(normName);
  
  if (isComponentWord) {
    return 'MATERIAL';
  }

  // Nhận diện Máy móc hoàn chỉnh của SGM
  const isWholeMachine = !/phế liệu|phe lieu|vụn|vun|bavia|mạt sắt/i.test(normName) && 
    /máy|may|dây chuyền|day chuyen|hệ thống|he thong|dập vòm|dap vom|cán tôn|can ton|xà gồ|xa go|chấn|chan|uốn|uon|k1200|c100|z200|khung dập|khung dap|bộ cán|bo can/i.test(normName);

  if (isWholeMachine) {
    return 'MACHINE';
  }

  // Nguyên vật liệu thô / tôn cuộn / thép tấm (khi không phải là cụm máy hoàn chỉnh)
  const isRawMaterial = /tôn cuộn|ton cuon|thép tấm|thep tam|sắt thép|sat thep|nhôm|inox|đồng|kim loại|gang|phế liệu|phe lieu/i.test(normName);
  if (isRawMaterial) {
    return 'MATERIAL';
  }

  // Nếu có đơn vị tính vật tư thì là MATERIAL
  if (isMaterialUnit) {
    return 'MATERIAL';
  }

  // Fallback về defaultType theo ngữ cảnh
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
