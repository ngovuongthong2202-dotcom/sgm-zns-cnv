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
}: ContractModalsContainerProps) {
  const { user } = useAuth();
  return (
    <>
      <ContractDetailDrawer
        drawerContract={drawerContract}
        payments={realtimePayments}
        deliveries={realtimeDeliveries}
        customers={drawerCustomer ? [drawerCustomer] : []}
        onClose={() => setDrawerContract(null)}
        onEdit={(contract) => { setEditingContract(contract); setDrawerContract(null); setIsFormOpen(true); }}
        onCreatePayment={async (contract) => {
          const ok = await checkWorkflowGate('PAYMENT', contract.id as string, 'contracts', user?.email || undefined);
          if (!ok) return;
          setPrefillPaymentContract(contract);
        }}
        onCreateDelivery={async (contract) => {
          const remaining = getRemainingProducts(contract, realtimeDeliveries);
          if (remaining.length === 0) {
            notify.warning("Hợp đồng này đã giao đầy đủ thiết bị, không cần tạo thêm phiếu giao!");
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

      {prefillPaymentContract && (
        <Suspense fallback={<ModalSkeleton />}>
          <PaymentFormDrawer
            payments={realtimePayments}
            contracts={contracts}
            quotations={quotations}
            nguoiPhuTrachList={nguoiPhuTrachList}
            phuongThucThanhToanList={['Chuyển khoản', 'Tiền mặt']}
            tinhTrangThanhToanList={['ĐÃ THANH TOÁN', 'CHƯA THANH TOÁN', 'Đã TT một phần', 'Tất toán']}
            onClose={() => setPrefillPaymentContract(null)}
            onSave={async (paymentData: any) => {
              try {
                await apiCreateEntity('payment', paymentData);
                notify.success("Đã ghi nhận phiếu thu thành công!");
                setPrefillPaymentContract(null);
              } catch (e: any) {
                notify.error("Lỗi khi ghi nhận phiếu thu: " + e.message);
              }
            }}
            payment={{
              contractId: prefillPaymentContract.id,
              customerId: prefillPaymentContract.customerId || '',
              maKh: prefillPaymentContract.maKh || '',
              tenKhachHang: prefillPaymentContract.tenKhachHang || '',
              sdt: prefillPaymentContract.sdt || '',
              soHopDong: prefillPaymentContract.soHopDong || '',
              soDonHang: prefillPaymentContract.soDonHang || '',
              totalAmount: prefillPaymentContract.totalAmount || 0,
              products: prefillPaymentContract.products || [],
              slMay: prefillPaymentContract.slMay || 0,
              loai: prefillPaymentContract.loai || '',
              dvt: prefillPaymentContract.dvt || 'Máy',
              nguoiPhuTrach: prefillPaymentContract.nguoiPhuTrach || '',
              vatRate: prefillPaymentContract.vatRate || 0,
              discountRate: prefillPaymentContract.discountRate || 0,
              subTotal: prefillPaymentContract.subTotal || 0,
              trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI,
              tinhTrangThanhToan: 'ĐÃ THANH TOÁN', 
              phuongThucThanhToan: 'Chuyển khoản',
              soTien: prefillPaymentContract.totalAmount || 0,
              ngayThanhToan: new Date().toISOString().split('T')[0]
            } as any}
          />
        </Suspense>
      )}

      {prefillDeliveryContract && (
        <Suspense fallback={<ModalSkeleton />}>
          <DeliveryFormModal
            deliveries={realtimeDeliveries}
            contracts={contracts}
            quotations={quotations}
            payments={realtimePayments}
            nguoiPhuTrachList={nguoiPhuTrachList}
            onClose={() => setPrefillDeliveryContract(null)}
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
            delivery={{
              contractId: prefillDeliveryContract.id,
              customerId: prefillDeliveryContract.customerId || '',
              maKh: prefillDeliveryContract.maKh || '',
              tenKhachHang: prefillDeliveryContract.tenKhachHang || '',
              sdt: prefillDeliveryContract.sdt || '',
              soHopDong: prefillDeliveryContract.soHopDong || '',
              soDonHang: prefillDeliveryContract.soDonHang || '',
              ngayKy: prefillDeliveryContract.ngayKy || '',
              loai: prefillDeliveryContract.loai || '',
              dvt: prefillDeliveryContract.dvt || 'Máy',
              products: getRemainingProducts(prefillDeliveryContract, realtimeDeliveries),
              slMay: getRemainingProducts(prefillDeliveryContract, realtimeDeliveries).reduce((acc: number, p: any) => acc + (p.quantity || 0), 0),
              nguoiPhuTrach: prefillDeliveryContract.nguoiPhuTrach || '',
              trangThaiGuiTinGiaoHang: EntityZnsStatus.CHUA_GUI,
              ngayGiaoMay: new Date().toISOString().split('T')[0]
            }}
          />
        </Suspense>
      )}
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
