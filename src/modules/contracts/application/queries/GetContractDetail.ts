import { Contract } from '../../domain/Contract';
import { ContractRepository } from '../../domain/ContractRepository';
import { Result } from '../../../../platform/domain/Result';

export class GetContractDetailQuery {
  constructor(private readonly repo: ContractRepository) {}

  public async execute(id: string): Promise<Result<Contract>> {
    try {
      const contract = await this.repo.getById(id);
      if (!contract) {
        return Result.fail('Contract not found');
      }
      return Result.ok(contract);
    } catch (e: any) {
      return Result.fail(e.message || 'Error occurred while getting contract detail');
    }
  }
}
