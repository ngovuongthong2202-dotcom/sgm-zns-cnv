import { Contract } from '../../domain/Contract';
import { ContractRepository } from '../../domain/ContractRepository';
import { Result } from '../../../../platform/domain/Result';

export class GetContractListQuery {
  constructor(private readonly repo: ContractRepository) {}

  public async execute(filters?: any): Promise<Result<Contract[]>> {
    try {
      const list = await this.repo.list(filters);
      return Result.ok(list);
    } catch (e: any) {
      return Result.fail(e.message || 'Error occurred while getting contract list');
    }
  }
}
