import { useProjectStore } from './store/projectStore.js';
import { useUIStore } from './store/uiStore.js';
import ProjectList from './components/ProjectList.jsx';
import { downloadFile } from './utils/fileIO.js';

function App() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  // When no project is active, show the project list
  if (!activeProjectId) {
    return <ProjectList />;
  }

  // When a project is active, show the project editor view
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => {
                  // Navigate back to project list
                  useProjectStore.setState({ activeProjectId: null });
                }}
                className="text-sm text-blue-600 hover:underline mr-4"
              >
                ← Projects
              </button>
              <h1 className="text-xl font-bold text-gray-900 inline">
                ply-calc
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 -mb-px">
            {['boxes', 'materials', 'cut-settings', 'output'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'cut-settings' ? 'Cut Settings' : tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'output' && (
          <OutputActions />
        )}
        {activeTab !== 'output' && (
          <p className="text-gray-600">
            {activeTab === 'boxes' && 'Box configuration — coming soon.'}
            {activeTab === 'materials' && 'Material selection — coming soon.'}
            {activeTab === 'cut-settings' && 'Cut settings — coming soon.'}
          </p>
        )}
      </main>
    </div>
  );
}

/**
 * OutputActions — export button on the output tab.
 * ADR-006: JSON export (download file) in the output screen.
 */
function OutputActions() {
  const exportProjectJSON = useProjectStore((s) => s.exportProjectJSON);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

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

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Output</h2>
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Export Project as JSON
        </button>
      </div>
      <p className="text-gray-600">Cut list and sheet layout — coming soon.</p>
    </div>
  );
}

export default App;