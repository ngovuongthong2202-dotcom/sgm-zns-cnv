import React from 'react';
import { UseFormSetValue, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { ContractSchema, Contract } from '@/src/domain/schema/contract.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { getProductItemKey } from '@/src/shared/utils/product-key';

export const FormSchema = ContractSchema.extend({
  ngayKy: z.string().min(1, 'Ngày ký hợp đồng là bắt buộc'),
  soNgayDuKienHoanThanh: z.number().int().min(1, 'Kỳ hạn hoàn thành tối thiểu phải là 1 ngày').default(30).catch(30),
});

export type FormValues = z.input<typeof FormSchema>;

export const STEPS = ['Thông tin chung', 'Sản phẩm & Máy', 'Tài chính', 'Điều khoản', 'Xem trước'];

export function getInitialContractFormValues(contract: any, draft: any): any {
  return contract || draft || {
    trangThaiGuiTinHopDong: EntityZnsStatus.CHUA_GUI,
    ngayKy: new Date().toISOString().split('T')[0],
    soHopDong: `HD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    soNgayDuKienHoanThanh: 30,
    danhSachMaMay: [],
    soDonHang: '',
    dvt: 'Máy',
    slMay: 1,
    nguoiDaiDien: '',
    nguoiPhuTrach: '',
    products: [],
    deliveredQuantities: {}
  };
}

export function applyQuotationToContractForm(setValue: UseFormSetValue<FormValues>, q: any) {
  setValue('customerId', q.customerId || '');
  setValue('maKh', q.maKh || '');
  setValue('tenKhachHang', q.tenKhachHang || '');
  setValue('sdt', q.sdt || '');
  setValue('nguoiDaiDien', q.nguoiDaiDien || '');
  setValue('soPhieuBaoGia', q.soPhieuBaoGia || '');
  setValue('ngayBaoGia', q.ngayBaoGia || '');
  setValue('loai', q.loai || '');
  setValue('dvt', (q as any).dvt || 'Máy');
  setValue('slMay', Number(q.slMay) || 1);
  setValue('nguoiPhuTrach', q.nguoiPhuTrach || '');
  
  setValue('subTotal', q.subTotal || 0);
  setValue('vatRate', q.vatRate || 0);
  setValue('vatAmount', q.vatAmount || 0);
  setValue('discountRate', q.discountRate || 0);
  setValue('discountAmount', q.discountAmount || 0);
  setValue('totalAmount', q.totalAmount || 0);
  
  if (q.products && q.products.length > 0) {
    setValue('products', JSON.parse(JSON.stringify(q.products)));
    const initialDelivered: Record<string, number> = {};
    q.products.forEach((p: any, index: number) => { 
      const itemKey = getProductItemKey(p, index);
      if (itemKey) initialDelivered[itemKey] = 0;
    });
    setValue('deliveredQuantities', initialDelivered);
  }
}

export function computeEstimatedCompletionDate(ngayKy: string, soNgayDuKienHoanThanh: number): string {
  if (!ngayKy || !soNgayDuKienHoanThanh) return '';
  const date = new Date(ngayKy);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + soNgayDuKienHoanThanh);
  return date.toLocaleDateString('vi-VN');
}

export function filterExistingContractsForQuo(selectedQuoId: string, contracts: Contract[], currentContractId?: string): Contract[] {
  if (!selectedQuoId) return [];
  return contracts.filter((c: Contract) => c.quotationId === selectedQuoId && c.id !== currentContractId);
}

export function ContractHiddenInputs({ register }: { register: UseFormRegister<FormValues> }) {
  return (
    <div className="opacity-0 h-0 overflow-hidden pointer-events-none absolute">
      <input type="hidden" {...register('customerId')} />
      <input type="hidden" {...register('soPhieuBaoGia')} />
      <input type="hidden" {...register('subTotal')} />
      <input type="hidden" {...register('totalAmount')} />
      <input type="hidden" {...register('tenKhachHang')} />
      <input type="hidden" {...register('sdt')} />
      <input type="hidden" {...register('maKh')} />
      <input type="hidden" {...register('nguoiDaiDien')} />
      <input type="hidden" {...register('slMay')} />
      <input type="hidden" {...register('loai')} />
      <input type="hidden" {...register('dvt')} />
    </div>
  );
}
