// ── Graph node & edge definitions ─────────────────────────────────────────────
// Add new nodes here to grow the graph — they'll appear in 3D space and in the nav automatically.
// pos: [x, y, z] in Three.js world units
// color: hex number (0xRRGGBB)
// r: sphere radius
// kind: "core" | "pil" (pillar) | "leaf"

export const NODES = [
  { id: 'core',       label: 'CORE.SYS',   pos: [0,    0,    0  ], color: 0x7CFFB2, r: 2.8, kind: 'core' },
  { id: 'about',      label: 'ABOUT.ME',   pos: [-18,  6,   -8  ], color: 0xB89CFF, r: 1.8, kind: 'pil'  },
  { id: 'projects',   label: 'PROJECTS',   pos: [20,   4,   -6  ], color: 0x7CFFB2, r: 1.8, kind: 'pil'  },
  { id: 'experience', label: 'EXPERIENCE', pos: [-16, -8,  -12  ], color: 0xB89CFF, r: 1.8, kind: 'pil'  },
  { id: 'skills',     label: 'SKILLS',     pos: [18,  -6,  -10  ], color: 0xFFC76A, r: 1.8, kind: 'pil'  },
  { id: 'contact',    label: 'CONTACT',    pos: [0,  -18,  -14  ], color: 0x7CFFB2, r: 1.5, kind: 'leaf' },
  { id: 'archive',    label: 'ARCHIVE',    pos: [0,   20,  -10  ], color: 0xB89CFF, r: 1.5, kind: 'leaf' },
]

export const EDGES = [
  ['core', 'about'],
  ['core', 'projects'],
  ['core', 'experience'],
  ['core', 'skills'],
  ['core', 'contact'],
  ['core', 'archive'],
  ['about', 'experience'],
  ['projects', 'skills'],
  ['about', 'archive'],
  ['skills', 'contact'],
]

export const NODE_MAP = Object.fromEntries(NODES.map(n => [n.id, n]))

export const NEON_COLORS = {
  core:       '#7CFFB2',
  about:      '#B89CFF',
  projects:   '#7CFFB2',
  experience: '#B89CFF',
  skills:     '#FFC76A',
  contact:    '#7CFFB2',
  archive:    '#B89CFF',
}
