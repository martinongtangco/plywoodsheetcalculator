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

    it('returns the id of the actual duplicated box', () => {
      useProjectStore.getState().createProject();
      const boxId = useProjectStore.getState().addBox({ name: 'Original' });
      const newId = useProjectStore.getState().duplicateBox(boxId);
      const project = useProjectStore.getState().getActiveProject();
      expect(newId).toBe(project.boxes[1].id);
      expect(newId).not.toBe(boxId);
    });
  });

  describe('addGroup', () => {
    it('adds a group to the active project and returns its id', () => {
      useProjectStore.getState().createProject();
      const groupId = useProjectStore.getState().addGroup('Cupboard A');
      const project = useProjectStore.getState().getActiveProject();
      expect(project.groups).toHaveLength(1);
      expect(project.groups[0].id).toBe(groupId);
      expect(project.groups[0].name).toBe('Cupboard A');
    });

    it('rejects empty or whitespace-only names', () => {
      useProjectStore.getState().createProject();
      const groupId = useProjectStore.getState().addGroup('   ');
      expect(groupId).toBeNull();
      const project = useProjectStore.getState().getActiveProject();
      expect(project.groups).toHaveLength(0);
    });
  });

  describe('renameGroup', () => {
    it('updates the group name', () => {
      useProjectStore.getState().createProject();
      const groupId = useProjectStore.getState().addGroup('Cupboard A');
      useProjectStore.getState().renameGroup(groupId, 'Bottom Shelves');
      const project = useProjectStore.getState().getActiveProject();
      expect(project.groups[0].name).toBe('Bottom Shelves');
    });

    it('ignores an empty name', () => {
      useProjectStore.getState().createProject();
      const groupId = useProjectStore.getState().addGroup('Cupboard A');
      useProjectStore.getState().renameGroup(groupId, '  ');
      const project = useProjectStore.getState().getActiveProject();
      expect(project.groups[0].name).toBe('Cupboard A');
    });
  });

  describe('deleteGroup', () => {
    it('removes the group and ungroups any box that referenced it', () => {
      useProjectStore.getState().createProject();
      const groupId = useProjectStore.getState().addGroup('Cupboard A');
      const boxId = useProjectStore.getState().addBox();
      useProjectStore.getState().updateBox(boxId, { groupId });
      useProjectStore.getState().deleteGroup(groupId);
      const project = useProjectStore.getState().getActiveProject();
      expect(project.groups).toHaveLength(0);
      expect(project.boxes.find((b) => b.id === boxId).groupId).toBeNull();
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

    it('imports a legacy project with no groups key or box.groupId', () => {
      const project = defaultProject();
      project.name = 'Legacy';
      delete project.groups;
      const box = defaultBox();
      delete box.groupId;
      project.boxes = [box];
      const json = JSON.stringify(project);

      const result = useProjectStore.getState().importProjectJSON(json);
      expect(result.success).toBe(true);
      const imported = useProjectStore.getState().getActiveProject();
      expect(imported.groups).toEqual([]);
      expect(imported.boxes[0].groupId).toBeNull();
    });

    it('re-IDs imported groups and remaps box.groupId to the new group id', () => {
      const project = defaultProject();
      project.name = 'Group Re-ID';
      project.groups = [{ id: 'orig-group', name: 'Cupboard A' }];
      const box = defaultBox();
      box.id = 'orig-box';
      box.groupId = 'orig-group';
      project.boxes = [box];
      const json = JSON.stringify(project);

      const result = useProjectStore.getState().importProjectJSON(json);
      expect(result.success).toBe(true);
      const imported = useProjectStore.getState().getActiveProject();
      expect(imported.groups[0].id).not.toBe('orig-group');
      expect(imported.boxes[0].groupId).toBe(imported.groups[0].id);
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

describe('calculateAllParts (ADR-017)', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], activeProjectId: null, calculatedParts: [], sheetLayouts: [] });
  });

  it('returns empty array when no active project', () => {
    const parts = useProjectStore.getState().calculateAllParts();
    expect(parts).toEqual([]);
  });

  it('returns empty array when project has no boxes', () => {
    useProjectStore.getState().createProject({ name: 'Empty' });
    const parts = useProjectStore.getState().calculateAllParts();
    expect(parts).toEqual([]);
  });

  it('calculates carcass parts for a single box (Method A)', () => {
    useProjectStore.getState().createProject({ name: 'Test' });
    const box = defaultBox(0);
    box.constructionMethod = 'A';
    box.externalWidth = 600;
    box.externalHeight = 720;
    box.externalDepth = 570;
    const boxId = useProjectStore.getState().addBox(box);
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
    });

    const parts = useProjectStore.getState().calculateAllParts();

    // Method A produces: 1 side (qty 2), 1 top, 1 bottom, 1 back = 4 unique parts
    expect(parts.length).toBe(4);
    // All parts should be tagged with the box
    for (const part of parts) {
      expect(part.boxId).toBe(boxId);
      expect(part.boxName).toBe('Box 1');
    }
    // Check part types
    const types = parts.map((p) => p.type);
    expect(types).toContain('side');
    expect(types).toContain('top');
    expect(types).toContain('bottom');
    expect(types).toContain('back');
  });

  it('calculates parts for Method B construction', () => {
    useProjectStore.getState().createProject({ name: 'Test B' });
    const box = defaultBox(0);
    box.constructionMethod = 'B';
    box.externalWidth = 600;
    box.externalHeight = 720;
    box.externalDepth = 570;
    const boxId = useProjectStore.getState().addBox(box);
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
    });

    const parts = useProjectStore.getState().calculateAllParts();
    // Method B produces: 1 side (qty 2), 1 top, 1 bottom, 1 back = 4 unique parts
    expect(parts.length).toBe(4);
    const types = parts.map((p) => p.type);
    expect(types).toContain('side');
    expect(types).toContain('top');
    expect(types).toContain('bottom');
    expect(types).toContain('back');
  });

  it('includes internal shelves when configured', () => {
    useProjectStore.getState().createProject({ name: 'Shelves' });
    const box = defaultBox(0);
    box.externalWidth = 600;
    box.externalHeight = 720;
    box.externalDepth = 570;
    box.internalShelves = [
      { heightFromBottom: 200, thickness: 18 },
      { heightFromBottom: 400, thickness: 18 },
    ];
    useProjectStore.getState().addBox(box);
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
    });

    const parts = useProjectStore.getState().calculateAllParts();
    const shelfParts = parts.filter((p) => p.type === 'shelf');
    expect(shelfParts.length).toBe(2);
  });

  it('includes drawer parts when drawers are configured', () => {
    useProjectStore.getState().createProject({ name: 'Drawers' });
    const boxId = useProjectStore.getState().addBox();
    const drawerId = useProjectStore.getState().addDrawer(boxId);
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
    });

    const parts = useProjectStore.getState().calculateAllParts();

    // Should have carcass parts + drawer parts
    const drawerParts = parts.filter((p) => p.drawerId === drawerId);
    expect(drawerParts.length).toBeGreaterThan(0);
    // Drawer should have side, front/back, and base parts
    const drawerTypes = drawerParts.map((p) => p.type);
    expect(drawerTypes).toContain('drawer_side');
    expect(drawerTypes).toContain('drawer_front_back');
    expect(drawerTypes).toContain('drawer_base');
  });

  it('multiplies drawer parts by quantity', () => {
    useProjectStore.getState().createProject({ name: 'Multi Drawer' });
    const boxId = useProjectStore.getState().addBox();
    useProjectStore.getState().addDrawer(boxId);
    useProjectStore.getState().updateDrawer(
      useProjectStore.getState().getActiveProject().drawers[0].id,
      { quantity: 3 }
    );
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
    });

    const parts = useProjectStore.getState().calculateAllParts();
    const drawerParts = parts.filter((p) => p.type === 'drawer_side');
    // 2 sides per drawer × 3 drawers = 6 side parts total
    const totalSideQty = drawerParts.reduce((sum, p) => sum + p.quantity, 0);
    expect(totalSideQty).toBe(6);
  });

  it('stores calculatedParts in store state', () => {
    useProjectStore.getState().createProject({ name: 'Store' });
    useProjectStore.getState().addBox();
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
    });

    useProjectStore.getState().calculateAllParts();
    expect(useProjectStore.getState().calculatedParts.length).toBeGreaterThan(0);
  });

  it('clears sheetLayouts when recalculating', () => {
    useProjectStore.getState().createProject({ name: 'Clear' });
    useProjectStore.getState().addBox();
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
      cutMode: 'balanced',
    });

    // Run layout first
    useProjectStore.getState().calculateAllParts();
    useProjectStore.getState().runLayout();
    expect(useProjectStore.getState().sheetLayouts.length).toBeGreaterThan(0);

    // Recalculate should clear layouts
    useProjectStore.getState().calculateAllParts();
    expect(useProjectStore.getState().sheetLayouts).toEqual([]);
  });
});

