 
import React, { ReactNode, useState, useEffect } from 'react';
import { InlineEntityLabel } from '../design-system';
import { auditLogsRepo } from '@/src/data/repositories/system.repo';

interface AuditLogItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  timestamp: string | number;
  userId: string;
  entityId: string;
  entityType: string;
  details?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// Map technical keys to friendly Vietnamese names for high-end SaaS presentation
function formatFieldName(key: string): string {
  const dictionary: Record<string, string> = {
    tinhTrangBaoGia: 'Tình trạng báo giá',
    soPhieuBaoGia: 'Số phiếu báo giá',
    customerId: 'ID Khách hàng',
    tongTien: 'Tổng tiền',
    note: 'Ghi chú',
    products: 'Danh sách sản phẩm',
    hieuLuc: 'Thời gian hiệu lực',
    createdAt: 'Ngày tạo',
    updatedAt: 'Ngày cập nhật',
    phuongThucThanhToan: 'Phương thức thanh toán',
    ngayBaoGia: 'Ngày báo giá',
    trangThaiGuiTinBaoGia: 'Trạng thái gửi tin ZNS',
    tongTienPhaiThanhToan: 'Tổng tiền phải thanh toán',
    soHopDong: 'Số hợp đồng',
    ngayKy: 'Ngày ký',
    ngayHieuLuc: 'Ngày hiệu lực',
    ngayHetHan: 'Ngày hết hạn',
    tinhTrangHopDong: 'Tình trạng hợp đồng',
    nguoiPhuTrach: 'Người phụ trách',
    triGiaHopDong: 'Trị giá hợp đồng',
    daThanhToan: 'Đã thanh toán',
    conPhaiThanhToan: 'Còn phải thanh toán',
  };
  if (dictionary[key]) return dictionary[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
}

function formatValue(key: string, val: unknown): ReactNode {
  if (val === null || val === undefined || val === '') return 'Trống';
  
  if (typeof val === 'string' && val.length > 5 && key.endsWith('Id') && !key.endsWith('UserId')) {
    const entityTypeMap: Record<string, string> = {
      customerId: 'customers',
      quotationId: 'quotations',
      contractId: 'contracts',
      paymentId: 'payments',
      deliveryId: 'deliveries',
    };
    const entityType = entityTypeMap[key];
    if (entityType) {
      return <InlineEntityLabel entityType={entityType} entityId={val} fallbackId={val} />;
    }
  }

  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function ProductDiffVisualizer({ beforeVal, afterVal }: { beforeVal?: unknown; afterVal?: unknown }) {
  const beforeList = Array.isArray(beforeVal) ? beforeVal : [];
  const afterList = Array.isArray(afterVal) ? afterVal : [];

  const getIdentity = (p: any) => p?.productId || p?.productName || p?.id || '';

  const beforeMap = new Map(beforeList.map(p => [getIdentity(p), p]));
  const afterMap = new Map(afterList.map(p => [getIdentity(p), p]));

  // Find added
  const added = afterList.filter(p => !beforeMap.has(getIdentity(p)));
  // Find removed
  const removed = beforeList.filter(p => !afterMap.has(getIdentity(p)));
  // Find modified
  const modified: { before: any; after: any }[] = [];
  afterList.forEach(afterItem => {
    const ident = getIdentity(afterItem);
    const beforeItem = beforeMap.get(ident);
    if (beforeItem && JSON.stringify(beforeItem) !== JSON.stringify(afterItem)) {
      modified.push({ before: beforeItem, after: afterItem });
    }
  });

  if (added.length === 0 && removed.length === 0 && modified.length === 0) {
    return <div className="text-xs text-slate-500 italic p-3">Mảng sản phẩm không thay đổi về nội dung.</div>;
  }

  const formatMoney = (val?: number) => {
    if (val === undefined || val === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-3 font-sans pb-3">
      {/* Removed items */}
      {removed.map((p, idx) => (
        <div key={`rem-${idx}`} className="border border-red-200 bg-red-50/70 p-3 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between font-semibold text-red-800">
            <span>🔴 ĐÃ XÓA: {p.productName}</span>
            <span className="font-mono">{p.productId || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-red-700/80 mt-1">
            <div>Số lượng: <span className="font-semibold">{p.quantity}</span> {p.unit || 'cái'}</div>
            <div>Đơn giá: <span className="font-semibold">{formatMoney(p.price)}</span></div>
            <div>Thành tiền: <span className="font-semibold">{formatMoney(p.total)}</span></div>
            {p.soNgayBaoHanh ? <div>Bảo hành: <span className="font-semibold">{p.soNgayBaoHanh} ngày</span></div> : null}
          </div>
        </div>
      ))}

      {/* Added items */}
      {added.map((p, idx) => (
        <div key={`add-${idx}`} className="border border-emerald-200 bg-emerald-50/70 p-3 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between font-semibold text-emerald-800">
            <span>🟢 ĐÃ THÊM MỚI: {p.productName}</span>
            <span className="font-mono">{p.productId || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-emerald-700/80 mt-1">
            <div>Số lượng: <span className="font-semibold">{p.quantity}</span> {p.unit || 'cái'}</div>
            <div>Đơn giá: <span className="font-semibold">{formatMoney(p.price)}</span></div>
            <div>Thành tiền: <span className="font-semibold">{formatMoney(p.total)}</span></div>
            {p.soNgayBaoHanh ? <div>Bảo hành: <span className="font-semibold">{p.soNgayBaoHanh} ngày</span></div> : null}
          </div>
        </div>
      ))}

      {/* Modified items */}
      {modified.map((item, idx) => {
        const b = item.before;
        const a = item.after;
        const diffs: { label: string; bVal: string; aVal: string }[] = [];

        if (b.productName !== a.productName) diffs.push({ label: 'Tên sản phẩm', bVal: b.productName, aVal: a.productName });
        if (b.quantity !== a.quantity || b.unit !== a.unit) {
          diffs.push({ label: 'Số lượng', bVal: `${b.quantity} ${b.unit || 'cái'}`, aVal: `${a.quantity} ${a.unit || 'cái'}` });
        }
        if (b.price !== a.price) diffs.push({ label: 'Đơn giá', bVal: formatMoney(b.price), aVal: formatMoney(a.price) });
        if (b.total !== a.total) diffs.push({ label: 'Thành tiền', bVal: formatMoney(b.total), aVal: formatMoney(a.total) });
        if (b.soNgayBaoHanh !== a.soNgayBaoHanh) {
          diffs.push({ label: 'Bảo hành', bVal: b.soNgayBaoHanh ? `${b.soNgayBaoHanh} ngày` : 'Không', aVal: a.soNgayBaoHanh ? `${a.soNgayBaoHanh} ngày` : 'Không' });
        }

        return (
          <div key={`mod-${idx}`} className="border border-slate-200 bg-slate-50/70 p-3 rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800 border-b border-slate-200/50 pb-1.5">
              <span>🟡 THAY ĐỔI: {a.productName}</span>
              <span className="font-mono">{a.productId || 'N/A'}</span>
            </div>
            <div className="space-y-1.5">
              {diffs.map((d, dIdx) => (
                <div key={dIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <span className="text-slate-500 font-medium">{d.label}:</span>
                  <span className="text-red-600 bg-red-50/60 break-all px-1.5 py-0.5 line-through rounded">{d.bVal}</span>
                  <span className="text-emerald-700 bg-emerald-50/60 break-all px-1.5 py-0.5 font-semibold rounded">{d.aVal}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldChanges({ before = {}, after = {} }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) {
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  
  const changes = allKeys.filter((key) => {
    if (key === 'updatedAt' || key === 'createdAt') return false;
    const bVal = JSON.stringify(before[key]);
    const aVal = JSON.stringify(after[key]);
    return bVal !== aVal;
  });

  if (changes.length === 0) {
    return <div className="p-4 text-xs text-slate-500 italic">Không tìm thấy thay đổi thuộc tính cụ thể.</div>;
  }

  return (
    <div className="divide-y divide-slate-100 font-sans">
      {changes.map((key) => {
        const bVal = before[key];
        const aVal = after[key];
        
        if (key === 'products') {
          return (
            <div key={key} className="p-4 flex flex-col gap-3 items-stretch hover:bg-slate-50/50 transition-colors">
              <div className="text-xs font-semibold text-slate-800 border-b border-slate-100 pb-2">
                {formatFieldName(key)}
                <span className="block font-mono text-2xs text-slate-600 font-normal">{key}</span>
              </div>
              <ProductDiffVisualizer beforeVal={bVal} afterVal={aVal} />
            </div>
          );
        }

        return (
          <div key={key} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-start hover:bg-slate-50/50 transition-colors">
            <div className="text-xs font-semibold text-slate-800 self-center">
              {formatFieldName(key)}
              <span className="block font-mono text-2xs text-slate-600 font-normal">{key}</span>
            </div>
            
            <div className="space-y-1">
              {bVal !== undefined && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 line-through break-all">
                  {formatValue(key, bVal)}
                </div>
              )}
              {bVal === undefined && (
                <div className="text-xs text-slate-300 italic px-1">Chưa định nghĩa</div>
              )}
            </div>
            
            <div className="space-y-1">
              {aVal !== undefined && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 font-medium break-all">
                  {formatValue(key, aVal)}
                </div>
              )}
              {aVal === undefined && (
                <div className="text-xs text-slate-600 italic px-1">Đã xóa</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EntityAuditLogs({ entityId, entityType }: { entityId: string, entityType: string }) {
  const [docItemsRaw, setDocItemsRaw] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auditLogsRepo.subscribe({ fkField: 'entityId', fkId: entityId, limit: 100 }, (data) => {
      setDocItemsRaw(data as unknown as AuditLogItem[]);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, [entityId]);

  const typeLower = entityType.toLowerCase();
  
  const logs = docItemsRaw.filter(log => {
      // Filter out ZNS events as they are rendered under the ZNS Tab
      const isZns = String(log.action || '').startsWith('ZNS_') || 
                    ['ZNS_SEND', 'ZNS_CALLBACK', 'VENDOR_WEBHOOK_PROCESSED', 'WORKFLOW_ZNS_TRIGGERED', 'ZNS_PRE_FLIGHT_BLOCKED'].includes(log.action);
      if (isZns) return false;
      
      // Match entityType (singular/plural, case-insensitive)
      const logType = String(log.entityType || '').toLowerCase();
      return logType === typeLower || 
             logType === typeLower + 's' || 
             typeLower === logType + 's';
  }).sort((a, b) => {
      const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tB - tA;
  });

  if (loading) return <div className="text-sm text-slate-600 py-8 flex items-center justify-center">Đang tải lịch sử...</div>;
  if (logs.length === 0) return <div className="text-sm text-slate-600 py-8 flex justify-center">Chưa có bản ghi lịch sử.</div>;

  return (
    <div className="space-y-6">
      {logs.map((log) => {
        return (
          <div key={log.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <div className="flex items-center gap-3">
                 <span className={`px-2 py-0.5 text-2xs font-bold uppercase rounded ${
                   log.action === 'CREATE' ? 'bg-blue-100 text-blue-700' :
                   log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700' : 
                   'bg-red-100 text-red-700'
                 }`}>{log.action}</span>
                 <span className="text-xs font-bold text-slate-700">{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
               </div>
               <span className="text-2xs font-mono text-slate-600">UID: {log.userId}</span>
            </div>
            {(log.action === 'UPDATE' || log.action === 'CREATE') && log.details && (
               <div className="bg-white overflow-hidden max-h-[400px] overflow-y-auto">
                 <FieldChanges before={log.details.before} after={log.details.after} />
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
