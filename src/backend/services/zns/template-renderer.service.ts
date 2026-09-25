import { adminDb } from '../../config/supabase.admin';
import lodash from 'lodash';
const { get } = lodash;
import { format } from 'date-fns';
import { ZnsTemplate } from '../../../domain/schema/zns-template.schema';
import { z } from 'zod';
import { CustomerSchema } from '../../../domain/schema/customer.schema';
import { ContractSchema } from '../../../domain/schema/contract.schema';
import { QuotationSchema } from '../../../domain/schema/quotation.schema';
import { PaymentSchema } from '../../../domain/schema/payment.schema';
import { DeliverySchema } from '../../../domain/schema/delivery.schema';

export type AnyEntity = 
  | z.infer<typeof CustomerSchema>
  | z.infer<typeof ContractSchema>
  | z.infer<typeof QuotationSchema>
  | z.infer<typeof PaymentSchema>
  | z.infer<typeof DeliverySchema>
  | Record<string, unknown>;

const BUILTIN_DEFAULT_TEMPLATES: Record<string, ZnsTemplate> = {
  CUSTOMER_PRE_QUOTE: {
    templateKey: 'CUSTOMER_PRE_QUOTE',
    label: 'Tin nhắn giới thiệu (trước báo giá)',
    entityType: 'CUSTOMER',
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'SYSTEM',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF', format: 'raw' },
    ],
  },
  BAOGIA: {
    templateKey: 'BAOGIA',
    label: 'Tin nhắn báo giá',
    entityType: 'QUOTATION',
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'SYSTEM',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'so_phieu_bao_gia', label: 'Số phiếu BG', sourceField: 'soPhieuBaoGia', sourceEntity: 'SELF', format: 'raw' },
      { name: 'ngay_bao_gia', label: 'Ngày BG', sourceField: 'ngayBaoGia', format: 'date', sourceEntity: 'SELF' },
      { name: 'ngay_het_han', label: 'Ngày hết hạn', sourceField: 'ngayHetHan', format: 'date', sourceEntity: 'SELF' },
      { name: 'sl_may', label: 'SL máy', sourceField: 'slMay', format: 'number', sourceEntity: 'SELF' },
      { name: 'nguoi_phu_trach', label: 'Người PT', sourceField: 'nguoiPhuTrach', sourceEntity: 'SELF', format: 'raw' },
    ],
  },
  HOPDONG_SIGN_ZNS: {
    templateKey: 'HOPDONG_SIGN_ZNS',
    label: 'Tin nhắn ký hợp đồng',
    entityType: 'CONTRACT',
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'SYSTEM',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF', format: 'raw' },
      { name: 'order_code', label: 'Mã HĐ (order_code)', sourceField: 'soHopDong', sourceEntity: 'SELF', format: 'raw' },
      { name: 'So_don_hang', label: 'Số đơn hàng', sourceField: 'soDonHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'ngay_ky', label: 'Ngày ký', sourceField: 'ngayKy', format: 'date', sourceEntity: 'SELF' },
      { name: 'so_ngay', label: 'Số ngày hoàn thành', sourceField: 'soNgayDuKienHoanThanh', format: 'number', sourceEntity: 'SELF' },
      { name: 'so_phieu', label: 'Số phiếu BG nguồn', sourceField: 'soPhieuBaoGia', sourceEntity: 'SELF', format: 'raw' },
      { name: 'nhan_vien', label: 'Nhân viên PT', sourceField: 'nguoiPhuTrach', sourceEntity: 'SELF', format: 'raw' },
    ],
  },
  THANH_TOAN_TAT_TOAN: {
    templateKey: 'THANH_TOAN_TAT_TOAN',
    label: 'Tin nhắn thanh toán — Tất toán',
    entityType: 'PAYMENT',
    paymentSubtype: 'TAT_TOAN',
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'SYSTEM',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF', format: 'raw' },
      { name: 'so_don_hang', label: 'Số đơn hàng', sourceField: 'soDonHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'so_hop_dong', label: 'Số HĐ', sourceField: 'soHopDong', sourceEntity: 'SELF', format: 'raw' },
      { name: 'ngay_thanh_toan', label: 'Ngày TT', sourceField: 'ngayThanhToan', format: 'date', sourceEntity: 'SELF' },
      { name: 'so_luong', label: 'Số lượng', sourceField: 'slMay', format: 'number', sourceEntity: 'SELF' },
      { name: 'dvt', label: 'ĐVT', sourceField: 'dvt', sourceEntity: 'SELF', format: 'raw' },
    ],
  },
  THANH_TOAN_CONG_NO: {
    templateKey: 'THANH_TOAN_CONG_NO',
    label: 'Tin nhắn thanh toán — Công nợ',
    entityType: 'PAYMENT',
    paymentSubtype: 'CONG_NO',
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'SYSTEM',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF', format: 'raw' },
      { name: 'order_code', label: 'Mã HĐ', sourceField: 'soHopDong', sourceEntity: 'SELF', format: 'raw' },
      { name: 'so_don_hang', label: 'Số đơn hàng', sourceField: 'soDonHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'so_hop_dong', label: 'Số HĐ', sourceField: 'soHopDong', sourceEntity: 'SELF', format: 'raw' },
      { name: 'time', label: 'Thời điểm ghi nhận', sourceField: 'ngayThanhToan', format: 'date', sourceEntity: 'SELF' },
      { name: 'so_luong', label: 'Số lượng', sourceField: 'slMay', format: 'number', sourceEntity: 'SELF' },
      { name: 'dvt', label: 'ĐVT', sourceField: 'dvt', sourceEntity: 'SELF', format: 'raw' },
    ],
  },
  GIAOHANG_ZNS: {
    templateKey: 'GIAOHANG_ZNS',
    label: 'Tin nhắn giao hàng',
    entityType: 'DELIVERY',
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'SYSTEM',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF', format: 'raw' },
      { name: 'So_hop_dong', label: 'Số HĐ', sourceField: 'soHopDong', sourceEntity: 'SELF', format: 'raw' },
      { name: 'So_don_hang', label: 'Số đơn hàng', sourceField: 'soDonHang', sourceEntity: 'SELF', format: 'raw' },
      { name: 'so_phieu_xuat', label: 'Số phiếu xuất', sourceField: 'soPhieuXuat', sourceEntity: 'SELF', format: 'raw' },
      { name: 'ngay_giao_may', label: 'Ngày giao', sourceField: 'ngayGiaoMay', format: 'date', sourceEntity: 'SELF' },
      { name: 'danh_sach_ma_may', label: 'Danh sách mã máy', sourceField: 'danhSachMaMay', sourceEntity: 'SELF', format: 'raw' },
      { name: 'so_luong', label: 'Số lượng', sourceField: 'slMay', format: 'number', sourceEntity: 'SELF' },
      { name: 'dvt', label: 'ĐVT', sourceField: 'dvt', sourceEntity: 'SELF', format: 'raw' },
    ],
  },
};

