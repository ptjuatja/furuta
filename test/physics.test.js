/* Node test harness for the Furuta physics engine + full FSM controller.
 * Run: node test/physics.test.js */
"use strict";
const P = require("../js/physics.js");

let passed = 0, failed = 0;
function ok(cond, name, extra) {
  if (cond) { passed++; console.log("  \u2713 " + name); }
  else { failed++; console.log("  \u2717 " + name + (extra ? "  -> " + JSON.stringify(extra) : "")); }
}
function near(a, b, tol, name) {
  ok(Math.abs(a - b) <= tol, name + ` (|${a.toFixed(6)} - ${b.toFixed(6)}| = ${Math.abs(a - b).toExponential(2)} <= ${tol})`);
}

const dt = 0.001, dtC = 0.005, CTL = Math.round(dtC / dt);
const params = { lA: 0.25, lB: 0.20, mA: 0.08, mB: 0.12, g: 9.81 };
const D = P.deriveParams(params);
console.log("Derived constants:", { Jt: +D.Jt.toFixed(5), Jp: +D.Jp.toFixed(5), Bc: +D.Bc.toFixed(5), L: +D.L.toFixed(5) });

/* default controller configuration (also used by the website) */
function defaultCtrl(mode) {
  const full = P.lqrGains(D, dtC, [[300, 0, 0, 0], [0, 25, 0, 0], [0, 0, 5, 0], [0, 0, 0, 1.5]], 0.012);
  const pendFirst = P.lqrGains(D, dtC, [[500, 0, 0, 0], [0, 1, 0, 0], [0, 0, 8, 0], [0, 0, 0, 0.1]], 0.008);
  const ctrl = {
    mode, K: full.K, Kp: mode === "lqr" ? pendFirst.K : null,
    pid: { kpPhi: 1.1, kdPhi: 0.11, kiPhi: 0.1, kpTheta: 0.04, kdTheta: 0.02, maxI: 0.4 },
    pump: "bang", kE: 4, kArm: 0.03, Mmax: 0.5,
    capture: 0.3, capVel: 2.5, capArmVel: 3.0, phiSafe: 0.12, lost: 0.55,
  };
  return ctrl;
}

/* run the FSM for Tmax seconds; returns stats */
function runFSM(ctrl, init, opts) {
  opts = opts || {};
  let s = { ...init };
  let M = 0, mode = "", capT = -1, fell = false, spin = false;
  let maxPhi = 0, maxM = 0, thFinal = 0;
  const cstate = { pidI: { iPhi: 0 } };
  for (let i = 0; i < opts.Tmax / dt; i++) {
    const t = i * dt;
    if (i % CTL === 0) {
      const r = P.controller(D, s, ctrl, cstate, dtC);
      M = r.M; mode = r.mode;
    }
    if (opts.kickT != null && t >= opts.kickT && !opts.kicked) { s.phd += opts.kickP; s.thd += opts.kickTd || opts.kickP * 0.7; opts.kicked = true; }
    s = P.stepRK4(D, s, M, dt);
    const phiW = Math.abs(P.wrapPi(s.ph));
    maxPhi = Math.max(maxPhi, phiW);
    maxM = Math.max(maxM, Math.abs(M));
    if (capT < 0 && mode === "balance") capT = t;
    if (capT >= 0 && t > capT + 2 && phiW > 0.7) { fell = true; break; }
    if (Math.abs(s.th) > 80) { spin = true; break; }
    if (Math.abs(s.phd) > 800) { spin = true; break; }
    thFinal = s.th;
  }
  return { capT, fell, spin, maxPhi, maxM, thFinal };
}