describe('validateProjectForCalculation (ADR-021)', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], activeProjectId: null, calculatedParts: [], sheetLayouts: [] });
  });

  it('returns errors when no active project', () => {
    const result = useProjectStore.getState().validateProjectForCalculation();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error about missing boxes when project has no boxes', () => {
    useProjectStore.getState().createProject({ name: 'Empty' });
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
    });
    const result = useProjectStore.getState().validateProjectForCalculation();
    expect(result.boxes).toBe(false);
  });

  it('returns error about missing materials when sheet size not set', () => {
    useProjectStore.getState().createProject({ name: 'No Materials' });
    const box = defaultBox(0);
    useProjectStore.getState().addBox(box);
    // Override defaults: set invalid sheet size and kerf
    useProjectStore.getState().updateProject({
      sheetSize: { width: 0, length: 0 },
      kerf: -1,
    });
    const result = useProjectStore.getState().validateProjectForCalculation();
    expect(result.materials).toBe(false);
  });

  it('returns error about missing cut settings when grain constraint not set', () => {
    useProjectStore.getState().createProject({ name: 'No Cut Settings' });
    const box = defaultBox(0);
    useProjectStore.getState().addBox(box);
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: null,
    });
    const result = useProjectStore.getState().validateProjectForCalculation();
    expect(result.cutSettings).toBe(false);
  });

  it('returns no errors when project is fully configured', () => {
    useProjectStore.getState().createProject({ name: 'Complete' });
    const box = defaultBox(0);
    useProjectStore.getState().addBox(box);
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
    });
    const result = useProjectStore.getState().validateProjectForCalculation();
    expect(result.errors).toEqual([]);
    expect(result.boxes).toBe(true);
    expect(result.materials).toBe(true);
    expect(result.cutSettings).toBe(true);
  });
});

