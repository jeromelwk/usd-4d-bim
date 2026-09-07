import type { PrimNode } from "../api/types";

export function flattenTree(tree: PrimNode[]): Map<string, PrimNode> {
  const map = new Map<string, PrimNode>();
  function visit(node: PrimNode) {
    map.set(node.path, node);
    node.children.forEach(visit);
  }
  tree.forEach(visit);
  return map;
}
