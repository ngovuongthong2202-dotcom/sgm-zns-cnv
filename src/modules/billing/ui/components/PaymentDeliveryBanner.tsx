import { Button } from '@/src/design-system';
import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';

interface Props {
  finishedDeliveryRecommend: any;
  handleCreatePrepaidFinalPayment: (delivery: any) => void;
}

export default function PaymentDeliveryBanner({
  finishedDeliveryRecommend,
  handleCreatePrepaidFinalPayment
}: Props) {
  if (!finishedDeliveryRecommend) return null;

  return (
    <div className="mx-6 mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-800 shrink-0">
          <CheckCircle2 size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 leading-tight">Đơn giao hàng vừa hoàn tất giao nhận</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Đơn <strong className="text-slate-900">{finishedDeliveryRecommend.deliveryId}</strong> của <strong className="text-slate-900">{finishedDeliveryRecommend.tenKhachHang}</strong> đã bàn giao thành công. Tạo phiếu thu dứt điểm?
          </p>
        </div>
      </div>
      <Button
        onClick={() => handleCreatePrepaidFinalPayment(finishedDeliveryRecommend)}
        className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
      >
        Tạo phiếu thu ngay <ChevronRight size={14} />
      </Button>
    </div>
  );
}
