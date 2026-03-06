import { useProjectStore } from '../store/project-store';
import type { ParamDef } from '../types/node-def';

interface Props {
  nodeId: string;
  def: ParamDef;
  value: boolean;
}

export default function BoolInput({ nodeId, def, value }: Props) {
  return (
    <button
      type="button"
      className={`relative h-6 w-11 rounded-full transition-colors ${
        value ? 'bg-blue-600' : 'bg-zinc-700'
      }`}
      onClick={() => {
        useProjectStore.getState().pushUndo();
        useProjectStore.getState().setParamValue(nodeId, def.name, {
          mode: 'literal',
          value: !value,
        });
      }}
    >
      <span
        className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
