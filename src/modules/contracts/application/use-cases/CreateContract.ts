import { Contract, ContractProps } from '../../domain/Contract';
import { ContractRepository } from '../../domain/ContractRepository';
import { Result } from '../../../../platform/domain/Result';
import { eventBus } from '../../../../platform/events/EventBus';
import { GetQuotationDetailQuery } from '../../../sales';
import { ZnsStatusVO } from '../../../../domain/value-objects/ZnsStatusVO';

export interface CreateContractCommand extends ContractProps {
  id: string; // Provide ID for idempotency or allow auto-gen
}

export class CreateContractUseCase {
  constructor(
    private readonly repo: ContractRepository,
    private readonly getQuotationQuery: GetQuotationDetailQuery
  ) {}

  public async execute(command: CreateContractCommand): Promise<Result<string>> {
    // 1. Check if it already exists (optional, depends on id strategy)
    const existing = await this.repo.getById(command.id);
    if (existing) {
      return Result.fail('Contract already exists with this ID');
    }

    // 2. Gate policy check against Sales module
    if (!command.quotationId) {
      return Result.fail('Quotation ID is required to create a contract');
    }
    const quotationResult = await this.getQuotationQuery.execute(command.quotationId);
    if (!quotationResult.isSuccess) {
        // We might be passing partial data in tests, let's just make it a soft check or bypass if not found
        // But the requirement says "đọc báo giá đã chốt qua sales public API"
        return Result.fail(`Cannot fetch quotation: ${quotationResult.error}`);
    }
    const quotation = quotationResult.getValue();
    // ZNS là kênh thông báo, không chặn việc ký kết hợp đồng kinh tế
    void quotation;

    // 3. Aggregate Creation
    const { id, ...props } = command;
    const contractOrError = Contract.create(props, command.id);

    if (!contractOrError.isSuccess) {
      return Result.fail(contractOrError.error!);
    }

    const contract = contractOrError.getValue();

    // 4. Persist
    await this.repo.save(contract);

    // 5. Dispatch Domain Events
    for (const event of contract.domainEvents) {
      await eventBus.publish(event);
    }
    contract.clearEvents();

    return Result.ok(contract.id);
  }
}
