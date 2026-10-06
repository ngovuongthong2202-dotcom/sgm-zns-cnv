import React, { Suspense } from 'react';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { ModalSkeleton } from '@/src/design-system/skeletons/ModalSkeleton';
import { ContractDetailDrawer } from './ContractDetailDrawer';
import { handleDatabaseError, OperationType } from '@/src/shared/errors/database-error';
import { notify } from '@/src/shared/utils/notify';
import { checkWorkflowGate } from '@/src/domain/workflow-ui';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { useAuth } from '@/src/modules/iam';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { computeLineItem, aggregateProducts } from '@/src/domain/pricing/quotation-pricing';
import { calculateMachineAllocation } from '@/src/shared/utils/voucherResolver';
import { calculateActualMachineCount, smartAllocateSerials } from '@/src/widgets/product-list-input/useProductItemSemantic';
import { getLinkedPaymentsForContract } from '@/src/domain/services/financial-reconciler';
import { getLinkedDeliveriesForContract } from '@/src/domain/services/delivery-reconciler';

const ContractFormModal = React.lazy(() => import('./ContractFormModal').then(m => ({ default: m.ContractFormModal })));
const PaymentFormDrawer = React.lazy(() => import('@/src/modules/billing/ui/components/PaymentFormDrawer').then(m => ({ default: m.PaymentFormDrawer })));
const DeliveryFormModal = React.lazy(() => import('@/src/modules/fulfillment/ui/components/DeliveryFormModal').then(m => ({ default: m.DeliveryFormModal })));

interface ContractModalsContainerProps {
  contracts: Contract[];
  quotations: any[];
  realtimePayments: any[];
  realtimeDeliveries: any[];
  drawerCustomer: Customer | null;
  
  nguoiPhuTrachList: string[];
  
  editingContract: Contract | null;
  setEditingContract: (contract: Contract | null) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  drawerContract: Contract | null;
  setDrawerContract: (contract: Contract | null) => void;
  prefillPaymentContract: Contract | null;
  setPrefillPaymentContract: (contract: Contract | null) => void;
  prefillDeliveryContract: Contract | null;
  setPrefillDeliveryContract: (contract: Contract | null) => void;
  
  createContract: (data: any) => Promise<any>;
  updateContract: (id: string, data: any) => Promise<any>;
  createPayment: (data: any) => Promise<any>;
  createDelivery: (data: any) => Promise<any>;
  handleDeleteContract: (contract: Contract) => Promise<void>;
  getRemainingProducts: (contract: Contract, deliveries: any[]) => any[];
  onSendZns?: (contract: Contract) => void;
  prefillQuotation?: any;
  setPrefillQuotation?: (quo: any) => void;
}

