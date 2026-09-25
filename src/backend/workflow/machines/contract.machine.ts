import { defineMachine } from '../engine';

export const contractMachine = defineMachine({
  id: 'contract',
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
    ZNS_SENT: { on: { SIGN: 'SIGNED' } },
    ZNS_FAILED: { on: { SEND_ZNS: 'ZNS_SENDING' } },
    LIMIT_EXCEEDED: { on: { SEND_ZNS: 'ZNS_SENDING' } },
    SIGNED: { on: {} }
  }
});
