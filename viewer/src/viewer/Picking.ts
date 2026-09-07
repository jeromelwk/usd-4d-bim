// Prim picking, selection highlighting, and instanced-selection overlays.

import {
  Box3,
  Color,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
} from "three";
import type { ViewportContext } from "./viewerContext";

interface PickSelection {
  path: string;
  instanceId: number | null;
}

export class PickingController {
  private readonly raycaster = new Raycaster();
  private readonly highlightedMeshes = new Set<Mesh>();
  private selectedInstance: PickSelection | null = null;
  private selectedInstanceOverlays: Mesh[] = [];
  // Patched for USD 4D BIM: the emissive tint in applyHighlight() can be nearly
  // invisible on bright/overexposed materials (e.g. plain white untextured BIM
  // geometry), so selection also gets a wireframe overlay -- unaffected by
  // lighting/tonemapping, always clearly visible.
  private meshHighlightOverlays: Mesh[] = [];

  constructor(
    private readonly ctx: ViewportContext,
    private readonly meshByPath: Map<string, Mesh>,
    private readonly pathByMesh: Map<Mesh, string>
  ) {}

  pickPrim(clientX: number, clientY: number): string | null {
    this.selectedInstance = null;
    const rect = this.ctx.host.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.ctx.camera);
    const hits = this.raycaster.intersectObjects(this.ctx.stageRoot.children, true);
    for (const hit of hits) {
      if (hit.object instanceof Mesh) {
        const meshPath = this.pathByMesh.get(hit.object);
        if (!meshPath) continue;
        const ownerPath = hit.object.userData.instanceOwnerPath as string | undefined;
        const path = ownerPath ?? meshPath;
        this.selectedInstance = {
          path,
          instanceId: hit.object instanceof InstancedMesh && typeof hit.instanceId === "number"
            ? hit.instanceId
            : null,
        };
        if (path) return path;
      }
    }
    return null;
  }

  setSelectedPrim(primPath: string | null): void {
    this.setSelectedPrims(primPath ? [primPath] : []);
  }

  // Patched for USD 4D BIM: highlight an arbitrary set of prims at once (multi-select
  // sync from an embedding app), instead of only a single prim. Instance-level overlay
  // (point-instancer picking) is kept single-selection since it only ever applies to the
  // one prim last clicked directly in the viewport.
  setSelectedPrims(primPaths: string[]): void {
    const selectedSet = new Set(primPaths);
    if (selectedSet.size !== 1 || this.selectedInstance?.path !== primPaths[0]) {
      this.selectedInstance = null;
    }
    this.clearSelectedInstanceOverlays();
    this.clearMeshHighlightOverlays();
    for (const mesh of this.highlightedMeshes) {
      this.clearHighlight(mesh);
    }
    this.highlightedMeshes.clear();
    if (selectedSet.size === 0) return;
    const prefixes = primPaths.map((p) => p + "/");
    for (const [path, mesh] of this.meshByPath) {
      const owningPath = primPaths.find((p) => path === p) ??
        primPaths[prefixes.findIndex((prefix) => path.startsWith(prefix))];
      if (owningPath === undefined) continue;
      if (mesh instanceof InstancedMesh && mesh.userData.instanceOwnerPath === owningPath) {
        this.addSelectedInstanceOverlay(mesh, owningPath);
      } else {
        this.applyHighlight(mesh);
        this.highlightedMeshes.add(mesh);
        this.addMeshHighlightOverlay(mesh);
      }
    }
  }

  // Patched for USD 4D BIM: see meshHighlightOverlays above.
  private addMeshHighlightOverlay(mesh: Mesh): void {
    mesh.updateWorldMatrix(true, false);
    const overlay = new Mesh(
      mesh.geometry,
      new MeshBasicMaterial({
        color: 0xffb347,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false,
      })
    );
    overlay.matrix.copy(mesh.matrixWorld);
    overlay.matrixAutoUpdate = false;
    overlay.renderOrder = 999;
    this.ctx.scene.add(overlay);
    this.meshHighlightOverlays.push(overlay);
  }

  private clearMeshHighlightOverlays(): void {
    for (const overlay of this.meshHighlightOverlays) {
      this.ctx.scene.remove(overlay);
      const materials = Array.isArray(overlay.material) ? overlay.material : [overlay.material];
      for (const material of materials) {
        material.dispose();
      }
    }
    this.meshHighlightOverlays = [];
  }

  isHighlighted(mesh: Mesh): boolean {
    return this.highlightedMeshes.has(mesh);
  }

  // Drop bookkeeping for a mesh removed from the scene.
  forgetMesh(mesh: Mesh): void {
    this.highlightedMeshes.delete(mesh);
  }

  // Reset all selection state across a stage swap.
  clearStageState(): void {
    this.highlightedMeshes.clear();
    this.selectedInstance = null;
    this.clearSelectedInstanceOverlays();
    this.clearMeshHighlightOverlays();
  }

  private addSelectedInstanceOverlay(mesh: InstancedMesh, primPath: string): void {
    const selected = this.selectedInstance;
    if (!selected || selected.path !== primPath || selected.instanceId === null) {
      return;
    }

    const overlay = new Mesh(
      mesh.geometry,
      new MeshBasicMaterial({
        color: 0xffb347,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    const instanceMatrix = new Matrix4();
    mesh.getMatrixAt(selected.instanceId, instanceMatrix);
    overlay.matrix.copy(mesh.matrix).multiply(instanceMatrix);
    overlay.matrixAutoUpdate = false;
    this.ctx.scene.add(overlay);
    this.selectedInstanceOverlays.push(overlay);
  }

  clearSelectedInstanceOverlays(): void {
    for (const overlay of this.selectedInstanceOverlays) {
      this.ctx.scene.remove(overlay);
      const materials = Array.isArray(overlay.material)
        ? overlay.material
        : [overlay.material];
      for (const material of materials) {
        material.dispose();
      }
    }
    this.selectedInstanceOverlays = [];
  }

  applyHighlight(mesh: Mesh): void {
    const materials = this.getEmissiveMaterials(mesh);
    if (!materials.length) return;
    if (!mesh.userData.selEmissive) {
      mesh.userData.selEmissive = materials.map((mat) => mat.emissive.clone());
    }
    for (const mat of materials) {
      mat.emissive.set(0x3d1a00); // warm amber, visible on most materials
      mat.needsUpdate = true;
    }
  }

  private clearHighlight(mesh: Mesh): void {
    const materials = this.getEmissiveMaterials(mesh);
    const saved = mesh.userData.selEmissive as Color[] | undefined;
    if (saved) {
      for (let index = 0; index < materials.length; ++index) {
        if (saved[index]) {
          materials[index].emissive.copy(saved[index]);
          materials[index].needsUpdate = true;
        }
      }
      mesh.userData.selEmissive = null;
    }
  }

  private getEmissiveMaterials(mesh: Mesh): Array<Material & { emissive: Color; needsUpdate: boolean }> {
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    return materials.filter((mat): mat is Material & { emissive: Color; needsUpdate: boolean } => {
      return "emissive" in mat && mat.emissive instanceof Color;
    });
  }

  getSelectedInstanceBox(primPath: string): Box3 | null {
    const selected = this.selectedInstance;
    if (!selected || selected.path !== primPath || selected.instanceId === null) {
      return null;
    }

    const box = new Box3();
    for (const mesh of this.meshByPath.values()) {
      if (!(mesh instanceof InstancedMesh) || mesh.userData.instanceOwnerPath !== primPath) {
        continue;
      }
      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }
      const bounds = mesh.geometry.boundingBox;
      if (!bounds) {
        return null;
      }
      const instanceMatrix = new Matrix4();
      mesh.getMatrixAt(selected.instanceId, instanceMatrix);
      const worldMatrix = new Matrix4().multiplyMatrices(mesh.matrixWorld, instanceMatrix);
      box.union(bounds.clone().applyMatrix4(worldMatrix));
    }

    return box.isEmpty() ? null : box;
  }
}
