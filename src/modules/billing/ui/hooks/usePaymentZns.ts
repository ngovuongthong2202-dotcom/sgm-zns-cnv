import { useState } from 'react';
import { Payment } from '@/src/domain/schema/payment.schema';
import { notify } from '@/src/shared/utils/notify';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { calculateFormattedPaymentPoints, calculateFormattedCustomerCumulativePoints } from '@/src/modules/billing/domain/loyaltyEngine';
import { formatZnsDate } from '@/src/shared/utils/formatDate';

export function usePaymentZns(
  confirm: (opts: import('@/src/design-system/Confirm').ConfirmOptions) => Promise<boolean>, 
  refresh: () => void,
  userRole?: string
) {
  const [znsPreviewPayment, setZnsPreviewPayment] = useState<{
    payment: Payment;
    customer?: any;
    phone?: string;
    messageType: ZnsMessageType;
    installmentIndex?: number;
    availablePhones?: Array<{ phone: string; label?: string; isPrimary?: boolean }>;
  } | null>(null);

  const handleSendZns = async (payment: Payment, installmentIndex?: number) => {
    let phone = payment.sdt;
    let customerName = payment.tenKhachHang;
    let cSnap: any = null;
    
    if (payment.customerId) {
      cSnap = await repositoryFactory.get<any>('customers').getById(payment.customerId);
      if (cSnap) {
        phone = phone || cSnap.sdt || cSnap.soDienThoai || cSnap.contacts?.[0]?.sdt;
        customerName = customerName || cSnap.tenKhachHang;
      }
    }

    const rawPhonesPool = [
      payment.sdt,
      cSnap?.sdt,
      cSnap?.sdtPhu,
      cSnap?.soZaloMacDinh,
      ...(Array.isArray(cSnap?.danhSachSdt) ? cSnap.danhSachSdt : []),
      ...(Array.isArray(cSnap?.contacts) ? cSnap.contacts.map((ct: any) => ct?.sdt) : [])
    ].filter(Boolean).join(' ');

    const extracted = extractVietnamesePhones(rawPhonesPool, (payment as any).diaChi || cSnap?.diaChi);
    const availableMobiles: Array<{ cleaned: string; formatted: string; carrier?: string }> = [];
    const seenMob = new Set<string>();
    extracted.mobilePhones.forEach(m => {
      if (!seenMob.has(m.cleaned)) {
        seenMob.add(m.cleaned);
        availableMobiles.push(m);
      }
    });

    const targetPhone = phone || availableMobiles[0]?.cleaned || '';
    
    const enrichedPayment: any = { ...payment };
    
    // 1. Luôn tra cứu Contract nếu có contractId hoặc soHopDong
    if (payment.contractId || (payment.soHopDong && !enrichedPayment.products?.length)) {
      const contract = payment.contractId 
        ? await repositoryFactory.get<any>('contracts').getById(payment.contractId)
        : (await repositoryFactory.get<any>('contracts').list({ limit: 10 })).find((c: any) => c.soHopDong === payment.soHopDong);
      
      if (contract) {
        enrichedPayment.soDonHang = enrichedPayment.soDonHang || contract.soDonHang || '';
        enrichedPayment.soHopDong = enrichedPayment.soHopDong || contract.soHopDong || '';
        if (!enrichedPayment.products || enrichedPayment.products.length === 0) {
          enrichedPayment.products = contract.products || [];
        }
        if (!enrichedPayment.slMay || enrichedPayment.slMay === 0) {
          enrichedPayment.slMay = contract.slMay || 0;
        }
        if (!enrichedPayment.soLuong || enrichedPayment.soLuong === 0) {
          enrichedPayment.soLuong = contract.slMay || contract.soLuong || 0;
        }
        if (!enrichedPayment.dvt) {
          enrichedPayment.dvt = contract.dvt || (contract.products?.[0]?.unit) || 'Máy';
        }
      }
    }

    // 2. Luôn tra cứu Quotation nếu có quotationId hoặc soPhieuBaoGia
    if (payment.quotationId || (payment.soPhieuBaoGia && (!enrichedPayment.products?.length || !enrichedPayment.soLuong))) {
      const quotation = payment.quotationId 
        ? await repositoryFactory.get<any>('quotations').getById(payment.quotationId)
        : (await repositoryFactory.get<any>('quotations').list({ limit: 10 })).find((q: any) => q.soPhieuBaoGia === payment.soPhieuBaoGia);
      
      if (quotation) {
        enrichedPayment.soHopDong = enrichedPayment.soHopDong || quotation.soHopDong || '';
        enrichedPayment.soDonHang = enrichedPayment.soDonHang || quotation.soDonHang || quotation.soPhieuBaoGia || '';
        enrichedPayment.soPhieuBaoGia = enrichedPayment.soPhieuBaoGia || quotation.soPhieuBaoGia || '';
        if (!enrichedPayment.products || enrichedPayment.products.length === 0) {
          enrichedPayment.products = quotation.products || [];
        }
        if (!enrichedPayment.slMay || enrichedPayment.slMay === 0) {
          enrichedPayment.slMay = quotation.slMay || 0;
        }
        if (!enrichedPayment.soLuong || enrichedPayment.soLuong === 0) {
          const prodSum = Array.isArray(quotation.products) 
            ? quotation.products.reduce((sum: number, p: any) => sum + (Number(p.quantity) || 0), 0)
            : 0;
          enrichedPayment.soLuong = quotation.slMay || quotation.soLuong || prodSum || 1;
        }
        if (!enrichedPayment.dvt) {
          enrichedPayment.dvt = quotation.dvt || (quotation.products?.[0]?.unit) || (quotation.products?.[0]?.dvt) || 'Cái';
        }
      }
    }

    // 3. Fallback tính tổng số lượng từ chính mảng products của payment nếu có
    if ((!enrichedPayment.soLuong || enrichedPayment.soLuong === 0) && Array.isArray(enrichedPayment.products) && enrichedPayment.products.length > 0) {
      enrichedPayment.soLuong = enrichedPayment.products.reduce((acc: number, p: any) => acc + (Number(p.quantity) || 0), 0);
      if (!enrichedPayment.dvt && enrichedPayment.products[0]?.unit) {
        enrichedPayment.dvt = enrichedPayment.products[0].unit;
      }
    }
    if (!enrichedPayment.soLuong) enrichedPayment.soLuong = enrichedPayment.slMay || 1;
    if (!enrichedPayment.dvt) enrichedPayment.dvt = 'Cái';

    // Nếu gửi cho từng đợt thu cụ thể
    if (installmentIndex !== undefined && Array.isArray(payment.cacDotThu) && payment.cacDotThu[installmentIndex]) {
      const inst = payment.cacDotThu[installmentIndex];
      enrichedPayment.soTien = inst.soTien || enrichedPayment.soTien;
      enrichedPayment.ngayThanhToan = inst.ngayThu || enrichedPayment.ngayThanhToan;
      enrichedPayment.phuongThucThanhToan = inst.phuongThucThanhToan || enrichedPayment.phuongThucThanhToan;
      if (inst.nguoiNop) enrichedPayment.tenNguoiNop = inst.nguoiNop;
    }

    // Enrich Loyalty & Payment Details for 2026 Template
    const allPaymentsSnap = await repositoryFactory.get<any>('payments').list({ limit: 500 }).catch(() => []);
    const mergedCodes = cSnap?.mergedCustomerCodes || [];
    const customerId = payment.customerId || cSnap?.id || cSnap?.maKh || '';

    const diemThanhToan = calculateFormattedPaymentPoints(Number(enrichedPayment.soTien || 0));
    const diemKhachHang = calculateFormattedCustomerCumulativePoints(customerId, allPaymentsSnap, mergedCodes);

    let loaiDon = 'Cung cấp Máy móc/Thiết Bị';
    const rawLoai = (payment as any).loai || (payment as any).loaiBaoGia || '';
    if (rawLoai.includes('Vật tư') || rawLoai.includes('VAT_TU')) {
      loaiDon = 'Cung cấp Vật Tư';
    } else if (rawLoai.includes('Dịch vụ') || rawLoai.includes('DICH_VU')) {
      loaiDon = 'Cung cấp giải pháp/dịch vụ';
    }

    const isFullyPaid = payment.tinhTrangThanhToan === 'Tất toán' || 
                        payment.tinhTrangThanhToan === 'ĐÃ THANH TOÁN' ||
                        payment.tinhTrangThanhToan === 'DA_THANH_TOAN' ||
                        Number(payment.congNoConLai || 0) <= 0;

    let defaultGhiChu = 'Thanh toán đợt hợp đồng';
    if (isFullyPaid) {
      defaultGhiChu = 'Tất toán 100% hợp đồng - Hoàn tất thanh toán';
    } else if (installmentIndex !== undefined) {
      const remainingDebt = Number(payment.congNoConLai || 0);
      defaultGhiChu = remainingDebt > 0 
        ? `Thanh toán đợt ${installmentIndex + 1} (Còn lại: ${new Intl.NumberFormat('vi-VN').format(remainingDebt)} đ)`
        : `Thanh toán đợt ${installmentIndex + 1}`;
    }

    const currentGhiChu = (installmentIndex !== undefined && Array.isArray(payment.cacDotThu) && payment.cacDotThu[installmentIndex]?.ghiChu)
      ? payment.cacDotThu[installmentIndex].ghiChu
      : (payment.ghiChu || defaultGhiChu);

    enrichedPayment.loaiDon = loaiDon;
    enrichedPayment.loai_don = loaiDon;
    enrichedPayment.ghiChu = currentGhiChu;
    enrichedPayment.ghi_chu = currentGhiChu;
    enrichedPayment.diemThanhToan = diemThanhToan;
    enrichedPayment.diem_thanh_toan = diemThanhToan;
    enrichedPayment.diemKhachHang = diemKhachHang;
    enrichedPayment.diem_khach_hang = diemKhachHang;
    enrichedPayment.maBaoGia = enrichedPayment.soPhieuBaoGia || '---';
    enrichedPayment.ma_bao_gia = enrichedPayment.maBaoGia;
    enrichedPayment.soPhieu = enrichedPayment.soHopDong || enrichedPayment.soPhieuBaoGia || '---';
    enrichedPayment.so_phieu = enrichedPayment.soPhieu;
    enrichedPayment.orderCode = enrichedPayment.soDonHang || '---';
    enrichedPayment.order_code = enrichedPayment.orderCode;
    enrichedPayment.nhanVien = payment.nguoiPhuTrach || 'Bộ phận Kế toán';
    enrichedPayment.nhan_vien = enrichedPayment.nhanVien;
    enrichedPayment.date = enrichedPayment.ngayThanhToan || formatZnsDate(new Date().toISOString());
    enrichedPayment.maTraCuu = enrichedPayment.soDonHang || enrichedPayment.soHopDong || enrichedPayment.soPhieuBaoGia || '';
    enrichedPayment.ma_tra_cuu = enrichedPayment.maTraCuu;

    // Hợp nhất toàn bộ thanh toán (Công nợ và Tất toán) vào Mẫu ZNS 646935 chuẩn Zalo OA 2026
    const messageType = 'THANH_TOAN_XAC_NHAN';

    setZnsPreviewPayment({
      payment: enrichedPayment,
      customer: cSnap,
      phone: targetPhone,
      messageType,
      installmentIndex,
      availablePhones: availableMobiles.map((m, idx) => ({
        phone: m.cleaned,
        label: `${m.formatted} (${m.carrier || 'Di động'})`,
        isPrimary: idx === 0
      }))
    });
  };

  return { handleSendZns, znsPreviewPayment, setZnsPreviewPayment };
}
