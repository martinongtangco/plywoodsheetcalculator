import { useState, useCallback } from 'react';
import { useProjectStore } from './store/projectStore.js';
import { useUIStore } from './store/uiStore.js';
import ProjectList from './components/ProjectList.jsx';
import BoxConfig from './components/BoxConfig.jsx';
import MaterialConfig from './components/MaterialConfig.jsx';
import CutSettings from './components/CutSettings.jsx';
import CutList from './components/CutList.jsx';
import SheetLayoutView from './components/SheetLayoutView.jsx';
import { downloadFile } from './utils/fileIO.js';

function App() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const activeProject = useProjectStore((s) => s.getActiveProject());

  // When no project is active, show the project list
  if (!activeProjectId) {
    return <ProjectList />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => {
                  useProjectStore.setState({ activeProjectId: null });
                }}
                className="text-sm text-blue-600 hover:underline mr-4"
              >
                ← Projects
              </button>
              <h1 className="text-xl font-bold text-gray-900 inline">
                ply-calc
              </h1>
              {activeProject && (
                <span className="ml-3 text-sm text-gray-500">{activeProject.name}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation — ADR-015 component-per-tab */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 -mb-px">
            {[
              { id: 'boxes', label: 'Boxes' },
              { id: 'materials', label: 'Materials' },
              { id: 'cut-settings', label: 'Cut Settings' },
              { id: 'cut-list', label: 'Cut List' },
              { id: 'sheet-layout', label: 'Sheet Layout' },
              { id: 'output', label: 'Output' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'boxes' && <BoxConfig />}
        {activeTab === 'materials' && <MaterialConfig />}
        {activeTab === 'cut-settings' && <CutSettings />}
        {activeTab === 'cut-list' && <CutList />}
        {activeTab === 'sheet-layout' && <SheetLayoutView />}
        {activeTab === 'output' && <OutputActions />}
      </main>
    </div>
  );
}

/**
 * OutputActions — Output tab integrating Cut List and Sheet Layout views.
 * ADR-017: Output Display UI — sub-tab toggle (Cut List / Sheet Layout).
 * ADR-006: JSON export (download file) in the output screen.
 */
function OutputActions() {
  const exportProjectJSON = useProjectStore((s) => s.exportProjectJSON);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const validateProjectForCalculation = useProjectStore((s) => s.validateProjectForCalculation);
  const calculateAllParts = useProjectStore((s) => s.calculateAllParts);
  const runLayout = useProjectStore((s) => s.runLayout);
  const calculatedParts = useProjectStore((s) => s.calculatedParts);

  const [outputSubTab, setOutputSubTab] = useState('cut-list');
  const [validationResult, setValidationResult] = useState(null);

  const handleExport = () => {
    const json = exportProjectJSON();
    if (!json) {
      alert('No active project to export.');
      return;
    }
    const project = projects.find((p) => p.id === activeProjectId);
    const safeName = project
      ? project.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      : 'project';
    downloadFile(json, `${safeName}.json`);
  };

  const handleCalculate = useCallback(() => {
    const result = validateProjectForCalculation();
    if (result.errors.length > 0) {
      setValidationResult(result);
      return;
    }
    setValidationResult(null);
    const parts = calculateAllParts();
    if (parts.length > 0) {
      runLayout();
    }
  }, [validateProjectForCalculation, calculateAllParts, runLayout]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Output</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCalculate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Calculate
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Validation banner */}
      {validationResult && validationResult.errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">Cannot calculate — missing required fields</h3>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {!validationResult.boxes && (
              <li>
                Boxes not configured — go to{' '}
                <button className="text-blue-600 underline hover:text-blue-800" onClick={() => useUIStore.getState().setActiveTab('boxes')}>
                  Boxes tab
                </button>
              </li>
            )}
            {!validationResult.materials && (
              <li>
                Sheet size and kerf not set — go to{' '}
                <button className="text-blue-600 underline hover:text-blue-800" onClick={() => useUIStore.getState().setActiveTab('materials')}>
                  Materials tab
                </button>
              </li>
            )}
            {!validationResult.cutSettings && (
              <li>
                Grain constraint not selected — go to{' '}
                <button className="text-blue-600 underline hover:text-blue-800" onClick={() => useUIStore.getState().setActiveTab('cut-settings')}>
                  Cut Settings tab
                </button>
              </li>
            )}
            {validationResult.errors.map((err, i) => (
              <li key={i} className="text-gray-700">{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sub-tab toggle — ADR-017 */}
      <div className="flex gap-1 mb-6 -mb-px border-b border-gray-200">
        {[
          { id: 'cut-list', label: 'Cut List' },
          { id: 'sheet-layout', label: 'Sheet Layout' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setOutputSubTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              outputSubTab === id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {outputSubTab === 'cut-list' && <CutListOutputInline />}
      {outputSubTab === 'sheet-layout' && <SheetLayoutOutputInline />}
    </div>
  );
}

/**
 * Inline Cut List view for the Output tab sub-tab.
 * Reuses the same calculation state but renders compactly within the Output wrapper.
 */
function CutListOutputInline() {
  const calculatedParts = useProjectStore((s) => s.calculatedParts);

  if (calculatedParts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No parts calculated.</p>
        <p className="text-sm mt-1">Click "Calculate" to generate the cut list.</p>
      </div>
    );
  }

  // Delegate to the full CutList component which handles sorting, grouping, and CSV export
  return <CutList />;
}

/**
 * Inline Sheet Layout view for the Output tab sub-tab.
 */
function SheetLayoutOutputInline() {
  const calculatedParts = useProjectStore((s) => s.calculatedParts);
  const sheetLayouts = useProjectStore((s) => s.sheetLayouts);

  if (calculatedParts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No parts to layout.</p>
        <p className="text-sm mt-1">Click "Calculate" to generate parts and sheet layout.</p>
      </div>
    );
  }

  // Delegate to the full SheetLayoutView component
  return <SheetLayoutView />;
}

export default App;