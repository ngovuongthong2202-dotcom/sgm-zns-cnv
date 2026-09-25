import { Payment } from './Payment';
import { ListOptions } from '@/src/platform/domain/ports/repository.port';

export interface PaymentRepository {
  getById(id: string): Promise<Payment | null>;
  list(filters?: ListOptions): Promise<Payment[]>;
  save(payment: Payment): Promise<void>;
  update(payment: Payment): Promise<void>;
  delete(id: string): Promise<void>;
}
