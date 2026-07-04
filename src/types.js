/**
 * types.js — JSDoc type definitions for the ADR-014 data model.
 *
 * These typedefs provide the canonical type contracts for all layers
 * (engine, store, UI, serialization). Import this file at the top
 * of any module that needs the type annotations for IDE support.
 *
 * @module types
 */

/**
 * A sheet size preset reference.
 * @typedef {Object} SheetSize
 * @property {number} width - Sheet width in mm (shorter edge)
 * @property {number} length - Sheet length in mm (longer edge)
 * @property {string} [id] - Preset identifier (e.g. "standard_18mm")
 */

/**
 * Per-part-type edge banding configuration for a Box.
 * Each key maps to an array of edge descriptors.
 * Edge descriptors: 'front' | 'back' | 'left' | 'right'
 * @typedef {Object} EdgeBandingEdges
 * @property {string[]} [side] - Edges to band on side panels
 * @property {string[]} [top] - Edges to band on top panel
 * @property {string[]} [bottom] - Edges to band on bottom panel
 */

/**
 * Edge banding configuration for a Box.
 * @typedef {Object} EdgeBanding
 * @property {number|null} thickness - Edge banding thickness in mm, or null if none
 * @property {EdgeBandingEdges} [edges] - Per-part-type edge banding config
 */

/**
 * Material thickness overrides for a Box.
 * @typedef {Object} BoxThicknesses
 * @property {number} side - Side panel thickness in mm
 * @property {number} top - Top panel thickness in mm
 * @property {number} bottom - Bottom panel thickness in mm
 * @property {number} back - Back panel thickness in mm
 */

/**
 * An internal shelf within a Box.
 * @typedef {Object} InternalShelf
 * @property {string} id - Unique identifier
 * @property {number} [heightFromBottom] - Position from box bottom in mm (ADR-014 schema)
 * @property {number} [positionFromTop] - Alternative position from box top in mm
 * @property {number} [quantity] - Number of identical shelves (default 1)
 * @property {number} [thickness] - Shelf material thickness in mm (defaults to Box top thickness)
 */

/**
 * A Box represents a single cabinet/carcass design.
 * Multiple identical physical units are expressed via `quantity`.
 *
 * @typedef {Object} Box
 * @property {string} id - UUID v4
 * @property {string} [name] - Human-readable label (e.g. "Base Cabinet Left")
 * @property {number} quantity - Number of identical boxes (default 1)
 * @property {number} externalWidth - External width in mm
 * @property {number} externalHeight - External height in mm
 * @property {number} externalDepth - External depth in mm
 * @property {'A'|'B'} constructionMethod - Carcass construction method
 * @property {BoxThicknesses} thicknesses - Per-part material thicknesses
 * @property {EdgeBanding} [edgeBanding] - Edge banding config (optional)
 * @property {InternalShelf[]} [internalShelves] - Additional shelves (optional)
 */

/**
 * Material thickness overrides for a Drawer.
 * @typedef {Object} DrawerThicknesses
 * @property {number} side - Drawer side panel thickness in mm (default 15)
 * @property {number} frontBack - Drawer front/back frame thickness in mm
 * @property {number} base - Drawer base panel thickness in mm
 */

/**
 * A DrawerConfiguration defines one drawer type within a Box.
 *
 * @typedef {Object} DrawerConfig
 * @property {string} id - UUID v4
 * @property {string} boxId - Reference to the parent Box id
 * @property {number} quantity - Number of identical drawers (default 1)
 * @property {number} drawerHeight - External drawer height in mm
 * @property {string} trackType - Slide type reference (e.g. "15mm_side")
 * @property {number} trackClearancePerSide - Clearance per side for slides in mm
 * @property {DrawerThicknesses} thicknesses - Drawer material thicknesses
 * @property {number} [backSetback] - Distance from cabinet back in mm (default 20)
 * @property {number} [baseInsetFromSide] - Base panel inset from each side in mm
 * @property {number} [baseInsetFromFront] - Base panel inset from front in mm
 */

/**
 * The root Project object. Persisted to localStorage, exported/imported as JSON.
 *
 * @typedef {Object} Project
 * @property {string} id - UUID v4
 * @property {string} name - User-provided project name
 * @property {number} createdAt - Unix timestamp
 * @property {number} updatedAt - Unix timestamp
 * @property {SheetSize} sheetSize - Sheet dimensions and preset reference
 * @property {number} kerf - Blade kerf width in mm
 * @property {'hard'|'soft'} grainConstraint - Grain alignment constraint
 * @property {Box[]} boxes - Carcass designs
 * @property {DrawerConfig[]} drawers - Drawer configurations
 */

/**
 * A Part is produced by the engine from a Box and DrawerConfig.
 * Parts are NOT persisted — they are calculated on demand.
 *
 * @typedef {Object} Part
 * @property {string} id - Unique identifier within the calculation run
 * @property {'side'|'top'|'bottom'|'back'|'shelf'|'drawer_side'|'drawer_front_back'|'drawer_base'} type - Part category
 * @property {string} label - Human-readable label
 * @property {number} cutLength - Length to set on the saw fence in mm
 * @property {number} cutWidth - Width to cut in mm
 * @property {number} quantity - Number of identical pieces
 * @property {number} materialThickness - Required material thickness in mm
 * @property {string[]} [edgeBandingEdges] - Edges requiring banding after cutting
 * @property {string} [boxId] - Parent Box id (added by store)
 * @property {string} [boxName] - Parent Box name (added by store)
 * @property {string} [drawerId] - Parent DrawerConfig id (added by store for drawer parts)
 */

/**
 * A sheet layout result from the layout engine.
 *
 * @typedef {Object} SheetLayout
 * @property {string} id - Layout identifier
 * @property {PartPlacement[]} placements - Parts placed on this sheet
 * @property {number} utilisation - Sheet utilisation percentage (0-100)
 */

/**
 * A single part placement on a sheet.
 *
 * @typedef {Object} PartPlacement
 * @property {string} partId - Reference to the source Part
 * @property {number} x - X offset from sheet origin in mm
 * @property {number} y - Y offset from sheet origin in mm
 * @property {boolean} rotated - Whether the part was rotated 90°
 */