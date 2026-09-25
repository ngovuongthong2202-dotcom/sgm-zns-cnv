import { Contract } from './Contract';
import { ListOptions } from '@/src/platform/domain/ports/repository.port';

export interface ContractRepository {
  getById(id: string): Promise<Contract | null>;
  list(filters?: ListOptions): Promise<Contract[]>;
  save(contract: Contract): Promise<void>;
  update(contract: Contract): Promise<void>;
  delete(id: string): Promise<void>;
}
