import { describe, expect, it } from 'vitest';
import { canTransitionProjectStatus } from './projectStatus';

describe('project status transitions', () => {
  it('allows the normal project lifecycle', () => {
    expect(canTransitionProjectStatus('draft', 'scanning')).toBe(true);
    expect(canTransitionProjectStatus('scanning', 'extracting')).toBe(true);
    expect(canTransitionProjectStatus('extracting', 'reviewing')).toBe(true);
    expect(canTransitionProjectStatus('reviewing', 'ready')).toBe(true);
  });

  it('prevents skipping review before ready', () => {
    expect(canTransitionProjectStatus('draft', 'ready')).toBe(false);
    expect(canTransitionProjectStatus('extracting', 'ready')).toBe(false);
  });
});
