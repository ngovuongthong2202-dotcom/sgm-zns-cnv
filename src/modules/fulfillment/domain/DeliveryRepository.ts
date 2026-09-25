import { Delivery } from './Delivery';
import { ListOptions } from '@/src/platform/domain/ports/repository.port';

export interface DeliveryRepository {
  getById(id: string): Promise<Delivery | null>;
  list(filters?: ListOptions): Promise<Delivery[]>;
  save(delivery: Delivery): Promise<void>;
  update(delivery: Delivery): Promise<void>;
  delete(id: string): Promise<void>;
}
