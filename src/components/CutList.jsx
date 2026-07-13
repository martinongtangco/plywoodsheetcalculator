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
  return colours[type] || 'bg-surface-200 border-surface-400';
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
  if (!active) return <span className="text-ink-300 ml-1">↕</span>;
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
    <>
      <tr>
        <td
          colSpan={8}
          className="px-4 py-2 cursor-pointer transition-colors duration-150 select-none"
          style={{backgroundColor: '#F1EBDA', color: '#22303D'}}
          onClick={() => setCollapsed(!collapsed)}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DCD2B8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F1EBDA'; }}
        >
          <span className="text-label-sm font-mono" style={{color: '#8A9199'}}>{collapsed ? '▶' : '▼'}</span>
          {boxName || `Box ${boxId}`}
          <span className="text-label-sm font-mono ml-1" style={{color: '#6B7A87'}}>({parts.length} part{parts.length !== 1 ? 's' : ''})</span>
          {oversizedParts.length > 0 && (
            <span className="text-label-sm font-mono ml-2" style={{color: '#D97706'}}>⚠ {oversizedParts.length} oversized</span>
          )}
        </td>
      </tr>
      {!collapsed &&
        sortedParts.map((part, i) => {
          const isOversized = (part.cutLength > sheetLength && part.cutWidth > sheetWidth) ||
            (part.cutLength > sheetWidth && part.cutWidth > sheetLength);
          return (
            <tr
              key={i}
              className={`border-b border-surface-100 last:border-b-0 hover:bg-surface-50 transition-colors duration-150 ${isOversized ? 'bg-amber-50' : ''}`}
            >
              <td className="px-4 py-2">
                <span className={`inline-block w-2 h-2 rounded-full ${partTypeColor(part.type)}`}></span>
              </td>
              <td className="px-4 py-2 text-surface-600">
                {part.label || partTypeLabel(part.type)}
                {isOversized && <span className="ml-2 text-amber-600 text-label-sm">⚠ too large</span>}
              </td>
              <td className="px-4 py-2 text-surface-600">{partTypeLabel(part.type)}</td>
              <td className="px-4 py-2 text-right font-mono">{part.cutLength} mm</td>
              <td className="px-4 py-2 text-right font-mono">{part.cutWidth} mm</td>
              <td className="px-4 py-2 text-right font-mono">{part.quantity}</td>
              <td className="px-4 py-2 text-right font-mono">{part.materialThickness} mm</td>
              <td className="px-4 py-2 text-body-sm text-surface-500">{formatEdgeBanding(part.edgeBandingEdges)}</td>
            </tr>
          );
        })}
    </>
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
    <div className="alert-danger mb-4">
      <h3 className="text-title-md text-danger-800 mb-2">Cannot calculate — missing required fields</h3>
      <ul className="list-disc list-inside text-body-sm text-danger-700 space-y-1">
        {!result.boxes && (
          <li>
            Boxes not configured — go to{' '}
            <button className="text-primary-600 underline hover:text-primary-800" onClick={() => useUIStore.getState().setActiveTab('boxes')}>
              Boxes tab
            </button>
          </li>
        )}
        {!result.materials && (
          <li>
            Sheet size and kerf not set — go to{' '}
            <button className="text-primary-600 underline hover:text-primary-800" onClick={() => useUIStore.getState().setActiveTab('materials')}>
              Materials tab
            </button>
          </li>
        )}
        {!result.cutSettings && (
          <li>
            Grain constraint not selected — go to{' '}
            <button className="text-primary-600 underline hover:text-primary-800" onClick={() => useUIStore.getState().setActiveTab('cut-settings')}>
              Cut Settings tab
            </button>
          </li>
        )}
        {result.errors.map((err, i) => (
          <li key={i} className="text-surface-700">{err}</li>
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <h2 className="section-title">Cut List</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCalculate} disabled={!project} className="btn-primary">
            Calculate
          </button>
          <button onClick={handleRunLayout} disabled={!project} className="btn-success">
            Run Layout
          </button>
          <button onClick={handleExportCSV} disabled={calculatedParts.length === 0} className="btn-secondary">
            Export CSV
          </button>
        </div>
      </div>

      {/* Validation banner */}
      <ValidationBanner result={validationResult} />

      {/* Summary — dark stat bar (Drafting Room) */}
      {calculatedParts.length > 0 && (
        <div className="card-flat mb-4" style={{background: '#22303D', borderRadius: '2px', borderColor: '#22303D'}}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-headline-lg font-display font-bold" style={{color: '#F4EFE1'}}>{totalQty}</p>
              <p className="text-label-sm font-mono uppercase" style={{color: '#9FB0BE'}}>Total Qty</p>
            </div>
            <div>
              <p className="text-headline-lg font-display font-bold" style={{color: '#F4EFE1'}}>{totalParts}</p>
              <p className="text-label-sm font-mono uppercase" style={{color: '#9FB0BE'}}>Unique Parts</p>
            </div>
            <div>
              <p className="text-headline-lg font-display font-bold" style={{color: '#F4EFE1'}}>{totalAreaM2}</p>
              <p className="text-label-sm font-mono uppercase" style={{color: '#9FB0BE'}}>m² Total Area</p>
            </div>
            <div>
              <p className="text-headline-lg font-display font-bold" style={{color: '#F4EFE1'}}>
                {sheetLayouts.length > 0 ? sheetLayouts.length : '—'}
              </p>
              <p className="text-label-sm font-mono uppercase" style={{color: '#9FB0BE'}}>Sheets Needed</p>
            </div>
          </div>

          {/* Warnings */}
          {(oversizedCount > 0 || unplacedCount > 0) && (
            <div className="mt-3 pt-3 border-t" style={{borderColor: 'rgba(255,255,255,.15)'}}>
              {oversizedCount > 0 && (
                <p className="text-body-sm" style={{color: '#FCD34D'}}>
                  ⚠ {oversizedCount} part{oversizedCount !== 1 ? 's' : ''} too large to fit on the selected sheet size.
                </p>
              )}
              {unplacedCount > 0 && (
                <p className="text-body-sm" style={{color: '#FCA5A5'}}>
                  ⚠ {unplacedCount} part{unplacedCount !== 1 ? 's' : ''} could not be placed by the layout algorithm.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Parts table grouped by Box */}
      {calculatedParts.length > 0 ? (
        <div className="overflow-x-auto border" style={{borderColor: '#DCD2B8', borderRadius: '2px'}}>
          <table className="w-full text-body-sm">
            <thead style={{backgroundColor: '#F1EBDA'}}>
              <tr style={{borderBottom: '1px solid #DCD2B8'}}>
                <th className="text-left px-4 py-2"></th>
                <th className="text-left px-4 py-2">
                  <button
                    onClick={() => handleSort('label')}
                    className="font-mono text-label-sm text-ink-400 uppercase hover:text-ink-700 transition-colors duration-150"
                  >
                    Label<SortIcon active={sortField === 'label'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-left px-4 py-2">
                  <span className="font-mono text-label-sm text-ink-400 uppercase">Type</span>
                </th>
                <th className="text-right px-4 py-2">
                  <button
                    onClick={() => handleSort('cutLength')}
                    className="font-mono text-label-sm text-ink-400 uppercase hover:text-ink-700 transition-colors duration-150"
                  >
                    Cut Length<SortIcon active={sortField === 'cutLength'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-right px-4 py-2">
                  <button
                    onClick={() => handleSort('cutWidth')}
                    className="font-mono text-label-sm text-ink-400 uppercase hover:text-ink-700 transition-colors duration-150"
                  >
                    Cut Width<SortIcon active={sortField === 'cutWidth'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-right px-4 py-2">
                  <button
                    onClick={() => handleSort('quantity')}
                    className="font-mono text-label-sm text-ink-400 uppercase hover:text-ink-700 transition-colors duration-150"
                  >
                    Qty<SortIcon active={sortField === 'quantity'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-right px-4 py-2">
                  <button
                    onClick={() => handleSort('materialThickness')}
                    className="font-mono text-label-sm text-ink-400 uppercase hover:text-ink-700 transition-colors duration-150"
                  >
                    Thickness<SortIcon active={sortField === 'materialThickness'} direction={sortDirection} />
                  </button>
                </th>
                <th className="text-left px-4 py-2">
                  <span className="font-mono text-label-sm text-ink-400 uppercase">Edge Banding</span>
                </th>
              </tr>
            </thead>
            <tbody>
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
              <tr>
                <td colSpan={8} className="px-4 py-2 text-label-md font-mono" style={{backgroundColor: '#F1EBDA', color: '#4A5964'}}>
                  <div className="flex justify-between">
                    <span>Summary</span>
                    <span>{totalQty} total pieces · {totalAreaM2} m² · {groupedByBox.length} box{groupedByBox.length !== 1 ? 'es' : ''}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-16 px-6">
          <div className="w-14 h-14 flex items-center justify-center mb-4" style={{borderRadius: '2px', backgroundColor: '#F1EBDA'}}>
            <svg className="w-7 h-7" style={{color: '#8A9199'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <p className="text-title-lg" style={{color: '#4A5964'}}>No parts calculated yet</p>
          <p className="text-body-sm mt-1" style={{color: '#8A9199'}}>Configure boxes, then click "Calculate" to generate the cut list.</p>
        </div>
      )}
    </div>
  );
}