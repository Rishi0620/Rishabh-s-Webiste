# UserOS 1.0 — Rishabh Bhargav's personal website

A first-person 3D portfolio built with **React + Vite + Three.js**.
Each glowing node in the graph is a section of the portfolio; fly to one and its panel opens.

**Live:** https://rishabh-bhargav-site.vercel.app

---

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the production build
```

---

## Project structure

```
index.html              Entry HTML (title, meta tags, no-JS fallback)
public/favicon.svg
src/
├── main.jsx            React root mount
├── App.jsx             Wires the scene, input and UI together
├── index.css           Global CSS variables + reset
│
├── data/
│   ├── content.js      Everything the site says — edit this to update the portfolio
│   └── graph.js        Node positions, edges, colours
│
├── hooks/
│   ├── useScene.js     Three.js scene, animation loop, flights between nodes
│   ├── useCamera.js    Keyboard, mouse look, pointer lock, touch
│   └── useCssVarHeight.js
│
└── components/
    ├── HUD.jsx          Top bar: status, clock, section nav
    ├── Panel.jsx        Content panel for each node
    ├── Console.jsx      Terminal: boot sequence + commands
    └── LockOverlay.jsx  Splash screen, crosshair, controls hint, fly bar
```

---

## Updating content

All copy lives in `src/data/content.js`:

| Export | Shown in |
|---|---|
| `PROFILE` | Core and About panels, console `whoami` |
| `PROJECTS` | Projects panel, console `projects` / `open` |
| `EXPERIENCE` | Experience panel |
| `SKILLS` | Skills panel |
| `CONTACT`, `AVAILABILITY` | Contact panel |
| `ARCHIVE` | Archive panel |

To add a project, append an object to `PROJECTS`. Give it `links: { live, repo }` and the card shows the links.

## Adding a node

Add it to `src/data/graph.js`:

```js
// NODES
{ id: 'blog', label: 'BLOG', pos: [30, 10, -20], color: 0x7CFFB2, r: 1.5, kind: 'leaf' }
// EDGES
['core', 'blog']
// NEON_COLORS
blog: '#7CFFB2'
```

The node appears in the scene, the top nav and the console automatically. Then add its content
component to `CONTENT_MAP` and `PANEL_META` in `Panel.jsx`.

---

## Controls

| Input | Action |
|---|---|
| **ENTER SYSTEM** / click | Enter the 3D space; the cursor is captured |
| **Mouse move** | Look around, a full 360° like a PC game |
| **W A S D** / arrows | Fly forward / left / back / right |
| **Q / E** | Fly down / up |
| **Click a node** | Fly to it and open its panel |
| **Click empty space** | Fly forward |
| **✕ CLOSE** on a panel | Back to free look |
| **ESC** | Release the cursor and leave the 3D space |
| **/** | Focus the console |
| Touch: **drag** / **tap** | Look around / fly to a node |

While a panel is open the cursor is visible and the view holds still; close the panel to look around again.
The top nav works without entering the 3D space, and the site falls back to panels only when WebGL is unavailable.

## Console commands

```
help              list all commands
whoami            operator identity
ls                list nodes
goto <node>       fly to a node
projects          list projects
open <project>    open a project's live site or repo
contact           print contact channels
sudo hire         elevated hire request
sudo oc           toggle overclocked mode (colour shift)
clear             clear the buffer
↑ / ↓  history    Tab  autocomplete    Esc  leave the console
```

---

## Deployment

Hosted on Vercel (project `rishabh-bhargav-site`). From the repo root:

```bash
npx vercel@latest deploy --prod
```

## Design tokens

```css
--bg:   #030509   /* background */
--sig:  #7CFFB2   /* signal green — primary accent */
--vio:  #B89CFF   /* violet — secondary */
--amb:  #FFC76A   /* amber */
--red:  #FF6A6A   /* errors */
--txt:  #f0faf4   /* body text */
--bar:  #dcefe5   /* top and bottom bar text */
--mut:  #b8d4c4   /* muted text */
--dim:  #8aaa98   /* dim text */
```
