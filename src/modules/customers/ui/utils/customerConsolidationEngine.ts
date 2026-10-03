import { Customer, ContactItem } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { normalizeBusinessName } from '@/src/shared/utils/textFormatter';
import { extractVietnamesePhones } from './vietnameseTelecomExtractor';

export interface DuplicateCustomerGroup {
  taxCode: string;
  normalizedName: string;
  masterCustomer: Customer;
  secondaryCustomers: Customer[];
  allCustomersInGroup: Customer[];
  totalQuotationsCount: number;
  distinctContactsCount: number;
}

export interface ConsolidationMigrationPlan {
  masterCustomer: Customer;
  updatedMasterCustomer: Customer;
  archivedSecondaryCustomers: Customer[];
  affectedQuotationIds: string[];
  affectedContractIds: string[];
  affectedBillingIds: string[];
  affectedDeliveryIds: string[];
  impactSummary: {
    quotationsCount: number;
    totalQuotationValue: number;
    contractsCount: number;
    totalContractValue: number;
    billingsCount: number;
    totalBillingAmount: number;
    deliveriesCount: number;
    contactsMergedCount: number;
  };
  auditSnapshot: {
    mergedAt: string;
    masterId: string;
    secondaryIds: string[];
    previousSecondaryState: Customer[];
  };
}

/**
 * Chuẩn hóa mã số thuế để so khớp (bỏ dấu cách, gạch ngang)
 */
export function normalizeTaxCode(tax?: string): string {
  return (tax || '').trim().replace(/[\s\-_]/g, '');
}

export const BLACKLISTED_DUMMY_TAX_CODES = new Set([
  '0000000000',
  '1111111111',
  '2222222222',
  '3333333333',
  '4444444444',
  '5555555555',
  '6666666666',
  '7777777777',
  '8888888888',
  '9999999999',
  '1234567890',
  '0123456789',
  '9876543210'
]);

/**
 * Kiểm tra xem MST có phải là Chi nhánh (13 số) hay không
 */
export function isBranchTaxCode(tax?: string): boolean {
  const norm = normalizeTaxCode(tax);
  return norm.length === 13;
}

/**
 * Kiểm tra tính hợp lệ của MST doanh nghiệp dùng trong MDM gom nhóm
 */
export function isValidEnterpriseTaxCode(tax?: string): boolean {
  const norm = normalizeTaxCode(tax);
  if (!norm || norm.length < 8) return false;
  if (isBranchTaxCode(norm)) return false; // Không gom nhầm chi nhánh 13 số
  if (BLACKLISTED_DUMMY_TAX_CODES.has(norm)) return false; // Không gom nhầm MST rác/tạm
  if (/^(\d)\1+$/.test(norm)) return false; // Không gom chuỗi ký tự lặp vô nghĩa
  return true;
}

/**
 * Tính toán độ tương đồng giữa 2 tên doanh nghiệp chuẩn hóa (Token Jaccard)
 */
