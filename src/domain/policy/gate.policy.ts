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

  const identified = identifyDocument(source);
  let failReason: string | undefined;

  if (identified?.kind === 'quotation') {
    const q = identified.data;
    if (normalizeLoai(q.loai) === QUOTATION_LOAI.MAY) {
      failReason = "Báo giá Máy phải được khởi tạo Hợp đồng trước khi tạo Thanh toán.";
    } else if (!ZnsStatusVO.isSuccess(q.trangThaiGuiTinBaoGia)) {
      failReason = "Phải gửi ZNS Báo giá THÀNH CÔNG trước khi tạo Thanh toán.";
    }
  } else if (identified?.kind === 'contract') {
    const c = identified.data;
    if (!ZnsStatusVO.isSuccess(c.trangThaiGuiTinHopDong as string)) {
      failReason = "Phải gửi ZNS Hợp đồng THÀNH CÔNG trước khi tạo Thanh toán.";
    }
  } else {
    // Fallback nếu không xác định được loại nhưng có trường ZNS
    const rec = source as Record<string, unknown>;
    if (rec.soHopDong) {
      if (!ZnsStatusVO.isSuccess(rec.trangThaiGuiTinHopDong as string)) {
        failReason = "Phải gửi ZNS Hợp đồng THÀNH CÔNG trước khi tạo Thanh toán.";
      }
    } else {
      if (normalizeLoai(rec.loai as string) === QUOTATION_LOAI.MAY) {
        failReason = "Báo giá Máy phải được khởi tạo Hợp đồng trước khi tạo Thanh toán.";
      } else if (!ZnsStatusVO.isSuccess(rec.trangThaiGuiTinBaoGia as string)) {
        failReason = "Phải gửi ZNS Báo giá THÀNH CÔNG trước khi tạo Thanh toán.";
      }
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

