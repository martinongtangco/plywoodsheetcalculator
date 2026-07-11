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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">ply-calc</h1>
          <p className="text-sm text-gray-500 mt-1">Plywood Sheet Calculator</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 min-h-[44px] sm:flex-none"
          >
            New Project
          </button>
          <button
            onClick={handleImport}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 min-h-[44px] sm:flex-none"
          >
            Import JSON
          </button>
          <button
            onClick={handleExportActive}
            disabled={!activeProjectId}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:flex-none"
          >
            Export Active
          </button>
        </div>

        {/* Storage info */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          <strong>Storage notice:</strong> Projects are saved in your browser's localStorage.
          Clearing browser data will delete all projects. Use <em>Export Active</em> to back up
          a project, then <em>Import JSON</em> on another device.
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
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
                  className={`flex items-center justify-between p-4 bg-white border rounded-md ${
                    project.id === activeProjectId
                      ? 'border-blue-500 ring-1 ring-blue-500'
                      : 'border-gray-200'
                  } ${isEditing ? 'shadow-md' : ''}`}
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
                          className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          aria-label="Project name"
                        />
                        {renameError && (
                          <p className="text-xs text-red-600 mt-1">{renameError}</p>
                        )}
                      </div>
                      <button
                        onClick={commitRename}
                        className="px-3 py-1 text-sm text-green-700 border border-green-200 rounded hover:bg-green-50"
                        title="Save"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelRename}
                        className="px-3 py-1 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
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
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
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
                          className="px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50 min-h-[44px]"
                          title={`Rename ${project.name}`}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 min-h-[44px]"
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