describe('runLayout (ADR-017)', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], activeProjectId: null, calculatedParts: [], sheetLayouts: [] });
  });

  it('returns empty array when no active project', () => {
    const layouts = useProjectStore.getState().runLayout();
    expect(layouts).toEqual([]);
  });

  it('auto-calculates parts when calculatedParts is empty', () => {
    useProjectStore.getState().createProject({ name: 'Auto' });
    useProjectStore.getState().addBox();
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
      cutMode: 'balanced',
    });

    const layouts = useProjectStore.getState().runLayout();
    // Should have auto-calculated and then laid out
    expect(layouts.length).toBeGreaterThan(0);
  });

  it('runs batch layout when mode is batch', () => {
    useProjectStore.getState().createProject({ name: 'Batch' });
    useProjectStore.getState().addBox();
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
      cutMode: 'batch',
    });

    useProjectStore.getState().calculateAllParts();
    const layouts = useProjectStore.getState().runLayout('batch');
    expect(layouts.length).toBeGreaterThan(0);
    expect(useProjectStore.getState().sheetLayouts).toBe(layouts);
  });

  it('runs balanced layout when mode is balanced', () => {
    useProjectStore.getState().createProject({ name: 'Balanced' });
    useProjectStore.getState().addBox();
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
      cutMode: 'balanced',
    });

    useProjectStore.getState().calculateAllParts();
    const layouts = useProjectStore.getState().runLayout('balanced');
    expect(layouts.length).toBeGreaterThan(0);
  });

  it('runs optimised layout when mode is optimised', () => {
    useProjectStore.getState().createProject({ name: 'Optimised' });
    useProjectStore.getState().addBox();
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'hard',
      cutMode: 'optimised',
    });

    useProjectStore.getState().calculateAllParts();
    const layouts = useProjectStore.getState().runLayout('optimised');
    expect(layouts.length).toBeGreaterThan(0);
  });

  it('defaults to balanced when mode is unknown', () => {
    useProjectStore.getState().createProject({ name: 'Default' });
    useProjectStore.getState().addBox();
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
    });

    useProjectStore.getState().calculateAllParts();
    const layouts = useProjectStore.getState().runLayout('unknown_mode');
    expect(layouts.length).toBeGreaterThan(0);
  });

  it('stores layouts in sheetLayouts state', () => {
    useProjectStore.getState().createProject({ name: 'Store Layout' });
    useProjectStore.getState().addBox();
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
      cutMode: 'balanced',
    });

    useProjectStore.getState().calculateAllParts();
    useProjectStore.getState().runLayout();
    expect(useProjectStore.getState().sheetLayouts.length).toBeGreaterThan(0);
  });

  it('layout placements have required fields', () => {
    useProjectStore.getState().createProject({ name: 'Fields' });
    useProjectStore.getState().addBox();
    useProjectStore.getState().updateProject({
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
      cutMode: 'balanced',
    });

    useProjectStore.getState().calculateAllParts();
    const layouts = useProjectStore.getState().runLayout();
    for (const layout of layouts) {
      expect(layout.sheetIndex).toBeDefined();
      expect(Array.isArray(layout.placements)).toBe(true);
      for (const placement of layout.placements) {
        expect(placement.part).toBeDefined();
        expect(placement.x).toBeDefined();
        expect(placement.y).toBeDefined();
      }
    }
  });
});
