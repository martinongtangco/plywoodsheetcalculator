/**
 * edgeNames.js — UI ↔ Engine edge name mapping
 *
 * ADR-024: Explicit mapping between user-facing semantic edge names and
 * coordinate-based engine edge names.
 *
 * UI names:     'front', 'back', 'left', 'right' (semantic, user-facing)
 * Engine names: 'length+', 'length-', 'width+', 'width-' (coordinate-based)
 *
 * The mapping depends on the part type because "front" means different
 * things for a side panel versus a top panel.
 *
 * No UI dependencies. No side effects.
 */

// UI → Engine mapping tables, keyed by part type.
// Each entry maps a UI edge name to the corresponding engine edge name.
const UI_TO_ENGINE_MAP = {
  /**
   * Side panel: runs vertically along the full height (Method A) or
   * between top/bottom (Method B). Width axis = depth of box.
   *   front  → width+  (front edge of side = positive width/depth axis)
   *   back   → width-  (back edge of side = negative width/depth axis)
   */
  side: {
    front: 'width+',
    back: 'width-',
  },

  /**
   * Top panel: length axis = width of box, width axis = depth of box.
   *   left   → length-  (left edge of top = negative length axis)
   *   right  → length+  (right edge of top = positive length axis)
   *   back   → width-   (back edge of top = negative width/depth axis)
   */
  top: {
    left: 'length-',
    right: 'length+',
    back: 'width-',
  },

  /**
   * Bottom panel: same orientation as top.
   *   left   → length-  (left edge = negative length axis)
   *   right  → length+  (right edge = positive length axis)
   */
  bottom: {
    left: 'length-',
    right: 'length+',
  },

  /**
   * Shelf: same orientation as top/bottom.
   *   left   → length-
   *   right  → length+
   */
  shelf: {
    left: 'length-',
    right: 'length+',
  },
};

// Engine → UI mapping: the inverse of the table above.
// Built programmatically to ensure consistency.
const ENGINE_TO_UI_MAP = {};
for (const [partType, mappings] of Object.entries(UI_TO_ENGINE_MAP)) {
  ENGINE_TO_UI_MAP[partType] = {};
  for (const [uiEdge, engineEdge] of Object.entries(mappings)) {
    ENGINE_TO_UI_MAP[partType][engineEdge] = uiEdge;
  }
}

/**
 * Map UI edge names to engine edge names for a given part type.
 *
 * @param {string} partType - One of: 'side' | 'top' | 'bottom' | 'shelf'
 * @param {string} uiEdge   - One of: 'front' | 'back' | 'left' | 'right'
 * @returns {string|null} Engine edge name, or null if no mapping exists
 */
export function uiEdgeToEngineEdge(partType, uiEdge) {
  const map = UI_TO_ENGINE_MAP[partType];
  if (!map) return null;
  return map[uiEdge] ?? null;
}

/**
 * Map engine edge names back to UI edge names (for display in cut list).
 *
 * @param {string} partType   - One of: 'side' | 'top' | 'bottom' | 'shelf'
 * @param {string} engineEdge - One of: 'length+' | 'length-' | 'width+' | 'width-'
 * @returns {string|null} UI edge name, or null if no mapping exists
 */
export function engineEdgeToUiEdge(partType, engineEdge) {
  const map = ENGINE_TO_UI_MAP[partType];
  if (!map) return null;
  return map[engineEdge] ?? null;
}

/**
 * Convert an entire UI edge-banding edges object to engine format.
 *
 * Input shape (from box.edgeBanding.edges):
 *   { side: ['front', 'back'], top: ['left', 'right', 'back'], bottom: [] }
 *
 * Output shape (for calculateCarcassParts edgeBandingEdges):
 *   { side: ['width+', 'width-'], top: ['length-', 'length+', 'width-'], bottom: [] }
 *
 * @param {object} uiEdges - Per-type edge banding config using UI names
 * @returns {object} Per-type edge banding config using engine names
 */
export function convertEdgeBandingToEngine(uiEdges) {
  if (!uiEdges || typeof uiEdges !== 'object') return {};

  const result = {};
  for (const [partType, edges] of Object.entries(uiEdges)) {
    if (!Array.isArray(edges)) {
      result[partType] = [];
      continue;
    }
    result[partType] = edges
      .map((uiEdge) => uiEdgeToEngineEdge(partType, uiEdge))
      .filter((engineEdge) => engineEdge !== null);
  }
  return result;
}

/**
 * Convert an engine edge-banding edges object back to UI format.
 *
 * @param {object} engineEdges - Per-type edge banding config using engine names
 * @returns {object} Per-type edge banding config using UI names
 */
export function convertEdgeBandingToUi(engineEdges) {
  if (!engineEdges || typeof engineEdges !== 'object') return {};

  const result = {};
  for (const [partType, edges] of Object.entries(engineEdges)) {
    if (!Array.isArray(edges)) {
      result[partType] = [];
      continue;
    }
    result[partType] = edges
      .map((engineEdge) => engineEdgeToUiEdge(partType, engineEdge))
      .filter((uiEdge) => uiEdge !== null);
  }
  return result;
}

/**
 * Get the list of valid UI edge names for a given part type.
 *
 * @param {string} partType - One of: 'side' | 'top' | 'bottom' | 'shelf'
 * @returns {string[]} Array of valid UI edge names
 */
export function getValidUiEdgesForPart(partType) {
  const map = UI_TO_ENGINE_MAP[partType];
  if (!map) return [];
  return Object.keys(map);
}

/**
 * Get the list of valid engine edge names.
 * @returns {string[]} Always ['length+', 'length-', 'width+', 'width-']
 */
export function getValidEngineEdges() {
  return ['length+', 'length-', 'width+', 'width-'];
}