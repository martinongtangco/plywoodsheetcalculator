import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * projectStore — owns all project data.
 * Persisted to localStorage via zustand/middleware persist.
 *
 * Shape:
 *   projects: Project[]
 *   activeProjectId: string | null
 *
 * See docs/spec/V1_FEATURE_SPEC.md section 4 for the full data model.
 */
export const useProjectStore = create(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      // TODO: implement actions
      // createProject, openProject, updateProject, deleteProject,
      // addBox, updateBox, deleteBox, duplicateBox,
      // addMaterial, updateMaterial, deleteMaterial,
      // updateCutSettings,
      // exportProjectJSON, importProjectJSON
    }),
    {
      name: 'ply-calc-projects',
    }
  )
);