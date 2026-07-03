/**
 * CutList.jsx — Cut List tab component
 *
 * ADR-015: Component-per-tab architecture.
 * ADR-017: Output Display UI — sortable table, grouped by Box, CSV export.
 * Reads from and writes to Zustand stores. Never imports from src/engine/.
 *
 * Features:
 * - Calculate and display the cut list from all box parts
 * - Grouped by Box (collapsible sections)
 * - Click column headers to sort ascending/descending
 * - Summary row at bottom: total parts count, total area
 * - Export button: download cut list as CSV
 * - Thickness and Edge Banding columns
 * - Warning rows for oversized parts
 */

import { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '../store/projectStore.js';
import { useUIStore } from '../store/uiStore.js';
import { downloadFile } from '../utils/fileIO.js';

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
 * Format edge banding edges for display
 */
function formatEdgeBanding(edges) {
  if (!edges || edges.length === 0) return '—';
  const edgeLabels = {
    'length+': 'L+',
    'length-': 'L−',
    'width+': 'W+',
    'width-': 'W−',
  };
  return edges.map((e) => edgeLabels[e] || e).join(', ');
}

/**
 * Convert parts array to CSV string for export
 */
function partsToCSV(parts, sheetWidth, sheetLength) {
  const headers = ['Label', 'Type', 'Cut Length (mm)', 'Cut Width (mm)', 'Qty', 'Thickness (mm)', 'Edge Banding', 'Box', 'Warning'];
  const rows = parts.map((p) => {
    const isOversized = (p.cutLength > sheetLength && p.cutWidth > sheetWidth) ||
      (p.cutLength > sheetWidth && p.cutWidth > sheetLength);
    return [
      `"${(p.label || p.type).replace(/"/g, '""')}"`,
      `"${partTypeLabel(p.type)}"`,
      p.cutLength,
      p.cutWidth,
      p.quantity,
      p.materialThickness,
      formatEdgeBanding(p.edgeBandingEdges),
      `"${p.boxName || '—'}"`,
      isOversized ? 'Too large for sheet' : '',
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Sort icon component
 */
function SortIcon({ active, direction }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}

/**
 * Collapsible box group
 */
function BoxGroup({ boxId, boxName, parts, sortField, sortDirection, sheetWidth, sheetLength }) {
  const [collapsed, setCollapsed] = useState(false);

  const sortedParts = useMemo(() => {
    const sorted = [...parts];
    if (!sortField) return sorted;
    sorted.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [parts, sortField, sortDirection]);

  // Check if any part in this group is oversized
  const oversizedParts = sortedParts.filter((p) => {
    return (p.cutLength > sheetLength && p.cutWidth > sheetWidth) ||
      (p.cutLength > sheetWidth && p.cutWidth > sheetLength);
  });

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 flex items-center gap-2"
      >
        <span className="text-xs text-gray-400">{collapsed ? '▶' : '▼'}</span>
        {boxName || `Box ${boxId}`}
        <span className="text-xs text-gray-500">({parts.length} part{parts.length !== 1 ? 's' : ''})</span>
        {oversizedParts.length > 0 && (
          <span className="text-xs text-amber-600 ml-auto">⚠ {oversizedParts.length} oversized</span>
        )}
      </button>
      {!collapsed && (
        <div>
          {sortedParts.map((part, i) => {
            const isOversized = (part.cutLength > sheetLength && part.cutWidth > sheetWidth) ||
              (part.cutLength > sheetWidth && part.cutWidth > sheetLength);
            return (
              <tr
                key={i}
                className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${isOversized ? 'bg-amber-50' : ''}`}
              >
                <td className="px-4 py-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${partTypeColor(part.type)}`}></span>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {part.label || partTypeLabel(part.type)}
                  {isOversized && <span className="ml-2 text-amber-600 text-xs">⚠ too large</span>}
                </td>
                <td className="px-4 py-2 text-gray-600">{partTypeLabel(part.type)}</td>
                <td className="px-4 py-2 text-right font-mono">{part.cutLength} mm</td>
                <td className="px-4 py-2 text-right font-mono">{part.cutWidth} mm</td>
                <td className="px-4 py-2 text-right font-mono">{part.quantity}</td>
                <td className="px-4 py-2 text-right font-mono">{part.materialThickness} mm</td>
                <td className="px-4 py-2 text-sm text-gray-500">{formatEdgeBanding(part.edgeBandingEdges)}</td>
              </tr>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Validation banner — shown when validation fails
 */
function ValidationBanner({ result }) {
  if (!result || result.errors.length === 0) return null;

  const tabLinks = {
    boxes: { label: 'Boxes', tabId: 'boxes' },
    materials: { label: 'Materials', tabId: 'materials' },
    cutSettings: { label: 'Cut Settings', tabId: 'cut-settings' },
  };

  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="font-semibold text-red-800 mb-2">Cannot calculate — missing required fields</h3>
      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
        {!result.boxes && (
          <li>
            Boxes not configured — go to{' '}
            <button className="text-blue-600 underline hover:text-blue-800" onClick={() => useUIStore.getState().setActiveTab('boxes')}>
              Boxes tab
            </button>
          </li>
        )}
        {!result.materials && (
          <li>
            Sheet size and kerf not set — go to{' '}
            <button className="text-blue-600 underline hover:text-blue-800" onClick={() => useUIStore.getState().setActiveTab('materials')}>
              Materials tab
            </button>
          </li>
        )}
        {!result.cutSettings && (
          <li>
            Grain constraint not selected — go to{' '}
            <button className="text-blue-600 underline hover:text-blue-800" onClick={() => useUIStore.getState().setActiveTab('cut-settings')}>
              Cut Settings tab
            </button>
          </li>
        )}
        {result.errors.map((err, i) => (
          <li key={i} className="text-gray-700">{err}</li>
        ))}
      </ul>
    </div>
  );
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
  const validateProjectForCalculation = useProjectStore((s) => s.validateProjectForCalculation);

  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [validationResult, setValidationResult] = useState(null);

  // Sheet dimensions for oversized checks
  const sheetWidth = project?.sheetSize?.width ?? 0;
  const sheetLength = project?.sheetSize?.length ?? 0;

  const handleCalculate = useCallback(() => {
    const result = validateProjectForCalculation();
    if (result.errors.length > 0) {
      setValidationResult(result);
      return;
    }
    setValidationResult(null);
    const parts = calculateAllParts();
    // Auto-run layout if cutMode is set
    if (parts.length > 0) {
      runLayout();
    }
  }, [validateProjectForCalculation, calculateAllParts, runLayout]);

  const handleRunLayout = useCallback(() => {
    if (calculatedParts.length === 0) {
      handleCalculate();
      return;
    }
    runLayout();
  }, [calculatedParts.length, handleCalculate, runLayout]);

  const handleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    if (calculatedParts.length === 0) return;
    const csv = partsToCSV(calculatedParts, sheetWidth, sheetLength);
    const safeName = project
      ? project.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      : 'cut_list';
    downloadFile(csv, `${safeName}_cut_list.csv`, 'text/csv');
  }, [calculatedParts, project, sheetWidth, sheetLength]);

  // Group parts by Box
  const groupedByBox = useMemo(() => {
    const groups = {};
    for (const part of calculatedParts) {
      const key = part.boxId || 'ungrouped';
      if (!groups[key]) {
        groups[key] = { boxId: key, boxName: part.boxName || 'Ungrouped', parts: [] };
      }
      groups[key].parts.push(part);
    }
    return Object.values(groups);
  }, [calculatedParts]);

  // Calculate totals
  const totalParts = calculatedParts.length;
  const totalQty = calculatedParts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalArea = calculatedParts.reduce((sum, p) => {
    return sum + (p.cutLength || 0) * (p.cutWidth || 0) * (p.quantity || 1);
  }, 0);
  const totalAreaM2 = (totalArea / 1_000_000).toFixed(3);

  // Oversized parts warning
  const oversizedCount = calculatedParts.filter((p) => {
    return sheetWidth > 0 && sheetLength > 0 &&
      ((p.cutLength > sheetLength && p.cutWidth > sheetWidth) ||
        (p.cutLength > sheetWidth && p.cutWidth > sheetLength));
  }).length;

  // Unplaced parts warning (parts exist but layout couldn't place them)
  const placedCount = sheetLayouts.reduce((sum, l) => sum + l.placements.length, 0);
  const unplacedCount = calculatedParts.length > 0 && sheetLayouts.length > 0
    ? Math.max(0, totalQty - placedCount)
    : 0;

  const sortableFields = [
    { key: 'label', label: 'Label' },
    { key: 'cutLength', label: 'Cut Length' },
    { key: 'cutWidth', label: 'Cut Width' },
    { key: 'quantity', label: 'Qty' },
    { key: 'materialThickness', label: 'Thickness' },
  ];

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
            Calculate
          </button>
          <button
            onClick={handleRunLayout}
            disabled={!project}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Layout
          </button>
          <button
            onClick={handleExportCSV}
            disabled={calculatedParts.length === 0}
            className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Validation banner */}
      <ValidationBanner result={validationResult} />

      {/* Summary */}
      {calculatedParts.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-700">{totalQty}</p>
              <p className="text-xs text-gray-500">Total Qty</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{totalParts}</p>
              <p className="text-xs text-gray-500">Unique Parts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{totalAreaM2}</p>
              <p className="text-xs text-gray-500">m² Total Area</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {sheetLayouts.length > 0 ? sheetLayouts.length : '—'}
              </p>
              <p className="text-xs text-gray-500">Sheets Needed</p>
            </div>
          </div>

          {/* Warnings */}
          {(oversizedCount > 0 || unplacedCount > 0) && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              {oversizedCount > 0 && (
                <p className="text-sm text-amber-700">
                  ⚠ {oversizedCount} part{oversizedCount !== 1 ? 's' : ''} too large to fit on the selected sheet size.
                </p>
              )}
              {unplacedCount > 0 && (
                <p className="text-sm text-red-700">
                  ⚠ {unplacedCount} part{unplacedCount !== 1 ? 's' : ''} could not be placed by the layout algorithm.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Parts table grouped by Box */}
      {calculatedParts.length > 0 ? (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-700"></th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('label')}
                    className="hover:text-gray-900"
                  >
                    Label<SortIcon active={sortField === 'label'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Type</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('cutLength')}
                    className="hover:text-gray-900"
                  >
                    Cut Length<SortIcon active={sortField === 'cutLength'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('cutWidth')}
                    className="hover:text-gray-900"
                  >
                    Cut Width<SortIcon active={sortField === 'cutWidth'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('quantity')}
                    className="hover:text-gray-900"
                  >
                    Qty<SortIcon active={sortField === 'quantity'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('materialThickness')}
                    className="hover:text-gray-900"
                  >
                    Thickness<SortIcon active={sortField === 'materialThickness'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Edge Banding</th>
              </tr>
            </thead>
          </table>
          {groupedByBox.map((group) => (
            <BoxGroup
              key={group.boxId}
              boxId={group.boxId}
              boxName={group.boxName}
              parts={group.parts}
              sortField={sortField}
              sortDirection={sortDirection}
              sheetWidth={sheetWidth}
              sheetLength={sheetLength}
            />
          ))}
          {/* Summary row */}
          <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700 text-sm flex justify-between">
            <span>Summary</span>
            <span>{totalQty} total pieces · {totalAreaM2} m² · {groupedByBox.length} box{groupedByBox.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No parts calculated.</p>
          <p className="text-sm mt-1">Configure boxes and click "Calculate" to generate the cut list.</p>
        </div>
      )}
    </div>
  );
}