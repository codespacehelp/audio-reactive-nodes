import { describe, it, expect } from 'vitest';
import { validateProject } from './validate';
import type { ProjectSchema } from '../types/project';

function makeValidProject(overrides?: Partial<ProjectSchema>): unknown {
  return {
    schemaVersion: 1,
    nodes: [
      {
        id: 'n1',
        name: 'sphere1',
        type: 'sphere',
        position: { x: 0, y: 0 },
        params: {},
      },
      {
        id: 'n2',
        name: 'scene1',
        type: 'scene',
        position: { x: 200, y: 0 },
        params: {},
      },
    ],
    connections: [
      {
        id: 'c1',
        fromNode: 'n1',
        fromPort: 'geometry',
        toNode: 'n2',
        toPort: 'geometry',
      },
    ],
    viewport: { panX: 0, panY: 0, zoom: 1 },
    ...overrides,
  };
}

describe('validateProject', () => {
  it('accepts a valid project', () => {
    const result = validateProject(makeValidProject());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schemaVersion).toBe(1);
      expect(result.value.nodes).toHaveLength(2);
    }
  });

  it('rejects missing schemaVersion', () => {
    const data = makeValidProject();
    delete (data as Record<string, unknown>).schemaVersion;
    const result = validateProject(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/schemaVersion/i);
  });

  it('rejects unsupported schemaVersion', () => {
    const result = validateProject(makeValidProject({ schemaVersion: 99 }));
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate node ids', () => {
    const result = validateProject({
      schemaVersion: 1,
      nodes: [
        { id: 'n1', name: 'a', type: 'sphere', position: { x: 0, y: 0 }, params: {} },
        { id: 'n1', name: 'b', type: 'scene', position: { x: 0, y: 0 }, params: {} },
      ],
      connections: [],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/duplicate.*id/i);
  });

  it('rejects duplicate node names', () => {
    const result = validateProject({
      schemaVersion: 1,
      nodes: [
        { id: 'n1', name: 'sphere1', type: 'sphere', position: { x: 0, y: 0 }, params: {} },
        { id: 'n2', name: 'sphere1', type: 'scene', position: { x: 0, y: 0 }, params: {} },
      ],
      connections: [],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/duplicate.*name/i);
  });

  it('rejects invalid node name regex', () => {
    const result = validateProject({
      schemaVersion: 1,
      nodes: [
        { id: 'n1', name: 'My Node!', type: 'sphere', position: { x: 0, y: 0 }, params: {} },
      ],
      connections: [],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/name/i);
  });

  it('rejects connection referencing nonexistent node', () => {
    const result = validateProject({
      schemaVersion: 1,
      nodes: [
        { id: 'n1', name: 'sphere1', type: 'sphere', position: { x: 0, y: 0 }, params: {} },
      ],
      connections: [
        { id: 'c1', fromNode: 'n1', fromPort: 'geometry', toNode: 'n_missing', toPort: 'in' },
      ],
      viewport: { panX: 0, panY: 0, zoom: 1 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/node/i);
  });

  it('rejects non-object input', () => {
    expect(validateProject(null).ok).toBe(false);
    expect(validateProject('hello').ok).toBe(false);
    expect(validateProject(42).ok).toBe(false);
  });

  it('rejects missing nodes array', () => {
    const result = validateProject({ schemaVersion: 1, connections: [], viewport: { panX: 0, panY: 0, zoom: 1 } });
    expect(result.ok).toBe(false);
  });
});