export function ContractModalsContainer({
  contracts,
  quotations,
  realtimePayments,
  realtimeDeliveries,
  drawerCustomer,
  nguoiPhuTrachList,
  
  editingContract,
  setEditingContract,
  isFormOpen,
  setIsFormOpen,
  prefillQuotation,
  setPrefillQuotation,
  drawerContract,
  setDrawerContract,
  prefillPaymentContract,
  setPrefillPaymentContract,
  prefillDeliveryContract,
  setPrefillDeliveryContract,
  
  createContract,
  updateContract,
  createPayment,
  createDelivery,
  handleDeleteContract,
  getRemainingProducts,
  onSendZns,
}: ContractModalsContainerProps) {
  const { user } = useAuth();
  const [pendingDeliveryContract, setPendingDeliveryContract] = React.useState<Contract | null>(null);
  const [prefillPaymentStatus, setPrefillPaymentStatus] = React.useState<string>('ĐÃ THANH TOÁN');
  const [transitionPaymentInfo, setTransitionPaymentInfo] = React.useState<{ id?: string; code?: string; isDacCach?: boolean } | null>(null);

  const isFormModalActive = Boolean(prefillPaymentContract || prefillDeliveryContract || isFormOpen);

  return (
    <>
      <ContractDetailDrawer
        drawerContract={drawerContract}
        payments={realtimePayments}
        deliveries={realtimeDeliveries}
        customers={drawerCustomer ? [drawerCustomer] : []}
        modal={!isFormModalActive}
        className={isFormModalActive ? 'opacity-0 pointer-events-none' : ''}
        onClose={() => setDrawerContract(null)}
        onSendZns={onSendZns}
        onEdit={(contract) => { setEditingContract(contract); setDrawerContract(null); setIsFormOpen(true); }}
        onCreatePayment={async (contract) => {
          const linkedPayments = getLinkedPaymentsForContract(contract, realtimePayments || []);
          const existingPayment = linkedPayments[0];
          if (existingPayment) {
            notify.info(`Hợp đồng ${contract.soHopDong} đã có phiếu thanh toán (${existingPayment.paymentId}). Mỗi hợp đồng chỉ tạo 1 phiếu thu duy nhất!`);
            return;
          }
          const ok = await checkWorkflowGate('PAYMENT', contract.id as string, 'contracts', user?.email || undefined);
          if (!ok) return;
          setPrefillPaymentStatus('ĐÃ THANH TOÁN');
          setPrefillPaymentContract(contract);
        }}
        onCreateDelivery={async (contract) => {
          const contractDeliveries = getLinkedDeliveriesForContract(contract, realtimeDeliveries || []);

          const allocGate = calculateMachineAllocation(contract, contractDeliveries);
          if (allocGate.isFullyAllocated) {
            notify.warning(`Hợp đồng ${contract.soHopDong || ''} đã điều phối đủ ${allocGate.totalAssignedMachines}/${allocGate.totalOrderMachines} máy xuất kho. Không thể tạo thêm phiếu giao!`);
            return;
          }
          const remaining = getRemainingProducts(contract, contractDeliveries);
          if (remaining.length === 0) {
            notify.warning("Hợp đồng này đã giao đầy đủ thiết bị, không cần tạo thêm phiếu giao!");
            return;
          }

          const linkedPayments = getLinkedPaymentsForContract(contract, realtimePayments || []);
          const linkedPayment = linkedPayments[0];

          if (!linkedPayment) {
            // Nghiệp vụ bảo toàn Workflow: Kích hoạt Đặc cách Ban Giám Đốc (Giao trước - Thanh toán sau)
            // Mở thẳng DeliveryFormModal với cờ dacCachGiaoTruoc, không ép tạo thanh toán thủ công gây ma sát
            setTransitionPaymentInfo({
              id: '',
              code: '',
              isDacCach: true,
            });
            setPrefillDeliveryContract(contract);
            notify.info("Hợp đồng chưa có phiếu thanh toán. Đã tự động kích hoạt Đặc cách Ban Giám Đốc (Giao trước - Thanh toán sau) để lập Phiếu Giao!");
            return;
          }

          const ok = await checkWorkflowGate('DELIVERY', contract.id as string, 'contracts', user?.email || undefined);
          if (!ok) return;

          setPrefillDeliveryContract(contract);
        }}
        onDelete={handleDeleteContract}
      />

      {isFormOpen && (
        <Suspense fallback={<ModalSkeleton />}>
          <ContractFormModal 
            key={editingContract?.id || 'new'}
            contract={editingContract} 
            contracts={contracts} 
            quotations={quotations} 
            nguoiPhuTrachList={nguoiPhuTrachList}
            allPayments={realtimePayments}
            allDeliveries={realtimeDeliveries}
            prefillQuotation={prefillQuotation}
            onClose={() => { 
              setIsFormOpen(false); 
              setEditingContract(null); 
              if (setPrefillQuotation) setPrefillQuotation(null);
            }} 
            onSave={async (data: any) => { 
              try {
                data.slMay = Number(data.slMay) || 0;
                if (editingContract?.id) {
                  const validation = validateContractUpdate(editingContract, data, realtimePayments, realtimeDeliveries);
                  if (!validation.allowed) {
                    notify.error(validation.reason || "Dữ liệu không hợp lệ!");
                    return;
                  }
                  await updateContract(editingContract.id, data);
                } else {
                  await apiCreateEntity('contract', data);
                }
                notify.success('Cập nhật thành công');
                setIsFormOpen(false); setEditingContract(null);
                if (setPrefillQuotation) setPrefillQuotation(null);
              } catch (e: any) {
                notify.error(e.message || 'Lỗi cập nhật'); handleDatabaseError(e, OperationType.WRITE, `contracts/${editingContract?.id || 'new'}`); }
            }} 
          />
        </Suspense>
      )}

      {prefillPaymentContract && (() => {
        const healedContractProducts = (prefillPaymentContract.products || []).map(computeLineItem);
        const contractAggs = aggregateProducts(healedContractProducts);
        const contractTotal = Number(prefillPaymentContract.totalAmount) || 0;
        const contractSubTotal = Number(prefillPaymentContract.subTotal) || 0;
        const effectiveTotalAmount = contractTotal > 0 
          ? contractTotal 
          : contractAggs.totalAfterTax;
        const effectiveSubTotal = contractSubTotal > 0 
          ? contractSubTotal 
          : contractAggs.totalGross;
        const effectiveVatRate = prefillPaymentContract.vatRate || (contractAggs.totalBeforeTax > 0 ? Math.round((contractAggs.totalVat / contractAggs.totalBeforeTax) * 100) : 0);
        const effectiveDiscountRate = prefillPaymentContract.discountRate || (effectiveSubTotal > 0 ? Number(((contractAggs.totalDiscount / effectiveSubTotal) * 100).toFixed(2)) : 0);
        const effectiveSlMay = prefillPaymentContract.slMay || healedContractProducts.reduce((sum: number, p: any) => sum + (Number(p.quantity) || 0), 0);

        const isChuaTT = prefillPaymentStatus === 'Chưa TT' || prefillPaymentStatus === 'CHƯA THANH TOÁN';
        return (
          <Suspense fallback={<ModalSkeleton />}>
            <PaymentFormDrawer
              payments={realtimePayments}
              contracts={contracts}
              quotations={quotations}
              nguoiPhuTrachList={nguoiPhuTrachList}
              phuongThucThanhToanList={['Chuyển khoản', 'Tiền mặt']}
              tinhTrangThanhToanList={['ĐÃ THANH TOÁN', 'CHƯA THANH TOÁN', 'Chưa TT', 'Đã TT một phần', 'Tất toán']}
              onClose={() => {
                setPrefillPaymentContract(null);
                setPendingDeliveryContract(null);
                setPrefillPaymentStatus('ĐÃ THANH TOÁN');
              }}
              onSave={async (paymentData: any) => {
                try {
                  const createdPayment = await apiCreateEntity('payment', paymentData);
                  notify.success("Đã ghi nhận phiếu thu thành công!");
                  setPrefillPaymentContract(null);
                  const isTransitioning = !!pendingDeliveryContract;
                  const targetContract = pendingDeliveryContract;
                  setPendingDeliveryContract(null);
                  setPrefillPaymentStatus('ĐÃ THANH TOÁN');

                  if (isTransitioning && targetContract) {
                    setTransitionPaymentInfo({
                      id: createdPayment?.id || paymentData?.id || paymentData?.paymentId,
                      code: paymentData?.paymentId || createdPayment?.paymentId,
                      isDacCach: true,
                    });
                    setPrefillDeliveryContract(targetContract);
                    notify.success("Đã ghi nhận Phiếu thu! Đang chuyển tiếp sang lập Phiếu giao hàng...");
                  }
                } catch (e: any) {
                  notify.error("Lỗi khi ghi nhận phiếu thu: " + e.message);
                }
              }}
              payment={{
                contractId: prefillPaymentContract.id,
                quotationId: prefillPaymentContract.quotationId || '',
                soPhieuBaoGia: prefillPaymentContract.soPhieuBaoGia || '',
                customerId: prefillPaymentContract.customerId || '',
                maKh: prefillPaymentContract.maKh || '',
                tenKhachHang: prefillPaymentContract.tenKhachHang || '',
                tenNguoiNop: prefillPaymentContract.nguoiDaiDien || prefillPaymentContract.tenKhachHang || '',
                sdt: prefillPaymentContract.sdt || '',
                soHopDong: prefillPaymentContract.soHopDong || '',
                soDonHang: prefillPaymentContract.soDonHang || '',
                totalAmount: effectiveTotalAmount,
                products: healedContractProducts,
                slMay: effectiveSlMay,
                loai: prefillPaymentContract.loai || (healedContractProducts[0]?.productName || ''),
                dvt: prefillPaymentContract.dvt || (healedContractProducts[0]?.unit || 'Máy'),
                nguoiPhuTrach: prefillPaymentContract.nguoiPhuTrach || '',
                vatRate: effectiveVatRate,
                discountRate: effectiveDiscountRate,
                subTotal: effectiveSubTotal,
                trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI,
                tinhTrangThanhToan: isChuaTT ? 'Chưa TT' : 'ĐÃ THANH TOÁN', 
                phuongThucThanhToan: 'Chuyển khoản',
                soTien: isChuaTT ? 0 : effectiveTotalAmount,
                congNoConLai: isChuaTT ? effectiveTotalAmount : 0,
                dacCachGiaoTruoc: isChuaTT,
                lyDoDacCach: isChuaTT ? 'Đặc cách giao hàng trước theo phê duyệt ban giám đốc' : '',
                ghiChu: isChuaTT ? 'Phiếu thu tự động khởi tạo theo quy trình Đặc cách giao hàng trước thanh toán.' : '',
                ngayThanhToan: new Date().toISOString().split('T')[0]
              } as any}
            />
          </Suspense>
        );
      })()}

      {prefillDeliveryContract && (() => {
        const linkedPayments = getLinkedPaymentsForContract(prefillDeliveryContract, realtimePayments || []);
        const linkedPayment = linkedPayments[0];
        const effectivePaymentId = transitionPaymentInfo?.id || linkedPayment?.id || linkedPayment?.paymentId || '';
        const effectivePaymentCode = transitionPaymentInfo?.code || linkedPayment?.paymentId || '';
        const isDacCach = Boolean(
          transitionPaymentInfo?.isDacCach || 
          linkedPayment?.dacCachGiaoTruoc || 
          (linkedPayment?.tinhTrangThanhToan && String(linkedPayment.tinhTrangThanhToan).toLowerCase().includes('chưa'))
        );

        const remainingProds = getRemainingProducts(prefillDeliveryContract, getLinkedDeliveriesForContract(prefillDeliveryContract, realtimeDeliveries || []));

        return (
          <Suspense fallback={<ModalSkeleton />}>
            <DeliveryFormModal
              delivery={{
                contractId: prefillDeliveryContract.id,
                soHopDong: prefillDeliveryContract.soHopDong,
                soDonHang: prefillDeliveryContract.soDonHang,
                paymentId: effectivePaymentId,
                soChungTuThamChieu: effectivePaymentCode,
                quotationId: prefillDeliveryContract.quotationId,
                customerId: prefillDeliveryContract.customerId,
                maKh: prefillDeliveryContract.maKh,
                tenKhachHang: prefillDeliveryContract.tenKhachHang,
                sdt: prefillDeliveryContract.sdt,
                nguoiDaiDien: prefillDeliveryContract.nguoiDaiDien,
                soPhieuBaoGia: prefillDeliveryContract.soPhieuBaoGia,
                ngayBaoGia: prefillDeliveryContract.ngayBaoGia,
                giaTriHopDong: prefillDeliveryContract.totalAmount || 0,
                products: remainingProds,
                danhSachMaMay: prefillDeliveryContract.danhSachMaMay || [],
                slMay: calculateActualMachineCount(remainingProds) || 1,
                nguoiPhuTrach: prefillDeliveryContract.nguoiPhuTrach || '',
                diaChiGiaoHang: (prefillDeliveryContract as any).diaChiGiaoHang || (prefillDeliveryContract as any).diaChi || '',
                nguoiLienHe: (prefillDeliveryContract as any).nguoiLienHe || (prefillDeliveryContract as any).nguoiDaiDien || '',
                sdtLienHe: (prefillDeliveryContract as any).sdtLienHe || (prefillDeliveryContract as any).sdt || '',
                dacCachGiaoTruoc: isDacCach,
                nguoiPheDuyetDacCach: (prefillDeliveryContract as any).nguoiPheDuyetDacCach || (linkedPayment as any)?.nguoiPheDuyetDacCach || 'Ban Giám Đốc',
                lyDoDacCach: (prefillDeliveryContract as any).lyDoDacCach || (linkedPayment as any)?.lyDoDacCach || 'Đặc cách giao hàng trước khi thanh toán',
                tinhTrangThanhToan: linkedPayment?.tinhTrangThanhToan || (isDacCach ? 'CHƯA THANH TOÁN' : 'ĐÃ THANH TOÁN'),
                trangThaiGuiTinGiaoHang: EntityZnsStatus.CHUA_GUI,
                ngayLapPgh: new Date().toISOString().split('T')[0],
                ngayGiaoMay: new Date().toISOString().split('T')[0],
              }}
              deliveries={realtimeDeliveries}
              contracts={contracts}
              quotations={quotations}
              payments={realtimePayments}
              nguoiPhuTrachList={nguoiPhuTrachList}
              onClose={() => {
                setPrefillDeliveryContract(null);
                setTransitionPaymentInfo(null);
              }}
              onSave={async (deliveryData: any) => {
                try {
                  const sourceId = deliveryData.contractId || deliveryData.quotationId;
                  const collectionName = deliveryData.contractId ? 'contracts' : 'quotations';
                  if (sourceId) {
                    const sourceDoc = await repositoryFactory.get<any>(collectionName).getById(sourceId);
                    if (sourceDoc) {
                      const currentDelivered = sourceDoc.deliveredQuantities || {};
                      const newDeliveredQuantities = { ...currentDelivered };

                      const allItemKeys = new Set<string>();
                      (deliveryData.products || []).forEach((p: any, idx: number) => allItemKeys.add(getProductItemKey(p, idx)));

                      for (const itemKey of Array.from(allItemKeys)) {
                        let contracted = 0;
                        if (sourceDoc.products) {
                          contracted = sourceDoc.products.filter((cp: any, sourceIndex: number) => getProductItemKey(cp, sourceIndex) === itemKey)
                            .reduce((acc: number, cp: any) => acc + (cp.quantity || 0), 0);
                        }

                        const previousDelivered = currentDelivered[itemKey] || 0;
                        
                        const newShipmentQty = (deliveryData.products || []).filter((np: any, npIndex: number) => getProductItemKey(np, npIndex) === itemKey)
                          .reduce((acc: number, np: any) => acc + (np.quantity || 0), 0);

                        if (newShipmentQty > (contracted - previousDelivered)) {
                          notify.error(`Sản phẩm ${itemKey} vượt quá số lượng còn lại (${contracted - previousDelivered})`);
                          return;
                        }
                        newDeliveredQuantities[itemKey] = previousDelivered + newShipmentQty;
                      }

                      if (deliveryData.dacCachGiaoTruoc && !deliveryData.paymentId && prefillDeliveryContract) {
                        try {
                          const rawContractProducts = (prefillDeliveryContract.products || []).map(computeLineItem);
                          const allocatedContractProducts = smartAllocateSerials(rawContractProducts, prefillDeliveryContract.danhSachMaMay || []);
                          const contractAggs = aggregateProducts(allocatedContractProducts);
                          const uncollectedPayment = await apiCreateEntity('payment', {
                            contractId: prefillDeliveryContract.id,
                            quotationId: prefillDeliveryContract.quotationId || '',
                            soPhieuBaoGia: prefillDeliveryContract.soPhieuBaoGia || '',
                            customerId: prefillDeliveryContract.customerId || '',
                            maKh: prefillDeliveryContract.maKh || '',
                            tenKhachHang: prefillDeliveryContract.tenKhachHang || '',
                            tenNguoiNop: prefillDeliveryContract.nguoiDaiDien || prefillDeliveryContract.tenKhachHang || '',
                            sdt: prefillDeliveryContract.sdt || '',
                            soHopDong: prefillDeliveryContract.soHopDong || '',
                            soDonHang: prefillDeliveryContract.soDonHang || '',
                            totalAmount: Number(prefillDeliveryContract.totalAmount) || contractAggs.totalAfterTax || 0,
                            soTien: 0,
                            products: allocatedContractProducts,
                            danhSachMaMay: prefillDeliveryContract.danhSachMaMay || [],
                            soNgayBaoHanh: (prefillDeliveryContract as any).soNgayBaoHanh || allocatedContractProducts[0]?.soNgayBaoHanh || 365,
                            ngayHetHanBaoHanh: (prefillDeliveryContract as any).ngayHetHanBaoHanh || allocatedContractProducts[0]?.ngayHetHanBaoHanh,
                            slMay: calculateActualMachineCount(allocatedContractProducts) || prefillDeliveryContract.slMay || 1,
                            loai: prefillDeliveryContract.loai || (allocatedContractProducts[0]?.productName || 'Máy'),
                            dvt: prefillDeliveryContract.dvt || (allocatedContractProducts[0]?.unit || 'Máy'),
                            nguoiPhuTrach: prefillDeliveryContract.nguoiPhuTrach || '',
                            vatRate: prefillDeliveryContract.vatRate || 0,
                            discountRate: prefillDeliveryContract.discountRate || 0,
                            subTotal: prefillDeliveryContract.subTotal || contractAggs.totalGross || 0,
                            trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI,
                            tinhTrangThanhToan: 'Chưa TT',
                            phuongThucThanhToan: 'Chuyển khoản',
                            dacCachGiaoTruoc: true,
                            ngayThanhToan: new Date().toISOString().split('T')[0]
                          });
                          if (uncollectedPayment?.id) {
                            deliveryData.paymentId = uncollectedPayment.id;
                            deliveryData.soChungTuThamChieu = uncollectedPayment.paymentId || uncollectedPayment.id;
                          }
                        } catch (pErr) {
                          console.warn('Could not auto-create uncollected payment ledger anchor:', pErr);
                        }
                      }

                      await apiCreateEntity('delivery', deliveryData);
                      await repositoryFactory.get(collectionName).update(sourceId, { deliveredQuantities: newDeliveredQuantities });
                    } else {
                      await apiCreateEntity('delivery', deliveryData);
                    }
                  } else {
                    await apiCreateEntity('delivery', deliveryData);
                  }

                  notify.success("Đã ghi nhận bàn giao máy thành công!");
                  setPrefillDeliveryContract(null);
                } catch (e: any) {
                  notify.error("Lỗi khi ghi nhận bàn giao máy: " + e.message);
                }
              }}
            />
          </Suspense>
        );
      })()}
    </>
  );
}

