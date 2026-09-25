import { BaseRepository } from '@/src/platform/data/base.repo';
import { Quotation, QuotationProps, QuotationStatus, QuotationType } from '../domain/Quotation';
import { QuotationRepository } from '../domain/QuotationRepository';

/**
 * Enterprise Quotation Repository (Supabase PostgreSQL)
 * Replaces legacy in-memory mock with real PostgreSQL persistence and L1/L2 caching.
 */
export class QuotationRepoSupabase extends BaseRepository<any> implements QuotationRepository {
  constructor() {
    super('quotations');
  }

  public async getById(id: string): Promise<Quotation | null> {
    const data = await super.getById(id);
    if (!data) return null;
    return this.toDomain(id, data);
  }

  public async list(filters?: any): Promise<Quotation[]> {
    const rawList = await super.list(filters || {});
    return rawList.map(item => this.toDomain(item.id, item));
  }

  public async save(quotation: Quotation): Promise<void> {
    const payload = {
      id: quotation.id,
      ...quotation.props,
      customerId: quotation.props.customerId,
      updatedAt: new Date().toISOString()
    };
    await this.set(quotation.id, payload);
  }

  public async update(idOrQuotation: string | Quotation, data?: any): Promise<void> {
    if (typeof idOrQuotation === 'string') {
      await super.update(idOrQuotation, data || {});
      return;
    }
    await this.save(idOrQuotation);
  }

  private toDomain(id: string, data: any): Quotation {
    const qProps: QuotationProps = {
      customerId: data.customerId,
      type: data.type || (data.loai as QuotationType) || QuotationType.MACHINE,
      items: data.items || data.products || [],
      subtotal: data.subtotal || data.subTotal || 0,
      discount: data.discount || data.discountAmount || 0,
      vatAmount: data.vatAmount || 0,
      totalAmount: data.totalAmount || 0,
      status: data.status || (data.lifecycleStatus as QuotationStatus) || QuotationStatus.DRAFT,
      sentAt: data.sentAt,
      znsStatus: data.znsStatus || data.trangThaiGuiTinBaoGia,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      ...data
    };
    const q = Object.create(Quotation.prototype);
    Object.assign(q, { id, props: qProps, _domainEvents: [] });
    return q;
  }
}

export const quotationRepo = new QuotationRepoSupabase();
/** @deprecated Use QuotationRepoSupabase instead */
export const QuotationRepoFirestore = QuotationRepoSupabase;
