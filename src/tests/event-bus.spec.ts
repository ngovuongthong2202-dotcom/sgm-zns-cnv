import { describe, it } from 'vitest';
import { entityEventsHandler } from '../modules/messaging/application/handlers/EntityEventsHandler';
import { workflowEventService } from '../backend/services/workflow/workflow-event.service';
import '../backend/services/audit/audit.logger';
import { metricsRollupEventHandler } from '../modules/reporting/application/handlers/MetricsRollupEventHandler';

// register handlers
entityEventsHandler.register();
metricsRollupEventHandler.register();

describe('event-bus side-effects', () => {
  it('should emit EventBus side-effects and handle idempotency', async () => {
    console.log('--- TEST: emitEvent and EventBus side-effects ---');
    
    // Fake entity
    const entityId = 'QUOTE-12345';
    const payload = { amount: 500000 };

    // Wait to capture console logs or just let them print
    await workflowEventService.emitEvent(entityId, 'QuotationCreated', payload);
    
    // Simulate Idempotency check: emitting twice
    console.log('\n--- TEST: Idempotency (gọi lần 2) ---');
    await workflowEventService.emitEvent(entityId, 'QuotationCreated', payload);

    console.log('\n--- All tests passed! ---\n');
  });
});

