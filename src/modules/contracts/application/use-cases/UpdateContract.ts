import { ContractProps } from '../../domain/Contract';
import { ContractRepository } from '../../domain/ContractRepository';
import { Result } from '../../../../platform/domain/Result';
import { eventBus } from '../../../../platform/events/EventBus';

export interface UpdateContractCommand extends Partial<ContractProps> {
  id: string;
}

export class UpdateContractUseCase {
  constructor(private readonly repo: ContractRepository) {}

  public async execute(command: UpdateContractCommand): Promise<Result<void>> {
    const contract = await this.repo.getById(command.id);
    if (!contract) {
      return Result.fail('Contract not found');
    }

    // Merge properties
    const { id, ...props } = command;
    Object.assign(contract.props, props);

    await this.repo.update(contract);

    // Dispatch Events
    for (const event of contract.domainEvents) {
      await eventBus.publish(event);
    }
    contract.clearEvents();

    return Result.ok();
  }
}
