import { useCallback, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore.js';
import { useUIStore } from '../store/uiStore.js';
import { downloadFile, readFileAsText, promptFileSelect } from '../utils/fileIO.js';

/**
 * ProjectList — displays all saved projects, allows creating, opening,
 * deleting (with confirmation), importing and exporting projects.
 *
 * ADR-006: JSON export/import for portability between devices.
 */
export default function ProjectList() {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const createProject = useProjectStore((s) => s.createProject);
  const openProject = useProjectStore((s) => s.openProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const exportProjectJSON = useProjectStore((s) => s.exportProjectJSON);
  const importProjectJSON = useProjectStore((s) => s.importProjectJSON);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  // Track which project is being renamed: { id, name } | null
  const [editingProject, setEditingProject] = useState(null);
  const [renameError, setRenameError] = useState('');
  const [showStorageNotice, setShowStorageNotice] = useState(true);
  const inputRef = useRef(null);

  const handleCreate = useCallback(() => {
    createProject();
    setActiveTab('boxes');
  }, [createProject, setActiveTab]);

  const handleOpen = useCallback((id) => {
    openProject(id);
    setActiveTab('boxes');
  }, [openProject, setActiveTab]);

  const handleDelete = useCallback((id) => {
    const project = projects.find((p) => p.id === id);
    const name = project ? project.name : 'Project';
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone. If you want to keep a copy, export the project first.`
    );
    if (confirmed) {
      deleteProject(id);
    }
  }, [projects, deleteProject]);

  const handleExportActive = useCallback(() => {
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
  }, [exportProjectJSON, activeProjectId, projects]);

  const handleImport = useCallback(async () => {
    try {
      const file = await promptFileSelect('.json');
      if (!file) return;
      const text = await readFileAsText(file);
      const result = importProjectJSON(text);
      if (result.success) {
        setActiveTab('boxes');
      } else {
        alert('Import failed:\n' + result.errors.join('\n'));
      }
    } catch (e) {
      alert(`Import error: ${e.message}`);
    }
  }, [importProjectJSON, setActiveTab]);

  const formatDate = (ts) => {
    if (!ts) return '\u2014';
    return new Date(ts).toLocaleString();
  };

  // -- Rename handlers --

  const startRename = useCallback((project) => {
    setEditingProject({ id: project.id, name: project.name });
    setRenameError('');
    // Focus the input on next render
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const commitRename = useCallback(() => {
    if (!editingProject) return;
    const trimmed = editingProject.name.trim();
    if (!trimmed) {
      setRenameError('Project name is required');
      return;
    }
    const result = renameProject(editingProject.id, trimmed);
    if (!result.success) {
      setRenameError(result.errors?.[0] ?? 'Rename failed');
      return;
    }
    setEditingProject(null);
    setRenameError('');
  }, [editingProject, renameProject]);

  const cancelRename = useCallback(() => {
    setEditingProject(null);
    setRenameError('');
  }, []);

  const handleRenameKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      commitRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  }, [commitRename, cancelRename]);

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="bg-white border-b border-surface-200 shadow-elev-1">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            {/* Hammer / saw icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-primary-600 rounded-xl shadow-elev-2 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 4.392l-6.61 1.654a1.002 1.002 0 01-1.203-1.18l1.295-6.648a2.001 2.001 0 01.97-1.426l3.554-1.777a2.001 2.001 0 011.79 0l3.554 1.777a2.001 2.001 0 01.97 1.426l1.295 6.648a1.002 1.002 0 01-1.203 1.18l-6.61-1.654z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v7.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 19.5h7.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-headline-md text-surface-900 tracking-tight">ply-calc</h1>
              <p className="text-body-sm text-surface-500">Plywood Sheet Calculator</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleCreate}
            className="btn-primary flex-1 sm:flex-none"
          >
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Project
          </button>
          <button
            onClick={handleImport}
            className="btn-tonal flex-1 sm:flex-none"
          >
            Import JSON
          </button>
          <button
            onClick={handleExportActive}
            disabled={!activeProjectId}
            className="btn-secondary flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Active
          </button>
        </div>

        {/* Storage info — a routine product fact, not a warning */}
        {showStorageNotice && (
          <div className="banner-notice mb-6">
            <svg className="w-5 h-5 flex-shrink-0 text-surface-400 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="flex-1">
              Projects are saved in your browser's local storage. Clearing browser data will
              delete them — use <span className="font-medium text-surface-800">Export Active</span> to
              back up a project, then <span className="font-medium text-surface-800">Import JSON</span> on
              another device.
            </p>
            <button
              onClick={() => setShowStorageNotice(false)}
              className="flex-shrink-0 p-1 -m-1 rounded-md text-surface-400 hover:text-surface-700 hover:bg-surface-200 transition-colors duration-150"
              aria-label="Dismiss storage notice"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <h2 className="text-headline-md text-surface-900 mb-2">Let's build something</h2>
            <p className="text-body-md text-surface-500 max-w-sm mb-6">
              Set up your first cut list — sizes, sheet stock, and kerf — and we'll work out
              exactly what to cut.
            </p>
            <button onClick={handleCreate} className="btn-primary">
              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Project
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => {
              const isEditing = editingProject?.id === project.id;
              return (
                <li
                  key={project.id}
                  className={`flex items-center justify-between p-4 bg-white rounded-xl border transition-all duration-150 ${
                    project.id === activeProjectId
                      ? 'border-primary-400 ring-2 ring-primary-100 shadow-elev-2'
                      : 'border-surface-200 shadow-elev-1 hover:shadow-elev-2'
                  } ${isEditing ? 'shadow-elev-3' : ''}`}
                >
                  {isEditing ? (
                    /* -- Inline rename form -- */
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingProject.name}
                          maxLength={100}
                          onChange={(e) => {
                            setEditingProject((prev) => ({ ...prev, name: e.target.value }));
                            if (renameError) setRenameError('');
                          }}
                          onKeyDown={handleRenameKeyDown}
                          onBlur={commitRename}
                          className="w-full px-2 py-1 text-body-md border-2 border-primary-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          aria-label="Project name"
                        />
                        {renameError && (
                          <p className="text-body-sm text-danger-600 mt-1">{renameError}</p>
                        )}
                      </div>
                      <button
                        onClick={commitRename}
                        className="px-3 py-1.5 text-label-md text-success-700 border border-success-300 rounded-lg hover:bg-success-50 active:scale-95 transition-all duration-150 min-h-[44px]"
                        title="Save"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelRename}
                        className="px-3 py-1.5 text-label-md text-surface-600 border border-surface-300 rounded-lg hover:bg-surface-100 active:scale-95 transition-all duration-150 min-h-[44px]"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    /* -- Default project row -- */
                    <>
                      <button
                        onClick={() => handleOpen(project.id)}
                        className="flex-1 text-left"
                        title="Open project"
                      >
                        <p className="text-title-md text-surface-900">{project.name}</p>
                        <p className="text-body-sm text-surface-500 mt-0.5">
                          {project.boxes.length} box{project.boxes.length !== 1 ? 'es' : ''}
                          {' \u00B7 '}
                          {project.drawers.length} drawer{project.drawers.length !== 1 ? 's' : ''}
                          {' \u00B7 '}
                          Modified {formatDate(project.updatedAt)}
                        </p>
                      </button>
                      <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => startRename(project)}
                          className="btn-tonal px-3.5 py-2 text-label-md min-h-[44px]"
                          title={`Rename ${project.name}`}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="btn-danger-ghost px-3.5 py-2 min-h-[44px]"
                          title={`Delete ${project.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}