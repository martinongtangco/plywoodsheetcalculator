/**
 * ValidationBanner.jsx — Shared validation error banner.
 *
 * Used by both App.jsx (Output tab) and CutList.jsx to display
 * validation errors with tab-navigation links. Extracted to eliminate
 * code duplication (Issue #10).
 */

import { useUIStore } from '../store/uiStore.js';

/**
 * @param {object} props
 * @param {{ boxes: boolean, materials: boolean, cutSettings: boolean, errors: string[] } | null} props.result
 */
export function ValidationBanner({ result }) {
  if (!result || result.errors.length === 0) return null;

  const setActiveTab = useUIStore((s) => s.setActiveTab);

  return (
    <div className="alert-danger mb-4">
      <h3 className="text-title-md text-danger-800 mb-2">Cannot calculate — missing required fields</h3>
      <ul className="list-disc list-inside text-body-sm text-danger-700 space-y-1">
        {!result.boxes && (
          <li>
            Boxes not configured — go to{' '}
            <button className="text-accent underline hover:text-ink-700" onClick={() => setActiveTab('boxes')}>
              Boxes tab
            </button>
          </li>
        )}
        {!result.materials && (
          <li>
            Sheet size and kerf not set — go to{' '}
            <button className="text-accent underline hover:text-ink-700" onClick={() => setActiveTab('materials')}>
              Materials tab
            </button>
          </li>
        )}
        {!result.cutSettings && (
          <li>
            Grain constraint not selected — go to{' '}
            <button className="text-accent underline hover:text-ink-700" onClick={() => setActiveTab('cut-settings')}>
              Cut Settings tab
            </button>
          </li>
        )}
        {result.errors.map((err, i) => (
          <li key={i} className="text-ink-700">{err}</li>
        ))}
      </ul>
    </div>
  );
}

export default ValidationBanner;