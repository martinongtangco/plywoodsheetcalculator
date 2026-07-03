/**
 * CutList.jsx — Cut List tab component
 *
 * ADR-015: Component-per-tab architecture.
 * Reads from and writes to Zustand stores. Never imports from src/engine/.
 *
 * Features:
 * - Calculate and display the cut list from all box parts
 * - Group parts by type for readability
 * - Show total quantity and material area
 * - Trigger layout calculation
 */

import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore.js';

/**
 * Get a human-readable label for a part type
 */
function partTypeLabel(type) {
  const labels = {
    side: 'Side Panel',
    top: 'Top Panel',
    bottom: 'Bottom Panel',
    back: 'Back Panel',
    shelf: 'Internal Shelf',
    drawer_side: 'Drawer Side',
    drawer_front_back: 'Drawer Front/Back',
    drawer_base: 'Drawer Base',
  };
  return labels[type] || type;
}

/**
 * Get a colour swatch for a part type
 */
function partTypeColor(type) {
  const colours = {
    side: 'bg-blue-200 border-blue-400',
    top: 'bg-green-200 border-green-400',
    bottom: 'bg-orange-200 border-orange-400',
    back: 'bg-purple-200 border-purple-400',
    shelf: 'bg-red-200 border-red-400',
    drawer_side: 'bg-emerald-200 border-emerald-400',
    drawer_front_back: 'bg-yellow-200 border-yellow-400',
    drawer_base: 'bg-violet-200 border-violet-400',
  };
  return colours[type] || 'bg-gray-200 border-gray-400';
}

/**
 * CutList — main Cut List tab component
 */
export default function CutList() {
  const project = useProjectStore((s) => s.getActiveProject());
  const calculatedParts = useProjectStore((s) => s.calculatedParts);
  const calculateAllParts = useProjectStore((s) => s.calculateAllParts);
  const runLayout = useProjectStore((s) => s.runLayout);
  const sheetLayouts = useProjectStore((s) => s.sheetLayouts);

  const handleCalculate = useCallback(() => {
    calculateAllParts();
  }, [calculateAllParts]);

  const handleRunLayout = useCallback(() => {
    runLayout();
  }, [runLayout]);

  // Group parts by type
  const groupedParts = {};
  for (const part of calculatedParts) {
    const key = part.type;
    if (!groupedParts[key]) {
      groupedParts[key] = [];
    }
    groupedParts[key].push(part);
  }

  // Calculate totals
  const totalParts = calculatedParts.length;
  const totalArea = calculatedParts.reduce((sum, p) => {
    return sum + (p.cutLength || 0) * (p.cutWidth || 0);
  }, 0);
  const totalAreaM2 = (totalArea / 1_000_000).toFixed(3);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Cut List</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCalculate}
            disabled={!project}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Calculate Parts
          </button>
          <button
            onClick={handleRunLayout}
            disabled={calculatedParts.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Layout
          </button>
        </div>
      </div>

      {/* Summary */}
      {calculatedParts.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-700">{totalParts}</p>
              <p className="text-xs text-gray-500">Total Parts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{totalAreaM2}</p>
              <p className="text-xs text-gray-500">m² Material</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {sheetLayouts.length > 0 ? sheetLayouts.length : '—'}
              </p>
              <p className="text-xs text-gray-500">Sheets Needed</p>
            </div>
          </div>
        </div>
      )}

      {/* Parts table */}
      {calculatedParts.length > 0 ? (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Box</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">Cut Length</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">Cut Width</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">Qty</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedParts).map(([type, parts]) => (
                <tbody key={type}>
                  <tr className="bg-gray-100">
                    <td colSpan={5} className="px-4 py-1.5 font-semibold text-gray-700">
                      <span className={`inline-block w-3 h-3 rounded-full border mr-2 ${partTypeColor(type)}`}></span>
                      {partTypeLabel(type)}
                      <span className="text-xs text-gray-500 ml-2">({parts.length} part{parts.length !== 1 ? 's' : ''})</span>
                    </td>
                  </tr>
                  {parts.map((part, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600">
                        <span className={`inline-block w-2 h-2 rounded-full ${partTypeColor(type)}`}></span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{part.boxName || '—'}</td>
                      <td className="px-4 py-2 text-right font-mono">{part.cutLength} mm</td>
                      <td className="px-4 py-2 text-right font-mono">{part.cutWidth} mm</td>
                      <td className="px-4 py-2 text-right font-mono">{part.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No parts calculated.</p>
          <p className="text-sm mt-1">Configure boxes and click "Calculate Parts" to generate the cut list.</p>
        </div>
      )}
    </div>
  );
}