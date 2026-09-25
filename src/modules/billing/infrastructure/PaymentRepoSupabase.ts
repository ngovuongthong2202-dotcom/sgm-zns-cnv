import { Payment } from '../domain/Payment';
import { PaymentRepository } from '../domain/PaymentRepository';
import { BaseRepository } from '../../../platform/data/base.repo';

export class PaymentRepoSupabase extends BaseRepository<any> implements PaymentRepository {
  constructor() {
    super('payments');
  }

  public async getById(id: string): Promise<Payment | null> {
    const data = await super.getById(id);
    if (!data) return null;
    
    // Reconstitute Aggregate
    const props = { ...data };
    const pm = Object.create(Payment.prototype);
    Object.assign(pm, { id, props, _domainEvents: [] });
    return pm;
  }

  public async list(filters?: any): Promise<Payment[]> {
    const rawList = await super.list(filters || {});
    return rawList.map((data: any) => {
      const props = { ...data };
      const pm = Object.create(Payment.prototype);
      Object.assign(pm, { id: data.id, props, _domainEvents: [] });
      return pm;
    });
  }

  public async save(payment: Payment): Promise<void> {
    await this.set(payment.id, payment.props as any);
  }

  public async update(idOrPayment: string | Payment, data?: any): Promise<void> {
    if (typeof idOrPayment === 'string') {
      await super.update(idOrPayment, data || {});
      return;
    }
    await super.update(idOrPayment.id, idOrPayment.props as any);
  }

  public async delete(id: string): Promise<void> {
    await this.softDelete(id);
  }
}

export const paymentRepo = new PaymentRepoSupabase();
/** @deprecated Use PaymentRepoSupabase instead */
export const PaymentRepoFirestore = PaymentRepoSupabase;
