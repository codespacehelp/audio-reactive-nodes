/** Data types that flow through ports */
export type PortType = 'audio_stream' | 'channel_set' | 'geometry' | 'scene';

/** Parameter value types */
export type ParamType = 'int' | 'float' | 'bool' | 'string' | 'color' | 'vec2' | 'vec3';

/** Node categories (determines color coding) */
export type NodeCategory = 'audio' | 'channels' | 'geometry' | 'scene';

/** Whether a parameter is a literal value or an expression */
export type ParamMode = 'literal' | 'expression';

/** Scalar numeric value */
export type ScalarValue = number;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** CSS hex color string, e.g. "#ff8800" */
export type Color = string;