console.log("\n[1] EoM cross-validation: matrix form vs raw Lagrange");
{
  let allOK = true;
  for (let i = 0; i < 200; i++) {
    const s = { th: (Math.random() - 0.5) * 6, ph: (Math.random() - 0.5) * 6, thd: (Math.random() - 0.5) * 8, phd: (Math.random() - 0.5) * 8 };
    const M = (Math.random() - 0.5) * 1;
    const a1 = P.accel(D, s, M), a2 = P.accelLagrange(D, s, M);
    if (Math.abs(a1.thdd - a2.thdd) > 1e-9 || Math.abs(a1.phdd - a2.phdd) > 1e-9) { allOK = false; break; }
  }
  ok(allOK, "200 random states agree to 1e-9");
}

console.log("\n[2] Energy conservation, M = 0, 10 s @ 1 kHz");
{
  let s = { th: 0, ph: Math.PI - 0.3, thd: 0.4, phd: 0.7 };
  const E0 = P.energy(D, s).E;
  let maxErr = 0;
  for (let i = 0; i < 10000; i++) {
    s = P.stepRK4(D, s, 0, 0.001);
    const E = P.energy(D, s).E;
    maxErr = Math.max(maxErr, Math.abs((E - E0) / E0));
  }
  ok(maxErr < 1e-4, `relative energy drift < 1e-4 (was ${maxErr.toExponential(2)})`);
}

console.log("\n[3] Hanging pendulum: small perturbation oscillates with the coupled period");
{
  // the arm swings in opposition (angular momentum conservation about E3), so the
  // effective pendulum inertia is the Schur complement  Jp - L^2/Jt
  const omega2 = (params.mA * params.g * params.lA / 2) / (D.Jp - D.L * D.L / D.Jt);
  const Tlin = 2 * Math.PI / Math.sqrt(omega2);
  let s = { th: 0, ph: Math.PI + 0.01, thd: 0, phd: 0 };
  let crossings = 0, tPrev = 0, t = 0, half = -1;
  let prev = s.ph - Math.PI;
  for (let i = 1; i < 40000 && crossings < 4; i++) {
    s = P.stepRK4(D, s, 0, 0.001);
    t += 0.001;
    const cur = s.ph - Math.PI;
    if (prev * cur < 0) {
      if (crossings > 0 && half < 0) half = t - tPrev;
      tPrev = t; crossings++;
    }
    prev = cur;
  }
  near(2 * half, Tlin, 0.02 * Tlin, `measured period ~ coupled linear period (T=${(2*half).toFixed(4)}, lin=${Tlin.toFixed(4)})`);
}

console.log("\n[4] LQR balance: stabilizes from phi = 0.12 rad and holds 10 s");
{
  const ctrl = defaultCtrl("lqr");
  const r = runFSM(ctrl, { th: 0, ph: 0.12, thd: 0, phd: 0 }, { Tmax: 10 });
  ok(r.capT >= 0 && !r.fell, `captured immediately and held (capT=${r.capT?.toFixed(2)}, fell=${r.fell})`);
  ok(r.maxPhi < 0.15, `pendulum never exceeds initial offset (max|phi|=${r.maxPhi.toFixed(4)})`);
}

console.log("\n[5] Swing-up: hanging -> capture -> balance, holds 40 s (LQR)");
{
  const ctrl = defaultCtrl("lqr");
  const r = runFSM(ctrl, { th: 0, ph: Math.PI + 0.02, thd: 0, phd: 0.1 }, { Tmax: 40 });
  ok(r.capT >= 0 && r.capT < 8, `swing-up captured at t=${r.capT?.toFixed(2)} s (< 8 s)`);
  ok(!r.fell, `did not fall for 40 s (fell=${r.fell}, thFinal=${r.thFinal.toFixed(2)})`);
  ok(!r.spin, `arm did not wind up (spin=${r.spin})`);
}

