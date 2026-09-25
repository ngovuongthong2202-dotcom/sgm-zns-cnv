import { Payment } from '../../domain/Payment';
import { PaymentRepository } from '../../domain/PaymentRepository';
import { PaymentProps } from '../../domain/Payment';
import { Result } from '../../../../platform/domain/Result';
import { eventBus } from '../../../../platform/events/EventBus';
import { GetQuotationDetailQuery } from '../../../sales';
import { GetContractDetailQuery } from '../../../contracts';
import { canCreatePayment } from '../../../../domain/policy/gate.policy';

export interface CreatePaymentCommand extends PaymentProps {
  id: string; 
}

export class CreatePaymentUseCase {
  constructor(
    private readonly repo: PaymentRepository,
    private readonly getQuotationQuery: GetQuotationDetailQuery,
    private readonly getContractQuery: GetContractDetailQuery
  ) {}

  public async execute(command: CreatePaymentCommand): Promise<Result<string>> {
    const existing = await this.repo.getById(command.id);
    if (existing) {
      return Result.fail('Payment already exists with this ID');
    }

    let sourceObj: any = null;
    
    // contract takes precedence
    if (command.contractId) {
       const contractR = await this.getContractQuery.execute(command.contractId);
       if (contractR.isSuccess) {
           sourceObj = contractR.getValue().props;
       }
    } else if (command.quotationId) {
       const quotR = await this.getQuotationQuery.execute(command.quotationId);
       if (quotR.isSuccess) {
           sourceObj = quotR.getValue().props;
       }
    }
    
    if (sourceObj) {
        const canCreate = canCreatePayment(sourceObj);
        if (!canCreate.allowed) {
            return Result.fail(canCreate.reason || "Lỗi policy khởi tạo thanh toán.");
        }
    }

    const { id, ...props } = command;
    const pmOrError = Payment.create(props, command.id);

    if (!pmOrError.isSuccess) {
      return Result.fail(pmOrError.error!);
    }

    const pm = pmOrError.getValue();
    await this.repo.save(pm);

    for (const event of pm.domainEvents) {
      await eventBus.publish(event);
    }
    pm.clearEvents();

    return Result.ok(pm.id);
  }
}
