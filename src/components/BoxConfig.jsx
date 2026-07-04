/**
 * BoxConfig.jsx — Boxes tab component
 *
 * ADR-015: Component-per-tab architecture.
 * ADR-016: Box Configuration UI — accordion-style box cards.
 * Reads from and writes to Zustand stores. Never imports from src/engine/.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore.js';
import { useUIStore } from '../store/uiStore.js';
import { THICKNESSES } from '../presets/thicknesses.js';
import { TRACK_TYPES } from '../presets/trackTypes.js';
import { BoxVisualization } from './BoxVisualization.jsx';

// Natural (numeric-aware) sort so "Box 2" sorts before "Box 10"
const NAME_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// Stable empty array to avoid creating new references in Zustand selectors
const EMPTY_ARRAY = [];

// Edge options for edge banding (per ADR-008)
const EDGE_OPTIONS = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

// Edge options specific to each part type
const EDGE_OPTIONS_BY_PART = {
  side: [
    { value: 'front', label: 'Front' },
    { value: 'back', label: 'Back' },
  ],
  top: [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'back', label: 'Back' },
  ],
  bottom: [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ],
};

/**
 * ThicknessSelect — dropdown populated from thickness presets.
 */
function ThicknessSelect({ value, onChange, label }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const preset = THICKNESSES.find((t) => t.id === e.target.value);
        onChange(preset ? preset.value : null);
      }}
      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
    >
      <option value="">Select…</option>
      {THICKNESSES.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

/**
 * GroupSelect — dropdown for assigning a box to a named group.
 * Picking "+ New group…" swaps in an inline text input so a group can be
 * created on the fly, without leaving the box card (tag-input style).
 */
function GroupSelect({ value, groups, onChange, onCreateGroup }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const commitCreate = () => {
    const trimmed = newName.trim();
    if (trimmed) onCreateGroup(trimmed);
    setCreating(false);
    setNewName('');
  };

  if (creating) {
    return (
      <div className="mt-1 flex gap-1">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          maxLength={100}
          placeholder="New group name"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitCreate();
            if (e.key === 'Escape') {
              setCreating(false);
              setNewName('');
            }
          }}
          onBlur={commitCreate}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value === '__new__') {
          setCreating(true);
          return;
        }
        onChange(e.target.value || null);
      }}
      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
    >
      <option value="">Ungrouped</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
      <option value="__new__">+ New group…</option>
    </select>
  );
}

/**
 * ShelfRow — single internal shelf editor row.
 * ADR-016: Internal Shelves — list of { heightFromBottom, quantity } with add/remove.
 */
