/* Swing-up strategy experiments: pump law variants x arm damping x capture logic */
"use strict";
const P = require("../js/physics.js");
const D = P.deriveParams({ lA: 0.25, lB: 0.20, mA: 0.08, mB: 0.12, g: 9.81 });
const dt = 0.001, dtC = 0.005;

function run(opts) {
  const { K } = P.lqrGains(D, dtC, opts.Q, opts.R);
  const ctrl = { mode: "lqr", K, capture: opts.capture, kE: opts.kE, kArm: opts.kArm, Mmax: opts.Mmax, pump: opts.pump, capVel: opts.capVel };
  let s = { th: 0, ph: Math.PI + 0.02, thd: 0, phd: 0.1 };
  let M = 0, mode = "", capT = -1, fell = false, spin = false;
  let minA = 99, minAVel = 99, minAt = 0, Emax = -1e9;
  for (let i = 0; i < 180000; i++) {
    const t = i * dt;
    if (i % 5 === 0) {
      const phiW = P.wrapPi(s.ph);
      const inZone = Math.abs(phiW) <= ctrl.capture && Math.abs(s.phd) <= (ctrl.capVel || 99);
      if (inZone) {
        M = -(ctrl.K[0] * phiW + ctrl.K[1] * P.wrapPi(s.th) + ctrl.K[2] * s.phd + ctrl.K[3] * s.thd);
        mode = "balance";
      } else {
        const E = P.pendEnergy(D, s);
        let Mp;
        if (ctrl.pump === "bang") Mp = ctrl.Mmax * Math.sign(-E * s.phd * Math.cos(s.ph));
        else Mp = -ctrl.kE * E * Math.sign(s.phd * Math.cos(s.ph));
        M = Mp - ctrl.kArm * s.thd;
        mode = "swing";
      }
      if (ctrl.Mmax > 0) M = Math.max(-ctrl.Mmax, Math.min(ctrl.Mmax, M));
    }
    s = P.stepRK4(D, s, M, dt);
    const a = Math.abs(P.wrapPi(s.ph));
    if (a < minA) { minA = a; minAVel = Math.abs(s.phd); minAt = t; }
    const E = P.pendEnergy(D, s);
    if (E > Emax) Emax = E;
    if (capT < 0 && mode === "balance" && a < ctrl.capture) capT = t;
    if (capT >= 0 && t > capT + 2 && a > 0.7) { fell = true; break; }
    if (capT >= 0 && t > capT + 12) break;
    if (Math.abs(s.th) > 60) { spin = true; break; }
  }
  return { capT, fell, spin, minA, minAVel, minAt, Emax };
}

const Q = [[300, 0, 0, 0], [0, 25, 0, 0], [0, 0, 5, 0], [0, 0, 0, 1.5]];
const R = 0.012;
const rows = [];
for (const pump of ["prop", "bang"]) {
  for (const kE of pump === "prop" ? [3, 6, 10, 16] : [1]) {
    for (const kArm of [0, 0.03, 0.08]) {
      for (const capture of [0.3]) {
        const r = run({ Q, R, kE, kArm, capture, Mmax: 0.5, pump, capVel: 2.2 });
        rows.push({ pump, kE, kArm, ...r });
      }
    }
  }
}
rows.sort((a, b) => (a.capT < 0 ? 1e9 : a.capT) - (b.capT < 0 ? 1e9 : b.capT));
for (const r of rows) {
  console.log(
    (r.pump === "prop" ? "prop" : "bang").padEnd(5),
    "kE=" + String(r.kE).padEnd(4),
    "kArm=" + r.kArm.toFixed(2).padEnd(6),
    "capT=" + (r.capT < 0 ? "NEVER" : r.capT.toFixed(2) + "s"),
    "fell=" + r.fell,
    "spin=" + r.spin,
    "min|phi|=" + r.minA.toFixed(3) + "@" + r.minAt.toFixed(1) + "s(vel=" + r.minAVel.toFixed(2) + ")",
    "Emax=" + r.Emax.toFixed(3)
  );
}
