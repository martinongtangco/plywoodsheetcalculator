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
      <span className="text-label-sm font-mono text-ink-400 uppercase">Grain Constraint</span>
      <div className="space-y-2">
        {GRAIN_OPTIONS.map(({ value, label, description }) => (
          <label
            key={value}
            className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors duration-150 min-h-[44px] ${
              grainConstraint === value
                ? 'border-accent bg-accent-light'
                : 'border-border-100 bg-paper-50 hover:bg-paper-200'
            }`}
          >
            <input
              type="radio"
              name="grainConstraint"
              checked={grainConstraint === value}
              onChange={() => handleChange(value)}
              className="mt-1 accent-accent min-h-[16px] min-w-[16px]"
            />
            <div>
              <span className="text-label-lg text-ink-900">{label}</span>
              <p className="text-body-sm text-ink-500 mt-0.5">{description}</p>
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
      <span className="text-label-sm font-mono text-ink-400 uppercase">Cut Mode</span>
      <div className="flex flex-wrap gap-2">
        {CUT_MODES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleChange(value)}
            className={cutMode === value ? 'chip-selected' : 'chip-unselected'}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-body-sm text-ink-400">
        {CUT_MODES.find((m) => m.value === cutMode)?.description}
      </p>
    </div>
  );
}

/**
 * CutSettings — main Cut Settings tab component
 */
export default function CutSettings() {
  return (
    <div>
      <h2 className="section-title mb-4">Cut Settings</h2>
      <div className="space-y-6">
        <div className="card">
          <GrainConstraintSelector />
        </div>
        <div className="card">
          <CutModeSelector />
        </div>
      </div>
    </div>
  );
}
