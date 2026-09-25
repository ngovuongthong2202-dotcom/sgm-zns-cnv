import { ContractRepository } from '../../domain/ContractRepository';
import { Result } from '../../../../platform/domain/Result';

export class DeleteContractUseCase {
  constructor(private readonly repo: ContractRepository) {}

  public async execute(id: string, linkedDeliveriesCount: number, linkedPaymentsCount: number): Promise<Result<void>> {
    const contract = await this.repo.getById(id);
    if (!contract) {
      return Result.fail('Contract not found');
    }

    const canBeDeletedResult = contract.canBeDeleted(linkedDeliveriesCount, linkedPaymentsCount);
    if (!canBeDeletedResult.isSuccess) {
      return Result.fail(canBeDeletedResult.error!);
    }

    await this.repo.delete(id);

    return Result.ok();
  }
}
