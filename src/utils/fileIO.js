/**
 * fileIO — serialization, deserialization, and browser file I/O.
 * Used by the export/import feature (ADR-006).
 * Per ADR-014: serialize/deserialize are pure functions (no DOM dependency).
 */

/**
 * Serialises a Project object to a JSON string.
 *
 * @param {Project} project
 * @returns {string}
 */
export function serializeProject(project) {
  return JSON.stringify(project, null, 2);
}

/**
 * Deserialises a JSON string back into a Project object.
 * Throws a TypeError if the JSON is malformed or the project
 * structure is invalid.
 *
 * @param {string} json
 * @returns {Project}
 * @throws {TypeError}
 */
export function deserializeProject(json) {
  if (typeof json !== 'string' || json.trim() === '') {
    throw new TypeError('Input must be a non-empty JSON string');
  }

  let project;
  try {
    project = JSON.parse(json);
  } catch (err) {
    throw new TypeError('Invalid JSON: ' + err.message);
  }

  if (!project || typeof project !== 'object') {
    throw new TypeError('Deserialised project is not a valid object');
  }

  return project;
}

/**
 * Downloads a string as a file with the given filename and MIME type.
 *
 * @param {string} content - The file content
 * @param {string} filename - The desired filename (e.g. "my-project.json")
 * @param {string} mimeType - The MIME type (default: "application/json")
 */
export function downloadFile(content, filename, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads a file selected by the user via a file input element.
 * Returns a Promise that resolves with the file text content.
 *
 * @param {File} file - The File object from an <input type="file">
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Creates a file input element, triggers a click, and returns a Promise
 * that resolves with the selected File or null if cancelled.
 *
 * @param {string} accept - MIME type filter (default: ".json")
 * @returns {Promise<File | null>}
 */
export function promptFileSelect(accept = '.json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files && input.files[0];
      resolve(file ?? null);
    };
    // Handle cancel — the onchange still fires but files is empty
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}