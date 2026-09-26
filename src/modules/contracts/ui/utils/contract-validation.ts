import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { notify } from '@/src/shared/utils/notify';

export async function validateContractSubmit({
  data,
  contract,
  user,
  quotations,
  existingContractsForQuo,
  allContracts = []
}: {
  data: any;
  contract: Contract | null;
  user: any;
  quotations: Quotation[];
  existingContractsForQuo: any[];
  allContracts?: any[];
}): Promise<boolean> {
  // NEXUS Uniqueness Gate: Chống trùng số hợp đồng tuyệt đối
  if (data.soHopDong && Array.isArray(allContracts)) {
    const normCode = (data.soHopDong || '').toString().trim().toUpperCase();
    const duplicate = allContracts.find((c: any) => {
      if (contract && (c.id === contract.id || c.soHopDong === contract.soHopDong)) return false;
      const cCode = (c.soHopDong || c.so_hop_dong || c.maHopDong || '').toString().trim().toUpperCase();
      return cCode === normCode && !c.deletedAt && !c.deleted_at;
    });
    if (duplicate) {
      notify.error(`Số hợp đồng "${data.soHopDong}" đã tồn tại trên hệ thống (của khách hàng: ${duplicate.tenKhachHang || 'khác'}). Vui lòng kiểm tra lại!`);
      return false;
    }
  }

  if (!contract) {
    const { checkWorkflowGate } = await import('@/src/domain/workflow-ui');
    const canProceed = await checkWorkflowGate('CONTRACT', data.quotationId, undefined, user?.email);
    if (!canProceed) return false;
  }

  const q = quotations.find(x => x.id === data.quotationId);
  const parentQuo = q || quotations.find(quo => quo.id === data.quotationId);
  if (parentQuo && parentQuo.ngayHetHan && data.ngayKy) {
     const expiredDate = new Date(parentQuo.ngayHetHan);
     const signDate = new Date(data.ngayKy);
     if (signDate > expiredDate) {
         notify.error(`Ngày ký kết hợp đồng (${signDate.toLocaleDateString('vi-VN')}) không được vượt quá ngày hết hạn của báo giá (${expiredDate.toLocaleDateString('vi-VN')}).`);
         return false;
     }
  }

  if (parentQuo && Array.isArray(parentQuo.products)) {
    const pQuoProducts = parentQuo.products;
    for (const p of (Array.isArray(data.products) ? data.products : [])) {
      const quoProd = pQuoProducts.find((qp: any) => (qp.productId && qp.productId === p.productId) || (qp.productName === p.productName)); 
      if (quoProd) {
        const consumed = existingContractsForQuo.reduce((acc: number, c: any) => { 
            const cpProducts = Array.isArray(c.products) ? c.products : [];
            const cp = cpProducts.find((cpp: any) => (cpp.productId && cpp.productId === p.productId) || (cpp.productName === p.productName)); 
            return acc + (cp?.quantity || 0);
        }, 0);

        if (consumed + p.quantity > quoProd.quantity) {
          notify.error(`Sản phẩm "${p.productName}" vượt quá hạn mức phân bổ trong báo giá (Số lượng còn lại khả dụng: ${quoProd.quantity - consumed})`);
          return false;
        }
      }
    }
  }
  return true;
}