function ShelfRow({ shelf, index, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500">#{index + 1}</span>
      <label className="flex items-center gap-1 text-sm">
        Qty
        <input
          type="number"
          min="1"
          step="1"
          value={shelf.quantity}
          onChange={(e) => onChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </label>
      <label className="flex items-center gap-1 text-sm">
        H from bot. (mm)
        <input
          type="number"
          min="0"
          step="1"
          value={shelf.heightFromBottom ?? ''}
          onChange={(e) => onChange(index, 'heightFromBottom', parseFloat(e.target.value) || 0)}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          placeholder="auto"
        />
      </label>
      <button
        onClick={() => onRemove(index)}
        className="text-xs text-red-500 hover:underline"
      >
        Remove
      </button>
    </div>
  );
}

/**
 * DrawerConfigInline — inline drawer configuration form within the box card.
 * ADR-016: DrawerConfigInline sub-component.
 */
function DrawerConfigInline({ drawer, onUpdate, onRemove }) {
  const handleTrackTypeChange = useCallback(
    (trackTypeId) => {
      const preset = TRACK_TYPES.find((t) => t.id === trackTypeId);
      const clearance = preset?.clearance_per_side ?? drawer.trackClearancePerSide;
      onUpdate(drawer.id, { trackType: trackTypeId, trackClearancePerSide: clearance ?? 0 });
    },
    [drawer, onUpdate]
  );

  return (
    <div className="p-3 bg-gray-50 rounded-md space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Drawer — {drawer.drawerHeight}mm high × {drawer.quantity}
        </span>
        <button
          onClick={() => onRemove(drawer.id)}
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
            step="1"
            value={drawer.drawerHeight}
            onChange={(e) =>
              onUpdate(drawer.id, {
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
            step="1"
            value={drawer.quantity}
            onChange={(e) =>
              onUpdate(drawer.id, {
                quantity: parseInt(e.target.value, 10) || 1,
              })
            }
            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Track type</span>
          <select
            value={drawer.trackType}
            onChange={(e) => handleTrackTypeChange(e.target.value)}
            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
          >
            {TRACK_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label className="block">
          <span className="text-xs text-gray-500">Side (mm)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={drawer.thicknesses.side}
            onChange={(e) =>
              onUpdate(drawer.id, {
                thicknesses: { ...drawer.thicknesses, side: parseFloat(e.target.value) || 0 },
              })
            }
            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Front/Back (mm)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={drawer.thicknesses.frontBack}
            onChange={(e) =>
              onUpdate(drawer.id, {
                thicknesses: { ...drawer.thicknesses, frontBack: parseFloat(e.target.value) || 0 },
              })
            }
            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Base (mm)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={drawer.thicknesses.base}
            onChange={(e) =>
              onUpdate(drawer.id, {
                thicknesses: { ...drawer.thicknesses, base: parseFloat(e.target.value) || 0 },
              })
            }
            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Back setback (mm)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={drawer.backSetback}
            onChange={(e) =>
              onUpdate(drawer.id, {
                backSetback: parseFloat(e.target.value) || 0,
              })
            }
            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs text-gray-500">Base inset side (mm)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={drawer.baseInsetFromSide}
            onChange={(e) =>
              onUpdate(drawer.id, {
                baseInsetFromSide: parseFloat(e.target.value) || 0,
              })
            }
            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Base inset front (mm)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={drawer.baseInsetFromFront}
            onChange={(e) =>
              onUpdate(drawer.id, {
                baseInsetFromFront: parseFloat(e.target.value) || 0,
              })
            }
            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>
      </div>
    </div>
  );
}

/**
 * BoxCard — collapsible card for a single box.
 * ADR-016: Each expanded BoxCard contains these sections in order:
 * 1. Basic Info — name, quantity
 * 2. External Dimensions — width, height, depth (mm)
 * 3. Construction Method — radio group
 * 4. Material Thicknesses — dropdown from presets
 * 5. Edge Banding — thickness selector, checkboxes per part type
 * 6. Internal Shelves — ShelfRow list
 * 7. Drawers — DrawerConfigInline list
 */
function BoxCard({ boxId }) {
  const updateBox = useProjectStore((s) => s.updateBox);
  const updateDrawer = useProjectStore((s) => s.updateDrawer);
  const deleteDrawer = useProjectStore((s) => s.deleteDrawer);
  const addDrawer = useProjectStore((s) => s.addDrawer);
  const addGroup = useProjectStore((s) => s.addGroup);

  const box = useProjectStore((s) => {
    const project = s.getActiveProject();
    if (!project) return null;
    return project.boxes.find((b) => b.id === boxId) ?? null;
  });

  const groups = useProjectStore((s) => {
    const project = s.getActiveProject();
    return project ? (project.groups || EMPTY_ARRAY) : EMPTY_ARRAY;
  });

  const allDrawers = useProjectStore((s) => {
    const project = s.getActiveProject();
    return project ? project.drawers : EMPTY_ARRAY;
  });
  const projectDrawers = useMemo(
    () => allDrawers.filter((d) => d.boxId === boxId),
    [allDrawers, boxId]
  );

  // Single-select accordion: only one box card is expanded at a time, driven
  // by uiStore.selectedBoxId (previously dead state — see ADR discussion).
  // This is also what makes "auto-select" on add/duplicate meaningful: setting
  // selectedBoxId to the new box both opens it and collapses whatever was open.
  const selectedBoxId = useUIStore((s) => s.selectedBoxId);
  const setSelectedBox = useUIStore((s) => s.setSelectedBox);
  const expanded = selectedBoxId === boxId;

  const cardRef = useRef(null);
  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expanded]);

  const handleFieldChange = useCallback(
    (field, value) => updateBox(boxId, { [field]: value }),
    [boxId, updateBox]
  );

  const handleCreateGroup = useCallback(
    (name) => {
      const groupId = addGroup(name);
      if (groupId) updateBox(boxId, { groupId });
    },
    [boxId, addGroup, updateBox]
  );

  const handleThicknessChange = useCallback(
    (key, value) => {
      updateBox(boxId, (state) => {
        const b = state.projects
          .find((p) => p.id === state.activeProjectId)?.boxes
          .find((bx) => bx.id === boxId);
        if (!b) return {};
        return {
          thicknesses: { ...b.thicknesses, [key]: value },
        };
      });
    },
    [boxId, updateBox]
  );

  const handleEbThicknessChange = useCallback(
    (value) => {
      const thickness = value === '' || value === 'none' ? null : parseFloat(value);
      updateBox(boxId, (state) => {
        const b = state.projects
          .find((p) => p.id === state.activeProjectId)?.boxes
          .find((bx) => bx.id === boxId);
        if (!b) return {};
        return {
          edgeBanding: { ...b.edgeBanding, thickness },
        };
      });
    },
    [boxId, updateBox]
  );

  const handleEbEdgesChange = useCallback(
    (partType, edge, checked) => {
      updateBox(boxId, (state) => {
        const b = state.projects
          .find((p) => p.id === state.activeProjectId)?.boxes
          .find((bx) => bx.id === boxId);
        if (!b) return {};
        const currentEdges = b.edgeBanding?.edges?.[partType] || [];
        const newEdges = checked
          ? [...currentEdges, edge]
          : currentEdges.filter((e) => e !== edge);
        return {
          edgeBanding: {
            ...b.edgeBanding,
            edges: { ...b.edgeBanding?.edges, [partType]: newEdges },
          },
        };
      });
    },
    [boxId, updateBox]
  );

  const handleAddShelf = useCallback(() => {
    updateBox(boxId, (state) => {
      const b = state.projects
        .find((p) => p.id === state.activeProjectId)?.boxes
        .find((bx) => bx.id === boxId);
      if (!b) return {};
      const shelves = [...(b.internalShelves || []), { quantity: 1 }];
      return { internalShelves: shelves };
    });
  }, [boxId, updateBox]);

  const handleShelfChange = useCallback(
    (index, field, value) => {
      updateBox(boxId, (state) => {
        const b = state.projects
          .find((p) => p.id === state.activeProjectId)?.boxes
          .find((bx) => bx.id === boxId);
        if (!b) return {};
        const shelves = [...b.internalShelves];
        shelves[index] = { ...shelves[index], [field]: value };
        return { internalShelves: shelves };
      });
    },
    [boxId, updateBox]
  );

  const handleRemoveShelf = useCallback(
    (index) => {
      updateBox(boxId, (state) => {
        const b = state.projects
          .find((p) => p.id === state.activeProjectId)?.boxes
          .find((bx) => bx.id === boxId);
        if (!b) return {};
        const shelves = b.internalShelves.filter((_, i) => i !== index);
        return { internalShelves: shelves };
      });
    },
    [boxId, updateBox]
  );

  if (!box) return null;

  return (
    <div ref={cardRef} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Box header — summary */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setSelectedBox(expanded ? null : boxId)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{box.name || 'Box'}</span>
            <span className="text-xs text-gray-500">
              {box.externalWidth}×{box.externalHeight}×{box.externalDepth} mm
              {box.quantity > 1 ? ` × ${box.quantity}` : ''}
            </span>
          </div>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded editor — ADR-016 sections */}
      {expanded && (
        <div className="p-4 space-y-6 border-t border-gray-200">
          {/* 1. Basic Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Basic Info</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">Name</span>
                <input
                  type="text"
                  value={box.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Quantity</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={box.quantity}
                  onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value, 10) || 1)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Group</span>
                <GroupSelect
                  value={box.groupId}
                  groups={groups}
                  onChange={(groupId) => handleFieldChange('groupId', groupId)}
                  onCreateGroup={handleCreateGroup}
                />
              </label>
            </div>
          </div>

          {/* 2. External Dimensions */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">External Dimensions (mm)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">Width (mm)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={box.externalWidth}
                  onChange={(e) => handleFieldChange('externalWidth', parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Height (mm)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={box.externalHeight}
                  onChange={(e) => handleFieldChange('externalHeight', parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Depth (mm)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={box.externalDepth}
                  onChange={(e) => handleFieldChange('externalDepth', parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>
            </div>
          </div>

          {/* 2b. Visualization Preview */}
          <BoxVisualization box={box} thicknesses={box.thicknesses} />

          {/* 3. Construction Method */}
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
                    {m === 'A' ? 'A — Sides run full height' : 'B — Top/bottom run full width'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Material Thicknesses — dropdown from presets */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Material Thicknesses</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['side', 'top', 'bottom', 'back'].map((key) => {
                const matchedPreset = THICKNESSES.find(
                  (t) => t.value === box.thicknesses[key]
                );
                return (
                  <label key={key} className="block">
                    <span className="text-xs text-gray-500 capitalize">{key}</span>
                    <ThicknessSelect
                      value={matchedPreset?.id ?? box.thicknesses[key]}
                      onChange={(val) => handleThicknessChange(key, val)}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* 5. Edge Banding */}
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
                    {(EDGE_OPTIONS_BY_PART[partType] || []).map(({ value, label }) => (
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

          {/* 6. Internal Shelves */}
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
                  <ShelfRow
                    key={i}
                    shelf={shelf}
                    index={i}
                    onChange={handleShelfChange}
                    onRemove={handleRemoveShelf}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No internal shelves configured.</p>
            )}
          </div>

          {/* 7. Drawers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Drawers</h4>
              <button
                onClick={() => addDrawer(boxId)}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add Drawer
              </button>
            </div>
            {projectDrawers.length > 0 ? (
              <div className="space-y-3">
                {projectDrawers.map((drawer) => (
                  <DrawerConfigInline
                    key={drawer.id}
                    drawer={drawer}
                    onUpdate={updateDrawer}
                    onRemove={deleteDrawer}
                  />
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
 * BoxListItem — a single box row: the collapsible BoxCard plus its
 * Duplicate/Delete actions. Shared between the grouped and ungrouped
 * rendering branches below.
 */
function BoxListItem({ boxId, fallbackName, onDuplicate, onDelete }) {
  return (
    <div className="relative">
      <BoxCard boxId={boxId} />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onDuplicate(boxId)}
          className="text-xs text-blue-600 hover:underline"
        >
          Duplicate
        </button>
        <button
          onClick={() => onDelete(boxId, fallbackName)}
          className="text-xs text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/**
 * BoxConfig — main Boxes tab component (ADR-016).
 * Accordion-style list where each box is a collapsible card, organized into
 * named groups (a project may have none) plus an "Ungrouped" bucket. Boxes
 * within each bucket, and the groups themselves, are always sorted by name.
 */
export default function BoxConfig() {
  const boxes = useProjectStore((s) => {
    const project = s.getActiveProject();
    return project ? project.boxes : EMPTY_ARRAY;
  });
  const groups = useProjectStore((s) => {
    const project = s.getActiveProject();
    return project ? (project.groups || EMPTY_ARRAY) : EMPTY_ARRAY;
  });

  const addBox = useProjectStore((s) => s.addBox);
  const deleteBox = useProjectStore((s) => s.deleteBox);
  const duplicateBox = useProjectStore((s) => s.duplicateBox);
  const renameGroup = useProjectStore((s) => s.renameGroup);
  const deleteGroup = useProjectStore((s) => s.deleteGroup);
  const setSelectedBox = useUIStore((s) => s.setSelectedBox);

  const [renamingGroupId, setRenamingGroupId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const getBox = useCallback(
    (id) => {
      const project = useProjectStore.getState().getActiveProject();
      if (!project) return null;
      return project.boxes.find((b) => b.id === id) ?? null;
    },
    []
  );

  const handleDelete = useCallback(
    (id, fallbackName) => {
      const b = getBox(id);
      if (window.confirm(`Delete "${b?.name || fallbackName}"?`)) {
        deleteBox(id);
      }
    },
    [getBox, deleteBox]
  );

  const handleDeleteGroup = useCallback(
    (group, count) => {
      const message = count > 0
        ? `Delete group "${group.name}"? ${count} box${count === 1 ? '' : 'es'} will become ungrouped.`
        : `Delete group "${group.name}"?`;
      if (window.confirm(message)) {
        deleteGroup(group.id);
      }
    },
    [deleteGroup]
  );

  const sections = useMemo(() => {
    const byGroup = new Map();
    const ungrouped = [];
    for (const box of boxes) {
      if (box.groupId) {
        if (!byGroup.has(box.groupId)) byGroup.set(box.groupId, []);
        byGroup.get(box.groupId).push(box);
      } else {
        ungrouped.push(box);
      }
    }
    const sortByName = (arr) => [...arr].sort((a, b) => NAME_COLLATOR.compare(a.name, b.name));

    const groupSections = [...groups]
      .sort((a, b) => NAME_COLLATOR.compare(a.name, b.name))
      .map((g) => ({ group: g, boxes: sortByName(byGroup.get(g.id) || []) }));

    return { groupSections, ungrouped: sortByName(ungrouped) };
  }, [boxes, groups]);

  const hasGroups = groups.length > 0;
  const hasBoxes = boxes.length > 0;

  const handleAddBox = () => {
    const id = addBox();
    setSelectedBox(id);
  };

  const handleDuplicate = (id) => {
    const newId = duplicateBox(id);
    if (newId) setSelectedBox(newId);
  };

  if (!hasBoxes) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Boxes</h2>
          <button
            onClick={handleAddBox}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            + Add Box
          </button>
        </div>
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No boxes configured.</p>
          <p className="text-sm mt-1">Add a box to start designing your furniture.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Boxes</h2>
        <button
          onClick={handleAddBox}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          + Add Box
        </button>
      </div>

      <div className="space-y-6">
        {sections.groupSections.map(({ group, boxes: groupBoxes }) => (
          <div key={group.id}>
            <div className="flex items-center justify-between mb-2">
              {renamingGroupId === group.id ? (
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  maxLength={100}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameGroup(group.id, renameValue);
                      setRenamingGroupId(null);
                    } else if (e.key === 'Escape') {
                      setRenamingGroupId(null);
                    }
                  }}
                  onBlur={() => {
                    renameGroup(group.id, renameValue);
                    setRenamingGroupId(null);
                  }}
                  className="px-2 py-1 text-sm font-semibold border border-blue-400 rounded"
                />
              ) : (
                <h3 className="text-sm font-semibold text-gray-700">{group.name}</h3>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setRenamingGroupId(group.id);
                    setRenameValue(group.name);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleDeleteGroup(group, groupBoxes.length)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete group
                </button>
              </div>
            </div>
            {groupBoxes.length > 0 ? (
              <div className="space-y-3">
                {groupBoxes.map((box, index) => (
                  <BoxListItem
                    key={box.id}
                    boxId={box.id}
                    fallbackName={`Box ${index + 1}`}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No boxes in this group.</p>
            )}
          </div>
        ))}

        {(sections.ungrouped.length > 0 || !hasGroups) && (
          <div>
            {hasGroups && (
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Ungrouped</h3>
            )}
            <div className="space-y-3">
              {sections.ungrouped.map((box, index) => (
                <BoxListItem
                  key={box.id}
                  boxId={box.id}
                  fallbackName={`Box ${index + 1}`}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}