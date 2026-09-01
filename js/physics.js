/* ============================================================================
 * Furuta Pendulum — physics engine
 * ----------------------------------------------------------------------------
 * Implements the nonlinear equations of motion derived in main.tex
 * (rotary self-balancing inverted pendulum, bar B = rotary arm, bar A =
 * pendulum). State vector: { th: theta (arm angle about E3), ph: phi
 * (pendulum angle about e'1), thd, phd }.
 *
 * Conventions (identical to main.tex):
 *   E  — fixed basis at O; e' — E rotated by theta about E3;
 *   e  — e' rotated by phi about e'1 (phi = 0 is upright).
 *   M(t) — control torque about E3 (positive spins the arm CCW viewed
 *          from above, i.e. from E1 toward E2).
 *
 * EoMs (matrix form of main.tex):
 *   M(q) qdd + C(q,qd) qd = tau
 *   q = [theta, phi]^T,  tau = [M, mA g lA/2 sin(phi)]^T
 *   Jt = mA lB^2 + mB lB^2/4 + J3B + J3A   (constant base inertia)
 *   Jp = mA lA^2/4 + J1A                   (constant pendulum inertia)
 *   Bc = mA lA^2/4 + J2A - J3A             (inertia variation amplitude)
 *   L  = mA lA lB / 2                      (coupling magnitude)
 *
 * Inertias default to the uniform slender-rod model (J about the reference
 * points O for the arm and S for the pendulum).
 * ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FurutaPhysics = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const G = 9.81;

  /* ------------------------------------------------------------------ */
  /* generic small-matrix helpers (rows-major arrays of arrays)          */
  /* ------------------------------------------------------------------ */
  function mmul(A, B) {
    const m = A.length, n = B[0].length, k = B.length;
    const C = [];
    for (let i = 0; i < m; i++) {
      C.push(new Array(n).fill(0));
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
        C[i][j] = s;
      }
    }
    return C;
  }
  function madd(A, B) {
    return A.map((r, i) => r.map((v, j) => v + B[i][j]));
  }
  function msub(A, B) {
    return A.map((r, i) => r.map((v, j) => v - B[i][j]));
  }
  function mscale(A, s) {
    return A.map((r) => r.map((v) => v * s));
  }
  function mtrans(A) {
    return A[0].map((_, j) => A.map((r) => r[j]));
  }
  function mmaxabs(A) {
    let m = 0;
    for (const r of A) for (const v of r) m = Math.max(m, Math.abs(v));
    return m;
  }
  function matEye(n) {
    const A = [];
    for (let i = 0; i < n; i++) {
      A.push(new Array(n).fill(0));
      A[i][i] = 1;
    }
    return A;
  }
  /* matrix exponential via scaling & squaring + Taylor series */
  function expm(A) {
    const n = A.length;
    let s = 0;
    let norm = mmaxabs(A);
    while (norm > 0.05) {
      A = mscale(A, 0.5);
      norm = mmaxabs(A);
      s++;
    }
    // Taylor: exp(A) = sum A^k / k!
    let E = matEye(n);
    let term = matEye(n);
    for (let k = 1; k < 40; k++) {
      term = mmul(term, mscale(A, 1 / k));
      E = madd(E, term);
      if (mmaxabs(term) < 1e-16) break;
    }
    while (s-- > 0) E = mmul(E, E);
    return E;
  }

  /* ------------------------------------------------------------------ */
  /* parameter derivation                                                */
  /* ------------------------------------------------------------------ */
  function deriveParams(p) {
    const lA = p.lA, lB = p.lB, mA = p.mA, mB = p.mB;
    const g = p.g != null ? p.g : G;
    // uniform slender-rod inertias:
    //   pendulum A about joint S : J1A = J2A = mA lA^2 / 3, J3A ~ 0 (axial)
    //   arm B about origin O     : J3B = mB lB^2 / 3 (only J3 appears)
    const J1A = (mA * lA * lA) / 3;
    const J2A = (mA * lA * lA) / 3;
    const J3A = 1e-6;
    const J3B = (mB * lB * lB) / 3;
    const Jt = mA * lB * lB + (mB * lB * lB) / 4 + J3B + J3A;
    const Jp = (mA * lA * lA) / 4 + J1A;
    const Bc = (mA * lA * lA) / 4 + J2A - J3A;
    const L = (mA * lA * lB) / 2;
    return { lA, lB, mA, mB, g, J1A, J2A, J3A, J3B, Jt, Jp, Bc, L };
  }

  /* ------------------------------------------------------------------ */
  /* dynamics                                                            */
  /* ------------------------------------------------------------------ */
  function wrapPi(x) {
    while (x > Math.PI) x -= 2 * Math.PI;
    while (x < -Math.PI) x += 2 * Math.PI;
    return x;
  }

  /* nonlinear accelerations, matrix form (main.tex eq. 7) */
  function accel(P, s, M) {
    const { Jt, Jp, Bc, L } = P;
    const sp = Math.sin(s.ph), cp = Math.cos(s.ph);
    const M11 = Jt + Bc * sp * sp, M12 = -L * cp, M22 = Jp;
    const det = M11 * M22 - M12 * M12;
    const C11 = Bc * s.phd * sp * cp;
    const C12 = Bc * s.thd * sp * cp + L * s.phd * sp;
    const C21 = -Bc * s.thd * sp * cp;
    const t1 = M;
    const t2 = (P.mA * P.g * P.lA / 2) * sp;
    const r1 = t1 - C11 * s.thd - C12 * s.phd;
    const r2 = t2 - C21 * s.thd;
    const thdd = (M22 * r1 - M12 * r2) / det;
    const phdd = (-M12 * r1 + M11 * r2) / det;
    return { thdd, phdd };
  }

  /* raw Lagrange form of the same EoMs (used for cross-validation) */
  function accelLagrange(P, s, M) {
    const { Jt, Jp, Bc, L } = P;
    const sp = Math.sin(s.ph), cp = Math.cos(s.ph);
    const M11 = Jt + Bc * sp * sp, M12 = -L * cp, M22 = Jp;
    const det = M11 * M22 - M12 * M12;
    const b1 = M - 2 * Bc * sp * cp * s.thd * s.phd - L * sp * s.phd * s.phd;
    const b2 = (P.mA * P.g * P.lA / 2) * sp + Bc * s.thd * s.thd * sp * cp;
    const thdd = (M22 * b1 - M12 * b2) / det;
    const phdd = (-M12 * b1 + M11 * b2) / det;
    return { thdd, phdd };
  }

  function stepRK4(P, s, M, dt) {
    const k1 = accel(P, s, M);
    const a2 = { th: s.th + 0.5 * dt * s.thd, ph: s.ph + 0.5 * dt * s.phd, thd: s.thd + 0.5 * dt * k1.thdd, phd: s.phd + 0.5 * dt * k1.phdd };
    const k2 = accel(P, a2, M);
    const a3 = { th: s.th + 0.5 * dt * a2.thd, ph: s.ph + 0.5 * dt * a2.phd, thd: s.thd + 0.5 * dt * k2.thdd, phd: s.phd + 0.5 * dt * k2.phdd };
    const k3 = accel(P, a3, M);
    const a4 = { th: s.th + dt * a3.thd, ph: s.ph + dt * a3.phd, thd: s.thd + dt * k3.thdd, phd: s.phd + dt * k3.phdd };
    const k4 = accel(P, a4, M);
    return {
      th: s.th + (dt / 6) * (s.thd + 2 * a2.thd + 2 * a3.thd + a4.thd),
      ph: s.ph + (dt / 6) * (s.phd + 2 * a2.phd + 2 * a3.phd + a4.phd),
      thd: s.thd + (dt / 6) * (k1.thdd + 2 * k2.thdd + 2 * k3.thdd + k4.thdd),
      phd: s.phd + (dt / 6) * (k1.phdd + 2 * k2.phdd + 2 * k3.phdd + k4.phdd),
    };
  }

  function energy(P, s) {
    const sp = Math.sin(s.ph), cp = Math.cos(s.ph);
    const T =
      0.5 * P.mA * (P.lA * P.lA / 4 * (s.thd * s.thd * sp * sp + s.phd * s.phd) +
                    P.lB * P.lB * s.thd * s.thd - P.lA * P.lB * s.thd * s.phd * cp) +
      0.5 * P.mB * P.lB * P.lB / 4 * s.thd * s.thd +
      0.5 * (P.J1A * s.phd * s.phd +
             (P.J2A * sp * sp + P.J3A * cp * cp + P.J3B) * s.thd * s.thd);
    const V = P.mA * P.g * P.lA / 2 * cp;
    return { T, V, E: T + V };
  }

  /* pendulum-only energy with datum E = 0 at upright (main.tex sec. 3.3.1) */
  function pendEnergy(P, s) {
    return 0.5 * P.Jp * s.phd * s.phd + (P.mA * P.g * P.lA / 2) * (Math.cos(s.ph) - 1);
  }

  /* ------------------------------------------------------------------ */
  /* control                                                             */
  /* ------------------------------------------------------------------ */

  /* linearized A, B about upright (phi = 0), state x = [phi, theta, phid, thid] */
  function linStateSpace(P) {
    const { Jt, Jp, L } = P;
    const det = Jt * Jp - L * L;
    const k = (P.mA * P.g * P.lA / 2) / det;
    const A = [
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [k * Jt, 0, 0, 0],
      [k * L, 0, 0, 0],
    ];
    const B = [[0], [0], [L / det], [Jp / det]];
    return { A, B };
  }

  /* zero-order-hold discretization of (A, B) with time step dt */
  function discretizeZOH(A, B, dt) {
    const n = A.length;
    const Ad = expm(mscale(A, dt));
    // Bd = sum_k A^k B dt^{k+1} / (k+1)!   (k = 0 term: B dt)
    let Bd = mscale(B, dt);
    let term = mscale(B, dt);
    let Apow = matEye(n);
    for (let k = 1; k < 60; k++) {
      Apow = mmul(Apow, A);
      term = mmul(Apow, B);
      term = mscale(term, Math.pow(dt, k + 1) / fact(k + 1));
      Bd = madd(Bd, term);
      if (mmaxabs(term) < 1e-16) break;
    }
    return { Ad, Bd };
  }
  function fact(n) {
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
  }

  /* discrete LQR via Riccati iteration (DARE), returns feedback K (1x4) */
  function lqrDiscrete(Ad, Bd, Q, R, maxIter, tol) {
    maxIter = maxIter || 8000;
    tol = tol || 1e-9;
    const n = Ad.length;
    const I = matEye(n);
    let P = Q.map((r) => r.slice());
    const BT = mtrans(Bd);
    for (let it = 0; it < maxIter; it++) {
      // S = R + B' P B   (scalar)
      const PB = mmul(P, Bd);                 // n x 1
      const BtPB = mmul(BT, PB)[0][0];        // scalar
      const S = R + BtPB;
      // AtP = A' P ; F (1 x n) = (B' P A) / S
      const AtP = mmul(mtrans(Ad), P);
      const BtPA = mmul(BT, mmul(P, Ad));     // 1 x n
      const Fv = BtPA[0].map((v) => v / S);   // 1 x n
      // Pnew = A' P (A - B F) + Q
      const BF = mmul(Bd, [Fv]);              // n x 1 * 1 x n -> n x n
      const AminusBF = msub(Ad, BF);
      const Pnew = madd(mmul(AtP, AminusBF), Q);
      // relative convergence: the absolute scale of P varies widely with Q/R
      const scale = Math.max(1, mmaxabs(P));
      if (mmaxabs(msub(Pnew, P)) < tol * scale) { P = Pnew; return { K: Fv, P, it }; }
      P = Pnew;
    }
    // fall back to last iterate
    const BTp = mtrans(Bd);
    const BtPA = mmul(BTp, mmul(P, Ad))[0];
    const BtPB = mmul(BTp, mmul(P, Bd))[0][0];
    const K = BtPA.map((v) => v / (R + BtPB));
    return { K, P, it: maxIter };
  }

  /* full LQR design for the pendulum about upright at control rate dtC */
  function lqrGains(P, dtC, Q, R) {
    const { A, B } = linStateSpace(P);
    const { Ad, Bd } = discretizeZOH(A, B, dtC);
    const { K } = lqrDiscrete(Ad, Bd, Q, R);
    return { K, Ad, Bd, A, B };
  }

  /* energy-pumping swing-up law (main.tex sec. 3.3.1).
   * Note on sign: with the basis convention of main.tex (phi measured such
   * that dE/dt ~ phi-dot * L * cos(phi) * thetadd), the energy-increasing
   * choice is  M = -kE * E * sgn(phid * cos(phi))  with  kE > 0, i.e. the
   * arm accelerates in the direction of the pendulum's swing when the
   * pendulum lacks energy. (The literal sign in the project notes would
   * remove energy; the verbal description pins the correct sign.) */
  function swingTorque(P, s, kE, Mmax) {
    const E = pendEnergy(P, s);
    const sgn = Math.sign(s.phd * Math.cos(s.ph));
    let M = -kE * E * sgn;
    if (Mmax != null && Mmax > 0) M = Math.max(-Mmax, Math.min(Mmax, M));
    return { M, E };
  }

  /* bang-bang energy pump: full torque in the energy-increasing direction */
  function bangTorque(P, s, Mmax) {
    const E = pendEnergy(P, s);
    const M = Mmax * Math.sign(-E * s.phd * Math.cos(s.ph));
    return { M, E };
  }

  /* cascaded dual-PID balance law (main.tex sec. 3.3.2), sign-corrected for
   * the basis convention of the derivation:
   *   M = -(kpPhi*phi + kdPhi*phid + kiPhi*int phi) + kpTheta*th + kdTheta*thd
   * i.e. the arm torque opposes the pendulum's lean (as the LQR does, and as
   * the project notes describe: "the arm darts to catch the pendulum"). */
  function pidTorque(P, s, pid, iState, dtC) {
    const phiW = wrapPi(s.ph);
    const thW = wrapPi(s.th);
    iState.iPhi += phiW * dtC;
    const clamp = Math.abs(pid.maxI) || 0.5;
    iState.iPhi = Math.max(-clamp, Math.min(clamp, iState.iPhi));
    return -(pid.kpPhi * phiW + pid.kdPhi * s.phd + pid.kiPhi * iState.iPhi) +
            pid.kpTheta * thW + pid.kdTheta * s.thd;
  }

  /* full finite-state controller with hysteresis.
   * States: SWING (energy pump) until the pendulum is near upright and slow
   * (and the arm is not spinning too fast), then BALANCE. BALANCE is exited
   * only when the pendulum is clearly lost (|phi| > ctrl.lost), which avoids
   * swing/balance chattering during an aggressive catch.
   * In BALANCE the hand-off uses pendulum-first gains (Kp) while
   * |phi| > phiSafe, then the full gains K (which regulate theta back to 0).
   * ctrl fields:
   *   mode: "lqr" | "pid"
   *   K, Kp: LQR gain rows (Kp may be null -> same as K)
   *   pid: { kpPhi, kdPhi, kiPhi, kpTheta, kdTheta, maxI }
   *   pump: "bang" | "prop" ; kE (prop), kArm (arm damping in swing),
   *   capture, capVel, capArmVel, phiSafe, lost, Mmax
   * Returns { M, mode } where mode is "swing" | "balance". */
  function controller(P, s, ctrl, cstate, dtC) {
    const phiW = wrapPi(s.ph);
    const thW = wrapPi(s.th);
    const aPhi = Math.abs(phiW);
    let mode, M;
    const balancing = cstate && cstate.balance;
    if (balancing && aPhi <= (ctrl.lost != null ? ctrl.lost : 0.55)) {
      mode = "balance";
    } else if (aPhi <= (ctrl.capture != null ? ctrl.capture : 0.3) &&
               Math.abs(s.phd) <= (ctrl.capVel != null ? ctrl.capVel : 99) &&
               Math.abs(s.thd) <= (ctrl.capArmVel != null ? ctrl.capArmVel : 99)) {
      mode = "balance";
    } else {
      mode = "swing";
    }
    if (cstate) cstate.balance = mode === "balance";
    if (mode === "balance") {
      if (ctrl.mode === "pid") {
        M = pidTorque(P, s, ctrl.pid, cstate.pidI, dtC);
        if (aPhi > (ctrl.phiSafe != null ? ctrl.phiSafe : 0.12)) {
          // pendulum-first hand-off: drop arm terms while catching
          const pid2 = ctrl.pid;
          M = -(pid2.kpPhi * phiW + pid2.kdPhi * s.phd + pid2.kiPhi * cstate.pidI.iPhi);
        }
      } else {
        const K = (ctrl.Kp && aPhi > (ctrl.phiSafe != null ? ctrl.phiSafe : 0.12)) ? ctrl.Kp : ctrl.K;
        M = -(K[0] * phiW + K[1] * thW + K[2] * s.phd + K[3] * s.thd);
      }
      if (ctrl.Mmax > 0) M = Math.max(-ctrl.Mmax, Math.min(ctrl.Mmax, M));
    } else {
      if (ctrl.pump === "bang") {
        M = bangTorque(P, s, ctrl.Mmax || 0.5).M;
        if (ctrl.kArm) M -= ctrl.kArm * s.thd;
        if (ctrl.Mmax > 0) M = Math.max(-ctrl.Mmax, Math.min(ctrl.Mmax, M));
      } else {
        const sw = swingTorque(P, s, ctrl.kE != null ? ctrl.kE : 2, ctrl.Mmax);
        M = sw.M;
        if (ctrl.kArm) M -= ctrl.kArm * s.thd;
        if (ctrl.Mmax > 0) M = Math.max(-ctrl.Mmax, Math.min(ctrl.Mmax, M));
      }
    }
    return { M, mode };
  }

  /* measurement model: add Gaussian noise to encoders, low-pass the velocities */
  function sensor(s, meas, noise, alpha) {
    if (!noise || !noise.on || noise.level <= 0) return { ...s };
    const n = (sig) => (Math.random() * 2 - 1) * sig;
    return {
      th: s.th + n(noise.level * 0.5),
      ph: s.ph + n(noise.level * 0.5),
      thd: lowpass(meas.thdFilt, s.thd + n(noise.level * 2.5), alpha),
      phd: lowpass(meas.phdFilt, s.phd + n(noise.level * 2.5), alpha),
    };
  }

  /* 1st-order low-pass filter helper */
  function lowpass(prev, raw, alpha) {
    return alpha * raw + (1 - alpha) * prev;
  }

  return {
    G,
    deriveParams,
    wrapPi,
    accel,
    accelLagrange,
    stepRK4,
    energy,
    pendEnergy,
    linStateSpace,
    discretizeZOH,
    lqrDiscrete,
    lqrGains,
    swingTorque,
    bangTorque,
    pidTorque,
    controller,
    sensor,
    lowpass,
    expm,
  };
});
