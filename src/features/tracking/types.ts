export type PortalContextType = 'QUOTATION' | 'CONTRACT' | 'ORDER' | 'PAYMENT';

export interface QuotationValidityInfo {
  ngayBaoGiaStr: string;
  ngayHetHanStr: string;
  daysLeft: number;
  isExpired: boolean;
  isValid: boolean;
  badgeClass?: string;
  badgeText?: string;
}

export interface TrackingProductItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
  specifications: string;
  itemType: 'MACHINE' | 'MATERIAL' | 'SERVICE';
  warranty: string;
  serials: string[];
}
