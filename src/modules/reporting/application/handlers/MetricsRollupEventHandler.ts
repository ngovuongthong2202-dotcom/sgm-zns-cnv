import { eventBus } from '../../../../platform/events/EventBus';
import { DomainEvent } from '../../../../platform/domain/DomainEvent';
import { metricsRollupService } from '../../infrastructure/metrics/metrics-rollup.service';

const processedProjectionEvents = new Set<string>();

export const metricsRollupEventHandler = {
  updateMetricsRollup: async (event: DomainEvent): Promise<void> => {

    const idempotencyKey = `${event.eventName}-${JSON.stringify((event as any).payload)}`;
    if (processedProjectionEvents.has(idempotencyKey)) {
       console.log(`[Metrics Rollup Projection] (Idempotent Bỏ qua) Đã xử lý event: ${event.eventName}`);
       return;
    }
    processedProjectionEvents.add(idempotencyKey);

    console.log(`[Metrics Rollup Projection] Cập nhật read-model / metrics rollup cho event: ${event.eventName}`);
    try {
      await metricsRollupService.runRollup();
    } catch (e) {
      console.error('Failed to run metrics rollup on event', e);
    }
  },
  
  register() {
    eventBus.subscribe('QuotationCreated', metricsRollupEventHandler.updateMetricsRollup);
    eventBus.subscribe('ContractSigned', metricsRollupEventHandler.updateMetricsRollup);
    eventBus.subscribe('PaymentSucceeded', metricsRollupEventHandler.updateMetricsRollup);
    eventBus.subscribe('DeliveryCompleted', metricsRollupEventHandler.updateMetricsRollup);
    eventBus.subscribe('ZnsDelivered', metricsRollupEventHandler.updateMetricsRollup);
  }
};
