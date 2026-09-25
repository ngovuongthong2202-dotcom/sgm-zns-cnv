import { defineMachine } from '../engine';

export const paymentMachine = defineMachine({
  id: 'payment',
  version: 1,
  initial: 'DRAFT',
  states: {
    DRAFT: { on: { SEND_ZNS: 'ZNS_SENDING' } },
    ZNS_SENDING: { 
      on: { 
        ZNS_SUCCESS: 'ZNS_SENT', 
        ZNS_FAILED: 'ZNS_FAILED', 
        LIMIT_EXCEEDED: 'LIMIT_EXCEEDED' 
      } 
    },
    ZNS_SENT: { on: { COMPLETE: 'COMPLETED' } },
    ZNS_FAILED: { on: { SEND_ZNS: 'ZNS_SENDING' } },
    LIMIT_EXCEEDED: { on: { SEND_ZNS: 'ZNS_SENDING' } },
    COMPLETED: { on: {} }
  }
});
