import { Button } from '@/src/design-system';
import React from 'react';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Check, Clock, FileText, FileSignature, Wallet, Truck, ArrowRight } from 'lucide-react';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { useDrawerStack } from '@/src/contexts/DrawerStackContext';
import { useConfirm } from '@/src/design-system/Confirm';
import { useManualZnsBypass } from '@/src/hooks/useManualZnsBypass';
import { toast } from 'react-hot-toast';

interface WorkflowTimelineProps {
  quotation: Quotation;
  contracts: Contract[];
  payments: Payment[];
  deliveries: Delivery[];
  className?: string;
}

export function WorkflowTimeline({ quotation, contracts, payments, deliveries, className = '' }: WorkflowTimelineProps) {
  const isMachine = normalizeLoai(quotation.loai) === QUOTATION_LOAI.MAY;
  const { openDrawer } = useDrawerStack();
  const { bypassZns, bypassingId } = useManualZnsBypass();
  const { confirm } = useConfirm();
  
  // Find related docs with Universal Lineage Resolution (both direct quotationId and indirect contract linkage)
  const relatedContracts = contracts.filter(c => c.quotationId === quotation.id);
  const relatedContractIds = new Set(relatedContracts.map(c => c.id).filter(Boolean));
  const relatedPayments = payments.filter(p => p.quotationId === quotation.id || (p.contractId && relatedContractIds.has(p.contractId)));
  const relatedDeliveries = deliveries.filter(d => d.quotationId === quotation.id || (d.contractId && relatedContractIds.has(d.contractId)));

  // ZNS Status extractors
  const hasZnsSuccess = (doc: any) => normalizeLegacyStatus(doc?.trangThaiZns || doc?.trangThaiGuiTinBaoGia || doc?.trangThaiGuiTinHopDong || doc?.trangThaiGuiTinThanhToan || doc?.trangThaiGuiTinGiaoHang) === EntityZnsStatus.THANH_CONG;
  
  // Steps definition based on logic
  const steps: any[] = [];

  // Step 1: Báo giá
  steps.push({
    id: 'quote',
    title: 'Báo Giá',
    type: 'Báo giá',
    docId: quotation.id,
    docNumber: quotation.soPhieuBaoGia,
    icon: <FileText size={16} />,
    completed: true,
    znsSuccess: hasZnsSuccess(quotation),
    znsStatus: normalizeLegacyStatus((quotation as any).trangThaiZns || (quotation as any).trangThaiGuiTinBaoGia),
    entityType: 'quotation' as const,
  });

  // Step 2: Hợp đồng (Only if BG Máy)
  if (isMachine) {
    const contract = relatedContracts[0];
    steps.push({
      id: 'contract',
      title: 'Hợp Đồng',
      type: 'Hợp đồng',
      docId: contract?.id,
      docNumber: contract?.soHopDong,
      icon: <FileSignature size={16} />,
      completed: !!contract,
      znsSuccess: contract ? hasZnsSuccess(contract) : false,
      znsStatus: normalizeLegacyStatus((contract as any)?.trangThaiZns || (contract as any)?.trangThaiGuiTinHopDong),
      entityType: 'contract' as const,
    });
  }

  // Step 3: Thanh toán
  const payment = relatedPayments[0];
  steps.push({
    id: 'payment',
    title: 'Thanh Toán',
    type: 'Thanh toán',
    docId: payment?.id,
    docNumber: payment?.paymentId,
    icon: <Wallet size={16} />,
    completed: !!payment,
    znsSuccess: payment ? hasZnsSuccess(payment) : false,
    znsStatus: normalizeLegacyStatus((payment as any)?.trangThaiZns || (payment as any)?.trangThaiGuiTinThanhToan),
    entityType: 'payment' as const,
  });

  // Step 4: Giao hàng
  const delivery = relatedDeliveries[0];
  steps.push({
    id: 'delivery',
    title: 'Giao Hàng',
    type: 'Giao hàng',
    docId: delivery?.id,
    docNumber: delivery?.deliveryId,
    icon: <Truck size={16} />,
    completed: !!delivery,
    znsSuccess: delivery ? hasZnsSuccess(delivery) : false,
    znsStatus: normalizeLegacyStatus((delivery as any)?.trangThaiZns || (delivery as any)?.trangThaiGuiTinGiaoHang),
    entityType: 'delivery' as const,
  });

  return (
    <div className={`p-4 bg-white border border-slate-200 rounded-xl ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between opacity-100 font-sans gap-2 overflow-x-auto w-full">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isActive = step.completed;
          const iconBg = isActive ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-400 border-slate-200';
          const lineClass = steps[index + 1]?.completed ? 'bg-blue-500' : 'bg-slate-200';
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center min-w-[120px] shrink-0 text-center relative group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 z-10 transition-colors shadow-sm ${iconBg}`}>
                  {step.icon}
                </div>
                
                <span className={`text-xs uppercase tracking-wide font-bold mb-1 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                  {step.title}
                </span>

                {step.completed && step.docId ? (
                   <Button 
                     onClick={() => openDrawer(step.entityType, step.docId as string)}
                     className="text-2xs font-mono font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-100 transition-colors mb-1 cursor-pointer"
                   >
                     {step.docNumber} ↗
                   </Button>
                ) : (
                   <span className="text-2xs text-slate-500 mb-1">Chưa tạo</span>
                )}

                {step.completed && (
                  <div className={`text-3xs font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-0.5 group/zns ${step.znsSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {step.znsSuccess ? <Check size={10} /> : <Clock size={10} />}
                    ZNS: {step.znsStatus}
                    {(!step.znsSuccess && step.znsStatus !== EntityZnsStatus.CHUA_GUI && step.docId) && (
                      <Button 
                        disabled={bypassingId === step.docId}
                        onClick={async (e) => {
                           e.stopPropagation();
                           const isConfirmed = await confirm({
                             title: 'Xác nhận vượt rào ZNS',
                             message: 'Tính năng này dùng để báo cáo ZNS đã thành công khi Webhook từ Zalo bị trễ hoặc lỗi ghi nhận. Nhấn xác nhận sẽ ghi log Audit. Bạn chắc chắn chứ?',
                             confirmText: 'Xác nhận ZNS Thành công',
                             variant: 'danger',
                           });
                           if (isConfirmed) {
                               await bypassZns(step.entityType as any, step.docId as string, step.znsStatus);
                               toast.success('Đã cập nhật trạng thái ZNS thủ công');
                           }
                        }}
                        className="ml-1 opacity-0 group-hover/zns:opacity-100 transition-opacity bg-amber-200 hover:bg-amber-300 text-amber-800 px-1.5 rounded cursor-pointer"
                        title="Xác nhận gửi thủ công (Bypass Webhook)"
                      >
                        {bypassingId === step.docId ? '...' : 'Bypass'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {!isLast && (
                <div className="hidden sm:block flex-1 mx-2 relative min-w-[40px] mt-[-40px]">
                  <div className={`h-[3px] w-full rounded-full transition-all ${lineClass}`}></div>
                  <ArrowRight size={14} className={`absolute top-1/2 -mt-[7px] right-2 ${steps[index + 1]?.completed ? 'text-blue-500' : 'text-slate-300'}`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
