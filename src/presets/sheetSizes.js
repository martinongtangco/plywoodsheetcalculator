/** All dimensions in mm. width = shorter edge, length = longer edge. */
export const SHEET_SIZES = [
  { id: 'ph-standard',  label: 'Standard (PH / Asia)',  width: 1220, length: 2440 },
  { id: 'eu-standard',  label: 'European Standard',     width: 1250, length: 2500 },
  { id: 'large-format', label: 'Large Format',          width: 1525, length: 3050 },
  { id: 'half-sheet',   label: 'Half Sheet',            width: 610,  length: 1220 },
  { id: 'custom',       label: 'Custom',                width: null, length: null },
];