export function validateContractUpdate(
  oldC: any,
  newC: any,
  realtimePayments: any[],
  realtimeDeliveries: any[]
): { allowed: boolean; reason?: string } {
  const linkedPayments = (realtimePayments || []).filter(p => p.contractId === oldC.id);
  const linkedDeliveries = (realtimeDeliveries || []).filter(d => d.contractId === oldC.id);
  const hasAnyChild = linkedPayments.length > 0 || linkedDeliveries.length > 0;

  const details: string[] = [];
  if (linkedPayments.length) details.push(`Thanh toán: ${linkedPayments.map(p => p.paymentId).join(', ')}`);
  if (linkedDeliveries.length) details.push(`Giao hàng: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}`);

  // Rule 10: Không đổi khách hàng khi đã phát sinh bước sau
  if (oldC.customerId !== newC.customerId && hasAnyChild) {
    return { allowed: false, reason: `Cảnh báo: Không thể thay đổi khách hàng cho hợp đồng ${oldC.soHopDong} vì đã phát sinh dữ liệu liên kết phía sau! Các phiếu liên kết: ${details.join('; ')}` };
  }

  // Rule 11: Không sửa mã chứng từ đã được tham chiếu
  if (oldC.soHopDong !== newC.soHopDong && hasAnyChild) {
    return { allowed: false, reason: `Cảnh báo: Không thể thay đổi số hiệu Hợp đồng từ "${oldC.soHopDong}" sang "${newC.soHopDong}" vì đã được tham chiếu liên kết! Các phiếu liên kết: ${details.join('; ')}` };
  }

  // Rule 5: Hợp đồng đã có thanh toán thì không sửa giá trị/điều khoản chính
  if (linkedPayments.length > 0) {
    if (isContractMainContentChanged(oldC, newC)) {
      return { allowed: false, reason: `Cảnh báo: Hợp đồng ${oldC.soHopDong} đã phát sinh phiếu Thanh toán liên kết: ${linkedPayments.map(p => p.paymentId).join(', ')}. Không được phép thay đổi điều khoản, giá trị chính (khách hàng, mã hợp đồng, báo giá, sản phẩm, giá trị)!` };
    }
  }

  // Rule 6: Hợp đồng đã có giao hàng thì không sửa/xóa nội dung ảnh hưởng hàng đã giao
  if (linkedDeliveries.length > 0) {
    const deliveredMap = oldC.deliveredQuantities || {};
    for (const [index, p] of (oldC.products || []).entries()) {
      const itemKey = getProductItemKey(p, index);
      const deliveredQty = deliveredMap[itemKey] || 0;
      if (deliveredQty > 0) {
        const newP = (newC.products || []).find((np: any, nIndex: number) => getProductItemKey(np, nIndex) === itemKey);
        if (!newP) {
          return { allowed: false, reason: `Cảnh báo: Hợp đồng đã có phiếu Giao hàng: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}. Sản phẩm "${p.productName || 'Sản phẩm chưa đặt tên'}" đã giao thực tế ${deliveredQty} cái. Không được xóa sản phẩm này khỏi hợp đồng!` };
        }
        if (newP.quantity < deliveredQty) {
          return { allowed: false, reason: `Cảnh báo: Hợp đồng đã có phiếu Giao hàng: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}. Sản phẩm "${p.productName || 'Sản phẩm chưa đặt tên'}" đã giao thực tế ${deliveredQty} cái. Không được giảm số lượng từ ${p.quantity} xuống ${newP.quantity} (thấp hơn số lượng đã giao)!` };
        }
      }
    }
  }

  // Rule 13: Không chuyển trạng thái thủ công vượt luồng
  if (oldC.tinhTrangHopDong && newC.tinhTrangHopDong && oldC.tinhTrangHopDong !== newC.tinhTrangHopDong) {
    if (oldC.tinhTrangHopDong === 'Hoàn tất' && newC.tinhTrangHopDong === 'Mới') {
      return { allowed: false, reason: 'Không được phép chuyển tình trạng hợp đồng từ Hoàn tất về Mới!' };
    }
    if (oldC.tinhTrangHopDong === 'Hủy' && newC.tinhTrangHopDong !== 'Hủy') {
      return { allowed: false, reason: 'Hợp đồng đã Hủy, không thể đổi trạng thái khác!' };
    }
  }

  return { allowed: true };
}

function isContractMainContentChanged(oldC: any, newC: any): boolean {
  if (oldC.customerId !== newC.customerId) return true;
  if (oldC.soHopDong !== newC.soHopDong) return true;
  if (Number(oldC.totalAmount) !== Number(newC.totalAmount)) return true;
  if (Number(oldC.subTotal) !== Number(newC.subTotal)) return true;
  if (Number(oldC.vatRate) !== Number(newC.vatRate)) return true;
  if (Number(oldC.discountRate) !== Number(newC.discountRate)) return true;
  return false;
}
