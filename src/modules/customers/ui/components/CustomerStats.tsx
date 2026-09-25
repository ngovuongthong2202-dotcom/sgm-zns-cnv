import React, { useMemo } from 'react';
import { Users, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Customer } from '@/src/domain/schema/customer.schema';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { MicroChart } from '@/src/design-system/MicroChart';
import { t } from '@/src/i18n/vi';

interface Props {
  customers: Customer[];
  selectedZnsStatus?: string;
  onSelectZnsStatus?: (status: string) => void;
  selectedProvince?: string | null;
  onSelectProvince?: (province: string | null) => void;
}

export function CustomerStats({ 
  customers, 
  selectedZnsStatus = '', 
  onSelectZnsStatus,
  selectedProvince = null,
  onSelectProvince 
}: Props) {
  const provincesCount = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach(c => {
      const p = c.tinhThanh;
      if (p) counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [customers]);

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalProvinces = new Set(customers.map((c) => c.tinhThanh).filter(Boolean)).size;

    const znsSuccess = customers.filter(
      (c) => normalizeLegacyStatus(c.trangThaiGuiTinQuangCao) === EntityZnsStatus.THANH_CONG
    ).length;

    const znsUnsent = customers.filter(
      (c) => {
        const norm = normalizeLegacyStatus(c.trangThaiGuiTinQuangCao);
        return norm === EntityZnsStatus.CHUA_GUI || !c.trangThaiGuiTinQuangCao;
      }
    ).length;

    const znsFailed = customers.filter(
      (c) => {
        const norm = normalizeLegacyStatus(c.trangThaiGuiTinQuangCao);
        return norm === EntityZnsStatus.THAT_BAI || norm === EntityZnsStatus.VUOT_HAN_MUC;
      }
    ).length;

    return [
      {
        id: 'ALL',
        label: 'Tổng Khách Hàng',
        value: totalCustomers,
        desc: 'Toàn bộ liên hệ B2B',
        icon: Users,
        iconColor: 'bg-slate-100 text-slate-600',
        isActive: selectedZnsStatus === '',
        filterValue: '',
      },
      {
        id: 'MAP',
        label: 'Tỉnh/Thành bao phủ',
        value: totalProvinces,
        desc: selectedProvince ? `Đang lọc: ${selectedProvince}` : 'Địa bàn hoạt động',
        icon: MapPin,
        iconColor: 'bg-teal-100 text-teal-600',
        isActive: !!selectedProvince,
        filterValue: selectedProvince,
      },
      {
        id: 'THANH_CONG',
        label: 'ZNS Thành Công',
        value: znsSuccess,
        desc: 'Đột phá chiến lược',
        icon: CheckCircle,
        iconColor: 'bg-emerald-100 text-emerald-600',
        isActive: selectedZnsStatus === EntityZnsStatus.THANH_CONG,
        filterValue: EntityZnsStatus.THANH_CONG,
      },
      {
        id: 'CHUA_GUI',
        label: 'ZNS Chưa Gửi',
        value: znsUnsent,
        desc: 'Cần khởi động đài phát',
        icon: Clock,
        iconColor: 'bg-slate-100 text-slate-500',
        isActive: selectedZnsStatus === EntityZnsStatus.CHUA_GUI,
        filterValue: EntityZnsStatus.CHUA_GUI,
      },
      {
        id: 'THAT_BAI',
        label: 'ZNS Thất Bại',
        value: znsFailed,
        desc: 'Lỗi đầu số / Từ chối',
        icon: AlertCircle,
        iconColor: 'bg-red-50 text-red-600',
        isActive: selectedZnsStatus === EntityZnsStatus.THAT_BAI,
        filterValue: EntityZnsStatus.THAT_BAI,
      },
    ];
  }, [customers, selectedZnsStatus]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 mb-2.5">
      {stats.map((stat, idx) => {
        const isClickable = onSelectZnsStatus && stat.id !== 'MAP';
        
        let activeBorders = 'border-slate-200/80 bg-white hover:border-slate-300';
        if (stat.isActive) {
          if (stat.id === 'ALL') activeBorders = 'border-slate-400 bg-slate-50 ring-1 ring-slate-400/10';
          else if (stat.id === 'MAP') activeBorders = 'border-teal-500 bg-teal-50/10 ring-1 ring-teal-500/20';
          else if (stat.id === 'THANH_CONG') activeBorders = 'border-emerald-500 bg-emerald-50/10 ring-1 ring-emerald-500/20';
          else if (stat.id === 'CHUA_GUI') activeBorders = 'border-blue-500 bg-blue-50/10 ring-1 ring-blue-500/20';
          else if (stat.id === 'THAT_BAI') activeBorders = 'border-red-500 bg-red-50/10 ring-1 ring-red-500/20';
        }

        const handleCardClick = () => {
          if (!isClickable || !onSelectZnsStatus) return;
          if (stat.isActive) {
            onSelectZnsStatus('');
            if (stat.id === 'ALL') onSelectProvince?.(null);
          } else {
            onSelectZnsStatus(stat.filterValue as string);
          }
        };

        if (stat.id === 'MAP') {
          return (
            <div
              key={idx}
              className={`group relative border rounded-xl py-2.5 px-3.5 flex items-center justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all select-none duration-150 ${activeBorders}`}
            >
              <div className="absolute left-0 top-[calc(100%+4px)] w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-[100] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 origin-top">
                <div className="text-2xs font-bold text-slate-500 uppercase tracking-widest px-2 py-1.5 mb-1.5 border-b border-slate-100">Chọn Tỉnh/Thành</div>
                <div className="max-h-[300px] overflow-y-auto">
                  {provincesCount.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500">{t('empty.noProvinceData')}</div>
                  )}
                  {provincesCount.map(([pName, pCount]) => (
                    <div 
                      key={pName} 
                      className={`px-2.5 py-1.5 text-xs rounded-md cursor-pointer flex justify-between items-center transition-colors ${selectedProvince === pName ? 'bg-teal-50 text-teal-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedProvince === pName) {
                          onSelectProvince?.(null);
                        } else {
                          onSelectProvince?.(pName);
                        }
                      }}
                    >
                      <span className="truncate pr-2">{pName}</span>
                      <span className="font-mono text-2xs text-slate-500 shrink-0">{pCount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col min-w-0 flex-1 pr-2 cursor-default">
                <span className="text-2xs font-bold uppercase tracking-wide text-slate-500 truncate mb-0.5 font-sans">
                  {stat.label}
                </span>
                <div className="flex items-end gap-2 mb-1">
                  <div className="text-lg font-bold font-mono tracking-tight text-slate-900 tabular-nums leading-none">
                    {stat.value}
                  </div>
                </div>
                <p className="text-2xs text-slate-500 font-medium truncate leading-none font-sans">
                  {stat.desc}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0 gap-1.5">
                 <div
                  className={`w-7 h-7 rounded-lg ${stat.iconColor} flex items-center justify-center shadow-sm cursor-help`}
                 >
                   <stat.icon size={14} />
                 </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={idx}
            onClick={handleCardClick}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleCardClick();
              }
            }}
            className={`relative border rounded-xl py-2.5 px-3.5 flex items-center justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all select-none overflow-hidden duration-150 ${isClickable ? 'cursor-pointer active:scale-[0.98]' : ''} ${activeBorders}`}
          >
            {stat.isActive && stat.filterValue !== '' && (
              <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stat.id === 'THANH_CONG' ? 'bg-emerald-400' : stat.id === 'THAT_BAI' ? 'bg-red-400' : 'bg-blue-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${stat.id === 'THANH_CONG' ? 'bg-emerald-500' : stat.id === 'THAT_BAI' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
              </span>
            )}
            
            <div className="flex flex-col min-w-0 flex-1 pr-2">
              <span className="text-2xs font-bold uppercase tracking-wide text-slate-500 truncate mb-0.5 font-sans">
                {stat.label}
              </span>
              <div className="flex items-end gap-2 mb-1">
                <div className="text-lg font-bold font-mono tracking-tight text-slate-900 tabular-nums leading-none">
                  {stat.value}
                </div>
                {stat.value > 0 && (
                  <div className="mb-0.5 opacity-60">
                    <MicroChart 
                      data={[stat.value * 0.6, stat.value * 0.8, stat.value * 0.7, stat.value * 0.9, stat.value]} 
                      type="line" 
                      color={stat.iconColor.includes('red') ? '#ef4444' : stat.iconColor.includes('emerald') ? '#10b981' : stat.iconColor.includes('teal') ? '#14b8a6' : '#3b82f6'} 
                      width={40} 
                      height={14} 
                    />
                  </div>
                )}
              </div>
              <p className="text-2xs text-slate-500 font-medium truncate leading-none font-sans">
                {stat.desc}
              </p>
            </div>
            <div className="flex flex-col items-end shrink-0 gap-1.5">
               <div
                className={`w-7 h-7 rounded-lg ${stat.iconColor} flex items-center justify-center shadow-sm`}
               >
                 <stat.icon size={14} />
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