export class TemplateRendererService {
  private cache: Map<string, { tpl: ZnsTemplate; ts: number }> = new Map();

  constructor() {}

  invalidateCache(templateKey: string) {
      this.cache.delete(templateKey);
  }

  async getTemplate(templateKey: string, paymentSubtype?: string): Promise<ZnsTemplate | null> {
    const cacheKey = paymentSubtype ? `${templateKey}_${paymentSubtype}` : templateKey;
    const now = Date.now();

    // Cache TTL: 60 seconds
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.ts < 60000) {
        return cached.tpl;
    }

    try {
      let query: any = adminDb.collection('znsTemplates')
        .where('templateKey', '==', templateKey)
        .where('isActive', '==', true);

      if (paymentSubtype) {
        query = query.where('paymentSubtype', '==', paymentSubtype);
      }

      const snapshot = await query.orderBy('version', 'desc').limit(1).get();

      if (!snapshot.empty) {
        const template = snapshot.docs[0].data() as ZnsTemplate;
        this.cache.set(cacheKey, { tpl: template, ts: now });
        return template;
      }

      if (paymentSubtype) {
        const fallbackSnapshot = await adminDb.collection('znsTemplates')
          .where('templateKey', '==', templateKey)
          .where('isActive', '==', true)
          .orderBy('version', 'desc').limit(1).get();
        if (!fallbackSnapshot.empty) {
          const tpl = fallbackSnapshot.docs[0].data() as ZnsTemplate;
          this.cache.set(cacheKey, { tpl, ts: now });
          return tpl;
        }
      }
    } catch (err) {
      console.warn('Query znsTemplates from DB failed, using builtin fallback:', err);
    }

    // Builtin default fallback
    const fallbackTemplate = BUILTIN_DEFAULT_TEMPLATES[cacheKey] || BUILTIN_DEFAULT_TEMPLATES[templateKey] || null;
    if (fallbackTemplate) {
      this.cache.set(cacheKey, { tpl: fallbackTemplate, ts: now });
      return fallbackTemplate;
    }

