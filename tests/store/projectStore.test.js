import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../../src/store/projectStore.js';
import { defaultProject, defaultBox, defaultDrawerConfig } from '../../src/utils/validate.js';

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], activeProjectId: null });
  });

  describe('createProject', () => {
    it('creates a project and sets it as active', () => {
      const id = useProjectStore.getState().createProject({ name: 'Test Project' });
      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.activeProjectId).toBe(id);
      expect(state.projects[0].name).toBe('Test Project');
    });
  });

  describe('openProject', () => {
    it('switches active project by id', () => {
      const id1 = useProjectStore.getState().createProject({ name: 'First' });
      const id2 = useProjectStore.getState().createProject({ name: 'Second' });
      useProjectStore.getState().openProject(id1);
      expect(useProjectStore.getState().activeProjectId).toBe(id1);
      useProjectStore.getState().openProject(id2);
      expect(useProjectStore.getState().activeProjectId).toBe(id2);
    });

    it('does nothing for non-existent id', () => {
      useProjectStore.getState().createProject({ name: 'Only' });
      useProjectStore.getState().openProject('does-not-exist');
      expect(useProjectStore.getState().activeProjectId).not.toBe('does-not-exist');
    });
  });

  describe('deleteProject', () => {
    it('removes the project from the list', () => {
      const id = useProjectStore.getState().createProject({ name: 'To Delete' });
      useProjectStore.getState().deleteProject(id);
      expect(useProjectStore.getState().projects).toHaveLength(0);
      expect(useProjectStore.getState().activeProjectId).toBeNull();
    });

    it('preserves activeProjectId when deleting a different project', () => {
      const id1 = useProjectStore.getState().createProject({ name: 'Keep' });
      const id2 = useProjectStore.getState().createProject({ name: 'Remove' });
      useProjectStore.getState().openProject(id1);
      useProjectStore.getState().deleteProject(id2);
      expect(useProjectStore.getState().activeProjectId).toBe(id1);
      expect(useProjectStore.getState().projects).toHaveLength(1);
    });
  });

  describe('addBox', () => {
    it('adds a box to the active project', () => {
      const projectId = useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox({ name: 'Shelf' });
      const project = useProjectStore.getState().getActiveProject();
      expect(project.boxes).toHaveLength(1);
      expect(project.boxes[0].id).toBe(boxId);
    });

    it('auto-names new boxes as "Box N"', () => {
      useProjectStore.getState().createProject();
      useProjectStore.getState().addBox();
      useProjectStore.getState().addBox();
      useProjectStore.getState().addBox();
      const project = useProjectStore.getState().getActiveProject();
      expect(project.boxes[0].name).toBe('Box 1');
      expect(project.boxes[1].name).toBe('Box 2');
      expect(project.boxes[2].name).toBe('Box 3');
    });

    it('uses default dimensions from ADR-016', () => {
      useProjectStore.getState().createProject();
      useProjectStore.getState().addBox();
      const box = useProjectStore.getState().getActiveProject().boxes[0];
      expect(box.externalWidth).toBe(600);
      expect(box.externalHeight).toBe(720);
      expect(box.externalDepth).toBe(570);
      expect(box.constructionMethod).toBe('A');
    });
  });

  describe('updateBox', () => {
    it('updates box fields', () => {
      const projectId = useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox();
      useProjectStore.getState().updateBox(boxId, { name: 'Updated Name', quantity: 3 });
      const project = useProjectStore.getState().getActiveProject();
      const box = project.boxes.find((b) => b.id === boxId);
      expect(box.name).toBe('Updated Name');
      expect(box.quantity).toBe(3);
    });

    it('supports function-based updates', () => {
      const projectId = useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox({ name: 'Test' });
      useProjectStore.getState().updateBox(boxId, (state) => {
        const currentBox = state.projects
          .find((p) => p.id === state.activeProjectId)?.boxes
          .find((b) => b.id === boxId);
        return { name: `${currentBox?.name || ''} - Copy` };
      });
      const project = useProjectStore.getState().getActiveProject();
      const box = project.boxes.find((b) => b.id === boxId);
      expect(box.name).toBe('Test - Copy');
    });
  });

  describe('deleteBox', () => {
    it('removes the box and its drawers', () => {
      const projectId = useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox();
      useProjectStore.getState().addDrawer(boxId);
      useProjectStore.getState().deleteBox(boxId);
      const project = useProjectStore.getState().getActiveProject();
      expect(project.boxes).toHaveLength(0);
      expect(project.drawers).toHaveLength(0);
    });
  });

  describe('duplicateBox', () => {
    it('creates a copy with a new id and "(copy)" suffix', () => {
      useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox({ name: 'Original' });
      useProjectStore.getState().duplicateBox(boxId);
      const project = useProjectStore.getState().getActiveProject();
      expect(project.boxes).toHaveLength(2);
      expect(project.boxes[1].name).toBe('Original (copy)');
      expect(project.boxes[1].id).not.toBe(boxId);
    });
  });

  describe('addDrawer', () => {
    it('adds a drawer to a box', () => {
      useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox();
      const drawerId = useProjectStore.getState().addDrawer(boxId);
      const project = useProjectStore.getState().getActiveProject();
      expect(project.drawers).toHaveLength(1);
      expect(project.drawers[0].id).toBe(drawerId);
      expect(project.drawers[0].boxId).toBe(boxId);
    });

    it('uses ADR-016 drawer defaults', () => {
      useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox();
      useProjectStore.getState().addDrawer(boxId);
      const drawer = useProjectStore.getState().getActiveProject().drawers[0];
      expect(drawer.drawerHeight).toBe(150);
      expect(drawer.trackType).toBe('15mm_side');
      expect(drawer.thicknesses.side).toBe(15);
      expect(drawer.thicknesses.frontBack).toBe(18);
      expect(drawer.thicknesses.base).toBe(5);
      expect(drawer.backSetback).toBe(0);
    });
  });

  describe('updateDrawer', () => {
    it('updates drawer fields', () => {
      useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox();
      const drawerId = useProjectStore.getState().addDrawer(boxId);
      useProjectStore.getState().updateDrawer(drawerId, {
        drawerHeight: 200,
        quantity: 2,
      });
      const project = useProjectStore.getState().getActiveProject();
      const drawer = project.drawers.find((d) => d.id === drawerId);
      expect(drawer.drawerHeight).toBe(200);
      expect(drawer.quantity).toBe(2);
    });
  });

  describe('deleteDrawer', () => {
    it('removes a drawer from the project', () => {
      useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox();
      useProjectStore.getState().addDrawer(boxId);
      useProjectStore.getState().addDrawer(boxId);
      const drawerId = useProjectStore.getState().getActiveProject().drawers[0].id;
      useProjectStore.getState().deleteDrawer(drawerId);
      const project = useProjectStore.getState().getActiveProject();
      expect(project.drawers).toHaveLength(1);
      expect(project.drawers[0].id).not.toBe(drawerId);
    });
  });

  describe('updateProject', () => {
    it('updates project fields and timestamp', () => {
      const projectId = useProjectStore.getState().createProject();
      const before = Date.now() - 1000;
      useProjectStore.getState().updateProject({ name: 'Renamed' });
      const project = useProjectStore.getState().getActiveProject();
      expect(project.name).toBe('Renamed');
      expect(project.updatedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('exportProjectJSON', () => {
    it('returns null when no active project', () => {
      useProjectStore.setState({ projects: [], activeProjectId: null });
      const result = useProjectStore.getState().exportProjectJSON();
      expect(result).toBeNull();
    });

    it('returns valid JSON string of the active project', () => {
      useProjectStore.getState().createProject({ name: 'Export Me' });
      const json = useProjectStore.getState().exportProjectJSON();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('Export Me');
      expect(parsed.id).toBeDefined();
      expect(Array.isArray(parsed.boxes)).toBe(true);
      expect(Array.isArray(parsed.drawers)).toBe(true);
    });

    it('includes boxes and drawers in export', () => {
      useProjectStore.getState().createProject({ name: 'Full Export' });
      useProjectStore.getState().addBox({ name: 'Cupboard' });
      const json = useProjectStore.getState().exportProjectJSON();
      const parsed = JSON.parse(json);
      expect(parsed.boxes).toHaveLength(1);
      expect(parsed.boxes[0].name).toBe('Cupboard');
    });
  });

  describe('importProjectJSON', () => {
    it('rejects invalid JSON', () => {
      const result = useProjectStore.getState().importProjectJSON('not json at all');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects JSON failing validation', () => {
      const result = useProjectStore.getState().importProjectJSON('{}');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('imports a valid project and sets it active', () => {
      const project = defaultProject();
      project.name = 'Imported';
      const json = JSON.stringify(project);
      const result = useProjectStore.getState().importProjectJSON(json);
      expect(result.success).toBe(true);
      expect(result.projectId).toBeDefined();
      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.activeProjectId).toBe(result.projectId);
    });

    it('re-IDs imported boxes to avoid collisions', () => {
      const project = defaultProject();
      project.name = 'Re-ID Test';
      const box = defaultBox();
      box.id = 'original-box-id';
      project.boxes = [box];
      const json = JSON.stringify(project);

      const result = useProjectStore.getState().importProjectJSON(json);
      expect(result.success).toBe(true);
      const imported = useProjectStore.getState().getActiveProject();
      expect(imported.boxes[0].id).not.toBe('original-box-id');
    });

    it('re-IDs imported drawers and remaps boxId', () => {
      const project = defaultProject();
      project.name = 'Drawer Re-ID';
      const box = defaultBox();
      box.id = 'orig-box';
      project.boxes = [box];
      project.drawers = [
        {
          id: 'orig-drawer',
          boxId: 'orig-box',
          quantity: 1,
          drawerHeight: 200,
          trackType: '15mm_side',
          trackClearancePerSide: 12,
          thicknesses: { side: 15, frontBack: 18, base: 5 },
          backSetback: 20,
          baseInsetFromSide: 1,
          baseInsetFromFront: 1,
        },
      ];
      const json = JSON.stringify(project);

      const result = useProjectStore.getState().importProjectJSON(json);
      expect(result.success).toBe(true);
      const imported = useProjectStore.getState().getActiveProject();
      expect(imported.drawers[0].id).not.toBe('orig-drawer');
      expect(imported.drawers[0].boxId).toBe(imported.boxes[0].id);
    });

    it('adds to existing projects without replacing', () => {
      useProjectStore.getState().createProject({ name: 'Existing' });
      const project = defaultProject();
      project.name = 'New Import';
      const json = JSON.stringify(project);

      const result = useProjectStore.getState().importProjectJSON(json);
      expect(result.success).toBe(true);
      expect(useProjectStore.getState().projects).toHaveLength(2);
    });
  });

  describe('localStorage persistence', () => {
    it('uses the correct localStorage key', () => {
      // The Zustand persist middleware uses the key 'ply-calc-projects'
      // Verify by creating a project and checking localStorage
      useProjectStore.getState().createProject({ name: 'Persist Test' });
      const stored = localStorage.getItem('ply-calc-projects');
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored);
      expect(parsed.state.projects.length).toBeGreaterThan(0);
    });

    it('survives a store reset simulation', () => {
      useProjectStore.getState().createProject({ name: 'Survive' });
      const stored = localStorage.getItem('ply-calc-projects');
      // Destroy and recreate
      useProjectStore.destroy?.();
      // Re-import to verify the data is serialised correctly
      const parsed = JSON.parse(stored);
      expect(parsed.state.projects[0].name).toBe('Survive');
    });
  });
});

describe('defaultBox', () => {
  it('auto-names based on boxCount', () => {
    expect(defaultBox(0).name).toBe('Box 1');
    expect(defaultBox(2).name).toBe('Box 3');
    expect(defaultBox(9).name).toBe('Box 10');
  });

  it('matches ADR-016 defaults', () => {
    const box = defaultBox(0);
    expect(box.externalWidth).toBe(600);
    expect(box.externalHeight).toBe(720);
    expect(box.externalDepth).toBe(570);
    expect(box.constructionMethod).toBe('A');
    expect(box.quantity).toBe(1);
    expect(box.thicknesses.side).toBe(18);
    expect(box.thicknesses.top).toBe(18);
    expect(box.thicknesses.bottom).toBe(18);
    expect(box.thicknesses.back).toBe(12);
    expect(box.internalShelves).toEqual([]);
  });
});

describe('defaultDrawerConfig', () => {
  it('matches ADR-016 drawer defaults', () => {
    const drawer = defaultDrawerConfig('test-box-id');
    expect(drawer.drawerHeight).toBe(150);
    expect(drawer.trackType).toBe('15mm_side');
    expect(drawer.thicknesses.side).toBe(15);
    expect(drawer.thicknesses.frontBack).toBe(18);
    expect(drawer.thicknesses.base).toBe(5);
    expect(drawer.backSetback).toBe(0);
    expect(drawer.baseInsetFromSide).toBe(1);
    expect(drawer.baseInsetFromFront).toBe(1);
    expect(drawer.boxId).toBe('test-box-id');
  });
});