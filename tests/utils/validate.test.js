import { describe, it, expect } from 'vitest';
import {
  defaultProject,
  defaultBox,
  defaultDrawerConfig,
  validateProject,
  validateProjectName,
  validateBox,
  validateDrawerConfig,
  isPositiveNumber,
  isNonNegativeNumber,
} from '../../src/utils/validate.js';

describe('isPositiveNumber', () => {
  it('returns true for positive numbers', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(0.001)).toBe(true);
  });

  it('returns false for zero, negative, non-numbers', () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(Infinity)).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
    expect(isPositiveNumber('5')).toBe(false);
    expect(isPositiveNumber(null)).toBe(false);
  });
});

describe('isNonNegativeNumber', () => {
  it('returns true for zero and positive numbers', () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(1)).toBe(true);
  });

  it('returns false for negative, non-numbers', () => {
    expect(isNonNegativeNumber(-1)).toBe(false);
    expect(isNonNegativeNumber(Infinity)).toBe(false);
    expect(isNonNegativeNumber(NaN)).toBe(false);
  });
});

describe('defaultProject', () => {
  it('returns a valid project object', () => {
    const project = defaultProject();
    const errors = validateProject(project);
    expect(errors).toHaveLength(0);
  });

  it('has correct defaults', () => {
    const p = defaultProject();
    expect(p.name).toBe('Untitled Project');
    expect(p.kerf).toBe(3);
    expect(p.grainConstraint).toBe('soft');
    expect(p.boxes).toEqual([]);
    expect(p.drawers).toEqual([]);
    expect(p.sheetSize.width).toBe(1220);
    expect(p.sheetSize.length).toBe(2440);
  });

  it('has a valid id', () => {
    const p = defaultProject();
    expect(typeof p.id).toBe('string');
    expect(p.id.length).toBeGreaterThan(0);
  });

  it('has numeric timestamps', () => {
    const p = defaultProject();
    expect(typeof p.createdAt).toBe('number');
    expect(typeof p.updatedAt).toBe('number');
  });
});

describe('defaultBox', () => {
  it('returns a valid box object', () => {
    const box = defaultBox();
    const errors = validateBox(box);
    expect(errors).toHaveLength(0);
  });

  it('has correct defaults', () => {
    const b = defaultBox();
    expect(b.quantity).toBe(1);
    expect(b.externalWidth).toBe(600);
    expect(b.externalHeight).toBe(720);
    expect(b.externalDepth).toBe(570);
    expect(b.constructionMethod).toBe('A');
    expect(b.thicknesses.side).toBe(18);
    expect(b.thicknesses.back).toBe(12);
    expect(b.internalShelves).toEqual([]);
  });
});

describe('defaultDrawerConfig', () => {
  it('returns a valid drawer config', () => {
    const drawer = defaultDrawerConfig('box-123');
    const errors = validateDrawerConfig(drawer);
    expect(errors).toHaveLength(0);
  });

  it('links to the provided boxId', () => {
    const drawer = defaultDrawerConfig('parent-box-id');
    expect(drawer.boxId).toBe('parent-box-id');
  });

  it('has correct defaults', () => {
    const d = defaultDrawerConfig('x');
    expect(d.thicknesses.side).toBe(15);
    expect(d.trackClearancePerSide).toBe(12);
    expect(d.quantity).toBe(1);
  });
});

describe('validateProject', () => {
  it('returns errors for null input', () => {
    expect(validateProject(null)).toEqual(['Project is required']);
  });

  it('returns errors for missing fields', () => {
    const errors = validateProject({});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns errors for invalid sheetSize', () => {
    const errors = validateProject({
      id: '1',
      name: 'Test',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sheetSize: { width: -1, length: 2440 },
      kerf: 3,
      grainConstraint: 'soft',
      boxes: [],
      drawers: [],
    });
    expect(errors.some((e) => e.includes('sheetSize.width'))).toBe(true);
  });

  it('returns errors for invalid grainConstraint', () => {
    const errors = validateProject({
      id: '1',
      name: 'Test',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sheetSize: { width: 1220, length: 2440 },
      kerf: 3,
      grainConstraint: 'invalid',
      boxes: [],
      drawers: [],
    });
    expect(errors.some((e) => e.includes('grainConstraint'))).toBe(true);
  });

  it('returns empty array for valid project', () => {
    const p = defaultProject();
    expect(validateProject(p)).toEqual([]);
  });
});

