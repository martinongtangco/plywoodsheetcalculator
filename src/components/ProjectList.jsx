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
              <h1 className="text-2xl font-bold text-surface-900 tracking-tight">ply-calc</h1>
              <p className="text-sm text-surface-500">Plywood Sheet Calculator</p>
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
            className="btn-secondary flex-1 sm:flex-none"
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

        {/* Storage info */}
        <div className="alert-info mb-6">
          <strong>Storage notice:</strong> Projects are saved in your browser's localStorage.
          Clearing browser data will delete all projects. Use <em>Export Active</em> to back up
          a project, then <em>Import JSON</em> on another device.
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-surface-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            <p className="text-lg">No projects yet.</p>
            <p className="text-sm mt-1">Create a new project or import an existing one.</p>
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
                          className="w-full px-2 py-1 text-sm border-2 border-primary-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    /* -- Default project row -- */
                    <>
                      <button
                        onClick={() => handleOpen(project.id)}
                        className="flex-1 text-left"
                        title="Open project"
                      >
                        <p className="font-semibold text-surface-900">{project.name}</p>
                        <p className="text-xs text-surface-500 mt-0.5">
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
                          className="px-3 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors min-h-[44px]"
                          title={`Rename ${project.name}`}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="px-3 py-2 text-sm font-medium text-danger-600 border border-danger-200 rounded-lg hover:bg-danger-50 transition-colors min-h-[44px]"
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