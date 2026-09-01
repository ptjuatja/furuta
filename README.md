# Furuta Pendulum Lab

A fully self-contained, offline-capable **interactive simulator, derivation and build guide** for a
rotary self-balancing inverted (Furuta) pendulum, with an **LQR** balance controller and an
energy-based swing-up.

![simulator](test/e2e/shots/02-simulator-balanced.png)

## What's inside

| Section | What it does |
|---|---|
| **§1 The System** | The rig: rotary arm B (length `l_B`) driven by `M(t)` about the vertical, pendulum A (length `l_A`) hinged at the arm tip; notation & bases `{E}`, `{e′}`, `{e}` |
| **§2 Derivation** | Full equations of motion via Lagrange, in the exact notation of `main.tex` — bases, kinematics, energy, EoMs, matrix form `M q̈ + C q̇ = τ`, linearization & **LQR** design, energy swing-up |
| **§3 Build Guide** | Physical blueprint, electronics, control FSM, firmware pseudocode and the phased tuning procedure from the project notes |
| **§4 Simulator** | 3D CAD-style viewport (drag to orbit, right-drag to pan, wheel to zoom), RK4 @ 1 kHz, controller @ 200 Hz, live LQR gain computation, swing-up → balance FSM, charts, telemetry, disturbance kicks, sensor noise |

## Run it locally

No build step, no server required (it even works offline). Any of:

```bash
# clone, then just open the file
git clone <your-repo-url> furuta-pendulum
cd furuta-pendulum
# simplest:
xdg-open index.html        # or double-click in your file manager

# or serve it (recommended — cleanest behaviour):
python3 -m http.server 8000
# then visit http://localhost:8000
```

Everything is vendored in the repo: three.js, OrbitControls, KaTeX and all fonts
(`lib/`). Nothing is fetched from a CDN at runtime.

## Using the simulator

1. **Play ▶** — start from *Near-upright* (balance) or *Hanging* (watch the swing-up pump the pendulum
   to the top and catch it).
2. **Kick** — disturb the pendulum while it balances and watch the LQR recover. (Space = play/pause,
   `K` = kick, `R` = reset.)
3. **Parameters tab** — change lengths/masses; the LQR gains **recompute live** from the linearization.
4. **Control tab** — tune the LQR weights `Q`, `R` (or switch to the cascaded dual-PID of the notes),
   the swing-up pump (`k_E`, bang-bang vs proportional), torque limit and capture zone. Add sensor
   noise to see how the velocity LPF helps.
5. **View tab** — toggle bases, angle arcs, gravity, velocity, torque, trail and the ground grid;
   snap the camera to isometric/top/front/side views.

## Sign conventions (important when building the real thing)

With the basis convention of `main.tex` (`e′ = E rotated by θ about E₃`, `e = e′ rotated by φ about
e′₁`, `φ = 0` upright), the model gives:

- positive `M(t)` spins the arm counterclockwise viewed from above;
- the energy swing-up law is `M = −k_E·E·sgn(φ̇·cosφ)` — the arm accelerates *in the direction of the
  pendulum's swing* when energy is lacking (see the sign note in §2.6 of the site);
- the balance torque opposes the pendulum's lean, `M = −Kx` for LQR (the dual-PID is written the same
  way). Verify your motor's wiring direction against this before applying power.

## Tests

The physics engine and the site are covered by two test suites:

```bash
# physics: EoMs vs raw Lagrange, energy conservation, LQR, swing-up, PID, noise, hardware variants
node test/physics.test.js

# end-to-end (headless Chrome; requires puppeteer-core in test/e2e and a local server)
cd test/e2e && npm install
node site.test.js      # interaction suite
node visual.test.js    # rendering/kinematics probes
```

## Credits

Derivation and blueprint after the project notes (`main.tex`). Built as a teaching prototype —
three.js for the 3D scene, KaTeX for the math, paper and ink from the VectorDyn design language.
