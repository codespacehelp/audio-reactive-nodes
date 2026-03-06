import { useProjectStore } from '../store/project-store';
import type { ParamDef } from '../types/node-def';

interface Props {
  nodeId: string;
  def: ParamDef;
  value: string;
}

export default function EnumSelect({ nodeId, def, value }: Props) {
  return (
    <select
      className="w-full rounded bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
      value={value}
      onChange={(e) => {
        useProjectStore.getState().pushUndo();
        useProjectStore.getState().setParamValue(nodeId, def.name, {
          mode: 'literal',
          value: e.target.value,
        });
      }}
    >
      {def.options?.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
