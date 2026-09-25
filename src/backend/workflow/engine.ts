import { adminDb as db } from '../config/supabase.admin';

export interface WorkflowTransitionData {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  fromState: string;
  toState: string;
  trigger: string;
  cid: string;
  actor: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface MachineConfig<TContext = unknown, TEvent = unknown> {
  id: string;
  version: number;
  initial: string;
  states: Record<string, {
    on: Record<string, { target: string; guard?: string; actions?: string[] } | string>;
  }>;
  guards?: Record<string, (context: TContext, event: TEvent) => boolean | Promise<boolean>>; 
  actions?: Record<string, (context: TContext, event: TEvent, transitionData: WorkflowTransitionData) => Promise<void> | void>;
}

export function defineMachine<TContext = unknown, TEvent = unknown>(
  config: MachineConfig<TContext, TEvent>
): MachineConfig<TContext, TEvent> {
  return config;
}

export class WorkflowEngine {
  private machines: Map<string, MachineConfig<unknown, unknown>> = new Map();

  register<TContext = unknown, TEvent = unknown>(machine: MachineConfig<TContext, TEvent>) {
    this.machines.set(machine.id, machine as unknown as MachineConfig<unknown, unknown>);
  }

  getMachine(id: string): MachineConfig<unknown, unknown> | undefined {
    return this.machines.get(id);
  }

  /**
   * Evaluates transition, executes actions, and writes to `workflowEvents`.
   */
  async trigger(
    machineId: string,
    currentState: string,
    eventName: string,
    context: unknown, // Document content (entity) 
    eventPayload: unknown, 
    metadata: { cid: string; actor: string; entityId: string; entityType: string }
  ): Promise<{ nextState: string; changed: boolean; error?: string }> {
    const machine = this.machines.get(machineId);
    if (!machine) throw new Error(`Machine ${machineId} not found`);

    const stateConfig = machine.states[currentState];
    if (!stateConfig) throw new Error(`State ${currentState} not found in machine ${machineId}`);

    const transition = stateConfig.on[eventName];
    if (!transition) {
      return { nextState: currentState, changed: false }; // Transition not defined for this state
    }

    const targetState = typeof transition === 'string' ? transition : transition.target;
    const guardName = typeof transition === 'string' ? undefined : transition.guard;
    const actionNames = typeof transition === 'string' ? [] : (transition.actions || []);

    // 1. Evaluate guard
    if (guardName && machine.guards && machine.guards[guardName]) {
      const canProceed = await machine.guards[guardName](context, eventPayload);
      if (!canProceed) {
        return { nextState: currentState, changed: false, error: `Guard ${guardName} failed` };
      }
    }

    if (currentState === targetState) {
      return { nextState: currentState, changed: false };
    }

    // 2. Log Transition to workflowEvents
    const eventRef = db.collection('workflowEvents').doc();
    const transitionPayload = eventPayload && typeof eventPayload === 'object'
      ? (eventPayload as Record<string, unknown>)
      : {};

    const transitionData: WorkflowTransitionData = {
      id: eventRef.id,
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      eventType: eventName,
      fromState: currentState,
      toState: targetState,
      trigger: eventName,
      cid: metadata.cid,
      actor: metadata.actor,
      payload: transitionPayload,
      timestamp: new Date().toISOString()
    };
    
    await eventRef.set(transitionData as unknown as Record<string, unknown>);

    // 3. Execute actions
    if (actionNames.length > 0 && machine.actions) {
      for (const actionName of actionNames) {
         if (machine.actions[actionName]) {
            await machine.actions[actionName](context, eventPayload, transitionData);
         }
      }
    }

    return { nextState: targetState, changed: true };
  }
}

export const engine = new WorkflowEngine();


