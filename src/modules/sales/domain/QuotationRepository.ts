import { Quotation } from './Quotation';
import { ListOptions } from '@/src/platform/domain/ports/repository.port';

export interface QuotationRepository {
  getById(id: string): Promise<Quotation | null>;
  list(filters?: ListOptions): Promise<Quotation[]>;
  save(quotation: Quotation): Promise<void>;
  update(quotation: Quotation): Promise<void>;
}
