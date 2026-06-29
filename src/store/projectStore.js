import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { uid } from '../utils/id.js';
import {
  defaultProject,
  defaultBox,
  defaultDrawerConfig,
  validateProject,
  validateBox,
  validateDrawerConfig,
} from '../utils/validate.js';

/**
 * projectStore — owns all project data.
 * Persisted to localStorage via zustand/middleware persist.
 * Wrapped with devtools for debugging.
 *
 * Shape:
 *   projects: Project[]
 *   activeProjectId: string | null
 *
 * See docs/spec/V1_FEATURE_SPEC.md section 4 for the full data model.
 * See ADR-014 for the data model definition.
 */
export const useProjectStore = create(
  devtools(
    persist(
      (set, get) => ({
        projects: [],
        activeProjectId: null,

        // -- Project getters --

        /**
         * @returns {Project | null}
         */
        getActiveProject: () => {
          const { projects, activeProjectId } = get();
          if (!activeProjectId) return null;
          return projects.find((p) => p.id === activeProjectId) ?? null;
        },

        // -- Project actions --

        /**
         * Creates a new project and sets it as active.
         * @param {Partial<Project>} overrides
         * @returns {string} The new project id
         */
        createProject: (overrides = {}) => {
          const project = { ...defaultProject(), ...overrides };
          set((state) => ({
            projects: [...state.projects, project],
            activeProjectId: project.id,
          }));
          return project.id;
        },

        /**
         * Opens an existing project by id.
         * @param {string} projectId
         */
        openProject: (projectId) => {
          const { projects } = get();
          const exists = projects.some((p) => p.id === projectId);
          if (exists) {
            set({ activeProjectId: projectId });
          }
        },

        /**
         * Updates fields on the active project.
         * @param {Partial<Project>} updates
         */
        updateProject: (updates) => {
          const { activeProjectId } = get();
          if (!activeProjectId) return;
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === activeProjectId
                ? { ...p, ...updates, updatedAt: Date.now() }
                : p
            ),
          }));
        },

        /**
         * Deletes a project. If it is the active project, clears activeProjectId.
         * @param {string} projectId
         */
        deleteProject: (projectId) => {
          set((state) => {
            const newProjects = state.projects.filter((p) => p.id !== projectId);
            const newActiveId =
              state.activeProjectId === projectId ? null : state.activeProjectId;
            return {
              projects: newProjects,
              activeProjectId: newActiveId,
            };
          });
        },

        // -- Box actions --

        /**
         * Adds a box to the active project.
         * @param {Partial<Box>} overrides
         * @returns {string} The new box id
         */
        addBox: (overrides = {}) => {
          const box = { ...defaultBox(), ...overrides };
          const errors = validateBox(box);
          if (errors.length > 0) {
            console.warn('Box validation warnings:', errors);
          }
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === state.activeProjectId
                ? { ...p, boxes: [...p.boxes, box], updatedAt: Date.now() }
                : p
            ),
          }));
          return box.id;
        },

        /**
         * Updates a box by id within the active project.
         * @param {string} boxId
         * @param {Partial<Box>} updates
         */
        updateBox: (boxId, updates) => {
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === state.activeProjectId
                ? {
                    ...p,
                    boxes: p.boxes.map((b) =>
                      b.id === boxId ? { ...b, ...updates } : b
                    ),
                    updatedAt: Date.now(),
                  }
                : p
            ),
          }));
        },

        /**
         * Deletes a box and its associated drawers from the active project.
         * @param {string} boxId
         */
        deleteBox: (boxId) => {
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === state.activeProjectId
                ? {
                    ...p,
                    boxes: p.boxes.filter((b) => b.id !== boxId),
                    drawers: p.drawers.filter((d) => d.boxId !== boxId),
                    updatedAt: Date.now(),
                  }
                : p
            ),
          }));
        },

        /**
         * Duplicates a box in the active project.
         * @param {string} boxId
         * @returns {string} The new box id
         */
        duplicateBox: (boxId) => {
          let sourceBox = null;
          set((state) => {
            const project = state.projects.find((p) => p.id === state.activeProjectId);
            if (!project) return {};
            sourceBox = project.boxes.find((b) => b.id === boxId);
            if (!sourceBox) return {};
            const copy = { ...sourceBox, id: uid(), name: `${sourceBox.name} (copy)` };
            return {
              projects: state.projects.map((p) =>
                p.id === state.activeProjectId
                  ? { ...p, boxes: [...p.boxes, copy], updatedAt: Date.now() }
                  : p
              ),
            };
          });
          return sourceBox ? uid() : null;
        },

        // -- Drawer actions --

        /**
         * Adds a drawer config to the active project.
         * @param {string} boxId
         * @param {Partial<DrawerConfig>} overrides
         * @returns {string} The new drawer id
         */
        addDrawer: (boxId, overrides = {}) => {
          const drawer = { ...defaultDrawerConfig(boxId), ...overrides };
          const errors = validateDrawerConfig(drawer);
          if (errors.length > 0) {
            console.warn('DrawerConfig validation warnings:', errors);
          }
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === state.activeProjectId
                ? { ...p, drawers: [...p.drawers, drawer], updatedAt: Date.now() }
                : p
            ),
          }));
          return drawer.id;
        },

        /**
         * Updates a drawer config by id within the active project.
         * @param {string} drawerId
         * @param {Partial<DrawerConfig>} updates
         */
        updateDrawer: (drawerId, updates) => {
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === state.activeProjectId
                ? {
                    ...p,
                    drawers: p.drawers.map((d) =>
                      d.id === drawerId ? { ...d, ...updates } : d
                    ),
                    updatedAt: Date.now(),
                  }
                : p
            ),
          }));
        },

        /**
         * Deletes a drawer config from the active project.
         * @param {string} drawerId
         */
        deleteDrawer: (drawerId) => {
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === state.activeProjectId
                ? {
                    ...p,
                    drawers: p.drawers.filter((d) => d.id !== drawerId),
                    updatedAt: Date.now(),
                  }
                : p
            ),
          }));
        },

        // -- Cut settings --

        /**
         * Updates cut-related settings (kerf, grain, sheet size) on the active project.
         * @param {Object} settings
         * @param {number} [settings.kerf]
         * @param {'hard'|'soft'} [settings.grainConstraint]
         * @param {Object} [settings.sheetSize]
         */
        updateCutSettings: (settings) => {
          get().updateProject(settings);
        },

        // -- Import / Export --

        /**
         * Exports the active project as a JSON string.
         * @returns {string | null}
         */
        exportProjectJSON: () => {
          const project = get().getActiveProject();
          if (!project) return null;
          return JSON.stringify(project, null, 2);
        },

        /**
         * Imports a project from a JSON string. Validates before adding.
         * @param {string} json
         * @returns {{ success: boolean, projectId?: string, errors?: string[] }}
         */
        importProjectJSON: (json) => {
          try {
            const parsed = JSON.parse(json);
            const errors = validateProject(parsed);
            if (errors.length > 0) {
              return { success: false, errors };
            }
            // Generate a fresh id so we don't collide with localStorage data
            const importId = uid();
            const project = { ...parsed, id: importId, updatedAt: Date.now() };
            // Re-ID nested items to avoid collisions
            const remapIds = new Map();
            if (project.boxes) {
              project.boxes = project.boxes.map((box) => {
                const newId = uid();
                remapIds.set(box.id, newId);
                return { ...box, id: newId };
              });
            }
            if (project.drawers) {
              project.drawers = project.drawers.map((d) => {
                const newId = uid();
                const newBoxId = remapIds.get(d.boxId) ?? d.boxId;
                return { ...d, id: newId, boxId: newBoxId };
              });
            }
            set((state) => ({
              projects: [...state.projects, project],
              activeProjectId: importId,
            }));
            return { success: true, projectId: importId };
          } catch (e) {
            return { success: false, errors: [`Invalid JSON: ${e.message}`] };
          }
        },
      }),
      {
        name: 'ply-calc-projects',
      }
    ),
    { name: 'ProjectStore' }
  )
);