# UserOS 1.0 — Rishabh Mehta's Personal Website

A first-person 3D space explorer built with **React + Vite + Three.js**.  
Navigate a node graph of glowing spheres in deep space — each node is a section of the portfolio.

---

## Quick Start

```bash
# 1. Copy the src/ folder to your project root
# 2. Install deps
npm install

# 3. Dev server
npm run dev

# 4. Production build
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── index.html          # Entry HTML
├── main.jsx            # React root mount
├── App.jsx             # Root component — wires all hooks + UI
├── index.css           # Global CSS vars + reset
│
├── data/
│   ├── graph.js        # Node positions, edges, colors — ADD NEW NODES HERE
│   └── content.js      # All portfolio content (projects, experience, skills, etc.)
│
├── hooks/
│   ├── useScene.js     # Three.js scene: spheres, edges, stars, orbit rings, animation loop
│   └── useCamera.js    # Input handling: WASD, mouse look, pointer lock, keyboard shortcuts
│
└── components/
    ├── HUD.jsx / .module.css           # Top bar: clock, position, nav, chips
    ├── Panel.jsx / .module.css         # Sliding content panel (all node content)
    ├── Console.jsx / .module.css       # Terminal: boot sequence, commands
    └── LockOverlay.jsx / .module.css   # Splash screen, crosshair, controls hint, fly bar
```

---

## Adding a New Node (Growing the Graph)

The graph grows automatically — just add to `src/data/graph.js`:

```js
// In NODES array:
{ id: 'blog', label: 'BLOG', pos: [30, 10, -20], color: 0x7CFFB2, r: 1.5, kind: 'leaf' }

// In EDGES array:
['core', 'blog']

// In NEON_COLORS:
blog: '#7CFFB2'
```

Then add the panel content in `src/data/content.js` and a new `BlogContent` component in `Panel.jsx`.  
That's it — the node appears in 3D space with its orbit ring, label, edges, and glow automatically.

---

## Controls

| Input | Action |
|---|---|
| **ENTER SYSTEM** button | Enter the 3D space |
| **Mouse move** | Look around (no click needed) |
| **W / A / S / D** | Fly forward / left / right / back |
| **Q / E** | Fly down / up |
| **Click node** | Fly to it + open content panel |
| **Click empty space** | Fly forward to that point |
| **Double-click canvas** | Request full pointer lock (immersive mode) |
| **ESC** | Exit the space |
| **/** | Focus terminal |

---

## Console Commands

```
help              list all commands
whoami            operator identity
goto <node>       fly to node (core / about / projects / experience / skills / contact / archive)
contact           print contact channels
ls                list nodes
sudo hire         send elevated hire request (P0)
sudo oc           toggle overclocked mode (amber color shift)
clear             clear console buffer
↑ / ↓             recall command history
Tab               autocomplete
```

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 + Vite 5 |
| 3D engine | Three.js r163 |
| Fonts | JetBrains Mono + Space Grotesk |
| Styling | CSS Modules |
| Build | Vite (ESM, tree-shaken) |

No analytics. No dark patterns. Just signals.

---

## Design Tokens (CSS vars)

```css
--sig:  #7CFFB2   /* Signal green — primary accent */
--vio:  #B89CFF   /* Bitcrush violet — secondary */
--amb:  #FFC76A   /* Amber — warnings, skills */
--red:  #FF6A6A   /* Error red */
--txt:  #d8ece0   /* Body text */
--mut:  #607068   /* Muted text */
--dim:  #38433c   /* Dim text */
--line: rgba(255,255,255,0.07)  /* Borders */
```

---

## Deployment

Works on any static host (Vercel, Netlify, GitHub Pages):

```bash
npm run build
# dist/ folder is the output — deploy that
```

For Vercel: just `vercel` in the project root. Zero config needed.
