import { Contract } from '../domain/Contract';
import { ContractRepository } from '../domain/ContractRepository';
import { BaseRepository } from '../../../platform/data/base.repo';

export class ContractRepoSupabase extends BaseRepository<any> implements ContractRepository {
  constructor() {
    super('contracts');
  }

  public async getById(id: string): Promise<Contract | null> {
    const data = await super.getById(id);
    if (!data) return null;
    
    // Reconstitute Aggregate
    const cProps = { ...data };
    const c = Object.create(Contract.prototype);
    Object.assign(c, { id, props: cProps, _domainEvents: [] });
    return c;
  }

  public async list(filters?: any): Promise<Contract[]> {
    const rawList = await super.list(filters || {});
    return rawList.map((data: any) => {
      const cProps = { ...data };
      const c = Object.create(Contract.prototype);
      Object.assign(c, { id: data.id, props: cProps, _domainEvents: [] });
      return c;
    });
  }

  public async save(contract: Contract): Promise<void> {
    await this.set(contract.id, contract.props as any);
  }

  public async update(idOrContract: string | Contract, data?: any): Promise<void> {
    if (typeof idOrContract === 'string') {
      await super.update(idOrContract, data || {});
      return;
    }
    await super.update(idOrContract.id, idOrContract.props as any);
  }

  public async delete(id: string): Promise<void> {
    await this.softDelete(id);
  }
}

export const contractRepo = new ContractRepoSupabase();
/** @deprecated Use ContractRepoSupabase instead */
export const ContractRepoFirestore = ContractRepoSupabase;
