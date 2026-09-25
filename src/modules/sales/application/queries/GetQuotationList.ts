import { Quotation } from '../../domain/Quotation';
import { QuotationRepository } from '../../domain/QuotationRepository';
import { Result } from '../../../../platform/domain/Result';

export class GetQuotationListQuery {
  constructor(private readonly repo: QuotationRepository) {}

  public async execute(filters?: any): Promise<Result<Quotation[]>> {
    try {
      const list = await this.repo.list(filters);
      return Result.ok(list);
    } catch (e: any) {
      return Result.fail(e.message || 'Error occurred while getting quotation list');
    }
  }
}
