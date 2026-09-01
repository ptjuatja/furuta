# VectorDyn — Global Design Document

**Design thesis**: "The engineering notebook, alive." The user's own concept sketch is handwritten on grid paper — so the entire site is built on that artifact: warm paper, a faint engineering grid, ink-blue machinery, red-ink handwritten annotations, and vectors drawn with crisp drafting arrows. The interface should feel like a beautifully kept dynamics notebook in which the drawings have started to move.

---

## 1. Visual Direction

- **Mood**: precise, warm, inviting, scholarly-but-playful. Drafting table meets modern web app.
- **Aesthetic anchors**: grid paper · technical ink drawings · red-pencil margin notes · KaTeX math typeset like a textbook · hairline rules · numbered figures ("Fig. 1 — Compound pendulum").
- **Hard rules**:
  - Light theme only. Warm paper background, never pure white (`#FFFFFF`) for large surfaces.
  - No blue–purple gradients, no glassmorphism, no neon. Depth comes from hairlines, paper layering, and small hard shadows (offset 2–3px, like cut paper).
  - All physics vector colors are **fixed by vector type** (see §3.3) and used consistently across canvas, equations, legends, and marketing pages — this is a pedagogical requirement, not decoration.

---

## 2. Color Palette

### 2.1 Surfaces & ink
| Token | Hex | Use |
|---|---|---|
| `paper` | `#F8F5EF` | Page background |
| `paper-deep` | `#F0EBE0` | Alternating sections, panel wells |
| `paper-card` | `#FDFBF6` | Cards, dialogs, raised surfaces |
| `grid-minor` | `#E4E0D5` | Engineering grid, minor lines |
| `grid-major` | `#CFC8B8` | Engineering grid, major lines (every 5th) |
| `ink` | `#22303C` | Primary text, strokes |
| `ink-soft` | `#5A6B78` | Secondary text |
| `ink-faint` | `#93A1AC` | Captions, disabled |
| `hairline` | `#D8D2C4` | Borders, rules |

### 2.2 Brand & action
| Token | Hex | Use |
|---|---|---|
| `engine-blue` | `#33475B` | Bodies/rods/masses on canvas, primary buttons, links-on-hover |
| `engine-blue-deep` | `#26374A` | Hover states |
| `signal-red` | `#C2452D` | Primary CTA accent, red-ink annotations, critical highlights |
| `signal-red-soft` | `#F3E2DC` | Red annotation underline/highlight wash |

### 2.3 Vector type colors (FIXED — semantic, never reuse for decoration)
| Vector type | Hex | CSS token |
|---|---|---|
| Fixed basis {E₁,E₂} | `#64748B` (slate) | `vec-basis-fixed` |
| Body basis {e₁,e₂} | `#8A6D3B` (warm brown) | `vec-basis-body` |
| Position r | `#8C97A3` (thin gray) | `vec-position` |
| Velocity v | `#2F9E6E` (green) | `vec-velocity` |
| Acceleration a | `#C94F4F` (red) | `vec-accel` |
| Applied force f(t) | `#E08A3C` (orange) | `vec-force` |
| Spring force | `#2E8C8C` (teal) | `vec-spring` |
| Gravity mg | `#7A8894` (gray) | `vec-gravity` |
| Constraint / reaction | `#8A6FAE` (purple) | `vec-constraint` |
| Angular velocity ω (curved arrows) | `#2F9E6E` with curved-arrow style | `vec-omega` |
| Highlight / correspondence glow | `#E9B949` (amber halo) | `vec-highlight` |

### 2.4 Feedback
- Success/energy-OK: `#2F9E6E` · Warning drift: `#E08A3C` · Error: `#C94F4F`.
- Selection (canvas & panels): 2px `signal-red` outline + 8% red wash.

---

## 3. Typography

Google Fonts: **Fraunces** (display), **Inter** (UI/body), **IBM Plex Mono** (numbers), **Caveat** (handwritten red-ink). Math via **KaTeX** (KaTeX_Main), sized to blend with Inter.

| Role | Font | Size / line-height | Weight | Letter-spacing | Notes |
|---|---|---|---|---|---|
| Display H1 | Fraunces | 72/68 desktop, 44/46 mobile | 600 | −0.02em | Occasional italic accent word (`font-style: italic`, weight 500) |
| H2 section | Fraunces | 44/48, 32/38 mobile | 600 | −0.015em | Paired with small mono kicker above |
| H3 card/figure | Fraunces | 26/32 | 600 | −0.01em | |
| Kicker / eyebrow | IBM Plex Mono | 12/16 | 500 | +0.14em, uppercase | e.g. `CASE 05 — ROTATING FRAME` |
| Body | Inter | 17/28, 15/24 compact | 400 | 0 | Max measure 62ch |
| UI label / button | Inter | 14/20 | 500–600 | +0.01em | |
| Numeric readout / coordinates | IBM Plex Mono | 13/18 | 400–500 | 0 | Tabular figures (`font-feature-settings: "tnum"`) |
| Hand annotation | Caveat | 22/26 | 600 | 0 | `signal-red`, rotated −1° to −3°, used sparingly (max 2–3 per viewport) |
| Math | KaTeX | 1.05em relative | — | — | Vectors with undertilde: `\underset{\sim}{r}` |