    return null;
  }

  async render(templateKey: string, entity: AnyEntity, opts?: { paymentSubtype?: string, templateOverride?: ZnsTemplate }): Promise<Record<string, unknown>> {
    const defaultOutput: Record<string, unknown> = { __version: 0 };
    if (!entity) return defaultOutput;

    const template = opts?.templateOverride || await this.getTemplate(templateKey, opts?.paymentSubtype);
    if (!template) {
        return defaultOutput;
    }

    const output: Record<string, unknown> = { __version: template.version };

    // Batch resolve related entities to avoid N+1 queries
    const relatedEntitiesCache: Record<string, AnyEntity | null> = { 'SELF': entity };
    const requiredEntities = new Set(template.variables.map(v => v.sourceEntity || 'SELF'));

    for (const sourceEntity of requiredEntities) {
       if (sourceEntity === 'SELF') continue;
       relatedEntitiesCache[sourceEntity] = await this.resolveRelatedEntity(sourceEntity, entity);
    }

    for (const variable of template.variables) {
      try {
        let value: unknown = undefined;
        let resolvedSource: 'self_snapshot' | 'related' | 'fallback' | 'empty' = 'empty';
        
        // ─────────────────────────────────────────
        // BƯỚC 1: Thử SELF snapshot TRƯỚC
        // ─────────────────────────────────────────
        // Mọi entity (Quotation/Contract/Payment/Delivery) đều có snapshot fields.
        // Kể cả khi user config sourceEntity='CUSTOMER', vẫn ưu tiên snapshot trên SELF
        // để giảm round-trip + tránh fail khi customerId thiếu.
        
        const selfValue = this.extractValue(entity, variable.sourceField);
        if (this.isMeaningful(selfValue)) {
          value = selfValue;
          resolvedSource = 'self_snapshot';
        }
        
        // ─────────────────────────────────────────
        // BƯỚC 2: Thử related entity nếu SELF không có
        // ─────────────────────────────────────────
        if (value === undefined && variable.sourceEntity && variable.sourceEntity !== 'SELF') {
          const resolvedDoc = relatedEntitiesCache[variable.sourceEntity];
          if (resolvedDoc) {
            const relatedValue = this.extractValue(resolvedDoc, variable.sourceField);
            if (this.isMeaningful(relatedValue)) {
              value = relatedValue;
              resolvedSource = 'related';
            }
          }
        }
        
        // ─────────────────────────────────────────
        // BƯỚC 3: Explicit fallback nếu user set
        // ─────────────────────────────────────────
        if (value === undefined && variable.fallback !== undefined && variable.fallback !== null && variable.fallback !== '') {
          value = variable.fallback;
          resolvedSource = 'fallback';
        }
        
        // ─────────────────────────────────────────
        // BƯỚC 4: Empty preserving
        // ─────────────────────────────────────────
        if (value === undefined) {
          output[variable.name] = '';
          continue;
        }
        
        // Format value
        output[variable.name] = this.formatValue(value, variable.format);
        
        // Trace source cho debug (chỉ trong dev/audit)
        if (process.env.NODE_ENV !== 'production') {
          const sources = (output.__sources as Record<string, string> || {});
          sources[variable.name] = resolvedSource;
          output.__sources = sources;
        }
        
      } catch (error) {
         console.warn(`Error resolving variable ${variable.name}:`, error);
         output[variable.name] = variable.fallback || '';
      }
    }

    return output;
  }

  async validate(templateKey: string, entity: AnyEntity, opts?: { paymentSubtype?: string }): Promise<{
    ok: boolean;
    missing: string[];
    resolved: Record<string, { value: string; source: 'mapped'|'fallback'|'empty' }>;
  }> {
    const template = await this.getTemplate(templateKey, opts?.paymentSubtype);
    if (!template) return { ok: false, missing: ['__no_template__'], resolved: {} };
    
    const rendered = await this.render(templateKey, entity, opts);
    delete rendered.__version;
    
    const missing: string[] = [];
    const resolved: Record<string, { value: string; source: 'mapped'|'fallback'|'empty' }> = {};
    
    for (const variable of template.variables) {
      const val = rendered[variable.name];
      if (val === '' || val === null || val === undefined) {
        missing.push(variable.name);
        resolved[variable.name] = { value: '', source: 'empty' };
      } else if (variable.fallback && val === variable.fallback) {
        resolved[variable.name] = { value: String(val), source: 'fallback' };
      } else {
        resolved[variable.name] = { value: String(val), source: 'mapped' };
      }
    }
    
    return { ok: missing.length === 0, missing, resolved };
  }

  private async resolveRelatedEntity(targetEntityType: string, currentEntity: AnyEntity): Promise<AnyEntity | null> {
       try {
           let collectionName = targetEntityType.toLowerCase() + 's';
           if (targetEntityType === 'DELIVERY') collectionName = 'deliveries';
           
           const currentRecord = currentEntity as Record<string, unknown>;
           // Check if current entity IS the target type implicitly
           const isImplicitMatch = 
              (targetEntityType === 'CUSTOMER' && (!currentRecord.customerId && (currentRecord.maSoThue !== undefined || currentRecord.contacts !== undefined || currentRecord.tenKhachHang !== undefined))) ||
              (targetEntityType === 'CONTRACT' && currentRecord.soHopDong !== undefined && !currentRecord.paymentId && !currentRecord.deliveryId) ||
              (targetEntityType === 'QUOTATION' && currentRecord.soPhieuBaoGia !== undefined && !currentRecord.soHopDong && !currentRecord.paymentId && !currentRecord.deliveryId) ||
              (targetEntityType === 'PAYMENT' && currentRecord.paymentId !== undefined && !currentRecord.deliveryId) ||
              (targetEntityType === 'DELIVERY' && currentRecord.deliveryId !== undefined);

           if (isImplicitMatch) {
               return currentEntity; // It is already the entity we want
           }

           // Need a link. Typically currentEntity has customerId, contractId, etc.
           let refId: unknown = null;
           if (targetEntityType === 'CUSTOMER') refId = currentRecord.customerId;
           else if (targetEntityType === 'CONTRACT') refId = currentRecord.contractId;
           else if (targetEntityType === 'QUOTATION') refId = currentRecord.quotationId;
           
           if (!refId || typeof refId !== 'string') return null;

           const docRef = await adminDb.collection(collectionName).doc(refId).get();
           return docRef.exists ? (docRef.data() as AnyEntity) : null;

       } catch (error) {
           console.error("Error resolving related entity", error);
           return null;
       }
  }

  /** Extract value với hỗ trợ array path `contacts[0].nguoiDaiDien` và collection path `contacts[].sdt` */
  private extractValue(doc: AnyEntity, sourceField: string): unknown {
    if (!doc || !sourceField) return undefined;
    
    let val: unknown = undefined;
    if (sourceField.includes('[]')) {
      const parts = sourceField.split('[].');
      if (parts.length === 2) {
        const arr = get(doc, parts[0]);
        if (Array.isArray(arr)) {
          val = arr.map((item: unknown) => get(item, parts[1]) as unknown)
                    .filter((v: unknown) => v !== undefined && v !== null && v !== '')
                    .join(' | ');
        }
      } else {
        val = get(doc, sourceField.replace('[]', ''));
      }
    } else {
      val = get(doc, sourceField);
    }

    // Fallback: check inside doc.payload if doc is a wrapped payload
    if (!this.isMeaningful(val) && (doc as any).payload && typeof (doc as any).payload === 'object') {
      val = get((doc as any).payload, sourceField);
    }

    // Smart aliases fallback cho các trường phổ biến
    if (!this.isMeaningful(val)) {
      if (sourceField === 'tenKhachHang') {
        val = (doc as any).tenKhachHang || (doc as any).customer_name || (doc as any).customerName || (doc as any).name || (doc as any).contacts?.[0]?.nguoiDaiDien || (doc as any).nguoiDaiDien;
      } else if (sourceField === 'sdt') {
        val = (doc as any).sdt || (doc as any).phone || (doc as any).soDienThoai || (doc as any).phoneNumber || (doc as any).contacts?.[0]?.sdt;
      } else if (sourceField === 'soHopDong') {
        val = (doc as any).soHopDong || (doc as any).maHopDong || (doc as any).order_code;
      } else if (sourceField === 'soDonHang') {
        val = (doc as any).soDonHang || (doc as any).maDonHang;
      } else if (sourceField === 'soPhieuBaoGia') {
        val = (doc as any).soPhieuBaoGia || (doc as any).maBaoGia;
      }
    }

    return val;
  }

  /** Một giá trị được coi là "có nghĩa" — không undefined/null/'' */
  private isMeaningful(v: unknown): boolean {
    return v !== undefined && v !== null && v !== '';
  }

  private formatValue(value: unknown, formatType: string): string { 
    if (value === null || value === undefined) return '';
    
    switch (formatType) {
      case 'date':
        if (typeof value === 'object' && value && '_seconds' in value) {
           // Firestore timestamp
           return format(new Date((value as { _seconds: number })._seconds * 1000), 'dd/MM/yyyy');
        } else if (typeof value === 'string' || value instanceof Date) {
           return format(new Date(value), 'dd/MM/yyyy');
        }
        return String(value);
      case 'number':
        return Number(value).toString();
      case 'currency':
        return Number(value).toLocaleString('vi-VN');
      case 'raw':
      default:
        return String(value);
    }
  }
}

export const templateRendererService = new TemplateRendererService();
