/**
 * CutSettings.jsx — Cut Settings tab component
 *
 * ADR-015: Component-per-tab architecture.
 * Reads from and writes to Zustand stores. Never imports from src/engine/.
 *
 * Features:
 * - Select grain constraint mode (hard/soft)
 * - Select cut mode (batch/balanced/optimised)
 */

import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore.js';

const GRAIN_OPTIONS = [
  { value: 'hard', label: 'Hard — No rotation', description: 'Parts are never rotated. Grain direction is enforced strictly.' },
  { value: 'soft', label: 'Soft — Rotation allowed', description: 'Parts may be rotated to improve sheet utilisation when grain direction is not critical.' },
];

const CUT_MODES = [
  { value: 'batch', label: 'Batch', description: 'Groups parts by width, rips strips, then cross-cuts. Fast and waste-efficient for simple designs.' },
  { value: 'balanced', label: 'Balanced', description: 'Shelf-based Next-Fit Decreasing algorithm. Good general-purpose layout.' },
  { value: 'optimised', label: 'Optimised', description: 'Guillotine Best-Fit Decreasing heuristic. Maximises utilisation at the cost of computation time.' },
];

/**
 * Grain constraint selector
 */
function GrainConstraintSelector() {
  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

  const grainConstraint = project?.grainConstraint ?? 'soft';

  const handleChange = useCallback((value) => {
    updateProject({ grainConstraint: value });
  }, [updateProject]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Grain Constraint</h3>
      <div className="space-y-2">
        {GRAIN_OPTIONS.map(({ value, label, description }) => (
          <label
            key={value}
            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
              grainConstraint === value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="grainConstraint"
              checked={grainConstraint === value}
              onChange={() => handleChange(value)}
              className="mt-1 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">{label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Cut mode selector
 */
function CutModeSelector() {
  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

  const cutMode = project?.cutMode ?? 'balanced';

  const handleChange = useCallback((value) => {
    updateProject({ cutMode: value });
  }, [updateProject]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Cut Mode</h3>
      <div className="space-y-2">
        {CUT_MODES.map(({ value, label, description }) => (
          <label
            key={value}
            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
              cutMode === value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="cutMode"
              checked={cutMode === value}
              onChange={() => handleChange(value)}
              className="mt-1 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">{label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * CutSettings — main Cut Settings tab component
 */
export default function CutSettings() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Cut Settings</h2>
      <div className="space-y-8">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <GrainConstraintSelector />
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <CutModeSelector />
        </div>
      </div>
    </div>
  );
}