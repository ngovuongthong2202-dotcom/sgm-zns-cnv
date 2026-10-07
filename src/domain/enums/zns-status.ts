import { AlertTriangle, CheckCircle, Clock, Send, XCircle } from 'lucide-react';
import { ZnsStatusVO } from '../value-objects/ZnsStatusVO';

export enum ZnsMessageType {
  CUSTOMER_PRE_QUOTE = 'CUSTOMER_PRE_QUOTE',
  BAOGIA = 'BAOGIA',
  HOPDONG_SIGN_ZNS = 'HOPDONG_SIGN_ZNS',
  THANH_TOAN_TAT_TOAN = 'THANH_TOAN_TAT_TOAN',
  THANH_TOAN_CONG_NO = 'THANH_TOAN_CONG_NO',
  THANH_TOAN_CONG_NO_DEN_HAN = 'THANH_TOAN_CONG_NO_DEN_HAN',
  THANH_TOAN_XAC_NHAN = 'THANH_TOAN_XAC_NHAN',
  GIAOHANG_ZNS = 'GIAOHANG_ZNS',
  GIAOHANG_HOANTAT = 'GIAOHANG_HOANTAT',
  GIAOHANG_BAOHANH = 'GIAOHANG_BAOHANH'
}

export enum ZnsInternalStatus {
  INIT = 'INIT',
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  SENT_WAITING = 'SENT_WAITING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  DLQ = 'DLQ',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED'
}

export enum EntityZnsStatus {
  CHUA_GUI = 'CHƯA GỬI',
  DANG_DAY = 'ĐANG ĐẨY',
  DA_DAY_CHO_KQ = 'ĐÃ ĐẨY - CHỜ KQ',
  THANH_CONG = 'THÀNH CÔNG',
  THAT_BAI = 'THẤT BẠI',
  CAN_GUI_LAI = 'CẦN GỬI LẠI',
  VUOT_HAN_MUC = 'VƯỢT HẠN MỨC'
}

export function mapInternalToEntityStatus(s: ZnsInternalStatus): EntityZnsStatus {
  switch (s) {
    case ZnsInternalStatus.INIT:
    case ZnsInternalStatus.PENDING:
      return EntityZnsStatus.CHUA_GUI;
    case ZnsInternalStatus.SENDING:
      return EntityZnsStatus.DANG_DAY;
    case ZnsInternalStatus.SENT_WAITING:
      return EntityZnsStatus.DA_DAY_CHO_KQ;
    case ZnsInternalStatus.SUCCESS:
      return EntityZnsStatus.THANH_CONG;
    case ZnsInternalStatus.FAILED:
    case ZnsInternalStatus.DLQ:
      return EntityZnsStatus.THAT_BAI;
    case ZnsInternalStatus.LIMIT_EXCEEDED:
      return EntityZnsStatus.VUOT_HAN_MUC;
    default:
      return EntityZnsStatus.CHUA_GUI;
  }
}

export function normalizeLegacyStatus(legacy?: string | null): EntityZnsStatus {
  return ZnsStatusVO.fromString(legacy);
}

/**
 * Kiểm tra trạng thái có phải là thành công hay không (hỗ trợ mọi biến thể có dấu, không dấu, uppercase, v.v.)
 */
export function isZnsSuccessStatus(status?: string | null): boolean {
  if (!status) return false;
  const normalized = normalizeLegacyStatus(status);
  if (normalized === EntityZnsStatus.THANH_CONG) return true;
  const s = String(status).toLowerCase().trim();
  return (
    s === 'success' ||
    s === 'sent' ||
    s === 'ok' ||
    s === 'true' ||
    s.includes('thành công') ||
    s.includes('thanh_cong') ||
    s.includes('thanh cong') ||
    s.includes('đã gửi') ||
    s.includes('da_gui')
  );
}

export function getStatusBadgeMeta(legacyStatus?: string | null) {
  const status = normalizeLegacyStatus(legacyStatus);
  
  switch (status) {
    case EntityZnsStatus.THANH_CONG:
      return { 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
        icon: CheckCircle, 
        label: EntityZnsStatus.THANH_CONG 
      };
    case EntityZnsStatus.DA_DAY_CHO_KQ:
      return { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        icon: Clock, 
        label: EntityZnsStatus.DA_DAY_CHO_KQ 
      };
    case EntityZnsStatus.DANG_DAY:
      return { 
        color: 'bg-amber-100 text-amber-800 border-amber-200', 
        icon: Send, 
        label: EntityZnsStatus.DANG_DAY 
      };
    case EntityZnsStatus.THAT_BAI:
      return { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle, 
        label: EntityZnsStatus.THAT_BAI 
      };
    case EntityZnsStatus.CAN_GUI_LAI:
        return { 
          color: 'bg-slate-100 text-slate-800 border-slate-200', 
          icon: AlertTriangle, 
          label: EntityZnsStatus.CAN_GUI_LAI 
        };
    case EntityZnsStatus.VUOT_HAN_MUC:
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: AlertTriangle, 
          label: EntityZnsStatus.VUOT_HAN_MUC 
        };
    case EntityZnsStatus.CHUA_GUI:
    default:
      return { 
        color: 'bg-slate-100 text-slate-800 border-slate-200', 
        icon: Clock, 
        label: EntityZnsStatus.CHUA_GUI 
      };
  }
}
