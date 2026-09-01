/* Empirical sweep over LQR weights: score candidates on full nonlinear closed-loop
 * simulations (balance-from-offset, kick rejection, swing-up) and print the best. */
"use strict";
const P = require("../js/physics.js");
const D = P.deriveParams({ lA: 0.25, lB: 0.20, mA: 0.08, mB: 0.12, g: 9.81 });
const dt = 0.001, dtC = 0.005, CTL_EVERY = Math.round(dtC / dt);

function sim(ctrl, init, kickAt, kickV, Tmax) {
  let s = { ...init };
  let M = 0, mode = "", t = 0;
  let maxM = 0, energyUse = 0, sats = 0;
  let settle = -1, fell = false, maxPhi = 0;
  let kicked = false;
  for (let i = 0; i < Tmax / dt; i++) {
    t = i * dt;
    if (i % CTL_EVERY === 0) {
      const r = P.controller(D, s, ctrl, {}, dtC);
      M = r.M; mode = r.mode;
      if (Math.abs(M) > ctrl.Mmax - 1e-9) sats++;
    }
    if (kickAt && t >= kickAt && !kicked) { s.phd += kickV; s.thd += kickV * 0.7; kicked = true; }
    s = P.stepRK4(D, s, M, dt);
    const phiW = Math.abs(P.wrapPi(s.ph));
    maxPhi = Math.max(maxPhi, phiW);
    if (Math.abs(M) > maxM) maxM = Math.abs(M);
    energyUse += Math.abs(M) * dt;
    if (settle < 0 && t > (kickAt || 0) + 1.0 && phiW < 0.02 && mode === "balance") settle = t;
    if (t > (kickAt || 0) + 0.5 && phiW > 1.2) { fell = true; break; }
    if (t > (kickAt || 0) + 4 && phiW < 0.02) break;
  }
  return { settle, fell, maxM, energyUse, sats, maxPhi, th: s.th };
}

function score(c) {
  // 1) balance from 0.12 rad offset
  const b1 = sim(c, { th: 0, ph: 0.12, thd: 0, phd: 0 }, null, 0, 6);
  // 2) kick rejection while balancing (start balanced, kick at 1s)
  const b2 = sim(c, { th: 0, ph: 0.05, thd: 0, phd: 0 }, 1.0, 1.5, 8);
  // 3) swing-up from hanging
  const b3 = sim(c, { th: 0, ph: Math.PI + 0.02, thd: 0, phd: 0.1 }, null, 0, 25);
  let sc = 0;
  if (b1.fell) sc -= 1000; else sc += 100 - Math.min(50, (b1.settle < 0 ? 50 : (b1.settle - 1) * 20));
  if (b2.fell) sc -= 1000; else sc += 100 - Math.min(50, (b2.settle < 0 ? 50 : (b2.settle - 1) * 20));
  if (b3.fell) sc -= 1000; else sc += 200;
  sc -= (b1.sats + b2.sats + b3.sats) * 1.5;      // penalize saturation episodes
  sc -= (b1.energyUse + b2.energyUse + b3.energyUse) * 40; // penalize effort
  sc -= Math.min(20, Math.abs(b3.th));            // arm drift after swing-up
  return { sc, b1, b2, b3 };
}

const Qs = [
  { qphi: 60,  qth: 6,   qdphi: 1, qdth: 0.3, r: 0.05 },
  { qphi: 120, qth: 10,  qdphi: 2, qdth: 0.5, r: 0.03 },
  { qphi: 200, qth: 15,  qdphi: 3, qdth: 1,   r: 0.02 },
  { qphi: 300, qth: 25,  qdphi: 4, qdth: 1.5, r: 0.012 },
  { qphi: 500, qth: 40,  qdphi: 6, qdth: 2,   r: 0.008 },
  { qphi: 800, qth: 60,  qdphi: 8, qdth: 3,   r: 0.005 },
  { qphi: 40,  qth: 4,   qdphi: 0.6,qdth: 0.2, r: 0.08 },
];
const kEs = [0.8, 1.2, 1.6, 2.0];
const Mmax = 0.5, capture = 0.25;

let best = null;
for (const q of Qs) {
  const Q = [[q.qphi,0,0,0],[0,q.qth,0,0],[0,0,q.qdphi,0],[0,0,0,q.qdth]];
  for (const kE of kEs) {
    const { K } = P.lqrGains(D, dtC, Q, q.r);
    const ctrl = { mode: "lqr", K, capture, kE, Mmax };
    const r = score(ctrl);
    const tag = `qphi=${q.qphi} qth=${q.qth} r=${q.r} kE=${kE}`;
    console.log((r.sc > -500 ? "  " : "✗ ") + tag.padEnd(38) + " score=" + r.sc.toFixed(1) +
      "  b1:settle=" + (r.b1.settle == null ? "inf" : r.b1.settle.toFixed(2)) + " sats=" + r.b1.sats +
      "  b2:settle=" + (r.b2.settle == null ? "inf" : r.b2.settle.toFixed(2)) + " sats=" + r.b2.sats +
      "  b3:settle=" + (r.b3.settle == null ? "inf" : r.b3.settle.toFixed(2)) + " fell=" + r.b3.fell + " th=" + r.b3.th.toFixed(2));
    if (!best || r.sc > best.sc) best = { tag, q, kE, ...r };
  }
}
console.log("\nBEST:", best.tag, "score=" + best.sc.toFixed(1));
