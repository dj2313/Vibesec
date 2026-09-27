import { describe, it, expect, beforeEach } from 'vitest';
import { VibeSecStateMachine, InvalidStateTransitionError } from '../../src/core/state/stateMachine.js';

describe('VibeSecStateMachine', () => {
  let sm: VibeSecStateMachine;

  beforeEach(() => {
    sm = new VibeSecStateMachine();
  });

  it('starts in START state by default', () => {
    expect(sm.getState()).toBe('START');
  });

  it('follows the standard lifecycle progression', () => {
    sm.transitionTo('PROJECT_CONNECTED');
    expect(sm.getState()).toBe('PROJECT_CONNECTED');

    sm.transitionTo('AGENT_CONNECTED');
    expect(sm.getState()).toBe('AGENT_CONNECTED');

    sm.transitionTo('AGENT_RUNNING');
    expect(sm.getState()).toBe('AGENT_RUNNING');

    sm.transitionTo('ACTION_DETECTED');
    expect(sm.getState()).toBe('ACTION_DETECTED');

    sm.transitionTo('RISK_EVALUATION');
    expect(sm.getState()).toBe('RISK_EVALUATION');

    sm.transitionTo('EXECUTING');
    expect(sm.getState()).toBe('EXECUTING');

    sm.transitionTo('ACTION_EXECUTED');
    expect(sm.getState()).toBe('ACTION_EXECUTED');

    sm.transitionTo('CHANGES_DETECTED');
    expect(sm.getState()).toBe('CHANGES_DETECTED');

    sm.transitionTo('VERIFYING');
    expect(sm.getState()).toBe('VERIFYING');

    sm.transitionTo('PASSED');
    expect(sm.getState()).toBe('PASSED');

    sm.transitionTo('COMPLETED');
    expect(sm.getState()).toBe('COMPLETED');
  });

  it('handles approval gate flow', () => {
    sm.transitionTo('PROJECT_CONNECTED');
    sm.transitionTo('AGENT_CONNECTED');
    sm.transitionTo('AGENT_RUNNING');
    sm.transitionTo('ACTION_DETECTED');
    sm.transitionTo('RISK_EVALUATION');

    sm.transitionTo('WAITING_FOR_APPROVAL');
    expect(sm.getState()).toBe('WAITING_FOR_APPROVAL');

    sm.transitionTo('EXECUTING');
    expect(sm.getState()).toBe('EXECUTING');
  });

  it('handles blocked action flow', () => {
    sm.transitionTo('PROJECT_CONNECTED');
    sm.transitionTo('AGENT_CONNECTED');
    sm.transitionTo('AGENT_RUNNING');
    sm.transitionTo('ACTION_DETECTED');
    sm.transitionTo('RISK_EVALUATION');

    sm.transitionTo('BLOCKED');
    expect(sm.getState()).toBe('BLOCKED');

    sm.transitionTo('COMPLETED');
    expect(sm.getState()).toBe('COMPLETED');
  });

  it('throws InvalidStateTransitionError for illegal state transitions', () => {
    expect(() => sm.transitionTo('VERIFYING')).toThrow(InvalidStateTransitionError);
    expect(() => sm.transitionTo('EXECUTING')).toThrow(InvalidStateTransitionError);
  });

  it('tracks transition history', () => {
    sm.transitionTo('PROJECT_CONNECTED');
    sm.transitionTo('AGENT_CONNECTED');
    expect(sm.getHistory().map((h) => h.state)).toEqual(['START', 'PROJECT_CONNECTED', 'AGENT_CONNECTED']);
  });
});