console.log("\n[6] Swing-up robustness across initial states (LQR)");
{
  const inits = [
    { th: 0, ph: Math.PI + 0.02, thd: 0, phd: 0.1 },
    { th: 0.5, ph: Math.PI - 0.3, thd: -0.4, phd: -0.6 },
    { th: -1.2, ph: Math.PI + 0.6, thd: 0.8, phd: 1.2 },
    { th: 0, ph: Math.PI, thd: 0, phd: 0.05 },
    { th: 2, ph: Math.PI + 1.0, thd: -1.5, phd: -2.0 },
    { th: -2, ph: -Math.PI - 0.4, thd: 2.2, phd: 2.5 },
  ];
  let all = true;
  for (let k = 0; k < inits.length; k++) {
    const r = runFSM(defaultCtrl("lqr"), inits[k], { Tmax: 30 });
    const good = r.capT >= 0 && !r.fell && !r.spin;
    if (!good) all = false;
    console.log(`  init #${k + 1}: capT=${r.capT < 0 ? "NEVER" : r.capT.toFixed(2)}s fell=${r.fell} spin=${r.spin} ${good ? "" : "  <-- FAIL"}`);
  }
  ok(all, "all 6 initial conditions swing up and balance");
}

console.log("\n[7] Disturbance rejection: sharp kick at t=6 s while balancing");
{
  const ctrl = defaultCtrl("lqr");
  const opts = { Tmax: 16, kickT: 6, kickP: 1.5, kicked: false };
  const r = runFSM(ctrl, { th: 0, ph: Math.PI, thd: 0, phd: 0.1 }, opts);
  ok(r.capT >= 0 && !r.fell, `survives kick (fell=${r.fell}, maxPhi=${r.maxPhi.toFixed(3)})`);
}

console.log("\n[8] Dual-PID balance (main.tex scheme) + swing-up capture");
{
  const ctrl = defaultCtrl("pid");
  // near-upright start
  const r1 = runFSM(ctrl, { th: 0, ph: 0.08, thd: 0, phd: 0 }, { Tmax: 12 });
  ok(r1.capT >= 0 && !r1.fell, `PID balances from 0.08 rad (fell=${r1.fell})`);
  // full swing-up with PID balance
  const r2 = runFSM(ctrl, { th: 0, ph: Math.PI + 0.02, thd: 0, phd: 0.1 }, { Tmax: 40 });
  ok(r2.capT >= 0 && r2.capT < 12 && !r2.fell, `PID swing-up captured at t=${r2.capT?.toFixed(2)} and held (fell=${r2.fell})`);
}

console.log("\n[9] Sensor noise + velocity LPF: still balances");
{
  const ctrl = defaultCtrl("lqr");
  let s = { th: 0, ph: Math.PI, thd: 0, phd: 0.1 };
  let M = 0, mode = "", capT = -1, fell = false;
  const meas = { thdFilt: 0, phdFilt: 0 };
  const cstate = { pidI: { iPhi: 0 } };
  let useS;
  for (let i = 0; i < 30000; i++) {
    const t = i * dt;
    if (i % CTL === 0) {
      useS = P.sensor(s, meas, { on: true, level: 0.01 }, 0.2); // ~0.01 rad encoder noise
      const r = P.controller(D, useS, ctrl, cstate, dtC);
      M = r.M; mode = r.mode;
      meas.thdFilt = useS.thd; meas.phdFilt = useS.phd;
    }
    s = P.stepRK4(D, s, M, dt);
    if (capT < 0 && mode === "balance") capT = t;
    if (capT >= 0 && t > capT + 2 && Math.abs(P.wrapPi(s.ph)) > 0.7) { fell = true; break; }
  }
  ok(capT >= 0 && !fell, `captured (${capT?.toFixed(2)}s) and held with noisy sensors (fell=${fell})`);
}

