import { defineMachine } from '../engine';

export const customerMachine = defineMachine({
  id: 'customer',
  version: 1,
  initial: 'NEW',
  states: {
    NEW: { on: { SEND_ZNS: 'ZNS_SENDING' } },
    ZNS_SENDING: { 
      on: { 
        ZNS_SUCCESS: 'ZNS_SENT', 
        ZNS_FAILED: 'ZNS_FAILED', 
        LIMIT_EXCEEDED: 'LIMIT_EXCEEDED' 
      } 
    },
    ZNS_SENT: { on: { CONVERT: 'ACTIVE' } },
    ZNS_FAILED: { on: { SEND_ZNS: 'ZNS_SENDING' } },
    LIMIT_EXCEEDED: { on: { SEND_ZNS: 'ZNS_SENDING' } },
    ACTIVE: { on: {} }
  }
});
