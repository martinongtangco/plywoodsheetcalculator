/**
 * BoxConfig.jsx — Boxes tab component
 *
 * ADR-015: Component-per-tab architecture.
 * Reads from and writes to Zustand stores. Never imports from src/engine/.
 *
 * Features:
 * - List all boxes in the active project
 * - Add / delete / duplicate boxes
 * - Edit box dimensions, construction method, thicknesses, edge banding
 * - Configure internal shelves
 * - Configure drawer configs per box
 */

import { useState, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore.js';

// Edge options for edge banding
const EDGE_OPTIONS = [
  { value: 'length+', label: 'Length +' },
  { value: 'length-', label: 'Length −' },
  { value: 'width+', label: 'Width +' },
  { value: 'width-', label: 'Width −' },
];

/**
 * Individual box editor panel
 */
function BoxEditor({ box }) {
  const updateBox = useProjectStore((s) => s.updateBox);
  const addDrawer = useProjectStore((s) => s.addDrawer);
  const updateDrawer = useProjectStore((s) => s.updateDrawer);
  const deleteDrawer = useProjectStore((s) => s.deleteDrawer);
  const projectDrawers = useProjectStore((s) => {
    const project = s.getActiveProject();
    if (!project) return [];
    // Stable reference: only returns new array when drawer data actually changes
    const result = [];
    for (let i = 0; i < project.drawers.length; i++) {
      if (project.drawers[i].boxId === box.id) {
        result.push(project.drawers[i]);
      }
    }
    return result;
  }, (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  });

  const [expanded, setExpanded] = useState(false);

  const handleFieldChange = useCallback((field, value) => {
    updateBox(box.id, { [field]: value });
  }, [box.id, updateBox]);

  const handleThicknessChange = useCallback((key, value) => {
    updateBox(box.id, (currentState) => {
      const boxInState = currentState.projects
        .find(p => p.id === currentState.activeProjectId)?.boxes
        .find(b => b.id === box.id);
      if (!boxInState) return {};
      return {
        thicknesses: {
          ...boxInState.thicknesses,
          [key]: parseFloat(value) || 0,
        },
      };
    });
  }, [box.id, updateBox]);

  const handleEbThicknessChange = useCallback((value) => {
    const thickness = value === '' || value === 'none' ? null : parseFloat(value);
    updateBox(box.id, (currentState) => {
      const boxInState = currentState.projects
        .find(p => p.id === currentState.activeProjectId)?.boxes
        .find(b => b.id === box.id);
      if (!boxInState) return {};
      return {
        edgeBanding: {
          ...boxInState.edgeBanding,
          thickness,
        },
      };
    });
  }, [box.id, updateBox]);

  const handleEbEdgesChange = useCallback((partType, edge, checked) => {
    updateBox(box.id, (currentState) => {
      const boxInState = currentState.projects
        .find(p => p.id === currentState.activeProjectId)?.boxes
        .find(b => b.id === box.id);
      if (!boxInState) return {};
      const currentEdges = boxInState.edgeBanding?.edges?.[partType] || [];
      const newEdges = checked
        ? [...currentEdges, edge]
        : currentEdges.filter((e) => e !== edge);
      return {
        edgeBanding: {
          ...boxInState.edgeBanding,
          edges: {
            ...boxInState.edgeBanding?.edges,
            [partType]: newEdges,
          },
        },
      };
    });
  }, [box.id, updateBox]);

  const handleAddShelf = useCallback(() => {
    updateBox(box.id, (currentState) => {
      const boxInState = currentState.projects
        .find(p => p.id === currentState.activeProjectId)?.boxes
        .find(b => b.id === box.id);
      if (!boxInState) return {};
      const shelves = [...(boxInState.internalShelves || []), { quantity: 1 }];
      return { internalShelves: shelves };
    });
  }, [box.id, updateBox]);

  const handleShelfChange = useCallback((index, field, value) => {
    updateBox(box.id, (currentState) => {
      const boxInState = currentState.projects
        .find(p => p.id === currentState.activeProjectId)?.boxes
        .find(b => b.id === box.id);
      if (!boxInState) return {};
      const shelves = [...boxInState.internalShelves];
      shelves[index] = { ...shelves[index], [field]: value };
      return { internalShelves: shelves };
    });
  }, [box.id, updateBox]);

  const handleRemoveShelf = useCallback((index) => {
    updateBox(box.id, (currentState) => {
      const boxInState = currentState.projects
        .find(p => p.id === currentState.activeProjectId)?.boxes
        .find(b => b.id === box.id);
      if (!boxInState) return {};
      const shelves = boxInState.internalShelves.filter((_, i) => i !== index);
      return { internalShelves: shelves };
    });
  }, [box.id, updateBox]);

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Box header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {box.name || `Box`}
            </span>
            <span className="text-xs text-gray-500">
              {box.externalWidth}×{box.externalHeight}×{box.externalDepth} mm
            </span>
          </div>
        </div>
        <span className="text-gray-400 text-sm">
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="p-4 space-y-6 border-t border-gray-200">
          {/* Basic fields */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Dimensions (mm)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">Width</span>
                <input
                  type="number"
                  min="1"
                  value={box.externalWidth}
                  onChange={(e) => handleFieldChange('externalWidth', parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Height</span>
                <input
                  type="number"
                  min="1"
                  value={box.externalHeight}
                  onChange={(e) => handleFieldChange('externalHeight', parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Depth</span>
                <input
                  type="number"
                  min="1"
                  value={box.externalDepth}
                  onChange={(e) => handleFieldChange('externalDepth', parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Quantity</span>
                <input
                  type="number"
                  min="1"
                  value={box.quantity}
                  onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value, 10) || 1)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>
            </div>
          </div>

          {/* Construction method */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Construction Method</h4>
            <div className="flex gap-4">
              {['A', 'B'].map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`method-${box.id}`}
                    checked={box.constructionMethod === m}
                    onChange={() => handleFieldChange('constructionMethod', m)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {m === 'A' ? 'A — Full-height sides' : 'B — Full-width top/bottom'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Material thicknesses */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Material Thicknesses (mm)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['side', 'top', 'bottom', 'back'].map((key) => (
                <label key={key} className="block">
                  <span className="text-xs text-gray-500 capitalize">{key}</span>
                  <input
                    type="number"
                    min="1"
                    value={box.thicknesses[key]}
                    onChange={(e) => handleThicknessChange(key, e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Edge banding */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Edge Banding</h4>
            <label className="block mb-3">
              <span className="text-xs text-gray-500">Thickness (mm, or leave blank for none)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={box.edgeBanding?.thickness ?? ''}
                onChange={(e) => handleEbThicknessChange(e.target.value)}
                className="mt-1 w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="none"
              />
            </label>

            {/* Per-part edge selectors */}
            {box.edgeBanding?.thickness != null && (
              <div className="space-y-2">
                {['side', 'top', 'bottom'].map((partType) => (
                  <div key={partType} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 capitalize w-12">{partType}</span>
                    {EDGE_OPTIONS.map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={(box.edgeBanding?.edges?.[partType] || []).includes(value)}
                          onChange={(e) => handleEbEdgesChange(partType, value, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal shelves */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Internal Shelves</h4>
              <button
                onClick={handleAddShelf}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add Shelf
              </button>
            </div>
            {box.internalShelves && box.internalShelves.length > 0 ? (
              <div className="space-y-2">
                {box.internalShelves.map((shelf, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">#{i + 1}</span>
                    <label className="flex items-center gap-1 text-sm">
                      Qty
                      <input
                        type="number"
                        min="1"
                        value={shelf.quantity}
                        onChange={(e) => handleShelfChange(i, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </label>
                    <button
                      onClick={() => handleRemoveShelf(i)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No internal shelves configured.</p>
            )}
          </div>

          {/* Drawers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Drawers</h4>
              <button
                onClick={() => addDrawer(box.id)}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add Drawer
              </button>
            </div>
            {projectDrawers.length > 0 ? (
              <div className="space-y-3">
                {projectDrawers.map((drawer) => (
                  <div key={drawer.id} className="p-3 bg-gray-50 rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Drawer — {drawer.drawerHeight}mm high × {drawer.quantity}
                      </span>
                      <button
                        onClick={() => deleteDrawer(drawer.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <label className="block">
                        <span className="text-xs text-gray-500">Height (mm)</span>
                        <input
                          type="number"
                          min="1"
                          value={drawer.drawerHeight}
                          onChange={(e) =>
                            updateDrawer(drawer.id, {
                              drawerHeight: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-500">Quantity</span>
                        <input
                          type="number"
                          min="1"
                          value={drawer.quantity}
                          onChange={(e) =>
                            updateDrawer(drawer.id, {
                              quantity: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-500">Track clearance/side (mm)</span>
                        <input
                          type="number"
                          min="0"
                          value={drawer.trackClearancePerSide}
                          onChange={(e) =>
                            updateDrawer(drawer.id, {
                              trackClearancePerSide: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No drawers configured for this box.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * BoxConfig — main Boxes tab component
 */
export default function BoxConfig() {
  const boxes = useProjectStore((s) => {
    const project = s.getActiveProject();
    return project ? project.boxes : [];
  });
  const addBox = useProjectStore((s) => s.addBox);
  const deleteBox = useProjectStore((s) => s.deleteBox);
  const duplicateBox = useProjectStore((s) => s.duplicateBox);
  const updateBox = useProjectStore((s) => s.updateBox);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Boxes</h2>
        <button
          onClick={() => addBox()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          + Add Box
        </button>
      </div>

      {boxes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No boxes configured.</p>
          <p className="text-sm mt-1">Add a box to start designing your furniture.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boxes.map((box, index) => (
            <div key={box.id} className="relative">
              <BoxEditor box={box} />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => duplicateBox(box.id)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${box.name || `Box ${index + 1}`}"?`)) {
                      deleteBox(box.id);
                    }
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}