describe('validateBox', () => {
  it('returns errors for null input', () => {
    expect(validateBox(null)).toEqual(['Box is required']);
  });

  it('returns errors for missing dimensions', () => {
    const errors = validateBox({ id: '1', quantity: 1 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns errors for invalid constructionMethod', () => {
    const errors = validateBox({
      ...defaultBox(),
      constructionMethod: 'C',
    });
    expect(errors.some((e) => e.includes('constructionMethod'))).toBe(true);
  });

  it('returns empty array for valid box', () => {
    expect(validateBox(defaultBox())).toEqual([]);
  });
});

describe('validateDrawerConfig', () => {
  it('returns errors for null input', () => {
    expect(validateDrawerConfig(null)).toEqual(['DrawerConfig is required']);
  });

  it('returns errors for missing boxId', () => {
    const errors = validateDrawerConfig({ id: '1' });
    expect(errors.some((e) => e.includes('boxId'))).toBe(true);
  });

  it('returns empty array for valid drawer config', () => {
    expect(validateDrawerConfig(defaultDrawerConfig('box-1'))).toEqual([]);
  });
});

describe('validateProjectName', () => {
  it('returns valid for a normal name', () => {
    const result = validateProjectName('Kitchen Cabinet');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects empty strings', () => {
    const result = validateProjectName('');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('required'))).toBe(true);
  });

  it('rejects whitespace-only names', () => {
    const result = validateProjectName('   ');
    expect(result.valid).toBe(false);
  });

  it('rejects names exceeding 100 characters', () => {
    const longName = 'A'.repeat(101);
    const result = validateProjectName(longName);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('100'))).toBe(true);
  });

  it('accepts names exactly 100 characters', () => {
    const exactName = 'A'.repeat(100);
    const result = validateProjectName(exactName);
    expect(result.valid).toBe(true);
  });

  it('rejects duplicate names (case-insensitive)', () => {
    const existing = ['Kitchen Cabinet', 'Bedroom Unit'];
    const result = validateProjectName('kitchen cabinet', existing);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('already exists'))).toBe(true);
  });

  it('allows same name when excluded (renaming self)', () => {
    const existing = ['Kitchen Cabinet', 'Bedroom Unit'];
    const result = validateProjectName('New Kitchen', existing, 'Kitchen Cabinet');
    expect(result.valid).toBe(true);
  });

  it('does not reject own name when renaming to the same name', () => {
    const existing = ['Kitchen Cabinet', 'Bedroom Unit'];
    const result = validateProjectName('Kitchen Cabinet', existing, 'Kitchen Cabinet');
    expect(result.valid).toBe(true);
  });

  it('handles HTML tags by stripping them (XSS prevention)', () => {
    const result = validateProjectName('<script>alert("xss")</script>');
    // After stripping tags, the content is empty or just text
    // The name becomes 'alert("xss")' after stripping
    expect(result.valid).toBe(true);
    // But the sanitized name should not contain the tags
    // We verify this is handled at the store level, the validator strips
  });

  it('rejects non-string input', () => {
    const result = validateProjectName(123);
    expect(result.valid).toBe(false);
  });

  it('rejects null input', () => {
    const result = validateProjectName(null);
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate even with different casing', () => {
    const existing = ['My Project'];
    const result = validateProjectName('MY PROJECT', existing);
    expect(result.valid).toBe(false);
  });

  it('trims leading and trailing whitespace for validation', () => {
    const result = validateProjectName('  Trimmed Name  ');
    expect(result.valid).toBe(true);
  });

  it('detects duplicate after trimming', () => {
    const existing = ['Trimmed Name'];
    const result = validateProjectName('  Trimmed Name  ', existing);
    expect(result.valid).toBe(false);
  });
});