console.log("\n[10] Parameter robustness: swing-up + balance across hardware variants");
{
  const variants = [
    { lA: 0.15, lB: 0.25, mA: 0.05, mB: 0.20 },   // long light arm, short light pendulum
    { lA: 0.35, lB: 0.15, mA: 0.15, mB: 0.06 },   // heavy long pendulum, short light arm
    { lA: 0.25, lB: 0.30, mA: 0.10, mB: 0.15 },   // longer arm
    { lA: 0.30, lB: 0.20, mA: 0.04, mB: 0.10 },   // very light pendulum
    { lA: 0.20, lB: 0.22, mA: 0.12, mB: 0.08 },   // heavy pendulum, short arm
  ];
  let all = true;
  for (let k = 0; k < variants.length; k++) {
    const Pk = P.deriveParams(variants[k]);
    const full = P.lqrGains(Pk, dtC, [[300, 0, 0, 0], [0, 25, 0, 0], [0, 0, 5, 0], [0, 0, 0, 1.5]], 0.012);
    const pf = P.lqrGains(Pk, dtC, [[500, 0, 0, 0], [0, 1, 0, 0], [0, 0, 8, 0], [0, 0, 0, 0.1]], 0.008);
    const ctrl = { mode: "lqr", K: full.K, Kp: pf.K, pump: "bang", kArm: 0.03, Mmax: 0.5, capture: 0.3, capVel: 2.5, capArmVel: 3.0, phiSafe: 0.12, lost: 0.55 };
    let s = { th: 0, ph: Math.PI + 0.02, thd: 0, phd: 0.1 };
    let M = 0, mode = "", capT = -1, fell = false;
    const cstate = { pidI: { iPhi: 0 } };
    for (let i = 0; i < 40000; i++) {
      const t = i * dt;
      if (i % CTL === 0) { const r = P.controller(Pk, s, ctrl, cstate, dtC); M = r.M; mode = r.mode; }
      s = P.stepRK4(Pk, s, M, dt);
      if (capT < 0 && mode === "balance") capT = t;
      if (capT >= 0 && t > capT + 2 && Math.abs(P.wrapPi(s.ph)) > 0.7) { fell = true; break; }
    }
    const good = capT >= 0 && !fell;
    if (!good) all = false;
    console.log(`  variant ${k + 1}: capT=${capT < 0 ? "NEVER" : capT.toFixed(2)}s fell=${fell} ${good ? "" : "  <-- FAIL"}`);
  }
  ok(all, "all 5 hardware variants swing up and balance with recomputed LQR");
}

console.log("\n[11] Controllability of the upright linearization (rank 4)");
{
  const { A, B } = P.linStateSpace(D);
  const vecs = [];
  let v = B.map((r) => r[0]);
  for (let k = 0; k < 4; k++) { if (k > 0) v = A.map((r) => r.reduce((a, x, j) => a + x * v[j], 0)); vecs.push(v.slice()); }
  const m = vecs.map((_, r) => vecs.map((c) => c[r]));
  let rank = 0;
  for (let col = 0; col < 4 && rank < 4; col++) {
    let piv = -1;
    for (let r = rank; r < 4; r++) if (Math.abs(m[r][col]) > 1e-10) { piv = r; break; }
    if (piv < 0) continue;
    [m[rank], m[piv]] = [m[piv], m[rank]];
    const d = m[rank][col];
    for (let c = col; c < 4; c++) m[rank][c] /= d;
    for (let r = 0; r < 4; r++) if (r !== rank && Math.abs(m[r][col]) > 1e-10) {
      const f = m[r][col];
      for (let c = col; c < 4; c++) m[r][c] -= f * m[rank][c];
    }
    rank++;
  }
  ok(rank === 4, `controllability matrix has rank 4 (got ${rank})`);
}

console.log("\n[12] Energy pump with corrected sign adds energy at the bottom");
{
  let s = { th: 0, ph: Math.PI, thd: 0, phd: 0.2 };
  const E0 = P.pendEnergy(D, s);
  let E = E0, M = 0;
  for (let i = 0; i < 4000; i++) {
    if (i % 5 === 0) { const r = P.swingTorque(D, s, 4, 0.5); M = r.M; }
    s = P.stepRK4(D, s, M, 0.001);
    E = P.pendEnergy(D, s);
  }
  ok(E > E0, `swing energy increased from ${E0.toFixed(4)} to ${E.toFixed(4)} J`);
}

console.log("\n======================================");
console.log(`PASS ${passed}  FAIL ${failed}`);
process.exit(failed ? 1 : 0);
