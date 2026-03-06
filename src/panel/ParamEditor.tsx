import { useProjectStore } from '../store/project-store';
import type { ParamDef } from '../types/node-def';
import type { ParamValue } from '../types/project';
import NumericInput from './NumericInput';
import StringInput from './StringInput';
import BoolInput from './BoolInput';
import EnumSelect from './EnumSelect';
import ColorInput from './ColorInput';
import ExpressionInput from './ExpressionInput';
import VecEditor from './VecEditor';

interface Props {
  nodeId: string;
  def: ParamDef;
  paramValue: ParamValue | undefined;
}

export default function ParamEditor({ nodeId, def, paramValue }: Props) {
  // Vec types get their own editor with per-component mode toggles
  if (def.type === 'vec2') {
    return <VecEditor nodeId={nodeId} def={def} paramValue={paramValue} components={['x', 'y']} />;
  }
  if (def.type === 'vec3') {
    return <VecEditor nodeId={nodeId} def={def} paramValue={paramValue} components={['x', 'y', 'z']} />;
  }

  const mode = paramValue?.mode ?? 'literal';
  const rawValue = paramValue?.value ?? def.default;

  const isExpression = mode === 'expression';
  const canExpression = def.expressionEnabled === true;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-400">
          {def.name}
        </label>
        {canExpression && (
          <button
            type="button"
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
              isExpression
                ? 'bg-amber-600/30 text-amber-400'
                : 'bg-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}
            title={isExpression ? 'Switch to literal' : 'Switch to expression'}
            onClick={() => {
              useProjectStore.getState().pushUndo();
              if (isExpression) {
                // Switch back to literal with the default value
                useProjectStore.getState().setParamValue(nodeId, def.name, {
                  mode: 'literal',
                  value: def.default,
                });
              } else {
                // Switch to expression with empty string
                useProjectStore.getState().setParamValue(nodeId, def.name, {
                  mode: 'expression',
                  value: '',
                });
              }
            }}
          >
            {isExpression ? 'expr' : 'fx'}
          </button>
        )}
      </div>

      {isExpression ? (
        <ExpressionInput
          nodeId={nodeId}
          def={def}
          expression={typeof rawValue === 'string' ? rawValue : ''}
        />
      ) : (
        <LiteralInput nodeId={nodeId} def={def} value={rawValue as string | number | boolean} />
      )}
    </div>
  );
}

function LiteralInput({
  nodeId,
  def,
  value,
}: {
  nodeId: string;
  def: ParamDef;
  value: number | string | boolean;
}) {
  switch (def.type) {
    case 'int':
    case 'float':
      return (
        <NumericInput
          nodeId={nodeId}
          def={def}
          value={typeof value === 'number' ? value : Number(value)}
        />
      );
    case 'string':
      return (
        <StringInput
          nodeId={nodeId}
          def={def}
          value={String(value)}
        />
      );
    case 'bool':
      return (
        <BoolInput
          nodeId={nodeId}
          def={def}
          value={Boolean(value)}
        />
      );
    case 'enum':
      return (
        <EnumSelect
          nodeId={nodeId}
          def={def}
          value={String(value)}
        />
      );
    case 'color':
      return (
        <ColorInput
          nodeId={nodeId}
          def={def}
          value={String(value)}
        />
      );
    default:
      return (
        <div className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-zinc-500">
          {String(value)}
        </div>
      );
  }
}
