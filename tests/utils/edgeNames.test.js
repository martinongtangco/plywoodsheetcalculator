/**
 * tests/utils/edgeNames.test.js
 *
 * ADR-024: Tests for UI ↔ Engine edge name mapping.
 */

import { describe, it, expect } from 'vitest';
import {
  uiEdgeToEngineEdge,
  engineEdgeToUiEdge,
  convertEdgeBandingToEngine,
  convertEdgeBandingToUi,
  getValidUiEdgesForPart,
  getValidEngineEdges,
} from '../../src/utils/edgeNames.js';

describe('edgeNames — uiEdgeToEngineEdge', () => {
  // Side panel mappings
  it('maps side front → width+', () => {
    expect(uiEdgeToEngineEdge('side', 'front')).toBe('width+');
  });

  it('maps side back → width-', () => {
    expect(uiEdgeToEngineEdge('side', 'back')).toBe('width-');
  });

  it('returns null for invalid side edge', () => {
    expect(uiEdgeToEngineEdge('side', 'left')).toBeNull();
    expect(uiEdgeToEngineEdge('side', 'right')).toBeNull();
  });

  // Top panel mappings
  it('maps top left → length-', () => {
    expect(uiEdgeToEngineEdge('top', 'left')).toBe('length-');
  });

  it('maps top right → length+', () => {
    expect(uiEdgeToEngineEdge('top', 'right')).toBe('length+');
  });

  it('maps top back → width-', () => {
    expect(uiEdgeToEngineEdge('top', 'back')).toBe('width-');
  });

  it('returns null for invalid top edge', () => {
    expect(uiEdgeToEngineEdge('top', 'front')).toBeNull();
  });

  // Bottom panel mappings
  it('maps bottom left → length-', () => {
    expect(uiEdgeToEngineEdge('bottom', 'left')).toBe('length-');
  });

  it('maps bottom right → length+', () => {
    expect(uiEdgeToEngineEdge('bottom', 'right')).toBe('length+');
  });

  // Shelf mappings
  it('maps shelf left → length-', () => {
    expect(uiEdgeToEngineEdge('shelf', 'left')).toBe('length-');
  });

  it('maps shelf right → length+', () => {
    expect(uiEdgeToEngineEdge('shelf', 'right')).toBe('length+');
  });

  // Unknown part type
  it('returns null for unknown part type', () => {
    expect(uiEdgeToEngineEdge('back', 'front')).toBeNull();
    expect(uiEdgeToEngineEdge('unknown', 'left')).toBeNull();
  });
});

describe('edgeNames — engineEdgeToUiEdge', () => {
  // Side panel reverse mappings
  it('maps side width+ → front', () => {
    expect(engineEdgeToUiEdge('side', 'width+')).toBe('front');
  });

  it('maps side width- → back', () => {
    expect(engineEdgeToUiEdge('side', 'width-')).toBe('back');
  });

  // Top panel reverse mappings
  it('maps top length- → left', () => {
    expect(engineEdgeToUiEdge('top', 'length-')).toBe('left');
  });

  it('maps top length+ → right', () => {
    expect(engineEdgeToUiEdge('top', 'length+')).toBe('right');
  });

  it('maps top width- → back', () => {
    expect(engineEdgeToUiEdge('top', 'width-')).toBe('back');
  });

  // Bottom panel reverse mappings
  it('maps bottom length- → left', () => {
    expect(engineEdgeToUiEdge('bottom', 'length-')).toBe('left');
  });

  it('maps bottom length+ → right', () => {
    expect(engineEdgeToUiEdge('bottom', 'length+')).toBe('right');
  });

  // Unknown part type
  it('returns null for unknown part type', () => {
    expect(engineEdgeToUiEdge('unknown', 'length+')).toBeNull();
  });

  // Unknown engine edge
  it('returns null for unknown engine edge', () => {
    expect(engineEdgeToUiEdge('side', 'length+')).toBeNull();
  });
});

