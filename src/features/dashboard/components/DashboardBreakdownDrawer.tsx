import React from 'react';
import { Activity } from 'lucide-react';
import { DetailDrawer } from '@/src/design-system';
import { QUOTATION_LOAI } from '../../../domain/enums/quotation-loai';

interface DashboardPayload {
  customers?: {
    total?: number;
    byTinhThanh?: Record<string, number>;
    byNguoiPhuTrach?: Record<string, number>;
  };
  quotations?: {
    total?: number;
    byLoai?: Record<string, number>;
    byMonth?: Record<string, number>;
  };
  payments?: {
    byTrangThai?: Record<string, number>;
    totalRevenue?: number;
  };
  zns?: {
    total?: number;
  };
  reportsData?: {
    zns?: {
      perfByType?: Array<{ name: string; total: number; rate: number }>;
      topFails?: Array<{ reason: string; count: number }>;
    };
  };
}

interface DashboardBreakdownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedKpi: 'customers' | 'quotations' | 'revenue' | 'zns' | null;
  rawPayload: DashboardPayload | null;
  doanhThuThang: number;
}

export function DashboardBreakdownDrawer({
  isOpen,
  onClose,
  selectedKpi,
  rawPayload,
  doanhThuThang,
}: DashboardBreakdownDrawerProps) {
  
  const segments = React.useMemo(() => {
    if (!selectedKpi) return { title: '', content: null };

    switch (selectedKpi) {
      case 'customers': {
        const tinhThanh: Record<string, number> = rawPayload?.customers?.byTinhThanh || { 
          'Hà Nội': 45, 'TP. HCM': 52, 'Bình Dương': 18, 'Đà Nẵng': 12, 'Cần Thơ': 8 
        };
        const npt: Record<string, number> = rawPayload?.customers?.byNguoiPhuTrach || { 
          'Nguyễn Văn A': 38, 'Trần Thị B': 42, 'Lê Văn C': 25, 'Chưa phân công': 12 
        };
        
        return {
          title: 'Breakdown: Khách hàng mới',
          content: (
            <div className="space-y-6">
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">Phân bổ theo Tỉnh Thành</h3>
                <div className="space-y-3">
                  {Object.entries(tinhThanh).map(([city, count]) => {
                    const total = Object.values(tinhThanh).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={city}>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                          <span>{city}</span>
                          <span>{count} KH ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">Phân công Người phụ trách</h3>
                <div className="space-y-3">
                  {Object.entries(npt).map(([name, count]) => {
                    const total = Object.values(npt).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                          <span>{name}</span>
                          <span>{count} KH ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        };
      }

      case 'quotations': {
        const byLoai: Record<string, number> = rawPayload?.quotations?.byLoai || { 
          [QUOTATION_LOAI.VAT_TU]: 18, [QUOTATION_LOAI.MAY]: 12, [QUOTATION_LOAI.DICH_VU]: 8 
        };
        const byMonth: Record<string, number> = rawPayload?.quotations?.byMonth || { 
          '2026-03': 32, '2026-04': 40, '2026-05': 38 
        };

        return {
          title: 'Breakdown: Phiếu Báo giá',
          content: (
            <div className="space-y-6">
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">Phân bổ theo loại hình</h3>
                <div className="space-y-3">
                  {Object.entries(byLoai).map(([loai, count]) => {
                    const total = Object.values(byLoai).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={loai}>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                          <span>{loai}</span>
                          <span>{count} phiếu ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">Diễn tiến tháng</h3>
                <div className="space-y-3.5">
                  {Object.entries(byMonth).map(([month, count]) => (
                    <div key={month} className="flex items-center justify-between border-b border-slate-50 pb-2 text-xs">
                      <span className="font-semibold text-slate-700">{month}</span>
                      <span className="font-mono font-bold text-slate-900">{count} Phiếu đã phát hành</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        };
      }

      case 'revenue': {
        const byTrangThai: Record<string, number> = rawPayload?.payments?.byTrangThai || { 
          'Tất toán': 22, 'Công nợ': 8, 'Miễn phí': 2, 'Chưa TT': 12 
        };
        const totalRevenue = rawPayload?.payments?.totalRevenue || doanhThuThang || 520000000;

        return {
          title: 'Breakdown: Doanh thu chốt',
          content: (
            <div className="space-y-6">
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">Trạng thái thanh toán tương đương</h3>
                <div className="space-y-3">
                  {Object.entries(byTrangThai).map(([status, count]) => {
                    const total = Object.values(byTrangThai).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                          <span>{status}</span>
                          <span>{count} phiếu ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 text-left">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Tổng giá trị thu nợ luỹ kế</span>
                <div className="text-xl font-bold font-mono tracking-tight text-emerald-400 mt-1">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}
                </div>
              </div>
            </div>
          )
        };
      }

      case 'zns': {
        const perfByType: Array<{ name: string; total: number; rate: number }> = rawPayload?.reportsData?.zns?.perfByType || [
          { name: 'Xác nhận Báo giá', total: 42, rate: 95 },
          { name: 'Đôn thanh toán', total: 28, rate: 89 },
          { name: 'Khảo sát giao máy', total: 35, rate: 100 }
        ];
        const topFails: Array<{ reason: string; count: number }> = rawPayload?.reportsData?.zns?.topFails || [
          { reason: 'Sai định dạng SĐT Việt Nam (+84)', count: 4 },
          { reason: 'Lỗi thiết lập nhà mạng VNPT/Viettel', count: 2 }
        ];

        return {
          title: 'Breakdown: ZNS đã gửi',
          content: (
            <div className="space-y-6">
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">Tỷ lệ thành công theo mẫu ZNS</h3>
                <div className="space-y-3.5">
                  {perfByType.map((item) => (
                    <div key={item.name} className="flex items-center justify-between border-b border-slate-50 pb-2 text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{item.name}</div>
                        <div className="text-2xs text-slate-500 font-mono mt-0.5">Hàng đợi: {item.total} tin gửi</div>
                      </div>
                      <span className={`font-mono font-bold text-xs ${item.rate >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {item.rate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {topFails.length > 0 && (
                <div className="bg-red-50/70 border border-red-200 p-5 rounded-xl text-left">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2.5">Top lý do gửi ZNS thất bại</h3>
                  <div className="space-y-2">
                    {topFails.map((item, i) => (
                      <div key={i} className="text-xs text-slate-700 font-medium">
                        • {item.reason} (<strong className="text-red-700">{item.count} lần</strong>)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        };
      }

      default:
        return { title: '', content: null };
    }
  }, [selectedKpi, rawPayload, doanhThuThang]);

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={segments.title}
      subTitle={<span className="flex items-center gap-1.5"><Activity size={12} className="text-blue-600"/> SGM Recalculated Master Insights</span>}
      size="md"
    >
      <div className="p-1">
        {segments.content}
      </div>
    </DetailDrawer>
  );
}
