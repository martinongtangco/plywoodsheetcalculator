import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  serializeProject,
  deserializeProject,
  downloadFile,
  readFileAsText,
} from '../../src/utils/fileIO.js';
import { defaultProject, defaultBox, defaultDrawerConfig } from '../../src/utils/validate.js';

describe('downloadFile', () => {
  let createElementSpy;
  let appendChildSpy;
  let removeChildSpy;
  let createObjectURLSpy;
  let revokeObjectURLSpy;
  let blobArgs;

  beforeEach(() => {
    blobArgs = null;
    // Mock Blob as a class
    vi.stubGlobal('Blob', vi.fn(function (args, options) {
      blobArgs = { args, options };
      return { size: 4, type: options?.type ?? '' };
    }));

    // Mock URL methods
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Mock DOM
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: vi.fn(),
    });
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob with correct MIME type', () => {
    downloadFile('{"test": true}', 'test.json');
    expect(blobArgs.options.type).toBe('application/json');
    expect(blobArgs.args).toEqual(['{"test": true}']);
  });

  it('sets the download filename', () => {
    downloadFile('{"test": true}', 'my_project.json');
    const link = document.createElement('a');
    expect(link.download).toBe('my_project.json');
  });

  it('uses custom MIME type when provided', () => {
    downloadFile('hello', 'test.txt', 'text/plain');
    expect(blobArgs.options.type).toBe('text/plain');
  });

  it('calls click on the anchor element', () => {
    const clickFn = vi.fn();
    createElementSpy.mockReturnValueOnce({
      href: '',
      download: '',
      click: clickFn,
    });
    downloadFile('{}', 'data.json');
    expect(clickFn).toHaveBeenCalled();
  });

  it('revokes the object URL after download', () => {
    downloadFile('{}', 'data.json');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url');
  });
});

// --- serialize / deserialize (ADR-014) ---

describe('serializeProject', () => {
  it('returns a pretty-printed JSON string', () => {
    const project = defaultProject();
    const json = serializeProject(project);
    expect(typeof json).toBe('string');
    // Pretty-printed JSON contains newlines
    expect(json).toContain('\n');
  });

  it('serialises a project with boxes and drawers', () => {
    const project = defaultProject();
    project.name = 'Kitchen Cabinets';
    project.boxes = [defaultBox()];
    project.drawers = [defaultDrawerConfig(project.boxes[0].id)];
    const json = serializeProject(project);

    // Verify round-trip through JSON.parse
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('Kitchen Cabinets');
    expect(parsed.boxes.length).toBe(1);
    expect(parsed.drawers.length).toBe(1);
    expect(parsed.drawers[0].boxId).toBe(parsed.boxes[0].id);
  });
});

describe('deserializeProject', () => {
  it('throws on empty string', () => {
    expect(() => deserializeProject('')).toThrow(TypeError);
  });

  it('throws on null input', () => {
    expect(() => deserializeProject(null)).toThrow(TypeError);
  });

  it('throws on non-string input', () => {
    expect(() => deserializeProject(42)).toThrow(TypeError);
  });

  it('throws on malformed JSON', () => {
    expect(() => deserializeProject('{invalid}')).toThrow(TypeError);
  });

  it('throws when JSON is not an object', () => {
    expect(() => deserializeProject('"just a string"')).toThrow(TypeError);
  });

  it('returns a valid project object', () => {
    const project = defaultProject();
    const json = serializeProject(project);
    const restored = deserializeProject(json);

    expect(restored.id).toBe(project.id);
    expect(restored.name).toBe(project.name);
    expect(restored.kerf).toBe(project.kerf);
    expect(restored.grainConstraint).toBe(project.grainConstraint);
  });
});

describe('JSON round-trip (ADR-014)', () => {
  it('empty project survives round-trip', () => {
    const original = defaultProject();
    const json = serializeProject(original);
    const restored = deserializeProject(json);

    expect(restored).toEqual(original);
  });

  it('project with complex data survives round-trip', () => {
    const original = defaultProject();
    original.name = 'V2 Prototype';
    original.kerf = 4;
    original.grainConstraint = 'hard';
    original.sheetSize = { width: 625, length: 1562, id: 'baltic_19mm' };

    const box1 = defaultBox();
    box1.name = 'Cupboard A';
    box1.externalWidth = 800;
    box1.externalHeight = 900;
    box1.quantity = 2;
    box1.constructionMethod = 'B';
    box1.internalShelves = [{ positionFromTop: 200, thickness: 18 }];
    original.boxes = [box1];

    const drawer1 = defaultDrawerConfig(box1.id);
    drawer1.quantity = 3;
    drawer1.drawerHeight = 180;
    original.drawers = [drawer1];

    const json = serializeProject(original);
    const restored = deserializeProject(json);

    expect(restored.name).toBe('V2 Prototype');
    expect(restored.kerf).toBe(4);
    expect(restored.grainConstraint).toBe('hard');
    expect(restored.sheetSize.width).toBe(625);
    expect(restored.boxes[0].name).toBe('Cupboard A');
    expect(restored.boxes[0].quantity).toBe(2);
    expect(restored.boxes[0].constructionMethod).toBe('B');
    expect(restored.boxes[0].internalShelves[0].positionFromTop).toBe(200);
    expect(restored.drawers[0].quantity).toBe(3);
    expect(restored.drawers[0].drawerHeight).toBe(180);
    expect(restored.drawers[0].boxId).toBe(restored.boxes[0].id);

    // Deep equality
    expect(restored).toEqual(original);
  });

  it('restored project can be re-serialised', () => {
    const original = defaultProject();
    original.boxes = [defaultBox()];

    const json1 = serializeProject(original);
    const restored = deserializeProject(json1);
    const json2 = serializeProject(restored);

    expect(json2).toBe(json1);
  });
});

describe('readFileAsText', () => {
  it('resolves with file content on success', async () => {
    const mockFile = { name: 'test.json', size: 13 };
    const mockResult = '{"key":"value"}';

    // Mock FileReader
    const originalFileReader = global.FileReader;
    global.FileReader = class {
      onload = null;
      onerror = null;
      readAsText() {
        // Simulate async read
        setTimeout(() => {
          this.result = mockResult;
          this.onload?.({ target: this });
        }, 0);
      };
    };

    const result = await readFileAsText(mockFile);
    expect(result).toBe(mockResult);

    global.FileReader = originalFileReader;
  });

  it('rejects on error', async () => {
    const mockFile = { name: 'bad.json' };
    const mockError = new DOMException('File read error');

    const originalFileReader = global.FileReader;
    global.FileReader = class {
      onload = null;
      onerror = null;
      readAsText() {
        setTimeout(() => {
          this.error = mockError;
          this.onerror?.(mockError);
        }, 0);
      };
    };

    await expect(readFileAsText(mockFile)).rejects.toThrow('File read error');

    global.FileReader = originalFileReader;
  });
});