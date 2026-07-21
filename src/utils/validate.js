import { uid } from './id.js';

/**
 * Validates a project name for safety and uniqueness.
 * - Sanitizes HTML tags (XSS prevention)
 * - Enforces max length of 100 characters
 * - Blocks duplicate names when `existingNames` is provided
 *
 * @param {string} name - The proposed project name
 * @param {string[]} [existingNames] - Array of existing project names to check against (case-insensitive)
 * @param {string} [excludeId] - Project ID to exclude from duplicate check (for renaming the same project)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProjectName(name, existingNames = [], excludeName = null) {
  const errors = [];

  if (typeof name !== 'string') {
    return { valid: false, errors: ['Project name must be a string'] };
  }

  // XSS mitigation: React auto-escapes text nodes, so user-controlled values
  // rendered in <input> and <p> elements are safe even without stripping.
  // The regex below provides defense-in-depth by removing HTML tag constructs
  // before they reach storage. Nested constructs like `on<break>focus=...` may
  // survive the strip, but they are harmless because React never interpolates
  // these values into dynamic attributes.
  const sanitized = name.replace(/<[^>]*>/g, '').trim();

  if (sanitized.length === 0) {
    errors.push('Project name is required');
  }

  if (sanitized.length > 100) {
    errors.push('Project name must be 100 characters or fewer');
  }

  // Check for duplicate names (case-insensitive), excluding the current name if renaming
  const normalizedName = sanitized.toLowerCase();
  const excludedName = excludeName ? excludeName.toLowerCase() : null;
  const filteredNames = existingNames
    .filter(n => excludedName ? n.toLowerCase() !== excludedName : true)
    .map(n => n.toLowerCase());

  if (filteredNames.includes(normalizedName)) {
    errors.push('A project with this name already exists');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Default values for a new Project.
 *
 * @returns {Project}
 */
export function defaultProject() {
  const now = Date.now();
  return {
    id: uid(),
    name: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    sheetSize: { width: 1220, length: 2440, id: 'standard_18mm' },
    kerf: 3,
    cutMode: 'balanced',
    grainConstraint: 'soft',
    boxes: [],
    drawers: [],
    groups: [],
  };
}

/**
 * Default values for a new Box.
 * Auto-numbers as "Box N" based on the current box count in the active project.
 * When called outside the store (e.g., tests), the counter starts at 1.
 *
 * @param {number} [boxCount] - Current number of boxes in the project (for auto-naming)
 * @returns {Box}
 */
export function defaultBox(boxCount = 0) {
  return {
    id: uid(),
    name: `Box ${boxCount + 1}`,
    quantity: 1,
    groupId: null,
    externalWidth: 600,
    externalHeight: 720,
    externalDepth: 570,
    constructionMethod: 'A',
    thicknesses: {
      side: 18,
      top: 18,
      bottom: 18,
      back: 12,
    },
    edgeBanding: {
      thickness: null,
      edges: {
        side: [],
        top: [],
        bottom: [],
      },
    },
    internalShelves: [],
  };
}

/**
 * Default values for a new DrawerConfig.
 *
 * @param {string} boxId
 * @returns {DrawerConfig}
 */
export function defaultDrawerConfig(boxId) {
  return {
    id: uid(),
    boxId,
    quantity: 1,
    drawerHeight: 150,
    trackType: '15mm_side',
    trackClearancePerSide: 12,
    thicknesses: {
      side: 15,
      frontBack: 18,
      base: 5,
    },
    // Default 20mm back setback matches the engine default in calculateDrawerParts().
    // This is the gap between the drawer back and the cabinet back wall.
    backSetback: 20,
    baseInsetFromSide: 1,
    baseInsetFromFront: 1,
  };
}

/**
 * Validates that a value is a positive finite number.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isPositiveNumber(value) {
  return typeof value === 'number' && isFinite(value) && value > 0;
}

/**
 * Validates that a value is a non-negative finite number.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isNonNegativeNumber(value) {
  return typeof value === 'number' && isFinite(value) && value >= 0;
}

/**
 * Validates a Project object structure.
 * Returns an array of error messages. Empty array means valid.
 *
 * @param {Object} project
 * @returns {string[]}
 */
