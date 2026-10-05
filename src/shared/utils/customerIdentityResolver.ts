import { cleanCode, cleanProperVietnameseText, normalizePhoneNumber } from './textFormatter';

/**
 * Normalizes Vietnamese business entity names by stripping legal entity prefixes
 * (e.g. "Công Ty TNHH", "Cửa Hàng", "Doanh Nghiệp Tư Nhân", "Đại Lý").
 */
export function normalizeCoreBusinessName(name?: string | null): string {
  if (!name) return '';
  let cleaned = cleanProperVietnameseText(name).toLowerCase();
  
  // Strip legal prefixes
  const prefixes = [
    'công ty tnhh mtv',
    'công ty tnhh sx tm dv',
    'công ty tnhh sx tm',
    'công ty tnhh tm dv',
    'công ty tnhh',
    'công ty cp',
    'công ty cổ phần',
    'cty tnhh mtv',
    'cty tnhh',
    'cty cp',
    'doanh nghiệp tư nhân',
    'dntn',
    'hộ kinh doanh',
    'cửa hàng vật liệu xây dựng',
    'cửa hàng vlxd',
    'cửa hàng',
    'đại lý',
    'xí nghiệp',
    'hợp tác xã',
  ];

  for (const p of prefixes) {
    if (cleaned.startsWith(p)) {
      cleaned = cleaned.slice(p.length).trim();
      break;
    }
  }

  // Remove punctuation, dashes and excess spaces
  return cleaned.replace(/[.,\-_/()]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extracts all valid Vietnamese phone numbers from a document entity.
 */
function extractPhonesFromDoc(doc: any): string[] {
  if (!doc) return [];
  const phones: string[] = [];

  const addPhone = (raw?: string | null) => {
    if (!raw) return;
    const norm = normalizePhoneNumber(raw);
    if (norm) {
      // Split on multiple phones separated by '/'
      norm.split('/').forEach(p => {
        const digits = p.replace(/\D/g, '');
        if (digits.length >= 9) {
          phones.push(digits.startsWith('84') && digits.length > 9 ? '0' + digits.slice(2) : digits);
        }
      });
    }
  };

  addPhone(doc.sdt);
  addPhone(doc.sdtLienHe);
  addPhone(doc.soDienThoai);
  addPhone(doc.phone);
  addPhone(doc.dienThoai);

  if (Array.isArray(doc.contacts)) {
    doc.contacts.forEach((c: any) => addPhone(c?.sdt || c?.phone));
  }

  return Array.from(new Set(phones));
}

function extractEntityCustomerId(doc: any): string {
  if (!doc) return '';
  if (doc.customerId) return String(doc.customerId).trim();
  if (doc.customer_id) return String(doc.customer_id).trim();

  // If it's a child transactional document, doc.id is document ID (e.g. quotation ID)
  const isTransactionalDoc = !!(
    doc.soPhieuBaoGia || doc.soHopDong || doc.paymentId || doc.deliveryId ||
    doc.maBaoGia || doc.maHopDong || doc.maThanhToan || doc.maGiaoHang ||
    doc.products || doc.revisions || doc.cacDotThu || doc.cacDotGiao
  );
  if (!isTransactionalDoc && doc.id) {
    return String(doc.id).trim();
  }
  return '';
}

/**
 * Sovereign Invariant: Evaluates whether two documents (or entities) belong to the EXACT SAME CUSTOMER.
 * Prevents cross-customer data leakage across all 5 core modules (Quotations, Contracts, Payments, Deliveries, Customers).
 */
export function isSameCustomer(docA: any, docB: any): boolean {
  if (!docA || !docB) return false;
  if (docA === docB) return true;

  // 1. Resolve Customer ID
  const idA = extractEntityCustomerId(docA);
  const idB = extractEntityCustomerId(docB);

  // If both have explicit Customer IDs and they MATCH -> TRUE
  if (idA && idB && idA === idB) {
    return true;
  }

  // 2. Kiểm tra kế thừa mã đã gộp (Merged Customer Codes Heritage & Transitive Link)
  const maKhA = cleanCode(docA.maKh || docA.maKH || docA.ma_kh || '').toUpperCase();
  const maKhB = cleanCode(docB.maKh || docB.maKH || docB.ma_kh || '').toUpperCase();

  const mergedA = Array.isArray(docA.mergedCustomerCodes) ? docA.mergedCustomerCodes.map((c: string) => cleanCode(c).toUpperCase()) : [];
  const mergedB = Array.isArray(docB.mergedCustomerCodes) ? docB.mergedCustomerCodes.map((c: string) => cleanCode(c).toUpperCase()) : [];
  if (
    (idB && mergedA.includes(idB.toUpperCase())) ||
    (idA && mergedB.includes(idA.toUpperCase())) ||
    (maKhB && mergedA.includes(maKhB)) ||
    (maKhA && mergedB.includes(maKhA))
  ) {
    return true;
  }
  const mergedIntoA = cleanCode(docA.mergedInto || docA.merged_into || '').toUpperCase();
  const mergedIntoB = cleanCode(docB.mergedInto || docB.merged_into || '').toUpperCase();
  if ((mergedIntoA && (mergedIntoA === idB.toUpperCase() || (maKhB && mergedIntoA === maKhB))) ||
      (mergedIntoB && (mergedIntoB === idA.toUpperCase() || (maKhA && mergedIntoB === maKhA)))) {
    return true;
  }

  // SOVEREIGN CONFLICT CHECK: If both have explicit IDs and they DIFFER, they CANNOT be the same customer!
  // This strictly prevents cross-customer contamination even if two customers share duplicate maKh.
  if (idA && idB && idA !== idB) {
    return false;
  }

  // 3. Resolve Customer Code (maKh) - Only when IDs are NOT in conflict
  if (maKhA && maKhB) {
    if (maKhA !== maKhB) {
      return false;
    }
    return true;
  }

  // 4. Tax Code (MST)
  const taxA = docA.maSoThue ? cleanCode(docA.maSoThue).replace(/[\s\-_]/g, '') : '';
  const taxB = docB.maSoThue ? cleanCode(docB.maSoThue).replace(/[\s\-_]/g, '') : '';
  if (taxA && taxB && taxA === taxB) {
    return true;
  }

  // 4. Normalized Core Business Name
  const rawNameA = docA.tenKhachHang || (docA.loaiKh ? docA.tenKhachHang : '') || docA.ten_khach_hang || '';
  const rawNameB = docB.tenKhachHang || (docB.loaiKh ? docB.tenKhachHang : '') || docB.ten_khach_hang || '';
  const coreNameA = normalizeCoreBusinessName(rawNameA);
  const coreNameB = normalizeCoreBusinessName(rawNameB);

  // If names are present and completely discordant (e.g. "Long Hưng" vs "Hợi Thủy"), REJECT!
  if (coreNameA && coreNameB) {
    if (coreNameA === coreNameB) {
      return true;
    }
    // Explicit name mismatch -> Not the same customer!
    return false;
  }

  // 5. Phone matching (Only when names do not conflict)
  const phonesA = extractPhonesFromDoc(docA);
  const phonesB = extractPhonesFromDoc(docB);
  if (phonesA.length > 0 && phonesB.length > 0) {
    const hasCommonPhone = phonesA.some(p => phonesB.includes(p));
    if (hasCommonPhone) return true;
  }

  return false;
}

/**
 * Filters an array of candidate documents to ONLY those that belong to the same customer as anchorDoc.
 */
export function filterBySameCustomer<T>(anchorDoc: any, candidates: T[]): T[] {
  if (!anchorDoc || !Array.isArray(candidates) || candidates.length === 0) return [];
  return candidates.filter(item => isSameCustomer(anchorDoc, item));
}

/**
 * Sanitizes and cleanses cross-customer links from a delivery document.
 * If contractId or paymentId belongs to a DIFFERENT customer, it is safely stripped.
 */
export function sanitizeDeliveryCustomerBoundary(delivery: any, contractDoc?: any, paymentDoc?: any): {
  isSafeContract: boolean;
  isSafePayment: boolean;
} {
  if (!delivery) return { isSafeContract: false, isSafePayment: false };

  const isSafeContract = contractDoc ? isSameCustomer(delivery, contractDoc) : true;
  const isSafePayment = paymentDoc ? isSameCustomer(delivery, paymentDoc) : true;

  return { isSafeContract, isSafePayment };
}
