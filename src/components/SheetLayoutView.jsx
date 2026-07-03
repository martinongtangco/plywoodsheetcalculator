/**
 * SheetLayoutView.jsx — Sheet Layout tab component
 *
 * ADR-015: Component-per-tab architecture.
 * Reads from and writes to Zustand stores. Never imports from src/engine/.
 *
 * Features:
 * - Display calculated sheet layouts with SVG diagrams
 * - Show utilisation stats and offcut information
 * - Provide "Run Layout" trigger if no layouts exist yet
 */

import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore.js';
import { SheetLayouts } from './SheetLayoutDiagram.jsx';

/**
 * SheetLayoutView — main Sheet Layout tab component
 */
export default function SheetLayoutView() {
  const project = useProjectStore((s) => s.getActiveProject());
  const sheetLayouts = useProjectStore((s) => s.sheetLayouts);
  const calculatedParts = useProjectStore((s) => s.calculatedParts);
  const runLayout = useProjectStore((s) => s.runLayout);

  const sheet = project
    ? { width: project.sheetSize.width, length: project.sheetSize.length }
    : { width: 1220, length: 2440 };

  const handleRunLayout = useCallback(() => {
    runLayout();
  }, [runLayout]);

  // Calculate overall stats
  const totalPartsPlaced = sheetLayouts.reduce((sum, l) => sum + l.placements.length, 0);
  const avgUtilisation = sheetLayouts.length > 0
    ? (sheetLayouts.reduce((sum, l) => sum + l.utilisationPercent, 0) / sheetLayouts.length).toFixed(1)
    : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Sheet Layout</h2>
        <button
          onClick={handleRunLayout}
          disabled={!project || calculatedParts.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run Layout
        </button>
      </div>

      {/* Stats summary */}
      {sheetLayouts.length > 0 && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-700">{sheetLayouts.length}</p>
              <p className="text-xs text-gray-500">Sheet{sheetLayouts.length !== 1 ? 's' : ''} Required</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{totalPartsPlaced}</p>
              <p className="text-xs text-gray-500">Parts Placed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{avgUtilisation}%</p>
              <p className="text-xs text-gray-500">Avg Utilisation</p>
            </div>
          </div>
        </div>
      )}

      {/* Sheet diagrams */}
      {sheetLayouts.length > 0 ? (
        <SheetLayouts
          layouts={sheetLayouts}
          sheet={sheet}
          showOffcuts={true}
          showLabels={true}
          showGrainArrows={true}
        />
      ) : (
        <div className="text-center py-16 text-gray-400">
          {calculatedParts.length === 0 ? (
            <>
              <p className="text-lg">No parts to layout.</p>
              <p className="text-sm mt-1">Go to Cut List and calculate parts first.</p>
            </>
          ) : (
            <>
              <p className="text-lg">No layout generated yet.</p>
              <p className="text-sm mt-1">Click "Run Layout" to generate sheet diagrams.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}