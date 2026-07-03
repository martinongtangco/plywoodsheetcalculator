import { useCallback } from 'react';
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
  const exportProjectJSON = useProjectStore((s) => s.exportProjectJSON);
  const importProjectJSON = useProjectStore((s) => s.importProjectJSON);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

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
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            New Project
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            Import JSON
          </button>
          <button
            onClick={handleExportActive}
            disabled={!activeProjectId}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
            {projects.map((project) => (
              <li
                key={project.id}
                className={`flex items-center justify-between p-4 bg-white border rounded-md ${
                  project.id === activeProjectId
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => handleOpen(project.id)}
                  className="flex-1 text-left"
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
                <button
                  onClick={() => handleDelete(project.id)}
                  className="ml-4 px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                  title={`Delete ${project.name}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}