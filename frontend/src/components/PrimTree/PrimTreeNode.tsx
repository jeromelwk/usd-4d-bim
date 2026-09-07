import type { PrimNode } from "../../api/types";
import { useScheduleStore } from "../../state/scheduleStore";

function typeIcon(type: string): string {
  if (type === "Mesh") return "▦";
  if (type === "Xform") return "▸";
  return "•";
}

export function PrimTreeNode({ node, depth }: { node: PrimNode; depth: number }) {
  const selected = useScheduleStore((s) => s.selectedPrimPaths.includes(node.path));
  const hasAssignment = useScheduleStore((s) => Boolean(s.assignments[node.path]));
  const togglePrimSelection = useScheduleStore((s) => s.togglePrimSelection);

  function onClick(e: React.MouseEvent) {
    togglePrimSelection(node.path, e.ctrlKey || e.metaKey || e.shiftKey);
  }

  return (
    <div>
      <div
        className={`tree-node${selected ? " tree-node-selected" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={onClick}
        title={node.path}
      >
        <span className="tree-icon">{typeIcon(node.type)}</span>
        <span className="tree-name">{node.name}</span>
        <span className="tree-type">{node.type}</span>
        {hasAssignment && <span className="tree-assigned-dot" title="Planifié" />}
      </div>
      {node.children.map((child) => (
        <PrimTreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
