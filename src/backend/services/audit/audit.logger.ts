import { eventBus } from '../../../platform/events/EventBus';
import { DomainEvent } from '../../../platform/domain/DomainEvent';
import { FEATURE_EVENT_HANDLERS } from '../workflow/workflow-event.service';
import { supabaseAdmin, isSupabaseAdminConfigured } from '../../config/supabase.admin';
import { v4 as uuidv4 } from 'uuid';

const processedEvents = new Set<string>();

export const auditLogger = {
  logAccess: (msg: string) => console.log(`[Audit Logger] ${msg}`),

  handleEvent: async (event: DomainEvent): Promise<void> => {
    if (!FEATURE_EVENT_HANDLERS) return;

    const payload = (event as any).payload || {};
    const idempotencyKey = `${event.eventName}-${event.eventId || JSON.stringify(payload)}`;
    if (processedEvents.has(idempotencyKey)) {
      return;
    }
    processedEvents.add(idempotencyKey);

    if (isSupabaseAdminConfigured) {
      try {
        const entityId = payload.entityId || payload.id || payload.quotationId || payload.contractId || payload.customerId || 'system';
        const entityType = payload.entityType || (
          event.eventName.startsWith('Quotation') ? 'quotation' : 
          event.eventName.startsWith('Contract') ? 'contract' : 
          event.eventName.startsWith('Payment') ? 'payment' : 
          event.eventName.startsWith('Delivery') ? 'delivery' : 
          'system'
        );
        const userId = payload.userId || payload.actor || 'system';
        const userName = payload.userName || payload.actorName || userId;

        await supabaseAdmin.from('audit_logs').insert({
          id: event.eventId || uuidv4(),
          entity_type: entityType,
          entity_id: entityId,
          action: event.eventName,
          user_id: userId,
          user_name: userName,
          data: payload,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('[Audit Logger] Error inserting audit log to Supabase:', err);
      }
    }
  }
};

// Đăng ký event
const eventsToAudit = [
  'CustomerCreated',
  'CustomerUpdated',
  'QuotationCreated', 
  'QuotationUpdated',
  'QuotationZnsSucceeded', 
  'ContractCreated',
  'ContractSigned', 
  'PaymentCreated',
  'PaymentSucceeded', 
  'DeliveryCreated',
  'DeliveryCompleted', 
  'ZnsRequested', 
  'ZnsDelivered'
];

eventsToAudit.forEach(eventName => {
  eventBus.subscribe(eventName, auditLogger.handleEvent);
});