---

## 4. Spacing, Layout, Shape

- **Spacing scale** (4px base): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
- **Marketing pages**: max content width 1200px, side padding 24px (mobile) / 48px (desktop). Sections separated by 96–128px and a hairline with a small "§" or figure-number marker.
- **Simulator page**: full-viewport app shell (see `simulator.md`), no marketing chrome.
- **Radius**: 10px cards/dialogs, 6px controls, 999px chips. No fully-round cards.
- **Shadows**: "cut paper" only — `0 1px 0 rgba(34,48,60,.06), 3px 3px 0 rgba(34,48,60,.08)` on raised cards/dialogs; none on flat sections.
- **Borders**: 1px `hairline` everywhere; 1.5px `ink` for figure frames (drawings look "plated" like textbook figures).
- **Grid-paper backgrounds**: CSS `background-image` with two repeating linear-gradients (minor 24px, major 120px) over `paper`. Used on hero, simulator canvas, and selected section bands.

---

## 5. Animation & Motion Style

**Signature motion idea — "drafted motion"**: elements arrive the way a drawing is drafted. Lines *draw themselves* (SVG stroke-dashoffset), arrows extend from tail to head, annotations *scribble in*, equation terms *slide into place* like typeset. Nothing bounces childishly; everything eases like a pen stroke.

- **Global easing**: `cubic-bezier(0.22, 1, 0.36, 1)` ("pen-out"); UI micro: `cubic-bezier(0.3, 0, 0.2, 1)` 150–250ms.
- **Scroll**: Lenis smooth scroll on marketing pages (`lerp: 0.1`); GSAP ScrollTrigger for pinned storytelling on home; disabled in the simulator route (app shell).
- **Signature effects**:
  1. **Arrow draw-on**: all decorative vector arrows animate `stroke-dashoffset` from full→0 over 600–900ms when entering viewport; arrowhead fades in last 20%.
  2. **Kinetic display type**: hero headline splits into words (≤8 words), each slides up 110%→0 with 60ms stagger inside an overflow-hidden mask (GSAP SplitText or manual spans).
  3. **Red-ink scribble**: Caveat annotations fade+rotate in (opacity 0→1, rotate −6°→−2°, 400ms, delay after the element they annotate).
  4. **Pinned canvas story**: home hero→demo transition pins a live mini-simulation while scroll drives playback time (see home.md).
- **Micro-interactions**: buttons translate(0,1px) + shadow collapse on press; cards lift −4px with shadow growth on hover; chips/toggles snap with 120ms color fill; links get a red underline that draws left→right (200ms).
- **Performance guardrails**: ≤8 simultaneous animated elements per viewport; one canvas/WebGL-free approach site-wide (2D canvas only); all draw-on effects have CSS fallback (opacity-only) for `prefers-reduced-motion`, which also disables Lenis and scrubbing pins.
- **Page transitions**: Framer Motion — outgoing fades/slides down 12px (180ms), incoming slides up 12px + fade (240ms, pen-out).

**Cursor**: default arrow globally; `crosshair` over simulator canvas; custom 28px ring cursor (1.5px ink ring that tightens to 20px + fills 8% red on interactive hover) on marketing pages only.

---

## 6. Shared Components

### 6.1 Navbar (marketing pages)
- Fixed top, height 64px, `paper-card` with 1px `hairline` bottom border + subtle paper grain; on scroll >24px gains `3px 3px 0` shadow.
- Left: logo (`logo.svg` — a small drawn basis {e₁,e₂} glyph) + "VectorDyn" in Fraunces 20px 600 + mono kicker `2D DYNAMICS NOTEBOOK`.
- Center links (Inter 14/500): Simulator · Case Library · Method · About. Active link: red hand-drawn underline (SVG stroke).
- Right: `Sign in`-style secondary button is NOT needed; instead → primary button **"Open Simulator ▶"** (`engine-blue` bg, paper text, arrow glyph), 40px height, radius 6px.
- Mobile: hamburger → full-height drawer (paper, grid bg) with staggered link reveal (60ms stagger, slide-up 24px).

### 6.2 Footer (marketing pages)
- Grid-paper band (`paper-deep` + grid), 4 columns: brand + mission line ("See the vector. Then trust the math."), page links, case-library quick links, colophon ("Equations from *Essential Dynamics*, R. G. Parker · Built as a teaching prototype").
- Bottom row: mono 12px — `g = 9.81 m/s² · RK4 @ 1 kHz · E = T + V` as a decorative spec strip + © line.

