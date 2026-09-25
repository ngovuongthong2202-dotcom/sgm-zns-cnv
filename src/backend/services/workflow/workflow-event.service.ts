import { eventBus } from '../../../platform/events/EventBus';
import { 
  QuotationCreated, 
  QuotationZnsSucceeded, 
  ContractSigned, 
  PaymentSucceeded, 
  DeliveryCompleted, 
  ZnsRequested, 
  ZnsDelivered 
} from '../../../platform/events/WorkflowEvents';

/**
 * FEATURE_EVENT_HANDLERS cờ tắt mở song song
 */
export const FEATURE_EVENT_HANDLERS = process.env.FEATURE_EVENT_HANDLERS === 'true' || true;

import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../lib/logger';

export const workflowEventService = {
  /**
   * Lưu vết sự kiện vào bảng workflow_events trong Supabase và phát qua EventBus
   */
  async emitEvent(entityId: string, eventType: string, payload: any): Promise<void> {
    logger.info(`[Workflow Event] Ghi workflowEvents: ${eventType} cho entity: ${entityId}`);
    
    try {
      await adminDb.collection('workflowEvents').doc().set({
        entityId,
        eventType,
        payload,
        createdAt: new Date().toISOString()
      });
    } catch (dbErr) {
      logger.warn({ err: dbErr }, '[Workflow Event] Không thể lưu workflowEvents vào database');
    }

    // [SONG SONG]: Chuyển type thành Domain Event tương ứng và publish qua EventBus
    let domainEvent = null;
    switch (eventType) {
      case 'QuotationCreated':
        domainEvent = new QuotationCreated(entityId, payload);
        break;
      case 'QuotationZnsSucceeded':
        domainEvent = new QuotationZnsSucceeded(entityId, payload);
        break;
      case 'ContractSigned':
        domainEvent = new ContractSigned(entityId, payload);
        break;
      case 'PaymentSucceeded':
        domainEvent = new PaymentSucceeded(entityId, payload);
        break;
      case 'DeliveryCompleted':
        domainEvent = new DeliveryCompleted(entityId, payload);
        break;
      case 'ZnsRequested':
        domainEvent = new ZnsRequested(entityId, payload);
        break;
      case 'ZnsDelivered':
        domainEvent = new ZnsDelivered(entityId, payload);
        break;
      default:
        // Cần map nếu có event khác
        break;
    }

    if (domainEvent) {
      console.log(`[EventBus] Publishing Domain Event: ${domainEvent.eventName}`);
      await eventBus.publish(domainEvent);
    }
  }
};