export function calculateBusinessNameSimilarity(nameA?: string, nameB?: string): number {
  if (!nameA || !nameB) return 0;
  const normA = normalizeBusinessName(nameA).toLowerCase();
  const normB = normalizeBusinessName(nameB).toLowerCase();
  if (normA === normB) return 1.0;

  const tokensA = new Set(normA.split(/\s+/).filter(w => w.length > 1));
  const tokensB = new Set(normB.split(/\s+/).filter(w => w.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  tokensA.forEach(t => {
    if (tokensB.has(t)) intersection++;
  });
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Quét toàn bộ danh sách khách hàng và phát hiện các nhóm trùng MST (hoặc trùng Tên pháp nhân chuẩn hóa)
 */
export function detectDuplicateCustomerGroups(
  customers: Customer[],
  quotations: Quotation[] = [],
  contracts: any[] = [],
  payments: any[] = [],
  deliveries: any[] = []
): DuplicateCustomerGroup[] {
  if (!Array.isArray(customers) || customers.length === 0) return [];

  // Bản đồ đếm số lượng Báo giá cho từng khách hàng
  const quoteCountByCustId = new Map<string, number>();
  quotations.forEach(q => {
    const id = q.customerId || q.maKh;
    if (id) {
      quoteCountByCustId.set(id, (quoteCountByCustId.get(id) || 0) + 1);
    }
  });

  // Bản đồ đếm số lượng Hợp đồng
  const contractCountByCustId = new Map<string, number>();
  contracts.forEach(c => {
    const id = c.customerId || c.maKh;
    if (id) {
      contractCountByCustId.set(id, (contractCountByCustId.get(id) || 0) + 1);
    }
  });

  // Bản đồ đếm số lượng Phiếu giao hàng
  const deliveryCountByCustId = new Map<string, number>();
  deliveries.forEach(d => {
    const id = d.customerId || d.maKh;
    if (id) {
      deliveryCountByCustId.set(id, (deliveryCountByCustId.get(id) || 0) + 1);
    }
  });

  // Bản đồ đếm số lượng Phiếu thu
  const paymentCountByCustId = new Map<string, number>();
  payments.forEach(p => {
    const id = p.customerId || p.maKh;
    if (id) {
      paymentCountByCustId.set(id, (paymentCountByCustId.get(id) || 0) + 1);
    }
  });

  // Nhóm theo Mã Số Thuế (Chỉ nhóm MST 10 số pháp nhân hợp lệ, bỏ qua rác và chi nhánh)
  const groupsByTax = new Map<string, Customer[]>();

  customers.forEach(c => {
    // Bỏ qua các khách hàng đã bị gộp trước đó hoặc đã lưu trữ
    if (c.isArchived || c.mergedInto || (c as any).is_archived || (c as any).merged_into || c.tenKhachHang?.startsWith('[ĐÃ GỘP VÀO')) return;

    const normTax = normalizeTaxCode(c.maSoThue);
    // Bỏ qua khách hàng cá nhân không có MST, MST < 8 số hoặc MST nằm trong Blacklist rác
    if (isValidEnterpriseTaxCode(normTax)) {
      if (!groupsByTax.has(normTax)) {
        groupsByTax.set(normTax, []);
      }
      groupsByTax.get(normTax)!.push(c);
    }
  });

  const duplicateGroups: DuplicateCustomerGroup[] = [];

  groupsByTax.forEach((groupCustomers, taxCode) => {
    if (groupCustomers.length > 1) {

      // Sovereign Multi-Dimensional Composite Scoring (MDSCS):
      // Giai tầng 1: Điểm nghiệp vụ giao dịch trọng yếu
      // Score = (Contracts * 10) + (Deliveries * 8) + (Payments * 6) + (Quotes * 2)
      // Giai tầng 2: Nếu điểm giao dịch bằng nhau (hoặc = 0) -> Giữ nguyên hồ sơ nền tảng tạo trước (mã KH nhỏ hơn: KH-001 < KH-002)
      const calculateCustomerScore = (cust: Customer): number => {
        const idKey = cust.id || '';
        const maKey = cust.maKh || '';
        const contractsCount = (contractCountByCustId.get(idKey) || 0) + (contractCountByCustId.get(maKey) || 0);
        const deliveriesCount = (deliveryCountByCustId.get(idKey) || 0) + (deliveryCountByCustId.get(maKey) || 0);
        const paymentsCount = (paymentCountByCustId.get(idKey) || 0) + (paymentCountByCustId.get(maKey) || 0);
        const quotesCount = (quoteCountByCustId.get(idKey) || 0) + (quoteCountByCustId.get(maKey) || 0);

        return (contractsCount * 10) +
               (deliveriesCount * 8) +
               (paymentsCount * 6) +
               (quotesCount * 2);
      };

      const sorted = [...groupCustomers].sort((a, b) => {
        const scoreA = calculateCustomerScore(a);
        const scoreB = calculateCustomerScore(b);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (a.maKh || '').localeCompare(b.maKh || '');
      });

      const master = sorted[0];
      const secondaries = sorted.slice(1);

      // Đếm tổng báo giá
      const totalQuotes = groupCustomers.reduce((sum, c) => {
        return sum + (quoteCountByCustId.get(c.id || '') || 0) + (quoteCountByCustId.get(c.maKh || '') || 0);
      }, 0);

      // Đếm tổng số đầu mối liên hệ duy nhất
      const allPhoneSet = new Set<string>();
      groupCustomers.forEach(c => {
        if (c.sdt) allPhoneSet.add(c.sdt.replace(/\D/g, ''));
        (c.contacts || []).forEach(ct => {
          if (ct.sdt) allPhoneSet.add(ct.sdt.replace(/\D/g, ''));
        });
      });

      duplicateGroups.push({
        taxCode,
        normalizedName: normalizeBusinessName(master.tenKhachHang),
        masterCustomer: master,
        secondaryCustomers: secondaries,
        allCustomersInGroup: groupCustomers,
        totalQuotationsCount: totalQuotes,
        distinctContactsCount: allPhoneSet.size || 1,
      });
    }
  });

  return duplicateGroups;
}

/**
 * Xây dựng kế hoạch di chuyển và gộp khách hàng trùng lặp bảo toàn phả hệ dữ liệu
 */
export function buildConsolidationMigrationPlan(
  group: DuplicateCustomerGroup,
  quotations: Quotation[] = [],
  contracts: any[] = [],
  billings: any[] = [],
  deliveries: any[] = []
): ConsolidationMigrationPlan {
  const master = group.masterCustomer;
  const secondaries = group.secondaryCustomers;
  const secondaryIds = secondaries.map(s => s.id || s.maKh).filter(Boolean) as string[];

  // 1. Gộp mảng Contacts: Giữ nguyên người đại diện chính của Master, bổ sung các đầu mối từ Secondary
  const mergedContacts: ContactItem[] = [...(master.contacts || [])];

  // Nếu master chưa có đại diện chính trong contacts thì thêm vào
  if (master.nguoiDaiDien || master.sdt) {
    const hasPrimaryInContacts = mergedContacts.some(
      ct => ct.sdt === master.sdt || ct.nguoiDaiDien === master.nguoiDaiDien
    );
    if (!hasPrimaryInContacts && (master.nguoiDaiDien || master.sdt)) {
      mergedContacts.unshift({
        danhXung: 'Đại diện',
        nguoiDaiDien: master.nguoiDaiDien || 'Đại diện chính',
        sdt: master.sdt || '',
        chucVu: 'Đại diện chính',
        chiNhanh: master.chiNhanh || 'Trụ sở chính'
      });
    }
  }

  // Helper thông minh phân giải viễn thông & hợp nhất đầu mối trùng lặp
  const fuseOrAddContact = (candidate: ContactItem, secMaKh?: string) => {
    const candExt = candidate.sdt ? extractVietnamesePhones(candidate.sdt) : null;
    const candCleanPhone = candExt?.primaryPhone || (candidate.sdt || '').replace(/\D/g, '');
    const candIsMobile = candExt ? candExt.isZaloEligible : /^0[35789]\d{8}$/.test(candCleanPhone);
    const candNameNorm = (candidate.nguoiDaiDien || '').trim().toLowerCase();

    // Tìm xem đã có đầu mối nào trong mergedContacts khớp không
    const matchIdx = mergedContacts.findIndex(ct => {
      const ctExt = ct.sdt ? extractVietnamesePhones(ct.sdt) : null;
      const ctCleanPhone = ctExt?.primaryPhone || (ct.sdt || '').replace(/\D/g, '');
      const ctIsMobile = ctExt ? ctExt.isZaloEligible : /^0[35789]\d{8}$/.test(ctCleanPhone);
      const ctNameNorm = (ct.nguoiDaiDien || '').trim().toLowerCase();

      // 1. Nếu cùng tên đại diện (chính xác) -> Khớp
      if (candNameNorm && ctNameNorm && candNameNorm === ctNameNorm) return true;

      // 2. Nếu cùng SĐT di động cá nhân -> Khớp 100% (cùng 1 cá nhân)
      if (candCleanPhone && ctCleanPhone && candCleanPhone === ctCleanPhone) {
        if (candIsMobile || ctIsMobile) return true;
        // 3. Nếu là số bàn công ty: chỉ khớp khi tên tương đồng (không phải 2 nhân viên khác nhau)
        if (calculateBusinessNameSimilarity(candNameNorm, ctNameNorm) > 0.4 || candNameNorm.includes(ctNameNorm) || ctNameNorm.includes(candNameNorm)) {
          return true;
        }
      }
      return false;
    });

    if (matchIdx !== -1) {
      // HỢP NHẤT ĐẦU MỐI TRÙNG LẶP (1 THẺ DUY NHẤT)
      const existing = mergedContacts[matchIdx];
      const sourceTag = secMaKh || 'Gộp';
      
      // Gộp nhãn nguồn gốc xuất xứ
      let branchInfo = existing.chiNhanh || master.chiNhanh || 'Trụ sở chính';
      if (!branchInfo.includes(sourceTag)) {
        if (branchInfo.includes('[Nguồn:')) {
          branchInfo = branchInfo.replace(/\[Nguồn:\s*([^\]]+)\]/, `[Nguồn: $1, ${sourceTag} (Đã hợp nhất trùng SĐT)]`);
        } else {
          branchInfo = `${branchInfo} [Nguồn: ${master.maKh || 'Master'}, ${sourceTag} (Đã hợp nhất trùng SĐT)]`;
        }
      }

      // Làm giàu thông tin còn thiếu
      const bestName = (existing.nguoiDaiDien && existing.nguoiDaiDien.length >= (candidate.nguoiDaiDien || '').length)
        ? existing.nguoiDaiDien
        : (candidate.nguoiDaiDien || existing.nguoiDaiDien);

      const bestRole = (existing.chucVu && existing.chucVu !== 'Đầu mối liên hệ' && existing.chucVu !== 'Liên hệ')
        ? existing.chucVu
        : (candidate.chucVu || existing.chucVu || 'Đại diện');

      mergedContacts[matchIdx] = {
        ...existing,
        nguoiDaiDien: bestName,
        chucVu: bestRole,
        email: existing.email || candidate.email || '',
        chiNhanh: branchInfo
      };
    } else {
      // BỔ SUNG ĐẦU MỐI ĐỘC LẬP MỚI
      const sourceTag = secMaKh || 'Gộp';
      mergedContacts.push({
        ...candidate,
        chiNhanh: `${candidate.chiNhanh || 'Trụ sở'} [Nguồn: ${sourceTag}]`
      });
    }
  };

  // Duyệt qua từng khách hàng phụ để trích xuất đầu mối và bảo toàn địa chỉ nhà xưởng/cơ sở
  secondaries.forEach(sec => {
    // Đầu mối từ primary fields của secondary
    if (sec.nguoiDaiDien || sec.sdt) {
      fuseOrAddContact({
        danhXung: 'Đại diện',
        nguoiDaiDien: sec.nguoiDaiDien || 'Đầu mối liên hệ',
        sdt: sec.sdt || '',
        chucVu: 'Đầu mối phụ trách',
        chiNhanh: sec.chiNhanh || 'Trụ sở'
      }, sec.maKh);
    }

    // Các đầu mối trong mảng contacts của secondary
    (sec.contacts || []).forEach(secContact => {
      fuseOrAddContact(secContact, sec.maKh);
    });

    // BẢO TOÀN ĐỊA CHỈ NHÀ XƯỞNG / CƠ SỞ CỦA SECONDARY THÀNH ĐIỂM GIAO HÀNG
    const trimmedSecAddress = sec.diaChi?.trim();
    if (trimmedSecAddress && trimmedSecAddress !== (master.diaChi || '').trim()) {
      const alreadyHasAddress = mergedContacts.some(ct => (ct.chiNhanh || '').includes(trimmedSecAddress));
      if (!alreadyHasAddress) {
        mergedContacts.push({
          danhXung: 'Xưởng / Cơ sở',
          nguoiDaiDien: sec.nguoiDaiDien || 'Bộ phận tiếp nhận xưởng',
          sdt: sec.sdt || '',
          chucVu: 'Địa điểm giao nhận xưởng',
          chiNhanh: `${trimmedSecAddress} [Nguồn: ${sec.maKh}]`
        });
      }
    }
  });

  // 2. Cập nhật Master Customer kèm danh sách mã gộp phục vụ Omni-Search Forwarding & Transitive Flattener
  const transitiveCodes: string[] = [];
  secondaries.forEach(s => {
    if (Array.isArray(s.mergedCustomerCodes)) {
      transitiveCodes.push(...s.mergedCustomerCodes);
    }
    if (Array.isArray((s as any).merged_customer_codes)) {
      transitiveCodes.push(...(s as any).merged_customer_codes);
    }
  });

  const mergedCustomerCodes = Array.from(new Set([
    ...(master.mergedCustomerCodes || (master as any).merged_customer_codes || []),
    ...secondaries.map(s => s.maKh).filter(Boolean),
    ...transitiveCodes
  ])) as string[];

  const updatedMasterCustomer: Customer = {
    ...master,
    contacts: mergedContacts,
    mergedCustomerCodes,
    ngayCapNhat: new Date().toISOString(),
    tags: Array.from(new Set([...(master.tags || []), 'CONSOLIDATED_MASTER'])),
  };

  // 3. Đánh dấu các khách hàng phụ là đã gộp
  const archivedSecondaryCustomers: Customer[] = secondaries.map(sec => ({
    ...sec,
    isArchived: true,
    mergedInto: master.id || master.maKh,
    ngayCapNhat: new Date().toISOString(),
    tags: Array.from(new Set([...(sec.tags || []), 'MERGED_SECONDARY'])),
  }));

  // 4. Tìm các Báo giá liên quan cần chuyển giao & Tính tổng giá trị
  const affectedQuotationIds: string[] = [];
  let totalQuotationValue = 0;
  quotations.forEach(q => {
    const isAff = (q.customerId && secondaryIds.includes(q.customerId)) || (q.maKh && secondaryIds.includes(q.maKh));
    if (isAff && q.id) {
      affectedQuotationIds.push(q.id);
      totalQuotationValue += (Number(q.totalAmount || (q as any).tongTien || (q as any).giaTriBaoGia) || 0);
    }
  });

  // 5. Tìm Hợp đồng liên quan & Tính tổng giá trị hợp đồng
  const affectedContractIds: string[] = [];
  let totalContractValue = 0;
  contracts.forEach(c => {
    const isAff = (c.customerId && secondaryIds.includes(c.customerId)) || (c.maKh && secondaryIds.includes(c.maKh));
    if (isAff && c.id) {
      affectedContractIds.push(c.id);
      totalContractValue += (Number(c.giaTriHopDong || (c as any).totalAmount || (c as any).tongGiaTri) || 0);
    }
  });

  // 6. Tìm Phiếu thu / Billing & Tính tổng tiền đã thu
  const affectedBillingIds: string[] = [];
  let totalBillingAmount = 0;
  billings.forEach(b => {
    const isAff = (b.customerId && secondaryIds.includes(b.customerId)) || (b.maKh && secondaryIds.includes(b.maKh));
    if (isAff && b.id) {
      affectedBillingIds.push(b.id);
      totalBillingAmount += (Number(b.soTien || (b as any).amount || (b as any).soTienThu) || 0);
    }
  });

  // 7. Tìm Phiếu giao hàng
  const affectedDeliveryIds: string[] = [];
  deliveries.forEach(d => {
    const isAff = (d.customerId && secondaryIds.includes(d.customerId)) || (d.maKh && secondaryIds.includes(d.maKh));
    if (isAff && d.id) {
      affectedDeliveryIds.push(d.id);
    }
  });

  return {
    masterCustomer: master,
    updatedMasterCustomer,
    archivedSecondaryCustomers,
    affectedQuotationIds,
    affectedContractIds,
    affectedBillingIds,
    affectedDeliveryIds,
    impactSummary: {
      quotationsCount: affectedQuotationIds.length,
      totalQuotationValue,
      contractsCount: affectedContractIds.length,
      totalContractValue,
      billingsCount: affectedBillingIds.length,
      totalBillingAmount,
      deliveriesCount: affectedDeliveryIds.length,
      contactsMergedCount: mergedContacts.length
    },
    auditSnapshot: {
      mergedAt: new Date().toISOString(),
      masterId: master.id || master.maKh,
      secondaryIds,
      previousSecondaryState: secondaries
    }
  };
}
