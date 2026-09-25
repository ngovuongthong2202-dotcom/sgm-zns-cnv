import { z } from 'zod';
import { ContractSchema } from '../../domain/schema/contract.schema';
import { QuotationSchema } from '../../domain/schema/quotation.schema';
import { PaymentSchema } from '../../domain/schema/payment.schema';
import { QUOTATION_LOAI, normalizeLoai } from '../../domain/enums/quotation-loai';
import { identifyDocument } from '../types/workflow-document.type';
import { ZnsStatusVO } from '../value-objects/ZnsStatusVO';

type Quotation = z.infer<typeof QuotationSchema>;
type Contract = z.infer<typeof ContractSchema>;
type Payment = z.infer<typeof PaymentSchema>;

export interface GatePolicyConfig {
  contractCreationGate?: 'BLOCK' | 'WARN' | 'OFF';
  paymentCreationGate?: 'BLOCK' | 'WARN' | 'OFF';
  deliveryCreationGate?: 'BLOCK' | 'WARN' | 'OFF';
}

export function canCreatePayment(
  source: Quotation | Contract | undefined | null,
  config?: GatePolicyConfig
): { allowed: boolean; reason?: string; warning?: string } {
  if (config?.paymentCreationGate === 'OFF') {
    return { allowed: true };
  }

  if (!source) return { allowed: false, reason: "Không tìm thấy nguồn tham chiếu." };

  const rec = source as Record<string, unknown>;
  const isContractExplicit = rec._collectionType === 'contracts' || (!!rec.soHopDong && !rec.paymentId && !rec.deliveryId);
  const isQuotationExplicit = !isContractExplicit && (rec._collectionType === 'quotations' || !!rec.soPhieuBaoGia || !!rec.tinhTrangBaoGia);

  let failReason: string | undefined;

  if (isContractExplicit) {
    const c = source as Contract;
    if (c.trangThaiGuiTinHopDong && !ZnsStatusVO.isSuccess(c.trangThaiGuiTinHopDong as string) && config?.paymentCreationGate === 'BLOCK') {
      failReason = "Phải gửi ZNS Hợp đồng THÀNH CÔNG trước khi tạo Thanh toán.";
    }
  } else if (isQuotationExplicit) {
    const loai = normalizeLoai((rec.loai || rec.phanLoai || rec.loaiBaoGia) as string);
    if (loai === QUOTATION_LOAI.MAY) {
      failReason = "Báo giá Máy phải được khởi tạo Hợp đồng trước khi tạo Thanh toán.";
    } else {
      // BG Vật tư và BG Dịch vụ có thể đi thẳng đến thanh toán
      if (rec.trangThaiGuiTinBaoGia && !ZnsStatusVO.isSuccess(rec.trangThaiGuiTinBaoGia as string) && config?.paymentCreationGate === 'BLOCK') {
        return { allowed: true, warning: "Báo giá này chưa được gửi ZNS thành công." };
      }
      return { allowed: true };
    }
  } else {
    const identified = identifyDocument(source);
    if (identified?.kind === 'quotation') {
      const q = identified.data;
      if (normalizeLoai(q.loai) === QUOTATION_LOAI.MAY) {
        failReason = "Báo giá Máy phải được khởi tạo Hợp đồng trước khi tạo Thanh toán.";
      } else {
        return { allowed: true };
      }
    } else if (identified?.kind === 'contract') {
      return { allowed: true };
    }
  }

  if (failReason) {
    if (config?.paymentCreationGate === 'WARN') {
      return { allowed: true, warning: failReason };
    }
    return { allowed: false, reason: failReason };
  }

  return { allowed: true };
}

export function canCreateDelivery(
  payment: Payment | undefined | null,
  config?: GatePolicyConfig
): { allowed: boolean; reason?: string; warning?: string } {
  if (config?.deliveryCreationGate === 'OFF') {
    return { allowed: true };
  }

  if (!payment) return { allowed: false, reason: "Không tìm thấy thanh toán." };

  if (!ZnsStatusVO.isSuccess(payment.trangThaiGuiTinThanhToan)) {
    const failReason = "Phải gửi ZNS Thanh toán THÀNH CÔNG trước khi tạo Giao hàng.";
    if (config?.deliveryCreationGate === 'WARN') {
      return { allowed: true, warning: failReason };
    }
    return { allowed: false, reason: failReason };
  }

  return { allowed: true };
}

export function canCreateContract(
  source: Quotation | undefined | null,
  config?: GatePolicyConfig
): { allowed: boolean; reason?: string; warning?: string } {
  if (config?.contractCreationGate === 'OFF') {
    return { allowed: true };
  }

  if (!source) return { allowed: false, reason: "Không tìm thấy báo giá." };

  if (!ZnsStatusVO.isSuccess(source.trangThaiGuiTinBaoGia)) {
    const failReason = "Phải gửi ZNS Báo giá THÀNH CÔNG trước khi tạo Hợp đồng.";
    if (config?.contractCreationGate === 'WARN') {
      return { allowed: true, warning: failReason };
    }
    return { allowed: false, reason: failReason };
  }

  return { allowed: true };
}

