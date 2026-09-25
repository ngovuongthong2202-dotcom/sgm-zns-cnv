import { AggregateRoot } from '@/src/platform/domain/AggregateRoot';
import { Result } from '@/src/platform/domain/Result';
import { BaseDomainEvent } from '@/src/platform/domain/DomainEvent';
import { DeliverySchema } from '@/src/domain/schema/delivery.schema';
import { DeliveryStatusVO } from '@/src/domain/value-objects/DeliveryStatusVO';
import { z } from 'zod';

export type DeliveryProps = z.infer<typeof DeliverySchema>;

export class DeliveryCompletedEvent extends BaseDomainEvent {
  constructor(
    public readonly deliveryId: string,
    public readonly deliveryProps: DeliveryProps
  ) {
    super('DeliveryCompleted');
  }
}

export class DeliveryZnsSentEvent extends BaseDomainEvent {
  constructor(
    public readonly deliveryId: string,
    public readonly payload: Record<string, unknown>
  ) {
    super('DeliveryZnsSent');
  }
}

export class Delivery extends AggregateRoot<DeliveryProps> {
  private constructor(props: DeliveryProps, id?: string) {
    super(props, id || crypto.randomUUID());
  }

  public static create(props: DeliveryProps, id?: string): Result<Delivery> {
    const parseResult = DeliverySchema.safeParse(props);
    if (!parseResult.success) {
      return Result.fail(parseResult.error.message);
    }
    return Result.ok(new Delivery(parseResult.data, id));
  }

  public update(props: Partial<DeliveryProps>): Result<void> {
    const updatedProps = { ...this.props, ...props };
    const parseResult = DeliverySchema.safeParse(updatedProps);
    if (!parseResult.success) {
      return Result.fail(parseResult.error.message);
    }
    this.props = parseResult.data;
    
    // Check if newly completed
    if (DeliveryStatusVO.isCompleted(props.tinhTrangGiaoHang, props.ngayGiaoThucTe)) {
      this.addDomainEvent(new DeliveryCompletedEvent(this.id, { ...this.props }));
    }

    return Result.ok();
  }

  public recordZnsSent(templateCode: string): void {
    this.addDomainEvent(new DeliveryZnsSentEvent(this.id, { templateCode }));
  }

  public get snapshot(): DeliveryProps {
    return { ...this.props, id: this.id };
  }
}
