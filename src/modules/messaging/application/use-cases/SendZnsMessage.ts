import { ZnsRepository } from '../../domain/ZnsRepository';
import { ZnsMessageAggregate } from '../../domain/ZnsMessage';
import { ZnsVendorPort } from '../../domain/ZnsVendorPort';
import { eventBus } from '../../../../platform/events/EventBus';

export class SendZnsMessageUseCase {
  constructor(
    private readonly repository: ZnsRepository,
    private readonly vendor: ZnsVendorPort
  ) {}

  async execute(params: {
    entityId: string;
    entityType: string;
    messageType: string;
    phone: string;
    payload: Record<string, unknown>;
  }): Promise<{ messageId: string; status: string; error?: string }> {
    
    const idempotencyKey = this.repository.generateIdempotencyKey(
      params.entityType,
      params.entityId,
      params.messageType,
      new Date().toISOString().slice(0, 10), // businessVersion (daily)
      0
    );

    let message = await this.repository.findById(idempotencyKey);
    if (!message) {
      const result = ZnsMessageAggregate.create({
        entityId: params.entityId,
        entityType: params.entityType,
        messageType: params.messageType as any,
        phone: params.phone,
        payload: params.payload
      }, idempotencyKey);

      if (result.isFailure) {
        throw new Error(result.error);
      }
      message = result.getValue();
    } else {
      if (['SUCCESS', 'SENT_WAITING'].includes(message.props.status)) {
        return { messageId: message.id, status: message.props.status };
      }
    }

    message.markSending();
    await this.repository.save(message);

    const vendorResult = await this.vendor.send(message);

    if (vendorResult.success) {
      message.markSentWaiting(vendorResult.trackingId);
    } else if (vendorResult.error && vendorResult.error.includes('Thiếu giá trị')) {
      // PRE_FLIGHT_BLOCKED internally handled by preflight block. We just mark it FAILED
      message.markFailed(vendorResult.error, 'PRE_FLIGHT_BLOCKED');
    } else {
      message.markFailed(vendorResult.error || 'Unknown Error');
    }

    await this.repository.save(message);
    
    // Publish events internally
    message.domainEvents.forEach(e => eventBus.publish(e));
    message.clearEvents();

    return { messageId: message.id, status: message.props.status, error: vendorResult.error };
  }
}
