/** clearance_per_side in mm per side. */
export const TRACK_TYPES = [
  { id: '15mm_side',         label: '15mm side-mount (standard)',     clearance_per_side: 12.7, note: 'Requires 15mm drawer side' },
  { id: 'undermount',        label: 'Undermount (Blum, Grass, etc.)', clearance_per_side: 0,    note: 'Attaches to base; set base_position separately' },
  { id: 'side-standard',     label: 'Side-mount standard',            clearance_per_side: 12.7, note: null },
  { id: 'side-soft-close',   label: 'Side-mount soft close',          clearance_per_side: 12.7, note: null },
  { id: 'centre-mount',      label: 'Centre mount',                   clearance_per_side: 0,    note: 'Single central runner' },
  { id: 'wooden-runners',    label: 'Wooden runners (shop-made)',      clearance_per_side: null, note: 'Enter clearance manually' },
  { id: 'custom',            label: 'Custom',                         clearance_per_side: null, note: null },
];
