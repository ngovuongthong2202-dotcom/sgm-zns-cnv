import { AggregateRoot } from '../../../platform/domain/AggregateRoot';
import { Result } from '../../../platform/domain/Result';
import { Money } from '../../../platform/domain/Money';
import { QuotationCreated, QuotationZnsSucceeded } from '../../../platform/events/WorkflowEvents';

export enum QuotationType {
  MACHINE = 'BG Máy',
  MATERIAL = 'BG Vật tư',
  SERVICE = 'BG Dịch vụ'
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export interface QuotationItem {
  productId: string;
  quantity: number;
  unitPrice: number; // Value in raw number for persistence, but we should calculate with Money
}

export interface QuotationProps {
  customerId: string;
  type: QuotationType;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  vatAmount: number;
  totalAmount: number;
  status: QuotationStatus;
  sentAt?: Date;
  znsStatus?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown; // Allow legacy UI fields safely
}

export class Quotation extends AggregateRoot<QuotationProps> {
  private constructor(props: QuotationProps, id: string) {
    super(props, id);
  }

  public static create(
    props: Omit<QuotationProps, 'status' | 'createdAt' | 'updatedAt' | 'subtotal' | 'totalAmount'> & {
      items: QuotationItem[];
      discount?: number;
      vatAmount?: number;
      vatRate?: number;
    },
    id: string
  ): Result<Quotation> {
    
    // Pricing rule using Money
    let subtotalValue = 0;
    for (const item of props.items) {
      if (item.quantity <= 0) return Result.fail("Quantity must be greater than 0");
      if (item.unitPrice < 0) return Result.fail("Unit price cannot be negative");
      subtotalValue += item.quantity * item.unitPrice;
    }
    
    const subtotalResult = Money.create(subtotalValue);
    if (!subtotalResult.isSuccess) return Result.fail(subtotalResult.error!);
    
    // Precision discount calculation
    const discountVal = Number(props.discount) || 0;
    const discountResult = Money.create(discountVal >= 0 ? discountVal : 0);
    if (!discountResult.isSuccess) return Result.fail(discountResult.error!);

    const afterDiscount = subtotalResult.getValue().subtract(discountResult.getValue());
    if (!afterDiscount.isSuccess) return Result.fail(afterDiscount.error!);

    // Precision VAT calculation
    let vatVal = Number(props.vatAmount) || 0;
    if (!vatVal && typeof props.vatRate === 'number' && props.vatRate > 0) {
      vatVal = Math.round((afterDiscount.getValue().amount * props.vatRate) / 100);
    }
    const vatAmountResult = Money.create(vatVal >= 0 ? vatVal : 0);
    if (!vatAmountResult.isSuccess) return Result.fail(vatAmountResult.error!);

    const totalAmountResult = afterDiscount.getValue().add(vatAmountResult.getValue());

    const fullProps = {
      ...props,
      status: QuotationStatus.DRAFT,
      subtotal: subtotalResult.getValue().amount,
      discount: discountResult.getValue().amount,
      vatAmount: vatAmountResult.getValue().amount,
      totalAmount: totalAmountResult.amount,
      createdAt: new Date(),
      updatedAt: new Date()
    } as QuotationProps;

    const quotation = new Quotation(fullProps, id);
    
    quotation.addDomainEvent(new QuotationCreated(id, {
      customerId: props.customerId,
      totalAmount: quotation.props.totalAmount,
      type: props.type
    }));

    return Result.ok(quotation);
  }

  /**
   * Gate Policy: Check what the next step should be based on Quotation Type
   */
  public getNextStep(): string {
    if (this.props.type === QuotationType.MACHINE) {
      return 'Requires_Contract';
    } else {
      return 'Requires_Payment'; // 'BG Vật tư' & 'BG Dịch vụ' can go straight to payment
    }
  }

  public canTransitionTo(newStatus: QuotationStatus): boolean {
    // Basic status transition guard
    if (this.props.status === QuotationStatus.DRAFT && newStatus === QuotationStatus.SENT) return true;
    if (this.props.status === QuotationStatus.SENT && (newStatus === QuotationStatus.ACCEPTED || newStatus === QuotationStatus.REJECTED)) return true;
    return false;
  }

  public markAsSent(): Result<void> {
    if (!this.canTransitionTo(QuotationStatus.SENT)) {
      return Result.fail(`Cannot transition from ${this.props.status} to SENT`);
    }
    this.props.status = QuotationStatus.SENT;
    this.props.sentAt = new Date();
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public markZnsSucceeded(msgId?: string): Result<void> {
    this.props.znsStatus = 'SUCCESS';
    this.props.updatedAt = new Date();
    this.addDomainEvent(new QuotationZnsSucceeded(this.id, {
      customerId: this.props.customerId,
      msgId
    }));
    return Result.ok();
  }
}
