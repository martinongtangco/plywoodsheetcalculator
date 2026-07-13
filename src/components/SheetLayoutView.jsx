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
          <label className="block text-label-sm font-mono text-ink-400 uppercase mb-1">Layout Mode</label>
          <div className="flex flex-wrap gap-2">
            {['batch', 'balanced', 'optimised'].map((m) => (
              <button
                key={m}
                onClick={() => updateProject({ cutMode: m })}
                className={cutMode === m ? 'chip-selected' : 'chip-unselected'}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-label-sm font-mono text-ink-400 uppercase mb-1">Grain Constraint</label>
          <div className="flex flex-wrap gap-2">
            {['soft', 'hard'].map((g) => (
              <button
                key={g}
                onClick={() => updateProject({ grainConstraint: g })}
                className={grainConstraint === g ? 'chip-selected' : 'chip-unselected'}
              >
                {g === 'soft' ? 'Soft — Rotate' : 'Hard — No Rotate'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleRunLayout} disabled={!hasParts} className="btn-primary">
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
    <div className="card-flat mb-4" style={{background: '#F1EBDA', borderColor: '#DCD2B8', borderRadius: '2px'}}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-headline-lg font-display font-bold" style={{color: '#2C5C82'}}>{layouts.length}</p>
          <p className="text-label-sm font-mono uppercase" style={{color: '#8A9199'}}>Sheet{layouts.length !== 1 ? 's' : ''} Required</p>
        </div>
        <div>
          <p className="text-headline-lg font-display font-bold" style={{color: '#2C5C82'}}>{totalPlacements}</p>
          <p className="text-label-sm font-mono uppercase" style={{color: '#8A9199'}}>Parts Placed</p>
        </div>
        <div>
          <p className="text-headline-lg font-display font-bold" style={{color: '#2C5C82'}}>{avgUtil}%</p>
          <p className="text-label-sm font-mono uppercase" style={{color: '#8A9199'}}>Avg Utilisation</p>
        </div>
        <div>
          <p className="text-headline-lg font-display font-bold" style={{color: '#2C5C82'}}>{offcutM2}</p>
          <p className="text-label-sm font-mono uppercase" style={{color: '#8A9199'}}>m² Offcut</p>
        </div>
      </div>

      {/* Per-sheet breakdown */}
      {layouts.length > 1 && (
        <div className="mt-3 pt-3 border-t" style={{borderColor: '#DCD2B8'}}>
          <p className="text-label-md font-mono mb-2" style={{color: '#4A5964'}}>Per-Sheet Breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-label-sm">
              <thead>
                <tr style={{borderBottom: '1px solid #DCD2B8'}}>
                  <th className="text-left py-1 px-2 font-mono text-label-sm uppercase" style={{color: '#8A9199'}}>Sheet</th>
                  <th className="text-right py-1 px-2 font-mono text-label-sm uppercase" style={{color: '#8A9199'}}>Parts</th>
                  <th className="text-right py-1 px-2 font-mono text-label-sm uppercase" style={{color: '#8A9199'}}>Utilisation</th>
                  <th className="text-right py-1 px-2 font-mono text-label-sm uppercase" style={{color: '#8A9199'}}>Used (m²)</th>
                  <th className="text-right py-1 px-2 font-mono text-label-sm uppercase" style={{color: '#8A9199'}}>Offcut (m²)</th>
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
                    <tr key={layout.sheetIndex} className="border-b last:border-b-0" style={{borderColor: '#EDE6D3'}}>
                      <td className="py-1 px-2">Sheet {layout.sheetIndex + 1}</td>
                      <td className="py-1 px-2 text-right font-mono" style={{color: '#3E4C57'}}>{layout.placements.length}</td>
                      <td className="py-1 px-2 text-right font-mono" style={{color: '#3E4C57'}}>{layout.utilisationPercent}%</td>
                      <td className="py-1 px-2 text-right font-mono" style={{color: '#3E4C57'}}>{usedAreaM2}</td>
                      <td className="py-1 px-2 text-right font-mono" style={{color: '#3E4C57'}}>{offcutAreaM2}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold" style={{borderColor: '#CFC4AA'}}>
                  <td className="py-1 px-2">Total</td>
                  <td className="py-1 px-2 text-right font-mono" style={{color: '#3E4C57'}}>{totalPlacements}</td>
                  <td className="py-1 px-2 text-right font-mono" style={{color: '#3E4C57'}}>{avgUtil}%</td>
                  <td className="py-1 px-2 text-right font-mono" style={{color: '#3E4C57'}}>{usedM2}</td>
                  <td className="py-1 px-2 text-right font-mono" style={{color: '#3E4C57'}}>{offcutM2}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="mt-2 text-label-sm font-mono" style={{color: '#8A9199'}}>
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
          <div className="w-14 h-14 flex items-center justify-center mb-4" style={{borderRadius: '2px', backgroundColor: '#F1EBDA'}}>
            <svg className="w-7 h-7" style={{color: '#8A9199'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
          </div>
          {calculatedParts.length === 0 ? (
            <>
              <p className="text-title-lg" style={{color: '#4A5964'}}>No parts to lay out yet</p>
              <p className="text-body-sm mt-1" style={{color: '#8A9199'}}>Go to Cut List and calculate parts first.</p>
            </>
          ) : (
            <>
              <p className="text-title-lg" style={{color: '#4A5964'}}>No layout generated yet</p>
              <p className="text-body-sm mt-1" style={{color: '#8A9199'}}>Click "Run Layout" to generate sheet diagrams.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
