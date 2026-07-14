import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { maybeDevtools } from './devtools.js';
import { uid } from '../utils/id.js';
import {
  defaultProject,
  defaultBox,
  defaultDrawerConfig,
  validateProject,
  validateProjectName,
  validateBox,
  validateDrawerConfig,
} from '../utils/validate.js';
import {
  calculateCarcassParts,
  calculateDrawerParts,
  calculateInternalDimensions,
} from '../engine/parts.js';
import { batchLayout } from '../engine/batch.js';
import { balancedLayout } from '../engine/balanced.js';
import { optimisedLayout } from '../engine/optimised.js';

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
  maybeDevtools(
    persist(
      (set, get) => ({
        projects: [],
        activeProjectId: null,
        calculatedParts: [],
        sheetLayouts: [],

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

        /**
         * Renames a project. Validates the name against XSS, length, and duplicates.
         * @param {string} projectId
         * @param {string} newName
         * @returns {{ success: boolean, errors?: string[] }}
         */
        renameProject: (projectId, newName) => {
          const { projects } = get();
          const project = projects.find((p) => p.id === projectId);
          if (!project) {
            return { success: false, errors: ['Project not found'] };
          }

          const existingNames = projects.map((p) => p.name);
          const { valid, errors } = validateProjectName(newName, existingNames, project.name);

          if (!valid) {
            return { success: false, errors };
          }

          // Sanitize: strip HTML tags
          const sanitized = newName.replace(/<[^>]*>/g, '').trim();

          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === projectId
                ? { ...p, name: sanitized, updatedAt: Date.now() }
                : p
            ),
          }));

          return { success: true };
        },

        // -- Box actions --

        /**
         * Adds a box to the active project.
         * @param {Partial<Box>} overrides
         * @returns {string} The new box id
         */
        addBox: (overrides = {}) => {
          const project = get().getActiveProject();
          const boxCount = project ? project.boxes.length : 0;
          const box = { ...defaultBox(boxCount), ...overrides };
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
         * @param {Partial<Box>|function} updates - Either a partial object or a function that receives the current state and returns a partial object
         */
        updateBox: (boxId, updates) => {
          set((state) => {
            const resolvedUpdates = typeof updates === 'function' ? updates(state) : updates;
            return {
              projects: state.projects.map((p) =>
                p.id === state.activeProjectId
                  ? {
                      ...p,
                      boxes: p.boxes.map((b) =>
                        b.id === boxId ? { ...b, ...resolvedUpdates } : b
                      ),
                      updatedAt: Date.now(),
                    }
                  : p
              ),
            };
          });
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
          let newBoxId = null;
          set((state) => {
            const project = state.projects.find((p) => p.id === state.activeProjectId);
            if (!project) return {};
            const sourceBox = project.boxes.find((b) => b.id === boxId);
            if (!sourceBox) return {};
            const copy = { ...sourceBox, id: uid(), name: `${sourceBox.name} (copy)` };
            newBoxId = copy.id;
            return {
              projects: state.projects.map((p) =>
                p.id === state.activeProjectId
                  ? { ...p, boxes: [...p.boxes, copy], updatedAt: Date.now() }
                  : p
              ),
            };
          });
          return newBoxId;
        },

        // -- Group actions --

        /**
         * Adds a named group to the active project.
         * @param {string} name
         * @returns {string|null} The new group id, or null if the name was empty
         */
        addGroup: (name) => {
          const trimmed = String(name ?? '').replace(/<[^>]*>/g, '').trim().slice(0, 100);
          if (!trimmed) return null;
          const group = { id: uid(), name: trimmed };
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === state.activeProjectId
                ? { ...p, groups: [...(p.groups || []), group], updatedAt: Date.now() }
                : p
            ),
          }));
          return group.id;
        },

        /**
         * Renames a group in the active project. No-op if the name is empty.
         * @param {string} groupId
         * @param {string} name
         */
        renameGroup: (groupId, name) => {
          const trimmed = String(name ?? '').replace(/<[^>]*>/g, '').trim().slice(0, 100);
          if (!trimmed) return;
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === state.activeProjectId
                ? {
                    ...p,
                    groups: (p.groups || []).map((g) =>
                      g.id === groupId ? { ...g, name: trimmed } : g
                    ),
                    updatedAt: Date.now(),
                  }
                : p
            ),
          }));
        },

        /**
         * Deletes a group from the active project. Any box referencing it
         * falls back to ungrouped (groupId: null) — mirrors how deleteBox()
         * also cleans up the box's drawers.
         * @param {string} groupId
         */
        deleteGroup: (groupId) => {
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === state.activeProjectId
                ? {
                    ...p,
                    groups: (p.groups || []).filter((g) => g.id !== groupId),
                    boxes: p.boxes.map((b) =>
                      b.groupId === groupId ? { ...b, groupId: null } : b
                    ),
                    updatedAt: Date.now(),
                  }
                : p
            ),
          }));
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
         * @param {Partial<DrawerConfig>|function} updates - Either a partial object or a function that receives the current state and returns a partial object
         */
        updateDrawer: (drawerId, updates) => {
          set((state) => {
            const resolvedUpdates = typeof updates === 'function' ? updates(state) : updates;
            return {
              projects: state.projects.map((p) =>
                p.id === state.activeProjectId
                  ? {
                      ...p,
                      drawers: p.drawers.map((d) =>
                        d.id === drawerId ? { ...d, ...resolvedUpdates } : d
                      ),
                      updatedAt: Date.now(),
                    }
                  : p
              ),
            };
          });
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

        // -- Calculation actions (ADR-015) --

        /**
         * Validates the active project for required fields.
         * Returns an object with per-tab validation status and overall errors.
         * @returns {{ boxes: boolean, materials: boolean, cutSettings: boolean, errors: string[] }}
         */
        validateProjectForCalculation: () => {
          const project = get().getActiveProject();
          if (!project) {
            return { boxes: false, materials: false, cutSettings: false, errors: ['No active project'] };
          }

          const errors = [];

          // Boxes validation: at least one box with valid external dimensions
          const boxesValid = project.boxes.length > 0 && project.boxes.every((b) => {
            return (
              typeof b.externalWidth === 'number' && b.externalWidth > 0 &&
              typeof b.externalHeight === 'number' && b.externalHeight > 0 &&
              typeof b.externalDepth === 'number' && b.externalDepth > 0
            );
          });
          if (!boxesValid) {
            errors.push('At least one box with valid external dimensions is required');
          }

          // Materials validation: sheetSize and kerf must be set
          const materialsValid = (
            typeof project.sheetSize === 'object' &&
            typeof project.sheetSize.width === 'number' && project.sheetSize.width > 0 &&
            typeof project.sheetSize.length === 'number' && project.sheetSize.length > 0 &&
            typeof project.kerf === 'number' && project.kerf >= 0
          );
          if (!materialsValid) {
            errors.push('Sheet size (width, length) and kerf must be set');
          }

          // Cut Settings validation: grainConstraint must be selected
          const cutSettingsValid = project.grainConstraint === 'hard' || project.grainConstraint === 'soft';
          if (!cutSettingsValid) {
            errors.push('Grain constraint must be selected (hard or soft)');
          }

          return { boxes: boxesValid, materials: materialsValid, cutSettings: cutSettingsValid, errors };
        },

        /**
         * Calculate all parts for the active project.
         * Iterates over each box, calculates carcass parts and drawer parts,
         * flattens into a single parts array stored in calculatedParts.
         * @returns {Part[]}
         */
        calculateAllParts: () => {
          const project = get().getActiveProject();
          if (!project) return [];

          const allParts = [];

          for (const box of project.boxes) {
            // Calculate carcass parts
            const carcassParts = calculateCarcassParts(
              {
                external_W: box.externalWidth,
                external_H: box.externalHeight,
                external_D: box.externalDepth,
                construction_method: box.constructionMethod,
              },
              box.thicknesses,
              box.edgeBanding,
              6, // backPanelOverlap default
              box.internalShelves ?? [],
              box.edgeBanding?.edges ?? {}
            );

            // Tag each part with box info
            for (const part of carcassParts) {
              part.boxId = box.id;
              part.boxName = box.name;
            }

            allParts.push(...carcassParts);

            // Calculate drawer parts for drawers belonging to this box
            const boxDrawers = project.drawers.filter((d) => d.boxId === box.id);
            for (const drawer of boxDrawers) {
              // Get internal dimensions of the box
              const internalDims = calculateInternalDimensions(
                {
                  external_W: box.externalWidth,
                  external_H: box.externalHeight,
                  external_D: box.externalDepth,
                  construction_method: box.constructionMethod,
                },
                box.thicknesses
              );

              const drawerParts = calculateDrawerParts(
                {
                  quantity: drawer.quantity,
                  drawer_height: drawer.drawerHeight,
                  track_clearance_per_side: drawer.trackClearancePerSide,
                  drawer_back_setback: drawer.backSetback,
                  base_inset_from_side: drawer.baseInsetFromSide,
                  base_inset_from_front: drawer.baseInsetFromFront,
                  side_edge_banding: ['length+'],
                },
                { width: internalDims.width, depth: internalDims.depth },
                drawer.thicknesses,
                box.edgeBanding
              );

              // Tag each part with box and drawer info
              for (const part of drawerParts) {
                part.boxId = box.id;
                part.boxName = box.name;
                part.drawerId = drawer.id;
              }

              allParts.push(...drawerParts);
            }
          }

          set({ calculatedParts: allParts, sheetLayouts: [] });
          return allParts;
        },

        /**
         * Run the layout algorithm on the current calculatedParts.
         * Uses the project's cutMode, sheetSize, kerf, and grainConstraint.
         * @param {string} [mode] - 'batch', 'balanced', or 'optimised'. Defaults to project cutMode or 'balanced'.
         * @returns {SheetLayout[]}
         */
        runLayout: (mode) => {
          const project = get().getActiveProject();
          if (!project) return [];

          const parts = get().calculatedParts;
          if (parts.length === 0) {
            // Auto-calculate if no parts yet
            get().calculateAllParts();
            return get().runLayout(mode);
          }

          const useMode = mode || project.cutMode || 'balanced';
          const kerf = project.kerf ?? 3;
          const grainConstraint = project.grainConstraint ?? 'soft';
          const sheet = { width: project.sheetSize.width, length: project.sheetSize.length };

          let layouts = [];

          if (useMode === 'batch') {
            layouts = batchLayout(parts, sheet, kerf);
          } else if (useMode === 'balanced') {
            layouts = balancedLayout(parts, sheet, kerf, grainConstraint);
          } else if (useMode === 'optimised') {
            layouts = optimisedLayout(parts, sheet, kerf, grainConstraint);
          } else {
            layouts = balancedLayout(parts, sheet, kerf, grainConstraint);
          }

          set({ sheetLayouts: layouts });
          return layouts;
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
            // Normalize fields added after older exports were created, so
            // legacy JSON (no `groups` key, boxes with no `groupId`) still
            // passes validation instead of being rejected as malformed.
            if (!Array.isArray(parsed.groups)) {
              parsed.groups = [];
            }
            const errors = validateProject(parsed);
            if (errors.length > 0) {
              return { success: false, errors };
            }
            // Generate a fresh id so we don't collide with localStorage data
            const importId = uid();
            const project = { ...parsed, id: importId, updatedAt: Date.now() };
            // Re-ID nested items to avoid collisions
            const groupRemapIds = new Map();
            project.groups = project.groups.map((g) => {
              const newId = uid();
              groupRemapIds.set(g.id, newId);
              return { ...g, id: newId };
            });
            const remapIds = new Map();
            if (project.boxes) {
              project.boxes = project.boxes.map((box) => {
                const newId = uid();
                remapIds.set(box.id, newId);
                const newGroupId = box.groupId ? (groupRemapIds.get(box.groupId) ?? null) : null;
                return { ...box, id: newId, groupId: newGroupId };
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