import type { ParamDef } from '../types/node-def';

/**
 * Temporary param definition lookup per node type.
 * Will be replaced by the full node registry in Milestone 6-7.
 */
const PARAM_DEFS: Record<string, ParamDef[]> = {
  audio_in: [
    { name: 'source', type: 'string', default: 'microphone' },
  ],
  audio_analyzer: [
    { name: 'fft_size', type: 'int', default: 1024, min: 32, max: 8192, step: 1, expressionEnabled: false },
    { name: 'band_count', type: 'int', default: 3, min: 1, max: 32, step: 1, expressionEnabled: false },
    { name: 'smoothing', type: 'float', default: 0.7, min: 0, max: 1, step: 0.01, expressionEnabled: true },
  ],
  channel_rename: [
    { name: 'from_1', type: 'string', default: '' },
    { name: 'to_1', type: 'string', default: '' },
    { name: 'from_2', type: 'string', default: '' },
    { name: 'to_2', type: 'string', default: '' },
    { name: 'from_3', type: 'string', default: '' },
    { name: 'to_3', type: 'string', default: '' },
    { name: 'from_4', type: 'string', default: '' },
    { name: 'to_4', type: 'string', default: '' },
    { name: 'from_5', type: 'string', default: '' },
    { name: 'to_5', type: 'string', default: '' },
  ],
  channel_lag: [
    { name: 'attack_ms', type: 'float', default: 30, min: 0, max: 2000, step: 1, expressionEnabled: true },
    { name: 'release_ms', type: 'float', default: 220, min: 0, max: 5000, step: 1, expressionEnabled: true },
    { name: 'gain', type: 'float', default: 1, min: 0, max: 10, step: 0.01, expressionEnabled: true },
  ],
  channel_map: [
    { name: 'in_min', type: 'float', default: 0, min: -100, max: 100, step: 0.01, expressionEnabled: true },
    { name: 'in_max', type: 'float', default: 1, min: -100, max: 100, step: 0.01, expressionEnabled: true },
    { name: 'out_min', type: 'float', default: 0, min: -100, max: 100, step: 0.01, expressionEnabled: true },
    { name: 'out_max', type: 'float', default: 1, min: -100, max: 100, step: 0.01, expressionEnabled: true },
    { name: 'clip_mode', type: 'enum', default: 'none', options: ['none', 'clamp'] },
  ],
  sphere: [
    { name: 'radius', type: 'float', default: 1, min: 0.01, max: 100, step: 0.1, expressionEnabled: true },
    { name: 'width_segments', type: 'int', default: 32, min: 3, max: 128, step: 1 },
    { name: 'height_segments', type: 'int', default: 16, min: 2, max: 128, step: 1 },
  ],
  plane: [
    { name: 'size_x', type: 'float', default: 10, min: 0.01, max: 1000, step: 0.1, expressionEnabled: true },
    { name: 'size_y', type: 'float', default: 10, min: 0.01, max: 1000, step: 0.1, expressionEnabled: true },
    { name: 'rows', type: 'int', default: 1, min: 1, max: 256, step: 1 },
    { name: 'columns', type: 'int', default: 1, min: 1, max: 256, step: 1 },
    { name: 'orientation', type: 'enum', default: 'xz', options: ['xy', 'xz', 'yz'] },
  ],
  transform: [
    { name: 'translate_x', type: 'float', default: 0, step: 0.1, expressionEnabled: true },
    { name: 'translate_y', type: 'float', default: 0, step: 0.1, expressionEnabled: true },
    { name: 'translate_z', type: 'float', default: 0, step: 0.1, expressionEnabled: true },
    { name: 'rotate_x', type: 'float', default: 0, step: 1, expressionEnabled: true },
    { name: 'rotate_y', type: 'float', default: 0, step: 1, expressionEnabled: true },
    { name: 'rotate_z', type: 'float', default: 0, step: 1, expressionEnabled: true },
    { name: 'scale_x', type: 'float', default: 1, step: 0.1, expressionEnabled: true },
    { name: 'scale_y', type: 'float', default: 1, step: 0.1, expressionEnabled: true },
    { name: 'scale_z', type: 'float', default: 1, step: 0.1, expressionEnabled: true },
    { name: 'uniform_scale', type: 'float', default: 1, min: 0.001, step: 0.1, expressionEnabled: true },
    { name: 'transform_order', type: 'enum', default: 'SRT', options: ['SRT', 'STR', 'RST', 'RTS', 'TRS', 'TSR'] },
  ],
  geo_merge: [],
  scene: [
    { name: 'camera_pos_x', type: 'float', default: 0, step: 0.1, expressionEnabled: true },
    { name: 'camera_pos_y', type: 'float', default: 2, step: 0.1, expressionEnabled: true },
    { name: 'camera_pos_z', type: 'float', default: 5, step: 0.1, expressionEnabled: true },
    { name: 'camera_target_x', type: 'float', default: 0, step: 0.1, expressionEnabled: true },
    { name: 'camera_target_y', type: 'float', default: 0, step: 0.1, expressionEnabled: true },
    { name: 'camera_target_z', type: 'float', default: 0, step: 0.1, expressionEnabled: true },
    { name: 'ambient_color', type: 'color', default: '#ffffff' },
    { name: 'ambient_intensity', type: 'float', default: 0.5, min: 0, max: 5, step: 0.1, expressionEnabled: true },
    { name: 'dir_color', type: 'color', default: '#ffffff' },
    { name: 'dir_intensity', type: 'float', default: 1, min: 0, max: 10, step: 0.1, expressionEnabled: true },
    { name: 'dir_pos_x', type: 'float', default: 5, step: 0.1, expressionEnabled: true },
    { name: 'dir_pos_y', type: 'float', default: 5, step: 0.1, expressionEnabled: true },
    { name: 'dir_pos_z', type: 'float', default: 5, step: 0.1, expressionEnabled: true },
    { name: 'background_color', type: 'color', default: '#111111' },
  ],
  materials: [
    { name: 'target_name', type: 'string', default: '' },
    { name: 'material_mode', type: 'enum', default: 'standard', options: ['standard', 'wireframe'] },
    { name: 'color', type: 'color', default: '#cccccc' },
    { name: 'roughness', type: 'float', default: 0.5, min: 0, max: 1, step: 0.01, expressionEnabled: true },
    { name: 'metalness', type: 'float', default: 0, min: 0, max: 1, step: 0.01, expressionEnabled: true },
  ],
  out: [],
};

export function getNodeParamDefs(nodeType: string): ParamDef[] {
  return PARAM_DEFS[nodeType] ?? [];
}
