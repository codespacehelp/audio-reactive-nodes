import { useProjectStore } from '../store/project-store';
import { getNodeParamDefs } from './param-defs';
import ParamEditor from './ParamEditor';

/**
 * Property panel showing parameters for the currently selected node.
 * Shows a placeholder when 0 or >1 nodes are selected.
 */
export default function PropertyPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedNodeIds = useProjectStore((s) => s.selectedNodeIds);

  if (!project || selectedNodeIds.size === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-zinc-500">
        Select a node to edit its properties
      </div>
    );
  }

  if (selectedNodeIds.size > 1) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-zinc-500">
        {selectedNodeIds.size} nodes selected
      </div>
    );
  }

  const nodeId = [...selectedNodeIds][0];
  const node = project.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const paramDefs = getNodeParamDefs(node.type);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-700 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {node.type}
        </div>
        <div className="mt-1 text-sm font-medium text-zinc-200">
          {node.name}
        </div>
      </div>

      {/* Parameters */}
      <div className="flex-1 p-4">
        {paramDefs.length === 0 ? (
          <p className="text-xs text-zinc-500">No editable parameters</p>
        ) : (
          <div className="space-y-3">
            {paramDefs.map((def) => (
              <ParamEditor
                key={def.name}
                nodeId={nodeId}
                def={def}
                paramValue={node.params[def.name]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
