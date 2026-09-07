import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";
import { PrimTreeNode } from "./PrimTreeNode";

export function PrimTree() {
  const tree = useScheduleStore((s) => s.tree);
  const selectedPrimPaths = useScheduleStore((s) => s.selectedPrimPaths);
  const clearSelection = useScheduleStore((s) => s.clearSelection);

  return (
    <div className="panel">
      {selectedPrimPaths.length > 0 && (
        <div className="panel-header">
          <button className="btn-link" onClick={clearSelection}>
            {t.tree.selectedCount(selectedPrimPaths.length)} · effacer
          </button>
        </div>
      )}
      {tree.length === 0 ? (
        <p className="empty-hint">{t.tree.empty}</p>
      ) : (
        <div className="tree-container">
          {tree.map((node) => (
            <PrimTreeNode key={node.path} node={node} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
