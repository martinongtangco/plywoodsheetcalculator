/**
 * MaterialConfig.jsx — Materials tab component
 *
 * ADR-015: Component-per-tab architecture.
 * Reads from and writes to Zustand stores. Never imports from src/engine/.
 *
 * Features:
 * - Select sheet size from presets or enter custom dimensions
 * - Set blade kerf from presets or enter custom value
 */

import { useCallback, useState } from 'react';
import { useProjectStore } from '../store/projectStore.js';
import { SHEET_SIZES, KERF_PRESETS } from '../presets/index.js';

/**
 * Sheet size selection panel
 */
function SheetSizeSelector() {
  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

  const width = project?.sheetSize?.width ?? 1220;
  const length = project?.sheetSize?.length ?? 2440;

  const handlePresetSelect = useCallback((preset) => {
    updateProject({ sheetSize: { width: preset.width, length: preset.length } });
  }, [updateProject]);

  const handleCustomChange = useCallback((field, value) => {
    updateProject({
      sheetSize: {
        width: field === 'width' ? (parseFloat(value) || 0) : width,
        length: field === 'length' ? (parseFloat(value) || 0) : length,
      },
    });
  }, [updateProject, width, length]);

  return (
    <div className="space-y-4">
      <h3 className="text-title-md text-surface-800">Sheet Size</h3>

      {/* Presets */}
      <div>
        <span className="text-label-sm text-surface-500 block mb-2">Presets</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SHEET_SIZES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className={width === preset.width && length === preset.length ? 'chip-selected' : 'chip-unselected'}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom dimensions */}
      <div>
        <span className="text-label-sm text-surface-500 block mb-2">Custom Dimensions (mm)</span>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-label-sm text-surface-500">Width (mm)</span>
            <input
              type="number"
              min="1"
              value={width}
              onChange={(e) => handleCustomChange('width', e.target.value)}
              className="input mt-1 py-2"
            />
          </label>
          <label className="block">
            <span className="text-label-sm text-surface-500">Length (mm)</span>
            <input
              type="number"
              min="1"
              value={length}
              onChange={(e) => handleCustomChange('length', e.target.value)}
              className="input mt-1 py-2"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

/**
 * Kerf input panel
 */
function KerfInput() {
  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

  const kerf = project?.kerf ?? 3;
  const [customKerf, setCustomKerf] = useState(String(kerf));

  const handlePresetSelect = useCallback((preset) => {
    if (preset.value !== null) {
      updateProject({ kerf: preset.value });
      setCustomKerf(String(preset.value));
    }
  }, [updateProject]);

  const handleCustomChange = useCallback((value) => {
    setCustomKerf(value);
    const val = parseFloat(value);
    if (!isNaN(val) && val >= 0) {
      updateProject({ kerf: val });
    }
  }, [updateProject]);

  return (
    <div className="space-y-4">
      <h3 className="text-title-md text-surface-800">Blade Kerf</h3>

      {/* Presets */}
      <div>
        <span className="text-label-sm text-surface-500 block mb-2">Presets</span>
        <div className="flex flex-wrap gap-2">
          {KERF_PRESETS.filter((p) => p.id !== 'custom').map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className={kerf === preset.value ? 'chip-selected' : 'chip-unselected'}
            >
              {preset.label}
              <span className="ml-1 text-label-sm font-normal text-surface-400">({preset.value}mm)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom input */}
      <div>
        <label className="block">
          <span className="text-label-sm text-surface-500">Custom Kerf (mm)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={customKerf}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="input mt-1 w-full sm:w-32 py-2"
          />
        </label>
        <p className="text-body-sm text-surface-400 mt-1">
          Kerf is the material removed by the blade. Typical values: 2-4mm for circular saw, 1-2mm for panel saw.
        </p>
      </div>
    </div>
  );
}

/**
 * MaterialConfig — main Materials tab component
 */
export default function MaterialConfig() {
  return (
    <div>
      <h2 className="section-title mb-4">Materials</h2>
      <div className="space-y-6">
        <div className="card">
          <SheetSizeSelector />
        </div>
        <div className="card">
          <KerfInput />
        </div>
      </div>
    </div>
  );
}