### 6.3 Buttons
- **Primary**: `engine-blue` bg, `#F8F5EF` text, radius 6px, padding 12×20, Inter 14/600; hover → `engine-blue-deep` + translateY(−1px); press → translateY(1px), shadow collapses.
- **Secondary/ghost**: transparent, 1px `ink`/20% border, ink text; hover → border `ink`, bg 4% ink.
- **Danger/reset**: `signal-red` outline variant.
- **Icon buttons** (simulator toolbar): 36px square, radius 6px, 1.5px lucide icons.

### 6.4 Cards
- **CaseCard**: `paper-card`, figure frame on top (live-rendered mini-canvas or SVG of the mechanism), body with mono kicker (CASE 0X), Fraunces H3, one-line description, vector-count chips, "Open case →" link. Hover: lift −4px, figure's vectors redraw (dashoffset replay).
- **EquationBlock**: bordered figure frame, KaTeX content, term spans carry `data-term-id`; hover term → amber glow (shared HighlightContext).
- **AnnotationNote**: absolutely-positioned Caveat red note + hand-drawn arrow SVG pointing at its subject.
- **MethodStep**: numbered circle (mono, red) + title + body; connected by a dashed vertical rule that draws on scroll.
- **Toggle/chip**: shadcn/ui Switch & Badge restyled to palette.

### 6.5 Dialogs
- shadcn/ui Dialog restyled: `paper-card`, 1.5px ink frame, cut-paper shadow, radius 10px, mono kicker header + Fraunces title. Used for Basis pop-up, Force pop-up (spec in `simulator.md`).

---

## 7. Dependencies (for implementation)

`tailwindcss@3.4` · `shadcn/ui` (button, dialog, dropdown-menu, radio-group, slider, switch, tooltip, accordion, tabs, badge, scroll-area, separator) · `framer-motion` · `gsap` + `ScrollTrigger` + `SplitText` · `lenis` · `katex` + `react-katex` · `lucide-react` · `zustand` (sim state) · No Three.js — the whole site is intentionally 2D (canvas 2D + SVG).

---

## 8. Page List

| File | Route | Description |
|---|---|---|
| `home.md` | `/` | Landing: hero with live mini-simulation, problem/solution, 3-step workflow, vector system showcase, case preview, method strip, CTA. |
| `simulator.md` | `/simulator` | **The core app** — full workspace per the user's sketch: top menu bar, parts panel, canvas with auto bases, equations panel with term⇄vector correspondence, playback, basis & force pop-ups, energy monitor. |
| `library.md` | `/library` | The general-cases library: all 9 textbook-verified cases as interactive cards with EOMs, parameters, validation targets, and deep links into the simulator. |
| `method.md` | `/method` | The solution method taught step-by-step (A–E workflow + Lagrange alternative): bases, transport equation, FBD, momentum balances, energy checks — with interactive figures. |
| `about.md` | `/about` | Mission (the original sketch story), notation guide (undertilde vectors, bases), how the solver works, credits & tech. |

---

## 9. Assets Manifest

The site is deliberately drawing-driven: mechanisms and vectors are rendered live on `<canvas>`/SVG by the physics engine, so few static assets are needed.

| Filename | Description | Intended location | Dimensions | Type |
|---|---|---|---|---|
| `logo.svg` | Minimal ink glyph: two perpendicular drafting arrows forming a basis {e₁,e₂} at a small circle origin, ink `#33475B` with the e₂ arrow tipped in `#C2452D`; hand-drawn-but-crisp stroke (2.5px, slightly tapered ends); transparent bg. | Navbar, footer, favicon | 64×64 viewBox | SVG |
| `hero-annotation-arrow.svg` | Loose hand-drawn curved red arrow (Caveat-style stroke, `#C2452D`) used to point from margin notes to UI elements; slightly wobbly single-stroke path with triangular head. | Home hero, method page margin notes | 240×160 viewBox | SVG |
| `sketch-facsimile.png` | A faithful digital facsimile of the user's original concept sketch: handwritten project plan on warm grid paper — boxes for "menu bar / canvas / play button / parts list", red-ink underlines and arrows, pencil-gray handwriting; slightly rumpled paper texture, soft shadow, photographed-flat look (NOT a screenshot of a real UI — a hand sketch). | About page ("The sketch that started it") + home story section | 1600×1100 (3:2) | Image |
| `grid-texture.svg` | Tileable engineering grid: 24px minor lines `#E4E0D5`, 120px major lines `#CFC8B8`, on transparent; used as repeating background where CSS gradients are impractical (e.g., inside canvas-adjacent panels). | Global backgrounds | 240×240 tile | SVG |
| `og-cover.png` | Social/OG card: grid-paper background, "VectorDyn" in Fraunces, a drawn compound pendulum with green velocity + red acceleration arrows, red Caveat note "press ▶ and the vectors appear". | Site meta | 1200×630 | Image |

No photography, no video. All mechanism figures (pendulum, spring–mass, double pendulum, etc.) are **procedurally drawn** — specified per page as live figures, not assets.
