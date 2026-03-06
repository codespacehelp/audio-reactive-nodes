import { useRef } from 'react';
import { useProjectStore } from '../store/project-store';
import type { ParamDef } from '../types/node-def';

interface Props {
  nodeId: string;
  def: ParamDef;
  value: string;
}

export default function ColorInput({ nodeId, def, value }: Props) {
  const undoPushedRef = useRef(false);

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
        value={value}
        onFocus={() => {
          undoPushedRef.current = false;
        }}
        onChange={(e) => {
          if (!undoPushedRef.current) {
            useProjectStore.getState().pushUndo();
            undoPushedRef.current = true;
          }
          useProjectStore.getState().setParamValue(nodeId, def.name, {
            mode: 'literal',
            value: e.target.value,
          });
        }}
      />
      <span className="text-xs font-mono text-zinc-400">{value}</span>
    </div>
  );
}
