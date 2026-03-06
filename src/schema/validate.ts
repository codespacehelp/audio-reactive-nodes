import type { ProjectSchema } from '../types/project';

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const NAME_REGEX = /^[a-z0-9_]+$/;

export function validateProject(json: unknown): Result<ProjectSchema, string> {
  if (!json || typeof json !== 'object') {
    return { ok: false, error: 'Project must be a JSON object' };
  }

  const obj = json as Record<string, unknown>;

  // Schema version
  if (obj.schemaVersion === undefined) {
    return { ok: false, error: 'Missing schemaVersion' };
  }
  if (obj.schemaVersion !== 1) {
    return { ok: false, error: `Unsupported schemaVersion: ${obj.schemaVersion}` };
  }

  // Nodes
  if (!Array.isArray(obj.nodes)) {
    return { ok: false, error: 'Missing or invalid nodes array' };
  }

  const nodeIds = new Set<string>();
  const nodeNames = new Set<string>();

  for (const node of obj.nodes) {
    if (!node || typeof node !== 'object') {
      return { ok: false, error: 'Invalid node entry' };
    }
    const n = node as Record<string, unknown>;

    if (typeof n.id !== 'string' || !n.id) {
      return { ok: false, error: 'Node missing id' };
    }
    if (nodeIds.has(n.id)) {
      return { ok: false, error: `Duplicate node id: ${n.id}` };
    }
    nodeIds.add(n.id);

    if (typeof n.name !== 'string' || !n.name) {
      return { ok: false, error: 'Node missing name' };
    }
    if (!NAME_REGEX.test(n.name)) {
      return { ok: false, error: `Invalid node name "${n.name}" — must match ${NAME_REGEX}` };
    }
    if (nodeNames.has(n.name)) {
      return { ok: false, error: `Duplicate node name: ${n.name}` };
    }
    nodeNames.add(n.name);

    if (typeof n.type !== 'string' || !n.type) {
      return { ok: false, error: `Node ${n.id} missing type` };
    }

    const pos = n.position as Record<string, unknown> | undefined;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      return { ok: false, error: `Node ${n.id} has invalid position` };
    }
  }

  // Connections
  if (!Array.isArray(obj.connections)) {
    return { ok: false, error: 'Missing or invalid connections array' };
  }

  for (const conn of obj.connections) {
    if (!conn || typeof conn !== 'object') {
      return { ok: false, error: 'Invalid connection entry' };
    }
    const c = conn as Record<string, unknown>;

    if (typeof c.fromNode !== 'string' || !nodeIds.has(c.fromNode)) {
      return { ok: false, error: `Connection references unknown fromNode: ${c.fromNode}` };
    }
    if (typeof c.toNode !== 'string' || !nodeIds.has(c.toNode)) {
      return { ok: false, error: `Connection references unknown toNode: ${c.toNode}` };
    }
  }

  // Viewport
  const vp = obj.viewport as Record<string, unknown> | undefined;
  if (!vp || typeof vp.panX !== 'number' || typeof vp.panY !== 'number' || typeof vp.zoom !== 'number') {
    return { ok: false, error: 'Missing or invalid viewport' };
  }

  return { ok: true, value: json as ProjectSchema };
}
