import { engine } from '../engine';
import { contractMachine } from './contract.machine';
import { customerMachine } from './customer.machine';
import { deliveryMachine } from './delivery.machine';
import { paymentMachine } from './payment.machine';
import { quotationMachine } from './quotation.machine';

export * from './quotation.machine';
export * from './contract.machine';
export * from './payment.machine';
export * from './delivery.machine';
export * from './customer.machine';

export function bootstrapMachines() {
  engine.register(contractMachine);
  engine.register(customerMachine);
  engine.register(deliveryMachine);
  engine.register(paymentMachine);
  engine.register(quotationMachine);
}

