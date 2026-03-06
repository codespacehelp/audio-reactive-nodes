import { useState, useRef } from 'react';
import { useProjectStore } from '../store/project-store';
import type { ParamDef } from '../types/node-def';

interface Props {
  nodeId: string;
  def: ParamDef;
  value: string;
}

export default function StringInput({ nodeId, def, value }: Props) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const undoPushedRef = useRef(false);

  const displayValue = isFocused ? localValue : value;

  return (
    <input
      type="text"
      className="w-full rounded bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
      value={displayValue}
      onFocus={() => {
        setIsFocused(true);
        setLocalValue(value);
        undoPushedRef.current = false;
      }}
      onChange={(e) => {
        setLocalValue(e.target.value);
        if (!undoPushedRef.current) {
          useProjectStore.getState().pushUndo();
          undoPushedRef.current = true;
        }
        useProjectStore.getState().setParamValue(nodeId, def.name, {
          mode: 'literal',
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
