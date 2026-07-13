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
    <div className="card-flat mb-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-label-sm text-surface-600 mb-1">Layout Mode</label>
          <select
            value={cutMode || 'balanced'}
            onChange={handleModeChange}
            className="select py-1.5"
          >
            <option value="batch">Batch (single-thickness)</option>
            <option value="balanced">Balanced (grouped)</option>
            <option value="optimised">Optimised (mixed)</option>
          </select>
        </div>
        <div>
          <label className="block text-label-sm text-surface-600 mb-1">Grain Constraint</label>
          <select
            value={grainConstraint || 'soft'}
            onChange={handleGrainChange}
            className="select py-1.5"
          >
            <option value="soft">Soft (rotate if needed)</option>
            <option value="hard">Hard (never rotate)</option>
          </select>
        </div>
        <button onClick={handleRunLayout} disabled={!hasParts} className="btn-success">
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
    <div className="card-flat mb-4 !bg-success-50 !border-success-200">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-headline-md text-success-700">{layouts.length}</p>
          <p className="text-label-sm text-surface-500">Sheet{layouts.length !== 1 ? 's' : ''} Required</p>
        </div>
        <div>
          <p className="text-headline-md text-success-700">{totalPlacements}</p>
          <p className="text-label-sm text-surface-500">Parts Placed</p>
        </div>
        <div>
          <p className="text-headline-md text-success-700">{avgUtil}%</p>
          <p className="text-label-sm text-surface-500">Avg Utilisation</p>
        </div>
        <div>
          <p className="text-headline-md text-success-700">{offcutM2}</p>
          <p className="text-label-sm text-surface-500">m² Offcut</p>
        </div>
      </div>

      {/* Per-sheet breakdown */}
      {layouts.length > 1 && (
        <div className="mt-3 pt-3 border-t border-success-200">
          <p className="text-label-md text-surface-600 mb-2">Per-Sheet Breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-label-sm">
              <thead>
                <tr className="border-b border-success-200">
                  <th className="text-left py-1 px-2 text-surface-600 font-normal">Sheet</th>
                  <th className="text-right py-1 px-2 text-surface-600 font-normal">Parts</th>
                  <th className="text-right py-1 px-2 text-surface-600 font-normal">Utilisation</th>
                  <th className="text-right py-1 px-2 text-surface-600 font-normal">Used (m²)</th>
                  <th className="text-right py-1 px-2 text-surface-600 font-normal">Offcut (m²)</th>
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
                    <tr key={layout.sheetIndex} className="border-b border-success-100 last:border-b-0">
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
                <tr className="border-t border-success-300 font-semibold">
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

      <div className="mt-2 text-label-sm text-surface-500">
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
        <h2 className="section-title">Sheet Layout</h2>
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
        <div className="flex flex-col items-center text-center py-16 px-6">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-surface-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
          </div>
          {calculatedParts.length === 0 ? (
            <>
              <p className="text-title-lg text-surface-700">No parts to lay out yet</p>
              <p className="text-body-sm text-surface-500 mt-1">Go to Cut List and calculate parts first.</p>
            </>
          ) : (
            <>
              <p className="text-title-lg text-surface-700">No layout generated yet</p>
              <p className="text-body-sm text-surface-500 mt-1">Click "Run Layout" to generate sheet diagrams.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
