import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";
import { PrimTreeNode } from "./PrimTreeNode";

export function PrimTree() {
  const tree = useScheduleStore((s) => s.tree);
  const selectedPrimPaths = useScheduleStore((s) => s.selectedPrimPaths);
  const clearSelection = useScheduleStore((s) => s.clearSelection);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t.tree.title}</h2>
        {selectedPrimPaths.length > 0 && (
          <button className="btn-link" onClick={clearSelection}>
            {t.tree.selectedCount(selectedPrimPaths.length)} · effacer
          </button>
        )}
      </div>
      {tree.length === 0 ? (
        <p className="empty-hint">{t.tree.empty}</p>
      ) : (
        <>
          <p className="hint-text">{t.tree.selectHint}</p>
          <div className="tree-container">
            {tree.map((node) => (
              <PrimTreeNode key={node.path} node={node} depth={0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
