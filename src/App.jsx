import { useState, useCallback, useRef } from 'react';
import { useProjectStore } from './store/projectStore.js';
import { useUIStore } from './store/uiStore.js';
import ProjectList from './components/ProjectList.jsx';
import BoxConfig from './components/BoxConfig.jsx';
import MaterialConfig from './components/MaterialConfig.jsx';
import CutSettings from './components/CutSettings.jsx';
import CutList from './components/CutList.jsx';
import SheetLayoutView from './components/SheetLayoutView.jsx';
import { downloadFile } from './utils/fileIO.js';
import { downloadPdf } from './pdf/generate.js';

function App() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const activeProject = useProjectStore((s) => s.getActiveProject());

  // All hooks MUST be called before any early return (Rules of Hooks)
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState('');
  const renameInputRef = useRef(null);

  const startRename = useCallback(() => {
    if (!activeProject) return;
    setRenameName(activeProject.name);
    setRenameError('');
    setIsRenaming(true);
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [activeProject]);

  const commitRename = useCallback(() => {
    if (!activeProject) return;
    const trimmed = renameName.trim();
    if (!trimmed) {
      setRenameError('Project name is required');
      return;
    }
    const result = useProjectStore.getState().renameProject(activeProject.id, trimmed);
    if (!result.success) {
      setRenameError(result.errors?.[0] ?? 'Rename failed');
      return;
    }
    setIsRenaming(false);
    setRenameError('');
  }, [activeProject, renameName]);

  const cancelRename = useCallback(() => {
    setIsRenaming(false);
    setRenameError('');
  }, []);

  const handleRenameKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      commitRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  }, [commitRename, cancelRename]);

  // When no project is active, show the project list
  if (!activeProjectId) {
    return <ProjectList />;
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="bg-white border-b border-surface-200 shadow-elev-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  useProjectStore.setState({ activeProjectId: null });
                }}
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline min-h-[44px] px-1 font-medium transition-colors"
              >
                ← Projects
              </button>
              {activeProject && (
                <>
                  <div className="w-px h-6 bg-surface-300" />
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <div>
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameName}
                          maxLength={100}
                          onChange={(e) => {
                            setRenameName(e.target.value);
                            if (renameError) setRenameError('');
                          }}
                          onKeyDown={handleRenameKeyDown}
                          onBlur={commitRename}
                          className="px-2 py-1 text-2xl font-bold border-2 border-primary-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900"
                          aria-label="Project name"
                        />
                        {renameError && (
                          <p className="text-xs text-danger-600 mt-1">{renameError}</p>
                        )}
                      </div>
                      <button
                        onClick={commitRename}
                        className="px-3 py-1 text-sm font-medium text-success-700 border border-success-300 rounded-lg hover:bg-success-50 transition-colors"
                        title="Save"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelRename}
                        className="px-3 py-1 text-sm text-surface-600 border border-surface-300 rounded-lg hover:bg-surface-100 transition-colors"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startRename}
                      className="group flex items-center gap-2"
                      title={`Rename: ${activeProject.name}`}
                    >
                      <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
                        {activeProject.name}
                      </h1>
                      <svg
                        className="w-4 h-4 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation — ADR-015 component-per-tab */}
      <nav className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex -mb-px">
            {[
              {
                id: 'boxes',
                label: 'Boxes',
                icon: (
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                ),
              },
              {
                id: 'materials',
                label: 'Materials',
                icon: (
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                ),
              },
              {
                id: 'cut-settings',
                label: 'Cut Settings',
                icon: (
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.115 1.115 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.115 1.115 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.115 1.115 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                id: 'cut-list',
                label: 'Cut List',
                icon: (
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                ),
              },
              {
                id: 'sheet-layout',
                label: 'Sheet Layout',
                icon: (
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                  </svg>
                ),
              },
              {
                id: 'output',
                label: 'Output',
                icon: (
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                ),
              },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 min-h-[44px] px-1 transition-colors ${
                  activeTab === id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
                }`}
              >
                <span className="flex-shrink-0">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
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
 * ADR-017: JSON export (download file) in the output screen.
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

  const handleExportPdf = useCallback(async () => {
    const activeProject = useProjectStore.getState().getActiveProject();
    const currentParts = useProjectStore.getState().calculatedParts;
    const currentLayouts = useProjectStore.getState().sheetLayouts;

    if (!activeProject || currentParts.length === 0) {
      alert('Nothing to export. Click "Calculate" first.');
      return;
    }

    const project = projects.find((p) => p.id === activeProjectId);
    const safeName = project
      ? project.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      : 'project';

    try {
      await downloadPdf(
        {
          project: activeProject,
          parts: currentParts,
          layouts: currentLayouts,
          sheet: activeProject.sheetSize,
        },
        `${safeName}.pdf`
      );
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Check console for details.');
    }
  }, [projects, activeProjectId]);

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
        <h2 className="text-lg font-semibold text-surface-900 tracking-tight">Output</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCalculate}
            className="btn-primary"
          >
            Calculate
          </button>
          <button
            onClick={handleExport}
            className="btn-secondary"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center justify-center px-5 py-2.5
              bg-accent-600 text-white text-sm font-semibold
              rounded-lg shadow-elev-1
              hover:bg-accent-700 hover:shadow-elev-2
              active:bg-accent-800 active:shadow-elev-1
              focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2
              transition-all duration-150 ease-in-out
              min-h-[44px]"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Validation banner */}
      {validationResult && validationResult.errors.length > 0 && (
        <div className="alert-danger mb-4">
          <h3 className="font-semibold text-danger-800 mb-2">Cannot calculate — missing required fields</h3>
          <ul className="list-disc list-inside text-sm text-danger-700 space-y-1">
            {!validationResult.boxes && (
              <li>
                Boxes not configured — go to{' '}
                <button className="text-primary-600 underline hover:text-primary-800 font-medium" onClick={() => useUIStore.getState().setActiveTab('boxes')}>
                  Boxes tab
                </button>
              </li>
            )}
            {!validationResult.materials && (
              <li>
                Sheet size and kerf not set — go to{' '}
                <button className="text-primary-600 underline hover:text-primary-800 font-medium" onClick={() => useUIStore.getState().setActiveTab('materials')}>
                  Materials tab
                </button>
              </li>
            )}
            {!validationResult.cutSettings && (
              <li>
                Grain constraint not selected — go to{' '}
                <button className="text-primary-600 underline hover:text-primary-800 font-medium" onClick={() => useUIStore.getState().setActiveTab('cut-settings')}>
                  Cut Settings tab
                </button>
              </li>
            )}
            {validationResult.errors.map((err, i) => (
              <li key={i} className="text-surface-700">{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sub-tab toggle — ADR-017 */}
      <div className="flex gap-1 mb-6 -mb-px border-b border-surface-200">
        {[
          { id: 'cut-list', label: 'Cut List' },
          { id: 'sheet-layout', label: 'Sheet Layout' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setOutputSubTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              outputSubTab === id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
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
      <div className="text-center py-16 text-surface-400">
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
      <div className="text-center py-16 text-surface-400">
        <p className="text-lg">No parts to layout.</p>
        <p className="text-sm mt-1">Click "Calculate" to generate parts and sheet layout.</p>
      </div>
    );
  }

  // Delegate to the full SheetLayoutView component
  return <SheetLayoutView />;
}

export default App;