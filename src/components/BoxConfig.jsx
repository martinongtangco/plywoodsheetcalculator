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
      className="select mt-1"
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
          className="input"
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
      className="select mt-1"
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
      <span className="text-label-sm text-surface-500">#{index + 1}</span>
      <label className="flex items-center gap-1.5 text-body-sm text-surface-600">
        Qty
        <input
          type="number"
          min="1"
          step="1"
          value={shelf.quantity}
          onChange={(e) => onChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
          className="w-16 px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </label>
      <label className="flex items-center gap-1.5 text-body-sm text-surface-600">
        H from bot. (mm)
        <input
          type="number"
          min="0"
          step="1"
          value={shelf.heightFromBottom ?? ''}
          onChange={(e) => onChange(index, 'heightFromBottom', parseFloat(e.target.value) || 0)}
          className="w-20 px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="auto"
        />
      </label>
      <button
        onClick={() => onRemove(index)}
        className="text-label-sm text-danger-600 hover:text-danger-700 hover:underline transition-colors duration-150"
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
    <div className="card-flat space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-label-lg text-surface-700">
          Drawer — {drawer.drawerHeight}mm high × {drawer.quantity}
        </span>
        <button
          onClick={() => onRemove(drawer.id)}
          className="text-label-sm text-danger-600 hover:text-danger-700 hover:underline transition-colors duration-150"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <label className="block">
          <span className="text-label-sm text-surface-500">Height (mm)</span>
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
            className="mt-1 w-full px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </label>

        <label className="block">
          <span className="text-label-sm text-surface-500">Quantity</span>
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
            className="mt-1 w-full px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </label>

        <label className="block">
          <span className="text-label-sm text-surface-500">Track type</span>
          <select
            value={drawer.trackType}
            onChange={(e) => handleTrackTypeChange(e.target.value)}
            className="select mt-1 py-1"
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
          <span className="text-label-sm text-surface-500">Side (mm)</span>
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
            className="mt-1 w-full px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </label>

        <label className="block">
          <span className="text-label-sm text-surface-500">Front/Back (mm)</span>
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
            className="mt-1 w-full px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </label>

        <label className="block">
          <span className="text-label-sm text-surface-500">Base (mm)</span>
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
            className="mt-1 w-full px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </label>

        <label className="block">
          <span className="text-label-sm text-surface-500">Back setback (mm)</span>
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
            className="mt-1 w-full px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-label-sm text-surface-500">Base inset side (mm)</span>
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
            className="mt-1 w-full px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </label>

        <label className="block">
          <span className="text-label-sm text-surface-500">Base inset front (mm)</span>
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
            className="mt-1 w-full px-2 py-1 border border-surface-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
    <div ref={cardRef} className="border border-surface-200 rounded-lg bg-white overflow-hidden shadow-elev-0">
      {/* Box header — summary */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-surface-50 cursor-pointer hover:bg-surface-100 transition-colors duration-150 min-h-[44px]"
        onClick={() => setSelectedBox(expanded ? null : boxId)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-title-md text-surface-900">{box.name || 'Box'}</span>
            <span className="text-label-sm text-surface-500 font-normal">
              {box.externalWidth}×{box.externalHeight}×{box.externalDepth} mm
              {box.quantity > 1 ? ` × ${box.quantity}` : ''}
            </span>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-surface-400 transition-transform duration-200 ease-out ${expanded ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* Expanded editor — ADR-016 sections */}
      {expanded && (
        <div className="p-4 space-y-4 border-t border-surface-200">
          {/* 1. Basic Info */}
          <div className="card-flat">
            <h4 className="text-title-md text-surface-800 mb-3">Basic Info</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-label-sm text-surface-500">Name</span>
                <input
                  type="text"
                  value={box.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="input mt-1 py-2"
                />
              </label>
              <label className="block">
                <span className="text-label-sm text-surface-500">Quantity</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={box.quantity}
                  onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value, 10) || 1)}
                  className="input mt-1 py-2"
                />
              </label>
              <label className="block">
                <span className="text-label-sm text-surface-500">Group</span>
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
          <div className="card-flat">
            <h4 className="text-title-md text-surface-800 mb-3">External Dimensions (mm)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-label-sm text-surface-500">Width (mm)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={box.externalWidth}
                  onChange={(e) => handleFieldChange('externalWidth', parseFloat(e.target.value) || 0)}
                  className="input mt-1 py-2"
                />
              </label>
              <label className="block">
                <span className="text-label-sm text-surface-500">Height (mm)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={box.externalHeight}
                  onChange={(e) => handleFieldChange('externalHeight', parseFloat(e.target.value) || 0)}
                  className="input mt-1 py-2"
                />
              </label>
              <label className="block">
                <span className="text-label-sm text-surface-500">Depth (mm)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={box.externalDepth}
                  onChange={(e) => handleFieldChange('externalDepth', parseFloat(e.target.value) || 0)}
                  className="input mt-1 py-2"
                />
              </label>
            </div>
          </div>

          {/* 2b. Visualization Preview */}
          <div>
            <h4 className="text-title-md text-surface-800 mb-3">3D Preview</h4>
            <BoxVisualization box={box} thicknesses={box.thicknesses} />
          </div>

          {/* 3. Construction Method */}
          <div className="card-flat">
            <h4 className="text-title-md text-surface-800 mb-2">Construction Method</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              {['A', 'B'].map((m) => (
                <label key={m} className="flex items-center gap-2 min-h-[44px]">
                  <input
                    type="radio"
                    name={`method-${box.id}`}
                    checked={box.constructionMethod === m}
                    onChange={() => handleFieldChange('constructionMethod', m)}
                    className="accent-primary-600 min-h-[16px] min-w-[16px]"
                  />
                  <span className="text-body-md text-surface-700">
                    {m === 'A' ? 'A — Sides run full height' : 'B — Top/bottom run full width'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Material Thicknesses — dropdown from presets */}
          <div className="card-flat">
            <h4 className="text-title-md text-surface-800 mb-2">Material Thicknesses</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['side', 'top', 'bottom', 'back'].map((key) => {
                const matchedPreset = THICKNESSES.find(
                  (t) => t.value === box.thicknesses[key]
                );
                return (
                  <label key={key} className="block">
                    <span className="text-label-sm text-surface-500 capitalize">{key}</span>
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
          <div className="card-flat">
            <h4 className="text-title-md text-surface-800 mb-2">Edge Banding</h4>
            <label className="block mb-3">
              <span className="text-label-sm text-surface-500">Thickness (mm, or leave blank for none)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={box.edgeBanding?.thickness ?? ''}
                onChange={(e) => handleEbThicknessChange(e.target.value)}
                className="input mt-1 w-full sm:w-32 py-2"
                placeholder="none"
              />
            </label>

            {/* Per-part edge selectors */}
            {box.edgeBanding?.thickness != null && (
              <div className="space-y-2">
                {['side', 'top', 'bottom'].map((partType) => (
                  <div key={partType} className="flex items-center gap-2 flex-wrap">
                    <span className="text-label-sm text-surface-500 capitalize w-12">{partType}</span>
                    {(EDGE_OPTIONS_BY_PART[partType] || []).map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-1.5 text-body-sm text-surface-700">
                        <input
                          type="checkbox"
                          checked={(box.edgeBanding?.edges?.[partType] || []).includes(value)}
                          onChange={(e) => handleEbEdgesChange(partType, value, e.target.checked)}
                          className="accent-primary-600"
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
          <div className="card-flat">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-title-md text-surface-800">Internal Shelves</h4>
              <button
                onClick={handleAddShelf}
                className="text-label-sm text-primary-600 hover:text-primary-700 hover:underline transition-colors duration-150"
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
              <p className="text-body-sm text-surface-400">No internal shelves configured.</p>
            )}
          </div>

          {/* 7. Drawers */}
          <div className="card-flat">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-title-md text-surface-800">Drawers</h4>
              <button
                onClick={() => addDrawer(boxId)}
                className="text-label-sm text-primary-600 hover:text-primary-700 hover:underline transition-colors duration-150"
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
              <p className="text-body-sm text-surface-400">No drawers configured for this box.</p>
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
      <div className="flex gap-1 mt-1.5">
        <button
          onClick={() => onDuplicate(boxId)}
          className="text-label-sm text-primary-600 hover:text-primary-700 hover:underline px-2 py-2 min-h-[44px] transition-colors duration-150"
        >
          Duplicate
        </button>
        <button
          onClick={() => onDelete(boxId, fallbackName)}
          className="text-label-sm text-danger-600 hover:text-danger-700 hover:underline px-2 py-2 min-h-[44px] transition-colors duration-150"
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h2 className="section-title">Boxes</h2>
          <button onClick={handleAddBox} className="btn-primary">
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Box
          </button>
        </div>
        <div className="flex flex-col items-center text-center py-16 px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <h3 className="text-headline-md text-surface-900 mb-2">No boxes yet</h3>
          <p className="text-body-md text-surface-500 max-w-sm mb-6">
            A box is one carcass — sides, top, bottom, back. Add your first one to start
            sizing the parts.
          </p>
          <button onClick={handleAddBox} className="btn-primary">
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Box
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <h2 className="section-title">Boxes</h2>
        <button onClick={handleAddBox} className="btn-primary">
          <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Box
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
                  className="px-2 py-1 text-title-md border-2 border-primary-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <h3 className="text-title-md text-surface-800">{group.name}</h3>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRenamingGroupId(group.id);
                    setRenameValue(group.name);
                  }}
                  className="text-label-sm text-primary-600 hover:text-primary-700 hover:underline transition-colors duration-150"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleDeleteGroup(group, groupBoxes.length)}
                  className="text-label-sm text-danger-600 hover:text-danger-700 hover:underline transition-colors duration-150"
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
              <p className="text-body-sm text-surface-400">No boxes in this group.</p>
            )}
          </div>
        ))}

        {(sections.ungrouped.length > 0 || !hasGroups) && (
          <div>
            {hasGroups && (
              <h3 className="text-label-md text-surface-500 uppercase tracking-wide mb-2">Ungrouped</h3>
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