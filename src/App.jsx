import { useState, useCallback, useRef } from 'react';
import { useProjectStore } from './store/projectStore.js';
import { useUIStore } from './store/uiStore.js';
import ProjectList from './components/ProjectList.jsx';
import BoxConfig from './components/BoxConfig.jsx';
import MaterialConfig from './components/MaterialConfig.jsx';
import CutSettings from './components/CutSettings.jsx';
import CutList from './components/CutList.jsx';
import SheetLayoutView from './components/SheetLayoutView.jsx';
import { ValidationBanner } from './components/ValidationBanner.jsx';
import { downloadFile } from './utils/fileIO.js';
import { downloadPdf } from './pdf/generate.js';

/**
 * Tab definitions — Drafting Room icons (18×18px, stroke-width 1.6)
 */
const TABS = [
  {
    id: 'boxes',
    label: 'Boxes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
  {
    id: 'materials',
    label: 'Materials',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'cut-settings',
    label: 'Cut Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" d="M4 6h16M4 12h10M4 18h7" />
      </svg>
    ),
  },
  {
    id: 'cut-list',
    label: 'Cut List',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    id: 'sheet-layout',
    label: 'Sheet Layout',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
      </svg>
    ),
  },
  {
    id: 'output',
    label: 'Output',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
];

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
    <div className="min-h-screen bg-paper-100">
      {/* Header — paper cream, flat, no shadow */}
      <header className="bg-paper-100 border-b border-border-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  useProjectStore.setState({ activeProjectId: null });
                }}
                className="font-mono text-label-md text-accent hover:underline min-h-[44px] px-1 transition-colors duration-150"
              >
                ← Projects
              </button>
              {activeProject && (
                <>
                  <div className="w-px h-4 bg-border-400" />
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
                          className="px-2 py-1 text-headline-md border-2 border-accent rounded focus:outline-none focus:ring-2 focus:ring-accent text-ink-900"
                          aria-label="Project name"
                        />
                        {renameError && (
                          <p className="text-body-sm text-danger-600 mt-1">{renameError}</p>
                        )}
                      </div>
                      <button
                        onClick={commitRename}
                        className="px-3 py-1.5 text-label-md font-semibold border border-success-200 rounded hover:bg-success-50 active:scale-95 transition-all duration-150 min-h-[44px] text-success-700"
                        title="Save"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelRename}
                        className="px-3 py-1.5 text-label-md text-ink-600 border border-border-300 rounded hover:bg-paper-200 active:scale-95 transition-all duration-150 min-h-[44px]"
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
                      <h1 className="text-headline-md font-display font-bold text-ink-900">
                        {activeProject.name}
                      </h1>
                      <svg
                        className="w-4 h-4 text-ink-400 opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Tab navigation — Drafting Room stacked icon+label tabs */}
      <nav className="bg-paper-200 border-b border-border-100 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-0">
            {TABS.map(({ id, label, icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-col items-center justify-center gap-1 px-4 py-3 text-body-sm font-semibold border-b-2 transition-all duration-150 ease-out min-h-[44px] ${
                    isActive
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-ink-400 border-b-2 border-transparent hover:text-ink-700'
                  }`}
                >
                  <span className="flex-shrink-0">{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 animate-fade-in">
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
  const [error, setError] = useState(null);

  const handleExport = () => {
    setError(null);
    const json = exportProjectJSON();
    if (!json) {
      setError('No active project to export.');
      return;
    }
    const project = projects.find((p) => p.id === activeProjectId);
    const safeName = project
      ? project.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      : 'project';
    downloadFile(json, `${safeName}.json`);
  };

  const handleExportPdf = useCallback(async () => {
    // Use a single getState() call to get a consistent snapshot of all data.
    // Avoids mixing closure values (projects, activeProjectId) with fresh state,
    // which could produce inconsistent snapshots.
    const state = useProjectStore.getState();
    const activeProject = state.getActiveProject();
    const currentParts = state.calculatedParts;
    const currentLayouts = state.sheetLayouts;

    if (!activeProject || currentParts.length === 0) {
      setError('Nothing to export. Click "Calculate" first.');
      return;
    }

    const safeName = activeProject.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

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
      if (import.meta.env.DEV) console.error('PDF generation failed:', err);
      setError('PDF generation failed. Please try again.');
    }
  }, []);

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
      {/* Inline error banner */}
      {error && (
        <div className="alert-danger mb-4 flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 text-danger-600 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="flex-1 text-body-sm text-danger-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="flex-shrink-0 p-1 -m-1 rounded text-danger-500 hover:text-danger-700 hover:bg-danger-100 transition-colors duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Output</h2>
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
            className="btn-accent"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Validation banner */}
      <ValidationBanner result={validationResult} />

      {/* Sub-tab toggle */}
      <div className="flex gap-1 mb-6 -mb-px border-b border-border-100">
        {[
          { id: 'cut-list', label: 'Cut List' },
          { id: 'sheet-layout', label: 'Sheet Layout' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setOutputSubTab(id)}
            className={`px-4 py-2 text-label-md font-semibold border-b-2 transition-colors duration-200 ease-out ${
              outputSubTab === id
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-400 hover:text-ink-700 hover:border-border-300'
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
 */
function CutListOutputInline() {
  const calculatedParts = useProjectStore((s) => s.calculatedParts);

  if (calculatedParts.length === 0) {
    return (
      <div className="text-center py-16 text-ink-400">
        <p className="text-lg">No parts calculated.</p>
        <p className="text-sm mt-1">Click "Calculate" to generate the cut list.</p>
      </div>
    );
  }

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
      <div className="text-center py-16 text-ink-400">
        <p className="text-lg">No parts to layout.</p>
        <p className="text-sm mt-1">Click "Calculate" to generate parts and sheet layout.</p>
      </div>
    );
  }

  return <SheetLayoutView />;
}

export default App;