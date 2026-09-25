import { AggregateRoot } from '../../../platform/domain/AggregateRoot';
import { Result } from '../../../platform/domain/Result';
import { ZnsMessage as ZnsMessageSchemaType, ZnsMessageSchema } from '../../../domain/schema/workflow.schema';
import { ZnsDelivered } from '../../../platform/events/WorkflowEvents';

export class ZnsMessageAggregate extends AggregateRoot<ZnsMessageSchemaType> {
  private constructor(props: ZnsMessageSchemaType, id?: string) {
    super(props, id || props.id || '');
  }

  public static create(props: Omit<ZnsMessageSchemaType, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'retryCount' | 'attemptBucket'>, id?: string): Result<ZnsMessageAggregate> {
    const defaultProps: ZnsMessageSchemaType = {
      ...props,
      id: id || crypto.randomUUID(),
      status: 'INIT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
      attemptBucket: 0,
    };

    const parsed = ZnsMessageSchema.safeParse(defaultProps);
    if (!parsed.success) {
      return Result.fail<ZnsMessageAggregate>(parsed.error.message);
    }

    return Result.ok<ZnsMessageAggregate>(new ZnsMessageAggregate(parsed.data, defaultProps.id));
  }

  public static reconstitute(props: ZnsMessageSchemaType): ZnsMessageAggregate {
    return new ZnsMessageAggregate(props, props.id);
  }

  public markSending(): void {
    this.props.status = 'SENDING';
    this.props.updatedAt = new Date().toISOString();
  }

  public markSentWaiting(trackingId: string): void {
    this.props.status = 'SENT_WAITING';
    this.props.trackingId = trackingId;
    this.props.updatedAt = new Date().toISOString();
  }

  public markSuccess(vendorStatus?: string): void {
    this.props.status = 'SUCCESS';
    this.props.vendorStatus = { status: vendorStatus || 'SUCCESS' };
    this.props.errorLog = undefined;
    this.props.updatedAt = new Date().toISOString();
    
    this.addDomainEvent(new ZnsDelivered(this.id, {
      entityId: this.props.entityId,
      entityType: this.props.entityType,
      messageType: this.props.messageType,
      internalStatus: 'SUCCESS',
      vendorStatus: vendorStatus || 'SUCCESS'
    }));
  }

  public markFailed(errorLog: string, vendorStatus?: string): void {
    this.props.status = 'FAILED';
    this.props.errorLog = errorLog;
    if (vendorStatus) {
      this.props.vendorStatus = { status: vendorStatus };
    }
    this.props.updatedAt = new Date().toISOString();
    
    this.addDomainEvent(new ZnsDelivered(this.id, {
      entityId: this.props.entityId,
      entityType: this.props.entityType,
      messageType: this.props.messageType,
      internalStatus: 'FAILED',
      vendorStatus: vendorStatus || 'FAILED'
    }));
  }

  public markDlq(errorLog: string): void {
    this.props.status = 'DLQ';
    this.props.errorLog = errorLog;
    this.props.updatedAt = new Date().toISOString();
  }


}
