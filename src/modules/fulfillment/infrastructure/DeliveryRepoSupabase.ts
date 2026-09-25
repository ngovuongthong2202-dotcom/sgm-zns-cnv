import { DeliveryRepository } from '../domain/DeliveryRepository';
import { Delivery } from '../domain/Delivery';
import { BaseRepository } from '@/src/platform/data/base.repo';

export class DeliveryRepoSupabase extends BaseRepository<any> implements DeliveryRepository {
  constructor() {
    super('deliveries');
  }

  async getById(id: string): Promise<Delivery | null> {
    const data = await super.getById(id);
    if (!data) return null;
    const res = Delivery.create(data, id);
    if (!res.isSuccess) throw new Error(res.error);
    return res.getValue();
  }

  async list(filters?: any): Promise<Delivery[]> {
    const docs = await super.list(filters || {});
    return docs.map(doc => {
      const res = Delivery.create(doc, doc.id);
      if (!res.isSuccess) throw new Error(res.error);
      return res.getValue();
    });
  }

  async save(delivery: Delivery): Promise<void> {
    await this.set(delivery.id, delivery.snapshot);
  }

  async update(idOrDelivery: string | Delivery, data?: any): Promise<void> {
    if (typeof idOrDelivery === 'string') {
      await super.update(idOrDelivery, data || {});
      return;
    }
    await super.update(idOrDelivery.id, idOrDelivery.snapshot);
  }

  async delete(id: string): Promise<void> {
    await this.softDelete(id);
  }
}

export const deliveryRepo = new DeliveryRepoSupabase();
/** @deprecated Use DeliveryRepoSupabase instead */
export const DeliveryRepoFirestore = DeliveryRepoSupabase;
