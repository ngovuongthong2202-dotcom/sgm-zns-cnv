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

    let query: any = adminDb.collection('znsTemplates')
      .where('templateKey', '==', templateKey)
      .where('isActive', '==', true);

    if (paymentSubtype) {
      query = query.where('paymentSubtype', '==', paymentSubtype);
    }

    const snapshot = await query.orderBy('version', 'desc').limit(1).get();

    if (snapshot.empty) {
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
      return null;
    }

    const template = snapshot.docs[0].data() as ZnsTemplate;
    this.cache.set(cacheKey, { tpl: template, ts: now });
    return template;
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
    
    if (sourceField.includes('[]')) {
      const parts = sourceField.split('[].');
      if (parts.length === 2) {
        const arr = get(doc, parts[0]);
        if (Array.isArray(arr)) {
          return arr.map((item: unknown) => get(item, parts[1]) as unknown)
                    .filter((v: unknown) => v !== undefined && v !== null && v !== '')
                    .join(' | ');
        }
      } else {
        return get(doc, sourceField.replace('[]', ''));
      }
    }
    return get(doc, sourceField);
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
