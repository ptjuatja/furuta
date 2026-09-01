/* ============================================================================
 * main.js — page bootstrap: KaTeX, decorative 3D figures, SVG figures
 * (blueprint + LQR block diagram + basis rotations), navbar, reveal-on-scroll.
 * ========================================================================== */
(function (root) {
  "use strict";
  const P = FurutaPhysics;
  const S3D = root.FurutaScene3D;

  document.addEventListener("DOMContentLoaded", () => {
    FurutaMath.renderAll(document);
    buildBasisFigure();
    buildBlueprint();
    buildLqrDiagram();
    setupFigures();
    setupNav();
    setupReveal();
  });

  /* ========================================================================
   * Decorative 3D figures
   * ==================================================================== */
  function setupFigures() {
    const params = { lA: 0.25, lB: 0.20, mA: 0.08, mB: 0.12, g: 9.81 };
    const D = P.deriveParams(params);
    const DT = 0.001, DTC = 0.005;

    // --- hero: full swing-up + balance loop, auto-restarting ---
    const heroBox = document.getElementById("hero-3d");
    if (heroBox) {
      let scene = null;
      try {
        scene = S3D.create(heroBox, { autoRotate: true, interactive: true });
        scene.setOverlays({ bases: true, arcs: false, gravity: false, velocity: false, torque: false, trail: true, grid: false });
        scene.setParams(params);
      } catch (e) {
        heroBox.innerHTML = '<div class="fig-loading mono">3D unavailable: ' + e.message + "</div>";
      }
      if (scene) {
        const ctrl = heroCtrl(D, DTC);
        let state = { th: 0, ph: Math.PI + 0.02, thd: 0, phd: 0.1 };
        let cstate = { pidI: { iPhi: 0 } };
        let M = 0, t = 0, balanceStart = -1;
        let last = performance.now(), acc = 0;
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        let visible = true;
        if ("IntersectionObserver" in window) {
          new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(heroBox);
        }
        (function heroLoop(now) {
          if (visible) requestAnimationFrame(heroLoop);
          const d = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (!visible) return;
          acc += d * 0.85; // slightly slower than real time
          let steps = 0;
          while (acc >= DT && steps < 60) {
            if (steps % 5 === 0) { const r = P.controller(D, state, ctrl, cstate, DTC); M = r.M; }
            state = P.stepRK4(D, state, M, DT);
            t += DT; acc -= DT; steps++;
          }
          if (P.wrapPi(state.ph) > 0.55) balanceStart = -1;
          if (Math.abs(P.wrapPi(state.ph)) < 0.05) {
            if (balanceStart < 0) balanceStart = t;
            if (t - balanceStart > 5) {
              state = { th: 0, ph: Math.PI + 0.02, thd: 0, phd: 0.1 };
              cstate = { pidI: { iPhi: 0 } }; t = 0; balanceStart = -1;
            }
          }
          scene.setState(state, M);
          if (reduced) scene.setAutoRotate(false);
        })(performance.now());
      }
    }

    // --- fig 1 in the derivation: free coupled swing (arm swings in opposition) ---
    const figBox = document.getElementById("fig-system-3d");
    if (figBox) {
      let scene = null;
      try {
        scene = S3D.create(figBox, { autoRotate: true, interactive: true });
        scene.setOverlays({ bases: true, arcs: true, gravity: false, velocity: false, torque: false, trail: true, grid: false });
        scene.setParams(params);
      } catch (e) {
        figBox.innerHTML = '<div class="fig-loading mono">3D unavailable: ' + e.message + "</div>";
      }
      if (scene) {
        let state = { th: 0, ph: 0.85, thd: 0, phd: 0 };
        let last = performance.now(), acc = 0;
        let visible = true;
        if ("IntersectionObserver" in window) {
          new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(figBox);
        }
        (function figLoop(now) {
          if (visible) requestAnimationFrame(figLoop);
          const d = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (!visible) return;
          acc += d * 0.6;
          let steps = 0;
          while (acc >= DT && steps < 60) {
            state = P.stepRK4(D, state, 0, DT);
            acc -= DT; steps++;
          }
          scene.setState(state, 0);
        })(performance.now());
      }
    }
  }

  /* default controller for the hero figure */
  function heroCtrl(D, DTC) {
    const full = P.lqrGains(D, DTC, [[300, 0, 0, 0], [0, 25, 0, 0], [0, 0, 5, 0], [0, 0, 0, 1.5]], 0.012);
    const pf = P.lqrGains(D, DTC, [[500, 0, 0, 0], [0, 1, 0, 0], [0, 0, 8, 0], [0, 0, 0, 0.1]], 0.008);
    return {
      mode: "lqr", K: full.K, Kp: pf.K, pump: "bang", kArm: 0.03, Mmax: 0.5,
      capture: 0.3, capVel: 2.5, capArmVel: 3.0, phiSafe: 0.12, lost: 0.55,
    };
  }

  /* ========================================================================
   * Fig. 2 — basis rotation diagram (SVG), faithful to main.tex's second TikZ
   * ==================================================================== */
  function buildBasisFigure() {
    const el = document.getElementById("fig-bases");
    if (!el) return;
    const ink = "#22303C", red = "#C2452D", blue = "#4A7FB5", faint = "#93A1AC";
    const arrow = (x1, y1, x2, y2, color, label, lx, ly, anchor) =>
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="2"/>' +
      '<polygon points="' + (x2) + "," + (y2) + " " + (x2 - 9) + "," + (y2 - 6) + " " + (x2 - 9) + "," + (y2 + 6) + '" fill="' + color + '"/>' +
      '<text x="' + lx + '" y="' + ly + '" font-size="14" fill="' + color + '" text-anchor="' + (anchor || "start") + '" font-family="Georgia, serif" font-style="italic">' + label + "</text>";

    const svg =
      '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">' +
      // left: theta rotation in horizontal plane (E1,E2)
      '<text x="190" y="28" font-size="13" fill="' + faint + '" font-family="IBM Plex Mono, monospace" text-anchor="middle">ROTATION θ ABOUT E₃</text>' +
      '<circle cx="190" cy="170" r="4" fill="' + ink + '"/>' +
      arrow(190, 170, 320, 170, red, "E₁", 328, 165, "start") +
      arrow(190, 170, 190, 50, red, "E₂", 196, 42, "start") +
      arrow(190, 170, 300, 130, blue, "e′₁", 308, 125, "start") +
      arrow(190, 170, 140, 74, blue, "e′₂", 100, 60, "end") +
      '<path d="M 260 170 A 70 70 0 0 0 232 109" fill="none" stroke="' + ink + '" stroke-width="1.6" stroke-dasharray="4 3"/>' +
      '<text x="252" y="128" font-size="14" fill="' + ink + '" font-family="Georgia, serif" font-style="italic">θ</text>' +
      '<text x="330" y="240" font-size="13" fill="' + ink + '" font-family="Georgia, serif" font-style="italic">E₃ = e′₃</text>' +
      // right: phi rotation in the e'2,e'3 plane
      '<text x="570" y="28" font-size="13" fill="' + faint + '" font-family="IBM Plex Mono, monospace" text-anchor="middle">ROTATION φ ABOUT e′₁</text>' +
      '<circle cx="570" cy="170" r="4" fill="' + ink + '"/>' +
      arrow(570, 170, 700, 170, blue, "e′₂", 708, 165, "start") +
      arrow(570, 170, 570, 50, blue, "e′₃", 576, 42, "start") +
      arrow(570, 170, 680, 130, "#8A6D3B", "e₂", 688, 125, "start") +
      arrow(570, 170, 520, 74, "#8A6D3B", "e₃", 486, 60, "end") +
      '<path d="M 640 170 A 70 70 0 0 0 612 109" fill="none" stroke="' + ink + '" stroke-width="1.6" stroke-dasharray="4 3"/>' +
      '<text x="630" y="128" font-size="14" fill="' + ink + '" font-family="Georgia, serif" font-style="italic">φ</text>' +
      '<text x="480" y="240" font-size="13" fill="' + ink + '" font-family="Georgia, serif" font-style="italic">e₁ = e′₁</text>' +
      // equations strip
      '<text x="380" y="300" font-size="14" fill="' + ink + '" text-anchor="middle" font-family="Georgia, serif">φ = 0 is upright — the pendulum points along e′₃ = E₃</text>' +
      "</svg>";
    el.innerHTML = '<div class="svg-fill">' + svg + "</div>";
  }

  /* ========================================================================
   * Fig. 4 — physical blueprint (SVG), faithful to main.tex section 2 figure
   * ==================================================================== */
  function buildBlueprint() {
    const el = document.getElementById("fig-blueprint");
    if (!el) return;
    const svg =
      '<svg viewBox="0 0 640 430" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">' +
      // base
      '<rect x="60" y="375" width="520" height="26" rx="3" fill="#E8E4DA" stroke="#22303C" stroke-width="1.6"/>' +
      '<text x="320" y="392" font-size="13" fill="#22303C" text-anchor="middle" font-family="Inter, sans-serif">Acrylic Base</text>' +
      // standoffs
      '<rect x="150" y="305" width="26" height="70" fill="#C9A227" stroke="#22303C" stroke-width="1.4"/>' +
      '<rect x="465" y="305" width="26" height="70" fill="#C9A227" stroke="#22303C" stroke-width="1.4"/>' +
      // mid plate
      '<rect x="105" y="290" width="430" height="20" rx="2" fill="#E8E4DA" stroke="#22303C" stroke-width="1.4"/>' +
      // motor
      '<rect x="245" y="160" width="150" height="130" fill="#2E343B" stroke="#22303C" stroke-width="1.6"/>' +
      '<text x="320" y="232" font-size="15" fill="#F8F5EF" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600">DC Motor</text>' +
      // shaft
      '<rect x="307" y="130" width="26" height="30" fill="#93A1AC" stroke="#22303C" stroke-width="1.4"/>' +
      // arm
      '<rect x="307" y="105" width="255" height="26" fill="#FDFBF6" stroke="#22303C" stroke-width="1.6"/>' +
      '<text x="430" y="123" font-size="13" fill="#22303C" text-anchor="middle" font-family="Inter, sans-serif">Arm (l_B)</text>' +
      // encoder joint
      '<rect x="545" y="98" width="30" height="40" fill="#1F252B" stroke="#22303C" stroke-width="1.6"/>' +
      // pendulum (rotated)
      '<g transform="rotate(-14 560 118)">' +
      '<rect x="550" y="118" width="20" height="185" fill="#FDFBF6" stroke="#22303C" stroke-width="1.6"/>' +
      '<text x="578" y="215" font-size="13" fill="#22303C" font-family="Inter, sans-serif" transform="rotate(90 578 215)">Pendulum (l_A)</text>' +
      "</g>" +
      // electronics
      '<rect x="80" y="215" width="150" height="75" rx="2" fill="#3F5A44" stroke="#22303C" stroke-width="1.4"/>' +
      '<text x="155" y="247" font-size="11" fill="#F8F5EF" text-anchor="middle" font-family="Inter, sans-serif">Arduino &amp;</text>' +
      '<text x="155" y="263" font-size="11" fill="#F8F5EF" text-anchor="middle" font-family="Inter, sans-serif">Motor Driver</text>' +
      // wires
      '<path d="M 200 230 C 240 210, 250 180, 320 205" fill="none" stroke="#C2452D" stroke-width="1.8" stroke-dasharray="6 4"/>' +
      '<path d="M 200 255 C 330 260, 480 150, 560 130" fill="none" stroke="#4A7FB5" stroke-width="1.8" stroke-dasharray="6 4"/>' +
      // angles
      '<path d="M 340 92 A 30 30 0 0 1 374 92" fill="none" stroke="#4A7FB5" stroke-width="2.4"/>' +
      '<polygon points="374,84 382,92 374,100" fill="#4A7FB5"/>' +
      '<text x="352" y="80" font-size="15" fill="#4A7FB5" font-family="Georgia, serif" font-style="italic" font-weight="bold">θ</text>' +
      '<line x1="560" y1="118" x2="556" y2="40" stroke="#C2452D" stroke-width="2.4"/>' +
      '<polygon points="556,32 550,44 562,44" fill="#C2452D"/>' +
      '<path d="M 606 80 A 26 26 0 0 0 596 48" fill="none" stroke="#C2452D" stroke-width="2" transform="translate(0 0)"/>' +
      '<text x="612" y="66" font-size="15" fill="#C2452D" font-family="Georgia, serif" font-style="italic" font-weight="bold">φ</text>' +
      // legend
      '<rect x="60" y="30" width="240" height="74" rx="6" fill="#FDFBF6" stroke="#D8D2C4" stroke-width="1"/>' +
      '<text x="74" y="50" font-size="11" fill="#5A6B78" font-family="IBM Plex Mono, monospace">FIG. 4 — BLUEPRINT</text>' +
      '<line x1="74" y1="62" x2="100" y2="62" stroke="#C2452D" stroke-width="2"/>' +
      '<text x="108" y="66" font-size="11" fill="#22303C" font-family="Inter, sans-serif">motor power wires</text>' +
      '<line x1="74" y1="78" x2="100" y2="78" stroke="#4A7FB5" stroke-width="2" stroke-dasharray="5 3"/>' +
      '<text x="108" y="82" font-size="11" fill="#22303C" font-family="Inter, sans-serif">encoder signal wires</text>' +
      "</svg>";
    el.innerHTML = '<div class="svg-fill">' + svg + "</div>";
  }

  /* ========================================================================
   * Fig. 3 — LQR block diagram (SVG)
   * ==================================================================== */
  function buildLqrDiagram() {
    const el = document.getElementById("fig-lqr");
    if (!el) return;
    const ink = "#22303C", blue = "#33475B", red = "#C2452D";
    const svg =
      '<svg viewBox="0 0 720 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">' +
      // plant
      '<rect x="300" y="55" width="220" height="90" rx="8" fill="#FDFBF6" stroke="' + ink + '" stroke-width="1.5"/>' +
      '<text x="410" y="88" font-size="14" fill="' + blue + '" text-anchor="middle" font-family="Georgia, serif" font-style="italic">ẋ = Ax + Bu</text>' +
      '<text x="410" y="112" font-size="12" fill="#5A6B78" text-anchor="middle" font-family="Inter, sans-serif">Furuta pendulum (nonlinear)</text>' +
      '<text x="410" y="130" font-size="11" fill="#93A1AC" text-anchor="middle" font-family="IBM Plex Mono, monospace">RK4 @ 1 kHz</text>' +
      // K block
      '<rect x="120" y="70" width="70" height="60" rx="8" fill="#FDFBF6" stroke="' + blue + '" stroke-width="1.5"/>' +
      '<text x="155" y="106" font-size="15" fill="' + blue + '" text-anchor="middle" font-family="Georgia, serif" font-weight="bold">K</text>' +
      // summing node
      '<circle cx="90" cy="100" r="16" fill="#FDFBF6" stroke="' + ink + '" stroke-width="1.5"/>' +
      '<text x="90" y="104" font-size="16" fill="' + red + '" text-anchor="middle">−</text>' +
      '<text x="80" y="90" font-size="12" fill="' + red + '" font-family="IBM Plex Mono, monospace">r = 0</text>' +
      // wires
      '<line x1="106" y1="100" x2="120" y2="100" stroke="' + ink + '" stroke-width="1.6"/>' +
      '<polygon points="120,95 128,100 120,105" fill="' + ink + '"/>' +
      '<line x1="190" y1="100" x2="300" y2="100" stroke="' + ink + '" stroke-width="1.6"/>' +
      '<polygon points="300,95 308,100 300,105" fill="' + ink + '"/>' +
      '<text x="240" y="92" font-size="13" fill="' + ink + '" text-anchor="middle" font-family="Georgia, serif" font-style="italic">M(t)</text>' +
      '<line x1="520" y1="100" x2="600" y2="100" stroke="' + ink + '" stroke-width="1.6"/>' +
      '<polygon points="600,95 608,100 600,105" fill="' + ink + '"/>' +
      '<text x="556" y="92" font-size="13" fill="' + ink + '" text-anchor="middle" font-family="Georgia, serif" font-style="italic">x = [φ, θ, φ̇, θ̇]</text>' +
      // feedback loop
      '<path d="M 600 100 L 660 100 L 660 165 L 90 165 L 90 116" fill="none" stroke="' + ink + '" stroke-width="1.6"/>' +
      '<polygon points="90,108 84,116 96,116" fill="' + ink + '"/>' +
      '<text x="380" y="178" font-size="12" fill="' + ink + '" text-anchor="middle" font-family="Georgia, serif" font-style="italic">u = −Kx,  saturated ±M_max,  200 Hz</text>' +
      "</svg>";
    el.innerHTML = '<div class="svg-fill">' + svg + "</div>";
  }

  /* ========================================================================
   * navbar + reveal-on-scroll
   * ==================================================================== */
  function setupNav() {
    const navbar = document.getElementById("navbar");
    const drawer = document.getElementById("nav-drawer");
    const burger = document.getElementById("nav-burger");
    const onScroll = () => navbar.classList.toggle("scrolled", window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    burger.addEventListener("click", () => drawer.classList.toggle("open"));
    drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => drawer.classList.remove("open")));
  }

  function setupReveal() {
    const els = document.querySelectorAll(".fig-frame, .derivation-block, .build-card, .red-note, .section-head");
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in-view");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => el.classList.add("reveal"));
    els.forEach((el) => io.observe(el));
  }
})(typeof self !== "undefined" ? self : this);