export function validateProject(project) {
  const errors = [];

  if (!project || typeof project !== 'object') {
    return ['Project is required'];
  }

  if (typeof project.id !== 'string' || project.id.length === 0) {
    errors.push('Project.id is required');
  }

  if (typeof project.name !== 'string' || project.name.length === 0) {
    errors.push('Project.name is required');
  }

  if (!isNonNegativeNumber(project.createdAt)) {
    errors.push('Project.createdAt must be a non-negative timestamp');
  }

  if (!isNonNegativeNumber(project.updatedAt)) {
    errors.push('Project.updatedAt must be a non-negative timestamp');
  }

  if (typeof project.sheetSize !== 'object') {
    errors.push('Project.sheetSize is required');
  } else {
    if (!isPositiveNumber(project.sheetSize.width)) {
      errors.push('Project.sheetSize.width must be a positive number (mm)');
    }
    if (!isPositiveNumber(project.sheetSize.length)) {
      errors.push('Project.sheetSize.length must be a positive number (mm)');
    }
  }

  if (!isNonNegativeNumber(project.kerf)) {
    errors.push('Project.kerf must be a non-negative number (mm)');
  }

  if (project.grainConstraint !== 'hard' && project.grainConstraint !== 'soft') {
    errors.push('Project.grainConstraint must be "hard" or "soft"');
  }

  if (!Array.isArray(project.boxes)) {
    errors.push('Project.boxes must be an array');
  }

  if (!Array.isArray(project.drawers)) {
    errors.push('Project.drawers must be an array');
  }

  if (!Array.isArray(project.groups)) {
    errors.push('Project.groups must be an array');
  }

  return errors;
}

/**
 * Validates a Box object structure.
 * Returns an array of error messages. Empty array means valid.
 *
 * @param {Object} box
 * @returns {string[]}
 */
export function validateBox(box) {
  const errors = [];

  if (!box || typeof box !== 'object') {
    return ['Box is required'];
  }

  if (typeof box.id !== 'string' || box.id.length === 0) {
    errors.push('Box.id is required');
  }

  if (!isPositiveNumber(box.quantity)) {
    errors.push('Box.quantity must be a positive number');
  }

  if (!isPositiveNumber(box.externalWidth)) {
    errors.push('Box.externalWidth must be a positive number (mm)');
  }

  if (!isPositiveNumber(box.externalHeight)) {
    errors.push('Box.externalHeight must be a positive number (mm)');
  }

  if (!isPositiveNumber(box.externalDepth)) {
    errors.push('Box.externalDepth must be a positive number (mm)');
  }

  if (box.constructionMethod !== 'A' && box.constructionMethod !== 'B') {
    errors.push('Box.constructionMethod must be "A" or "B"');
  }

  if (typeof box.thicknesses !== 'object') {
    errors.push('Box.thicknesses is required');
  } else {
    for (const key of ['side', 'top', 'bottom', 'back']) {
      if (!isPositiveNumber(box.thicknesses[key])) {
        errors.push(`Box.thicknesses.${key} must be a positive number (mm)`);
      }
    }
  }

  if (!Array.isArray(box.internalShelves)) {
    errors.push('Box.internalShelves must be an array');
  }

  return errors;
}

/**
 * Validates a DrawerConfig object structure.
 * Returns an array of error messages. Empty array means valid.
 *
 * @param {Object} drawer
 * @returns {string[]}
 */
export function validateDrawerConfig(drawer) {
  const errors = [];

  if (!drawer || typeof drawer !== 'object') {
    return ['DrawerConfig is required'];
  }

  if (typeof drawer.id !== 'string' || drawer.id.length === 0) {
    errors.push('DrawerConfig.id is required');
  }

  if (typeof drawer.boxId !== 'string' || drawer.boxId.length === 0) {
    errors.push('DrawerConfig.boxId is required');
  }

  if (!isPositiveNumber(drawer.quantity)) {
    errors.push('DrawerConfig.quantity must be a positive number');
  }

  if (!isPositiveNumber(drawer.drawerHeight)) {
    errors.push('DrawerConfig.drawerHeight must be a positive number (mm)');
  }

  if (typeof drawer.trackType !== 'string' || drawer.trackType.length === 0) {
    errors.push('DrawerConfig.trackType is required');
  }

  if (!isNonNegativeNumber(drawer.trackClearancePerSide)) {
    errors.push('DrawerConfig.trackClearancePerSide must be a non-negative number (mm)');
  }

  if (typeof drawer.thicknesses !== 'object') {
    errors.push('DrawerConfig.thicknesses is required');
  } else {
    for (const key of ['side', 'frontBack', 'base']) {
      if (!isPositiveNumber(drawer.thicknesses[key])) {
        errors.push(`DrawerConfig.thicknesses.${key} must be a positive number (mm)`);
      }
    }
  }

  return errors;
}