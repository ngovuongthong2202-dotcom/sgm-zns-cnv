import { eventBus } from '../../../../platform/events/EventBus';
import { DomainEvent } from '../../../../platform/domain/DomainEvent';
import { SendZnsMessageUseCase } from '../use-cases/SendZnsMessage';
import { znsRepository } from '../../infrastructure/ZnsRepoSupabase';
import { znsVendor } from '../../infrastructure/CnvZnsVendor';
import { adminDb } from '../../../../backend/config/supabase.admin';

export class EntityEventsHandler {
  private readonly sendZnsUseCase: SendZnsMessageUseCase;
  private readonly processedEvents = new Set<string>();

  constructor() {
    this.sendZnsUseCase = new SendZnsMessageUseCase(znsRepository, znsVendor);
  }

  handleWorkflowEventTrigger = async (event: DomainEvent): Promise<void> => {
    // Basic idempotency check in memory (for serverless environments this needs Redis or Firestore,
    // but we use Set as requested by the original stub).
    const payloadStr = JSON.stringify((event as any).payload || {});
    const entityId = (event as any).contractId || (event as any).quotationId || (event as any).paymentId || (event as any).deliveryId || (event as any).entityId;
    const idempotencyKey = `${event.eventName}-${entityId}-${crypto.randomUUID()}`; // avoid dup calls in same run
    // Actually the stub used: `${event.eventName}-${JSON.stringify((event as any).payload)}`;
    
    // Using a more robust cache-level check to avoid duplicate ZNS
    const safeKey = `${event.eventName}-${entityId}`;
    if (this.processedEvents.has(safeKey)) {
       console.log(`[ZNS Outbound Handler] (Idempotent) Passed over: ${event.eventName}`);
       return;
    }
    this.processedEvents.add(safeKey);

    console.log(`[ZNS Outbound Handler] Processing event: ${event.eventName} for entityId: ${entityId}`);

    const payload = (event as any).payload;
    if (!payload) return;

    let messageType: string;
    
    switch (event.eventName) {
      case 'QuotationCreated':
        messageType = 'BAOGIA';
        break;
      case 'ContractSigned':
        messageType = 'HOPDONG_SIGN_ZNS';
        break;
      case 'PaymentSucceeded':
        messageType = 'THANH_TOAN_TAT_TOAN';
        break;
      case 'DeliveryCompleted':
        messageType = 'GIAOHANG_HOANTAT';
        break;
      default:
        return;
    }

    // Determine entity details
    let entityType = '';
    let phone = payload.phone || payload.sdt || payload.phoneNumber || '';

    // If phone is missing, fetch the full entity to get phone. WorkflowEvents often just contain minimal payload.
    if (!phone) {
      let collectionName = '';
      if (event.eventName === 'QuotationCreated') { collectionName = 'quotations'; entityType = 'QUOTATION'; }
      if (event.eventName === 'ContractSigned') { collectionName = 'contracts'; entityType = 'CONTRACT'; }
      if (event.eventName === 'PaymentSucceeded') { collectionName = 'payments'; entityType = 'PAYMENT'; }
      if (event.eventName === 'DeliveryCompleted') { collectionName = 'deliveries'; entityType = 'DELIVERY'; }

      if (collectionName && entityId) {
        const doc = await adminDb.collection(collectionName).doc(entityId).get();
        if (doc.exists) {
          const data = doc.data() || {};
          phone = phone || data.phone || data.sdt || data.phoneNumber;
          Object.assign(payload, data);
        }
      }
    } else {
        if (event.eventName === 'QuotationCreated') { entityType = 'QUOTATION'; }
        if (event.eventName === 'ContractSigned') { entityType = 'CONTRACT'; }
        if (event.eventName === 'PaymentSucceeded') { entityType = 'PAYMENT'; }
        if (event.eventName === 'DeliveryCompleted') { entityType = 'DELIVERY'; }
    }

    if (!phone || !entityType) {
      console.error(`[ZNS Outbound Handler] Missing phone or entityType for event ${event.eventName}. ZNS aborted.`);
      return;
    }

    try {
      await this.sendZnsUseCase.execute({
        entityId: entityId,
        entityType,
        messageType,
        phone,
        payload
      });
    } catch (err) {
      console.error(`[ZNS Outbound Handler] Execution failed:`, err);
    }
  }

  public register() {
    eventBus.subscribe('QuotationCreated', this.handleWorkflowEventTrigger);
    eventBus.subscribe('ContractSigned', this.handleWorkflowEventTrigger);
    eventBus.subscribe('PaymentSucceeded', this.handleWorkflowEventTrigger);
    eventBus.subscribe('DeliveryCompleted', this.handleWorkflowEventTrigger);
  }
}

export const entityEventsHandler = new EntityEventsHandler();
entityEventsHandler.register();
