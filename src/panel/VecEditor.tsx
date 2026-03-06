import { useRef } from 'react';
import { useProjectStore } from '../store/project-store';
import type { ParamDef } from '../types/node-def';
import type { ParamValue, ParamValueVec } from '../types/project';

interface Props {
  nodeId: string;
  def: ParamDef;
  paramValue: ParamValue | undefined;
  components: ('x' | 'y' | 'z')[];
}

const COMPONENT_LABELS: Record<string, string> = { x: 'X', y: 'Y', z: 'Z' };

function defaultVec(components: ('x' | 'y' | 'z')[], defaultVal: number): ParamValueVec {
  const vec: ParamValueVec = {
    x: { mode: 'literal', value: defaultVal },
    y: { mode: 'literal', value: defaultVal },
  };
  if (components.includes('z')) {
    vec.z = { mode: 'literal', value: defaultVal };
  }
  return vec;
}

export default function VecEditor({ nodeId, def, paramValue, components }: Props) {
  const undoPushedRef = useRef(false);

  const vec: ParamValueVec =
    paramValue?.value && typeof paramValue.value === 'object' && 'x' in paramValue.value
      ? (paramValue.value as ParamValueVec)
      : defaultVec(components, typeof def.default === 'number' ? def.default : 0);

  function updateComponent(
    comp: 'x' | 'y' | 'z',
    mode: 'literal' | 'expression',
    value: number | string,
  ) {
    if (!undoPushedRef.current) {
      useProjectStore.getState().pushUndo();
      undoPushedRef.current = true;
    }
    const newVec: ParamValueVec = {
      x: { ...vec.x },
      y: { ...vec.y },
    };
    if (vec.z) newVec.z = { ...vec.z };

    if (comp === 'z') {
      newVec.z = { mode, value };
    } else {
      newVec[comp] = { mode, value };
    }

    useProjectStore.getState().setParamValue(nodeId, def.name, {
      mode: 'literal',
      value: newVec,
    });
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-400">
        {def.name}
      </label>
      <div className="space-y-1">
        {components.map((comp) => {
          const compVal = comp === 'z' ? vec.z : vec[comp];
          const mode = compVal?.mode ?? 'literal';
          const value = compVal?.value ?? 0;
          const isExpr = mode === 'expression';

          return (
            <div key={comp} className="flex items-center gap-1">
              <span className="w-4 text-center text-[10px] font-bold text-zinc-500">
                {COMPONENT_LABELS[comp]}
              </span>
              {isExpr ? (
                <input
                  type="text"
                  className="min-w-0 flex-1 rounded bg-zinc-900 px-2 py-1 font-mono text-xs text-amber-400 outline-none ring-2 ring-amber-600/50 focus:ring-amber-500"
                  value={typeof value === 'string' ? value : ''}
                  placeholder="expression"
                  onChange={(e) => updateComponent(comp, 'expression', e.target.value)}
                  onFocus={() => { undoPushedRef.current = false; }}
                  onBlur={() => { undoPushedRef.current = false; }}
                />
              ) : (
                <input
                  type="number"
                  className="min-w-0 flex-1 rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
                  value={typeof value === 'number' ? value : 0}
                  step={def.step ?? 0.1}
                  onChange={(e) => {
                    const num = parseFloat(e.target.value);
                    if (!isNaN(num)) updateComponent(comp, 'literal', num);
                  }}
                  onFocus={() => { undoPushedRef.current = false; }}
                  onBlur={() => { undoPushedRef.current = false; }}
                />
              )}
              {def.expressionEnabled && (
                <button
                  type="button"
                  className={`rounded px-1 py-0.5 font-mono text-[9px] ${
                    isExpr
                      ? 'bg-amber-600/30 text-amber-400'
                      : 'bg-zinc-700 text-zinc-500 hover:text-zinc-300'
                  }`}
                  onClick={() => {
                    if (isExpr) {
                      updateComponent(comp, 'literal', typeof def.default === 'number' ? def.default : 0);
                    } else {
                      updateComponent(comp, 'expression', '');
                    }
                  }}
                >
                  {isExpr ? 'expr' : 'fx'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
