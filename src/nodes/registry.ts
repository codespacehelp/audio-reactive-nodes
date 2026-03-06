import type { NodeDef } from '../types/node-def';

import { audioInDef } from './audio/audio-in';
import { audioAnalyzerDef } from './audio/audio-analyzer';
import { channelRenameDef } from './channels/channel-rename';
import { channelLagDef } from './channels/channel-lag';
import { channelMapDef } from './channels/channel-map';
import { sphereDef } from './geometry/sphere';
import { planeDef } from './geometry/plane';
import { transformDef } from './geometry/transform';
import { geoMergeDef } from './geometry/geo-merge';
import { sceneDef } from './scene/scene';
import { materialsDef } from './scene/materials';
import { outDef } from './scene/out';

const registry = new Map<string, NodeDef>();

/** Register a node definition */
export function registerNode(def: NodeDef) {
  registry.set(def.type, def);
}

/** Get all registered node definitions as a plain object */
export function getNodeDefs(): Record<string, NodeDef> {
  const result: Record<string, NodeDef> = {};
  for (const [type, def] of registry) {
    result[type] = def;
  }
  return result;
}

/** Get a single node definition by type */
export function getNodeDef(type: string): NodeDef | undefined {
  return registry.get(type);
}

/** Register all built-in nodes */
export function registerBuiltins() {
  const defs = [
    audioInDef,
    audioAnalyzerDef,
    channelRenameDef,
    channelLagDef,
    channelMapDef,
    sphereDef,
    planeDef,
    transformDef,
    geoMergeDef,
    sceneDef,
    materialsDef,
    outDef,
  ];

  for (const def of defs) {
    registerNode(def);
  }
}
