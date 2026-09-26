import React from 'react';
import { UseFormSetValue, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { ContractSchema, Contract } from '@/src/domain/schema/contract.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { computeLineItem, aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

export const FormSchema = ContractSchema.extend({
  ngayKy: z.string().min(1, 'Ngày ký hợp đồng là bắt buộc'),
  soNgayDuKienHoanThanh: z.number().int().min(1, 'Kỳ hạn hoàn thành tối thiểu phải là 1 ngày').default(30).catch(30),
});

export type FormValues = z.input<typeof FormSchema>;

export const STEPS = ['Thông tin chung', 'Sản phẩm & Máy', 'Tài chính', 'Điều khoản', 'Xem trước'];

export function getInitialContractFormValues(contract: any, draft: any): any {
  const source = contract || draft;
  if (source) {
    const rawProducts = Array.isArray(source.products) ? source.products : [];
    const products = rawProducts.map(computeLineItem);
    const aggs = aggregateProducts(products);
    const subTotal = aggs.totalGross > 0 ? aggs.totalGross : (Number(source.subTotal) || 0);
    const discountAmount = aggs.totalDiscount > 0 ? aggs.totalDiscount : (Number(source.discountAmount) || 0);
    const vatAmount = aggs.totalVat > 0 ? aggs.totalVat : (Number(source.vatAmount) || 0);
    const totalAmount = aggs.totalAfterTax > 0 ? aggs.totalAfterTax : (Number(source.totalAmount) || 0);
    const discountRate = subTotal > 0 ? Number(((discountAmount / subTotal) * 100).toFixed(2)) : (Number(source.discountRate) || 0);
    const vatRate = aggs.totalBeforeTax > 0 ? Math.round((vatAmount / aggs.totalBeforeTax) * 100) : (Number(source.vatRate) || 0);

    return {
      ...source,
      products,
      subTotal,
      discountAmount,
      discountRate,
      vatAmount,
      vatRate,
      totalAmount,
      slMay: Number(source.slMay) || products.reduce((sum: number, p: any) => sum + (Number(p.quantity) || 0), 0) || 1
    };
  }

  return {
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
  setValue('nguoiPhuTrach', q.nguoiPhuTrach || '');

  const healedProducts = Array.isArray(q.products) ? q.products.map(computeLineItem) : [];
  const aggs = aggregateProducts(healedProducts);

  const subTotal = aggs.totalGross > 0 ? aggs.totalGross : (Number(q.subTotal) || 0);
  const discountAmount = aggs.totalDiscount > 0 ? aggs.totalDiscount : (Number(q.discountAmount) || 0);
  const vatAmount = aggs.totalVat > 0 ? aggs.totalVat : (Number(q.vatAmount) || 0);
  const totalAmount = aggs.totalAfterTax > 0 ? aggs.totalAfterTax : (Number(q.totalAmount) || 0);
  const discountRate = subTotal > 0 ? Number(((discountAmount / subTotal) * 100).toFixed(2)) : (Number(q.discountRate) || 0);
  const vatRate = aggs.totalBeforeTax > 0 ? Math.round((vatAmount / aggs.totalBeforeTax) * 100) : (Number(q.vatRate) || 0);
  const totalQty = healedProducts.reduce((sum: number, p: any) => sum + (Number(p.quantity) || 0), 0);

  setValue('slMay', totalQty > 0 ? totalQty : (Number(q.slMay) || 1));
  setValue('subTotal', subTotal);
  setValue('vatRate', vatRate);
  setValue('vatAmount', vatAmount);
  setValue('discountRate', discountRate);
  setValue('discountAmount', discountAmount);
  setValue('totalAmount', totalAmount);
  
  if (healedProducts.length > 0) {
    setValue('products', JSON.parse(JSON.stringify(healedProducts)));
    const initialDelivered: Record<string, number> = {};
    healedProducts.forEach((p: any, index: number) => { 
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
