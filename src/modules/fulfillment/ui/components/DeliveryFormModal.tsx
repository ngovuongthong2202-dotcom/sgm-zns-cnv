/* eslint-disable max-lines */
import { getEntityDisplayLabel } from '@/src/domain/mapping/entity-label';
import React from 'react';
import { notify } from '@/src/shared/utils/notify';
import { useAuth } from '@/src/modules/iam';
import { Clock, Package } from 'lucide-react';
import { MachineCodeChipInput } from '@/src/modules/contracts/ui/components/MachineCodeChipInput';
import { AsyncSearchableSelect } from '@/src/design-system/primitives/AsyncSearchableSelect';
import ProductListInput from '@/src/widgets/ProductListInput';
import { Button } from '@/src/design-system/Button';
import { canCreateDelivery } from '@/src/domain/policy/gate.policy';
import { PaymentHoverCard } from '@/src/modules/billing/ui/components/PaymentHoverCard';
import {
  DeliverySourceCard,
  DeliveryInfoSection,
  DeliveryTransportSection,
  DeliveryHiddenInputs
} from './DeliveryFormSections';
import { checkA5Policy } from '@/src/modules/iam';
import { EntityLockWarning } from '@/src/widgets/EntityLockWarning';
import { handleEnterToTab } from '@/src/shared/utils/formNavigation';
import { normalizeDeliveryFormValues, validateDeliveryBusinessRules } from './DeliveryFormHelpers';
import { useDeliveryForm } from '../hooks/useDeliveryForm';

