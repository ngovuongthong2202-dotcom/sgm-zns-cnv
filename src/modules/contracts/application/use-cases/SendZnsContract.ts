import { ContractRepository } from '../../domain/ContractRepository';
import { Result } from '../../../../platform/domain/Result';
import { eventBus } from '../../../../platform/events/EventBus';
// if we want to emit zns request

export class SendZnsContractUseCase {
  constructor(private readonly repo: ContractRepository) {}

  public async execute(id: string): Promise<Result<void>> {
    const contract = await this.repo.getById(id);
    if (!contract) {
      return Result.fail('Contract not found');
    }

    // Trigger generic ZNS request event or directly update status as pending.
    contract.requestZns();

    // Or we simply return ok and let UI call the api. The existing UI likely calls `/api/zns/send/contract`.
    
    // Dispatch Events
    for (const event of contract.domainEvents) {
      await eventBus.publish(event);
    }
    contract.clearEvents();

    return Result.ok();
  }
}
