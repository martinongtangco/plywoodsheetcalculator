import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadFile, readFileAsText } from '../../src/utils/fileIO.js';

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