export function DeliveryFormModal({ delivery, payments, contracts, quotations, customers, deliveries, nguoiPhuTrachList, onClose, onSave }: any) {
  const { user, userData } = useAuth();
  const { canEdit, reason: lockReason } = checkA5Policy(user, userData, delivery);

  const {
    register,
    handleSubmit,
    watch,
    watchAll,
    setValue,
    errors,
    isSubmitting,
    isLockedByOther,
    setIsLockedByOther,
    draft,
    clearDraft,
    lastSavedAt,
    maxQuantities,
    deliveryProducts,
    selectedPaymentId,
    populateFromPayment,
    lookupExportSale,
    isLookingUpExportSale,
  } = useDeliveryForm(delivery, payments, contracts, quotations, customers);

  // Đồng bộ hóa tức thời 100% với danh sách payments đang hiển thị ở trang Thanh toán
  const enrichedPayments = React.useMemo(() => {
    if (!Array.isArray(payments) || payments.length === 0) return [];
    
    const contractsMap = new Map((contracts || []).map((c: any) => [c.id, c]));
    const quoMap = new Map((quotations || []).map((q: any) => [q.id, q]));

    const deliveriesByPayment = new Map<string, any[]>();
    (deliveries || []).forEach((d: any) => {
      if (!d.deletedAt && !d.deleted_at && d.tinhTrangGiaoHang !== 'HỦY' && d.tinhTrangGiaoHang !== 'Hủy' && d.paymentId) {
        const list = deliveriesByPayment.get(d.paymentId) || [];
        list.push(d);
        deliveriesByPayment.set(d.paymentId, list);
      }
    });

    return payments
      .filter((p: any) => !p.deletedAt && !p.deleted_at)
      .map((p: any) => {
        const contractData = p.contractId ? contractsMap.get(p.contractId) : (contracts || []).find((c: any) => c.soHopDong === p.soHopDong);
        const quotationData = p.quotationId ? quoMap.get(p.quotationId) : (quotations || []).find((q: any) => q.soPhieuBaoGia === p.soPhieuBaoGia);
        const soCT = p.contractId ? `HĐ: ${contractData?.soHopDong || p.soHopDong}` : (p.quotationId ? `BG: ${quotationData?.soPhieuBaoGia || p.soPhieuBaoGia}` : 'Không có');

        const source = (p.contractId ? contractData : quotationData) || p;
        const productList = Array.isArray(source?.products) && source.products.length > 0 
          ? source.products 
          : (Array.isArray(p.products) ? p.products : []);

        let totalContracted = 0;
        let totalDelivered = 0;
        let _isFullyDelivered = false;

        if (productList.length > 0) {
          const linkedDeliveries = deliveriesByPayment.get(p.id) || deliveriesByPayment.get(p.paymentId) || [];
          const actualDeliveredMap: Record<string, number> = {};

          linkedDeliveries.forEach(d => {
            (d.products || []).forEach((dp: any, idx: number) => {
              const key = dp.id || dp.productId || dp.productName || String(idx);
              actualDeliveredMap[key] = (actualDeliveredMap[key] || 0) + Number(dp.quantity || 0);
            });
          });

          productList.forEach((cp: Record<string, unknown>, index: number) => {
            const key = (cp.id as string) || (cp.productId as string) || (cp.productName as string) || String(index);
            const q = Number(cp.quantity || 0);
            totalContracted += q;
            const fromSource = Number(((source?.deliveredQuantities || {}) as Record<string, number>)[key] || 0);
            const fromDeliveries = Number(actualDeliveredMap[key] || 0);
            totalDelivered += Math.max(fromSource, fromDeliveries);
          });

          if (totalDelivered >= totalContracted && totalContracted > 0) {
            _isFullyDelivered = true;
          }
        }

        const pStatus = (p.tinhTrangThanhToan as string || '').toLowerCase().trim();
        const _isChuaTT = pStatus === 'chưa tt' || pStatus === 'chua tt' || pStatus === 'chưa thanh toán';

        return {
          ...p,
          _soCT: soCT,
          _isFullyDelivered,
          _isChuaTT,
          _sourceObj: source || null,
          _totalContracted: totalContracted,
          _totalDelivered: totalDelivered
        };
      })
      .filter((p: any) => {
        // Nếu đã giao đủ số lượng thì không hiển thị cho chọn / tạo nữa (trừ khi đang sửa chính phiếu giao hàng này)
        if (p._isFullyDelivered) {
          const isCurrentSelected = delivery?.paymentId && (delivery.paymentId === p.id || delivery.paymentId === p.paymentId);
          if (!isCurrentSelected) return false;
        }
        return true;
      });
  }, [payments, contracts, quotations, deliveries, delivery?.paymentId]);

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col h-screen overflow-hidden">
      <div className="bg-slate-50 flex flex-col h-full w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header toolbar */}
        <div className="bg-slate-900 flex items-center justify-between px-6 py-3.5 shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white">
                <Clock size={16} />
             </div>
             <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{delivery ? 'Hiệu chỉnh Lệnh Giao Hàng' : 'Lập Phiếu Giao Hàng & Vận Chuyển'}</h2>
                <div className="text-2xs text-slate-500 font-semibold flex items-center gap-2">
                   <span>Xác nhận lịch trình bàn giao & Kích hoạt ZNS theo dõi đơn</span>
                </div>
             </div>
          </div>
          <Button 
             aria-label="Đóng"  
             onClick={onClose} 
             className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors border-none"
             variant="ghost"
          >
             <span className="text-xl">&times;</span>
          </Button>
        </div>
        
        {!canEdit && (
          <div className="px-6 pt-3 shrink-0">
            <div className="bg-orange-50 text-orange-800 p-3 flex items-center gap-2 text-sm border border-orange-200 rounded-lg">
              <Package size={16} />
              <span>{lockReason}</span>
            </div>
          </div>
        )}

        {delivery?.id && (
          <div className="px-6 pt-3 shrink-0">
             <EntityLockWarning entityType="deliveries" entityId={delivery?.id} onLockStateChange={setIsLockedByOther} />
          </div>
        )}

        {/* 1-Screen Scrollable Body */}
        <form id="deliveryForm" onKeyDown={handleEnterToTab} onSubmit={handleSubmit(async (data: any) => { 
          // normalization
          data = normalizeDeliveryFormValues(data);

          const { valid, error } = validateDeliveryBusinessRules(data, payments, maxQuantities, delivery);
          if (!valid) {
            notify.error(error as string);
            return;
          }

          if (!delivery) {
            const { checkWorkflowGate } = await import('@/src/domain/workflow-ui');
            const canProceed = await checkWorkflowGate('DELIVERY', data.paymentId, undefined, user?.email);
            if (!canProceed) return;
          }

          onSave(data);
          clearDraft();
        }, (formErrors) => {
          const FIELD_LABELS: Record<string, string> = {
            deliveryId: 'Mã giao hàng',
            soPhieuXuat: 'Số phiếu xuất',
            donViVanChuyen: 'Đơn vị VC',
            ngayGiaoMay: 'Ngày giao',
            products: 'Sản phẩm',
          };
          const errorList = Object.keys(formErrors).map(k => FIELD_LABELS[k] || k).join(', ');
          notify.error(`Vui lòng kiểm tra: ${errorList}`);
          
          const firstErrorKey = Object.keys(formErrors)[0];
          const el = document.querySelector(`[name="${firstErrorKey}"]`) || document.querySelector(`[id="${firstErrorKey}"]`);
          if (el && (el as any).scrollIntoView) {
            (el as any).scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => (el as HTMLElement).focus?.(), 50);
          }
          console.error("Form validation errors:", formErrors);
        })} className="flex-1 overflow-y-auto w-full px-6 lg:px-8 py-8 pb-32 scrollbar-thin">
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Col: Source Data & Delivery Info */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Clock size={14} /> 1. CĂN CỨ XUẤT KHO
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-1.5 z-20 relative">
                    <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1 flex justify-between items-center">
                      <span>Chứng từ Thanh toán tham chiếu <span className="text-red-700">*</span></span>
                      {(() => {
                        const selectedPayment = payments?.find((p: any) => p.id === selectedPaymentId);
                        if (!selectedPayment) return null;
                        return (
                          <PaymentHoverCard
                            payment={selectedPayment}
                            contracts={contracts || []}
                            quotations={quotations || []}
                            deliveries={deliveries || []}
                          >
                            <span className="text-blue-600 hover:text-blue-700 font-bold text-2xs cursor-pointer bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                              Xem chi tiết thanh toán 🛈
                            </span>
                          </PaymentHoverCard>
                        );
                      })()}
                    </label>
                    <AsyncSearchableSelect
                      collection="payments"
                      options={enrichedPayments}
                      value={watch('paymentId') || ''}
                      onChange={(val, doc) => {
                        setValue('paymentId', val, { shouldValidate: true });
                        if (doc) {
                          populateFromPayment(doc);
                        }
                      }}
                      filterOption={(p: any) => {
                        // Loại trừ phiếu thu đã bị xóa
                        if (p.deletedAt || p.deleted_at) return false;
                        if (p._isFullyDelivered) {
                          const isCurrentSelected = delivery?.paymentId && (delivery.paymentId === p.id || delivery.paymentId === p.paymentId);
                          if (!isCurrentSelected) return false;
                        }
                        return true;
                      }}
                      isOptionDisabled={(p: any) => {
                         const gateResult = canCreateDelivery(p);
                         if (!gateResult.allowed) return { disabled: true, reason: gateResult.reason };
                         if (p._isFullyDelivered) {
                           return { disabled: true, reason: 'Đã giao đủ 100% số lượng' };
                         }
                         return { disabled: false };
                      }}
                      renderOption={(p: any) => ({
                        label: getEntityDisplayLabel('payment', p), 
                        subLabel: p.tenKhachHang
                      })}
                      renderItemWrapper={(p: any, children) => (
                        <PaymentHoverCard
                          payment={p}
                          contracts={contracts || []}
                          quotations={quotations || []}
                          deliveries={deliveries || []}
                        >
                          {children}
                        </PaymentHoverCard>
                      )}
                      placeholder="Tìm theo Mã KH, Tên, Số GD..."
                      error={errors.paymentId?.message as string | undefined}
                    />
                  </div>

                  {selectedPaymentId && (
                    <DeliverySourceCard
                      soHopDong={watch('soHopDong')}
                      soDonHang={watch('soDonHang')}
                      tenKhachHang={watch('tenKhachHang')}
                      tinhTrangThanhToan={watch('tinhTrangThanhToan')}
                      paymentId={selectedPaymentId}
                      sdt={watch('sdt')}
                    />
                  )}
                </div>
              </section>

              <DeliveryInfoSection
                register={register}
                errors={errors}
                nguoiPhuTrachList={nguoiPhuTrachList}
                onLookupExportSale={lookupExportSale}
                isLookingUpExportSale={isLookingUpExportSale}
              />
            </div>

            {/* Right Col: Transport & Cross-check */}
            <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
              <DeliveryTransportSection
                register={register}
                errors={errors}
              />

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <h3 className="text-2xs font-bold text-slate-900 uppercase tracking-widest">
                    Thông tin rà soát chéo
                  </h3>
                </div>
                <div className="flex flex-col gap-3 text-xs font-semibold text-slate-700">
                   <div>
                     <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Đối tác nhận hàng</span>
                     <p className="text-slate-950 text-sm font-bold text-balance">{watchAll.tenKhachHang || '---'}</p>
                     <p className="mt-0.5">Mã Số CRM: <span className="font-mono text-slate-800 font-bold">{watchAll.maKh || '---'}</span></p>
                   </div>
                   <div className="pt-2 border-t border-slate-100">
                     <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Chứng từ liên quan</span>
                     <p>Số HĐ: <span className="font-mono text-slate-850 font-bold">{watchAll.soHopDong || '---'}</span></p>
                     <p className="mt-0.5">Liên kết Thanh toán: <span className="font-mono text-slate-800 font-bold">{watchAll.paymentId ? 'Có' : 'Chưa gắn'}</span></p>
                   </div>
                   <div className="pt-2 border-t border-slate-100">
                     <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Khoản phải thu</span>
                     <p>Trạng thái: <span className="text-slate-800 font-bold">{watchAll.tinhTrangThanhToan || '---'}</span></p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Products */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 mt-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                 DANH MỤC SẢN PHẨM BÀN GIAO
              </h3>
            </div>
            
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm pt-2">
              <div className="px-3 pb-2">
                <ProductListInput 
                  products={deliveryProducts} 
                  onChange={(newProducts) => setValue('products', newProducts)}
                  readOnly={true}
                  allowEditProductId={true}
                  hideAddRemove={true}
                  maxQuantities={maxQuantities}
                  showBaoHanh={true}
                  baseDateForBaoHanh={watch('ngayGiaoMay') as string}
                  showPrice={true}
                  showFinance={true}
                />
              </div>
              <div className="flex flex-col border-t border-slate-200 bg-white p-4">
                <div className="flex flex-col text-right ml-auto">
                  <div className="flex justify-end gap-6 text-xs font-semibold">
                    <span className="text-slate-500 uppercase tracking-wide">Tạm tính giá trị xuất kho:</span>
                    <span className="font-bold font-mono text-slate-700 w-28 text-sm">{new Intl.NumberFormat('vi-VN').format(watch('subTotal') || 0)} đ</span>
                  </div>
                  {(watch('vatAmount') || 0) > 0 && (
                    <div className="flex justify-end gap-6 text-xs mt-1.5 font-semibold">
                      <span className="text-slate-500 uppercase tracking-wide">VAT:</span>
                      <span className="font-bold font-mono text-slate-700 w-28">{new Intl.NumberFormat('vi-VN').format(watch('vatAmount') || 0)} đ</span>
                    </div>
                  )}
                  {(watch('discountAmount') || 0) > 0 && (
                    <div className="flex justify-end gap-6 text-xs mt-1.5 font-semibold">
                      <span className="text-emerald-700 uppercase tracking-wide">Chiết khấu:</span>
                      <span className="font-bold font-mono text-emerald-700 w-28">-{new Intl.NumberFormat('vi-VN').format(watch('discountAmount') || 0)} đ</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-6 text-xs mt-2 pt-2 border-t border-slate-100">
                    <span className="font-black text-slate-800 uppercase tracking-wider text-xs">Tổng giá trị bàn giao:</span>
                    <span className="font-black font-mono text-blue-700 text-base w-28">{new Intl.NumberFormat('vi-VN').format(watch('totalAmount') || 0)} đ</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide flex items-center gap-2">
              4. Mã máy / Serial thực tế xuất lô
            </h3>
            <div className="space-y-2">
              <MachineCodeChipInput 
                value={watch('danhSachMaMay') || []}
                onChange={(newVal) => setValue('danhSachMaMay', newVal, { shouldDirty: true })}
                allContracts={contracts}
              />
              <p className="text-2xs text-slate-500 font-medium">Nhập số serial chính xác đã xuất kho (sẽ đối soát với hợp đồng nếu có).</p>
            </div>
          </section>

          <DeliveryHiddenInputs register={register} />
        </form>

        {/* Sticky footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/90 backdrop-blur shrink-0 flex items-center justify-between z-10 bottom-0 sticky w-full">
          <div className="text-2xs text-slate-500 font-mono flex items-center gap-1.5 min-w-0 pr-4">
            {draft && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Đã tự động lưu nháp lúc {lastSavedAt?.toLocaleTimeString('vi-VN')}</span>
              </>
            )}
            <span className="ml-2">Pulse ZNS tự động gửi nếu có liên kết.</span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                clearDraft();
                onClose();
              }}
              disabled={isSubmitting}
              className="px-4 py-1.5 hover:bg-slate-200 text-sm font-medium text-slate-600 rounded-lg transition-colors border-none"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              form="deliveryForm"
              disabled={isSubmitting || isLockedByOther || !canEdit}
              className={`px-5 py-2 h-9 border-none text-white rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm min-w-[120px] ${!canEdit ? 'bg-slate-400' : 'bg-blue-600'}`}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu & Vận hành'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
