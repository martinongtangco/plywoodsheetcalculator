/**
 * SheetLayoutView.jsx — Sheet Layout tab component
 *
 * ADR-015: Component-per-tab architecture.
 * ADR-017: Output Display UI — LayoutControls and SheetSummary.
 * Reads from and writes to Zustand stores. Never imports from src/engine/.
 *
 * Features:
 * - Display calculated sheet layouts with SVG diagrams
 * - LayoutControls: layout mode selector (batch/balanced/optimised), grain constraint
 * - SheetSummary: offcut area, utilisation stats per sheet
 * - "Run Layout" trigger if no layouts exist yet
 */

import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore.js';
import { SheetLayouts } from './SheetLayoutDiagram.jsx';

/**
 * LayoutControls — mode selector and grain constraint dropdown
 */
function LayoutControls({ cutMode, grainConstraint, sheetLayoutsLength, hasParts }) {
  const updateProject = useProjectStore((s) => s.updateProject);
  const runLayout = useProjectStore((s) => s.runLayout);

  const handleModeChange = useCallback((e) => {
    updateProject({ cutMode: e.target.value });
  }, [updateProject]);

  const handleGrainChange = useCallback((e) => {
    updateProject({ grainConstraint: e.target.value });
  }, [updateProject]);

  const handleRunLayout = useCallback(() => {
    runLayout();
  }, [runLayout]);

  return (
    <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Layout Mode</label>
          <select
            value={cutMode || 'balanced'}
            onChange={handleModeChange}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="batch">Batch (single-thickness)</option>
            <option value="balanced">Balanced (grouped)</option>
            <option value="optimised">Optimised (mixed)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Grain Constraint</label>
          <select
            value={grainConstraint || 'soft'}
            onChange={handleGrainChange}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="soft">Soft (rotate if needed)</option>
            <option value="hard">Hard (never rotate)</option>
          </select>
        </div>
        <button
          onClick={handleRunLayout}
          disabled={!hasParts}
          className="px-4 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sheetLayoutsLength > 0 ? 'Re-run Layout' : 'Run Layout'}
        </button>
      </div>
    </div>
  );
}

/**
 * SheetSummary — per-sheet offcut and utilisation stats
 */
function SheetSummary({ layouts, sheet }) {
  if (!layouts || layouts.length === 0) return null;

  const sheetArea = (sheet.width || 0) * (sheet.length || 0);
  const totalSheetArea = sheetArea * layouts.length;

  // Calculate total used area from placements
  const totalUsedArea = layouts.reduce((sum, layout) => {
    return sum + layout.placements.reduce((ps, p) => {
      const placedL = p.rotated ? p.part.cutWidth : p.part.cutLength;
      const placedW = p.rotated ? p.part.cutLength : p.part.cutWidth;
      return ps + placedL * placedW;
    }, 0);
  }, 0);

  const totalOffcutArea = totalSheetArea - totalUsedArea;
  const offcutM2 = (totalOffcutArea / 1_000_000).toFixed(3);
  const usedM2 = (totalUsedArea / 1_000_000).toFixed(3);
  const sheetM2 = (totalSheetArea / 1_000_000).toFixed(3);

  const avgUtil = layouts.length > 0
    ? (layouts.reduce((s, l) => s + l.utilisationPercent, 0) / layouts.length).toFixed(1)
    : '—';

  const totalPlacements = layouts.reduce((s, l) => s + l.placements.length, 0);

  return (
    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-green-700">{layouts.length}</p>
          <p className="text-xs text-gray-500">Sheet{layouts.length !== 1 ? 's' : ''} Required</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-700">{totalPlacements}</p>
          <p className="text-xs text-gray-500">Parts Placed</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-700">{avgUtil}%</p>
          <p className="text-xs text-gray-500">Avg Utilisation</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-700">{offcutM2}</p>
          <p className="text-xs text-gray-500">m² Offcut</p>
        </div>
      </div>

      {/* Per-sheet breakdown */}
      {layouts.length > 1 && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">Per-Sheet Breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-green-200">
                  <th className="text-left py-1 px-2 text-gray-600">Sheet</th>
                  <th className="text-right py-1 px-2 text-gray-600">Parts</th>
                  <th className="text-right py-1 px-2 text-gray-600">Utilisation</th>
                  <th className="text-right py-1 px-2 text-gray-600">Used (m²)</th>
                  <th className="text-right py-1 px-2 text-gray-600">Offcut (m²)</th>
                </tr>
              </thead>
              <tbody>
                {layouts.map((layout) => {
                  const usedArea = layout.placements.reduce((s, p) => {
                    const pl = p.rotated ? p.part.cutWidth : p.part.cutLength;
                    const pw = p.rotated ? p.part.cutLength : p.part.cutWidth;
                    return s + pl * pw;
                  }, 0);
                  const usedAreaM2 = (usedArea / 1_000_000).toFixed(4);
                  const offcutAreaM2 = ((sheetArea - usedArea) / 1_000_000).toFixed(4);
                  return (
                    <tr key={layout.sheetIndex} className="border-b border-green-100 last:border-b-0">
                      <td className="py-1 px-2">Sheet {layout.sheetIndex + 1}</td>
                      <td className="py-1 px-2 text-right">{layout.placements.length}</td>
                      <td className="py-1 px-2 text-right">{layout.utilisationPercent}%</td>
                      <td className="py-1 px-2 text-right font-mono">{usedAreaM2}</td>
                      <td className="py-1 px-2 text-right font-mono">{offcutAreaM2}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-green-300 font-semibold">
                  <td className="py-1 px-2">Total</td>
                  <td className="py-1 px-2 text-right">{totalPlacements}</td>
                  <td className="py-1 px-2 text-right">{avgUtil}%</td>
                  <td className="py-1 px-2 text-right font-mono">{usedM2}</td>
                  <td className="py-1 px-2 text-right font-mono">{offcutM2}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        Total sheet area: {sheetM2} m² · Used: {usedM2} m² · Offcut: {offcutM2} m²
      </div>
    </div>
  );
}

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

  const hasParts = calculatedParts.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Sheet Layout</h2>
      </div>

      {/* Layout Controls */}
      {project && (
        <LayoutControls
          cutMode={project.cutMode}
          grainConstraint={project.grainConstraint}
          sheetLayoutsLength={sheetLayouts.length}
          hasParts={hasParts}
        />
      )}

      {/* Sheet Summary */}
      <SheetSummary layouts={sheetLayouts} sheet={sheet} />

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