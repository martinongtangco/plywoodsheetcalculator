/**
 * balanced.test.js — Smoke tests for src/engine/balanced.js
 *
 * Per ADR-009: every public function in the engine has at least
 * one happy-path test and one edge-case test.
 *
 * balancedLayout is currently a stub that throws "not yet implemented".
 * These tests verify the stub behaviour and will be expanded when
 * the implementation is completed.
 */
import { describe, it, expect } from 'vitest';
import { balancedLayout } from '../../src/engine/balanced.js';

describe('balancedLayout', () => {
  it('throws "not yet implemented" error', () => {
    expect(() => {
      balancedLayout([], { width: 1220, length: 2440 }, 3, 'hard');
    }).toThrow('balancedLayout not yet implemented');
  });

  it('throws with parts provided', () => {
    const parts = [
      {
        id: 'p1',
        type: 'side',
        label: 'Side',
        cutLength: 600,
        cutWidth: 400,
        quantity: 1,
        materialThickness: 18,
        edgeBandingEdges: [],
      },
    ];
    expect(() => {
      balancedLayout(parts, { width: 1220, length: 2440 }, 3, 'hard');
    }).toThrow('balancedLayout not yet implemented');
  });

  it('throws with soft grain constraint', () => {
    expect(() => {
      balancedLayout([], { width: 1220, length: 2440 }, 3, 'soft');
    }).toThrow('balancedLayout not yet implemented');
  });
});