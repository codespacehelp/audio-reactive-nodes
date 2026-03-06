import { useState, useRef } from 'react';
import { useProjectStore } from '../store/project-store';
import type { ParamDef } from '../types/node-def';

interface Props {
  nodeId: string;
  def: ParamDef;
  expression: string;
}

export default function ExpressionInput({ nodeId, def, expression }: Props) {
  const [localValue, setLocalValue] = useState(expression);
  const [isFocused, setIsFocused] = useState(false);
  const undoPushedRef = useRef(false);

  const displayValue = isFocused ? localValue : expression;

  return (
    <input
      type="text"
      className="w-full rounded border-0 bg-zinc-900 px-3 py-1.5 font-mono text-sm text-amber-400 outline-none ring-2 ring-amber-600/50 focus:ring-amber-500"
      placeholder="e.g. @node:channel * 2"
      value={displayValue}
      onFocus={() => {
        setIsFocused(true);
        setLocalValue(expression);
        undoPushedRef.current = false;
      }}
      onChange={(e) => {
        setLocalValue(e.target.value);
        if (!undoPushedRef.current) {
          useProjectStore.getState().pushUndo();
          undoPushedRef.current = true;
        }
        useProjectStore.getState().setParamValue(nodeId, def.name, {
          mode: 'expression',
          value: e.target.value,
        });
      }}
      onBlur={() => {
        setIsFocused(false);
        undoPushedRef.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