describe('edgeNames — round-trip consistency', () => {
  const partTypes = ['side', 'top', 'bottom', 'shelf'];

  for (const partType of partTypes) {
    it(`round-trips for ${partType}: ui → engine → ui`, () => {
      const uiEdges = getValidUiEdgesForPart(partType);
      for (const uiEdge of uiEdges) {
        const engineEdge = uiEdgeToEngineEdge(partType, uiEdge);
        expect(engineEdge).not.toBeNull();
        const roundTrip = engineEdgeToUiEdge(partType, engineEdge);
        expect(roundTrip).toBe(uiEdge);
      }
    });

    it(`round-trips for ${partType}: engine → ui → engine`, () => {
      const uiEdges = getValidUiEdgesForPart(partType);
      const engineEdges = new Set(uiEdges.map(e => uiEdgeToEngineEdge(partType, e)));
      for (const engineEdge of engineEdges) {
        const uiEdge = engineEdgeToUiEdge(partType, engineEdge);
        expect(uiEdge).not.toBeNull();
        const roundTrip = uiEdgeToEngineEdge(partType, uiEdge);
        expect(roundTrip).toBe(engineEdge);
      }
    });
  }
});

describe('edgeNames — convertEdgeBandingToEngine', () => {
  it('converts a full UI edges object to engine format', () => {
    const input = {
      side: ['front', 'back'],
      top: ['left', 'right', 'back'],
      bottom: ['left'],
      shelf: [],
    };

    const result = convertEdgeBandingToEngine(input);

    expect(result).toEqual({
      side: ['width+', 'width-'],
      top: ['length-', 'length+', 'width-'],
      bottom: ['length-'],
      shelf: [],
    });
  });

  it('handles null input', () => {
    expect(convertEdgeBandingToEngine(null)).toEqual({});
    expect(convertEdgeBandingToEngine(undefined)).toEqual({});
  });

  it('filters out unmapped edges silently', () => {
    const input = {
      side: ['front', 'unknown_edge'],
    };

    const result = convertEdgeBandingToEngine(input);

    expect(result).toEqual({
      side: ['width+'],
    });
  });

  it('handles empty edges object', () => {
    expect(convertEdgeBandingToEngine({})).toEqual({});
  });
});

describe('edgeNames — convertEdgeBandingToUi', () => {
  it('converts a full engine edges object to UI format', () => {
    const input = {
      side: ['width+', 'width-'],
      top: ['length-', 'length+', 'width-'],
      bottom: ['length-'],
    };

    const result = convertEdgeBandingToUi(input);

    expect(result).toEqual({
      side: ['front', 'back'],
      top: ['left', 'right', 'back'],
      bottom: ['left'],
    });
  });

  it('handles null input', () => {
    expect(convertEdgeBandingToUi(null)).toEqual({});
    expect(convertEdgeBandingToUi(undefined)).toEqual({});
  });

  it('filters out unmapped edges silently', () => {
    const input = {
      side: ['width+', 'unknown_edge'],
    };

    const result = convertEdgeBandingToUi(input);

    expect(result).toEqual({
      side: ['front'],
    });
  });
});

describe('edgeNames — full round-trip (convertEdgeBandingToEngine then convertEdgeBandingToUi)', () => {
  it('preserves all edges through a full round-trip', () => {
    const original = {
      side: ['front', 'back'],
      top: ['left', 'right', 'back'],
      bottom: ['left'],
      shelf: ['right'],
    };

    const engineFormat = convertEdgeBandingToEngine(original);
    const backToUi = convertEdgeBandingToUi(engineFormat);

    expect(backToUi).toEqual(original);
  });
});

describe('edgeNames — getValidUiEdgesForPart', () => {
  it('returns correct edges for side', () => {
    const edges = getValidUiEdgesForPart('side');
    expect(edges).toContain('front');
    expect(edges).toContain('back');
    expect(edges.length).toBe(2);
  });

  it('returns correct edges for top', () => {
    const edges = getValidUiEdgesForPart('top');
    expect(edges).toContain('left');
    expect(edges).toContain('right');
    expect(edges).toContain('back');
    expect(edges.length).toBe(3);
  });

  it('returns correct edges for bottom', () => {
    const edges = getValidUiEdgesForPart('bottom');
    expect(edges).toContain('left');
    expect(edges).toContain('right');
    expect(edges.length).toBe(2);
  });

  it('returns empty array for unknown part type', () => {
    expect(getValidUiEdgesForPart('unknown')).toEqual([]);
  });
});

describe('edgeNames — getValidEngineEdges', () => {
  it('returns the four standard engine edge names', () => {
    expect(getValidEngineEdges()).toEqual([
      'length+', 'length-', 'width+', 'width-',
    ]);
  });
});