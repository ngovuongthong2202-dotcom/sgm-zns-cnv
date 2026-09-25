import { Quotation } from '../../domain/Quotation';
import { QuotationRepository } from '../../domain/QuotationRepository';
import { Result } from '../../../../platform/domain/Result';

export class GetQuotationDetailQuery {
  constructor(private readonly repo: QuotationRepository) {}

  public async execute(id: string): Promise<Result<Quotation>> {
    try {
      const quotation = await this.repo.getById(id);
      if (!quotation) {
        return Result.fail('Quotation not found');
      }
      return Result.ok(quotation);
    } catch (e: any) {
      return Result.fail(e.message || 'Error occurred while getting quotation detail');
    }
  }
}
