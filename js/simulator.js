/* ============================================================================
 * simulator.js — the interactive simulator app.
 * Physics at 1 kHz (RK4), controller at 200 Hz, render at display rate.
 * ========================================================================== */
(function (root) {
  "use strict";
  const P = FurutaPhysics;
  const S3D = root.FurutaScene3D;

  const DT = 0.001;        // physics step
  const DTC = 0.005;       // control step (200 Hz)
  const CTL_EVERY = Math.round(DTC / DT);

  /* ---------------- configuration ---------------- */
  const params = { lA: 0.25, lB: 0.20, mA: 0.08, mB: 0.12, g: 9.81 };
  let D = P.deriveParams(params);

  const ctrl = {
    mode: "lqr",
    Q: [[300, 0, 0, 0], [0, 25, 0, 0], [0, 0, 5, 0], [0, 0, 0, 1.5]],
    R: 0.012,
    Qp: [[500, 0, 0, 0], [0, 1, 0, 0], [0, 0, 8, 0], [0, 0, 0, 0.1]],
    Rp: 0.008,
    pid: { kpPhi: 1.1, kdPhi: 0.11, kiPhi: 0.10, kpTheta: 0.04, kdTheta: 0.02, maxI: 0.4 },
    pump: "bang",
    kE: 4.0,
    kArm: 0.03,
    Mmax: 0.5,
    capture: 0.30,
    capVel: 2.5,
    capArmVel: 3.0,
    phiSafe: 0.12,
    lost: 0.55,
    noise: { on: false, level: 0.01 },
  };

  function recomputeGains() {
    const full = P.lqrGains(D, DTC, ctrl.Q, ctrl.R);
    const pf = P.lqrGains(D, DTC, ctrl.Qp, ctrl.Rp);
    ctrl.K = full.K;
    ctrl.Kp = pf.K;
    const g = document.getElementById("gains-readout");
    if (g) g.innerHTML = ctrl.K.map((v) => "<span>" + fmt(v, 3) + "</span>").join("");
  }

  /* ---------------- simulation state ---------------- */
  const sim = {
    running: false,
    speed: 1,
    time: 0,
    state: null,
    torque: 0,
    ctrlMode: "pause",
    startMode: "upright",
    manualDeg: 120,
    kickStrength: 0.9,
  };
  let cstate = { pidI: { iPhi: 0 } };
  let meas = { thdFilt: 0, phdFilt: 0 };
  let stepCount = 0;

  function makeStartState() {
    if (sim.startMode === "hanging") return { th: 0, ph: Math.PI + 0.02, thd: 0, phd: 0.1 };
    if (sim.startMode === "upright") return { th: 0, ph: 0.05, thd: 0, phd: 0 };
    const ph = (sim.manualDeg / 180) * Math.PI; // 0 deg = upright, 180 = hanging
    return { th: 0, ph, thd: 0, phd: 0 };
  }

  function reset() {
    sim.state = makeStartState();
    sim.time = 0;
    sim.torque = 0;
    sim.ctrlMode = "swing";
    stepCount = 0;
    cstate = { pidI: { iPhi: 0 } };
    meas = { thdFilt: 0, phdFilt: 0 };
    charts.forEach((c) => c.clear());
  }

  /* ---------------- charts ---------------- */
  class Chart {
    constructor(canvas, series, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.series = series; // [{color, label}]
      this.window = opts.window || 12;
      this.yPad = opts.yPad || 0.25;
      this.n = Math.ceil(this.window / 0.02);
      this.times = new Float32Array(this.n);
      this.vals = series.map(() => new Float32Array(this.n));
      this.head = 0;
      this.count = 0;
      this.yMin = opts.yMin != null ? opts.yMin : Infinity;
      this.yMax = opts.yMax != null ? opts.yMax : -Infinity;
      this.fixed = opts.fixed || null; // [min, max]
      this.sampleEvery = opts.sampleEvery || 1;
      this.sampleAcc = 0;
      this._time = 0;
    }
    clear() {
      this.head = 0; this.count = 0;
      this.yMin = this.fixed ? this.fixed[0] : Infinity;
      this.yMax = this.fixed ? this.fixed[1] : -Infinity;
    }
    push(t, values) {
      this._time = t;
      if (++this.sampleAcc < this.sampleEvery) return;
      this.sampleAcc = 0;
      this.times[this.head] = t;
      for (let i = 0; i < values.length; i++) {
        this.vals[i][this.head] = values[i];
        if (!this.fixed) {
          if (values[i] < this.yMin) this.yMin = values[i];
          if (values[i] > this.yMax) this.yMax = values[i];
        }
      }
      this.head = (this.head + 1) % this.n;
      if (this.count < this.n) this.count++;
    }
    draw() {
      const cv = this.canvas, ctx = this.ctx;
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const padL = 34, padR = 8, padT = 8, padB = 16;
      const pw = w - padL - padR, ph = h - padT - padB;
      // y range
      let yMin, yMax;
      if (this.fixed) { yMin = this.fixed[0]; yMax = this.fixed[1]; }
      else {
        if (!isFinite(this.yMin) || !isFinite(this.yMax)) { yMin = -1; yMax = 1; }
        else {
          const pad = Math.max(0.12, (this.yMax - this.yMin) * this.yPad);
          yMin = this.yMin - pad; yMax = this.yMax + pad;
        }
        if (yMax - yMin < 1e-6) { yMax = yMin + 1; }
      }
      const X = (t) => padL + (t - (this._time - this.window)) / this.window * pw;
      const Y = (v) => padT + (yMax - v) / (yMax - yMin) * ph;
      // grid
      ctx.strokeStyle = "#E4E0D5";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const yy = padT + ph * i / 4;
        ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy);
      }
      for (let i = 0; i <= 6; i++) {
        const xx = padL + pw * i / 6;
        ctx.moveTo(xx, padT); ctx.lineTo(xx, padT + ph);
      }
      ctx.stroke();
      // y = 0 line
      if (0 > yMin && 0 < yMax) {
        ctx.strokeStyle = "#CFC8B8";
        ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(w - padR, Y(0)); ctx.stroke();
      }
      // labels
      ctx.fillStyle = "#93A1AC";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(fmt(yMax, 2), padL - 4, padT + 8);
      ctx.fillText(fmt(0, 2), padL - 4, Y(0) + 3);
      ctx.fillText(fmt(yMin, 2), padL - 4, padT + ph);
      ctx.textAlign = "left";
      ctx.fillText(fmt(this._time - this.window, 1) + "s", padL, h - 3);
      ctx.fillText(fmt(this._time, 1) + "s", w - padR - 34, h - 3);
      // series
      for (let s = 0; s < this.series.length; s++) {
        ctx.strokeStyle = this.series[s].color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        let started = false;
        const n = this.count;
        for (let i = 0; i < n; i++) {
          const idx = (this.head - n + i + this.n * 2) % this.n;
          const t = this.times[idx];
          const v = this.vals[s][idx];
          if (t < this._time - this.window) continue;
          if (!started) { ctx.moveTo(X(t), Y(v)); started = true; }
          else ctx.lineTo(X(t), Y(v));
        }
        ctx.stroke();
      }
    }
  }

  const charts = [];
  function initCharts() {
    const angles = new Chart(document.getElementById("chart-angles"),
      [{ color: "#33475B" }, { color: "#C2452D" }],
      { window: 12, fixed: [-3.6, 3.6] });
    const torque = new Chart(document.getElementById("chart-torque"),
      [{ color: "#E08A3C" }], { window: 12 });
    const energy = new Chart(document.getElementById("chart-energy"),
      [{ color: "#2F9E6E" }], { window: 12, yPad: 0.2 });
    charts.push(angles, torque, energy);
  }

  /* ---------------- loop ---------------- */
  let scene = null;
  let lastFrame = performance.now();
  let acc = 0;
  let sampleAcc2 = 0;
  let noiseLvl = 0.01;

  function frame(now) {
    requestAnimationFrame(frame);
    const dReal = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (sim.running) {
      acc += dReal * sim.speed;
      let steps = 0;
      while (acc >= DT && steps < 1000) {
        if (stepCount % CTL_EVERY === 0) {
          const useS = P.sensor(sim.state, meas, ctrl.noise, 0.2);
          meas.thdFilt = useS.thd;
          meas.phdFilt = useS.phd;
          const r = P.controller(D, useS, ctrl, cstate, DTC);
          sim.torque = r.M;
          sim.ctrlMode = r.mode;
        }
        sim.state = P.stepRK4(D, sim.state, sim.torque, DT);
        stepCount++;
        sim.time += DT;
        acc -= DT;
        steps++;
        sampleAcc2 += DT;
        if (sampleAcc2 >= 0.02) {
          sampleAcc2 = 0;
          const E = P.pendEnergy(D, sim.state);
          charts[0].push(sim.time, [P.wrapPi(sim.state.ph), sim.state.th]);
          charts[1].push(sim.time, [sim.torque]);
          charts[2].push(sim.time, [E]);
        }
      }
      if (acc > 2) acc = 0; // drop backlog only after a long stall (hidden tab)
    }
    if (scene) {
      scene.setState(sim.state, sim.torque);
      scene.setAutoRotate(autorotateFlag);
    }
    updateTelemetry();
    charts.forEach((c) => c.draw());
  }

  /* ---------------- UI ---------------- */
  const $ = (id) => document.getElementById(id);
  let autorotateFlag = false;

  function fmt(v, d) {
    if (!isFinite(v)) return "—";
    return v.toFixed(d);
  }

  function updateTelemetry() {
    const s = sim.state;
    if (!s) return;
    $("tel-th").textContent = fmt(s.th, 3);
    $("tel-ph").textContent = fmt(P.wrapPi(s.ph), 3);
    $("tel-thd").textContent = fmt(s.thd, 3);
    $("tel-phd").textContent = fmt(s.phd, 3);
    $("tel-M").textContent = fmt(sim.torque, 3);
    $("tel-E").textContent = fmt(P.pendEnergy(D, s), 3);
    $("tel-t").textContent = fmt(sim.time, 2);
    const badge = $("state-badge");
    const mode = !sim.running ? "PAUSED" : sim.ctrlMode === "balance" ? "BALANCE" : "SWING-UP";
    $("tel-mode").textContent = mode;
    badge.textContent = mode;
    badge.className = "state-badge" +
      (!sim.running ? "" : sim.ctrlMode === "balance" ? " balance" : " swing");
    $("sim-time").textContent = "t = " + sim.time.toFixed(2) + " s";
  }

  function bindUI() {
    const playBtn = $("btn-play");
    playBtn.addEventListener("click", togglePlay);
    $("btn-reset").addEventListener("click", reset);
    $("btn-kick").addEventListener("click", () => { if (sim.state) { sim.state.phd += sim.kickStrength; } });
    $("btn-kick-arm").addEventListener("click", () => { if (sim.state) { sim.state.thd += 1.2; } });
    $("start-mode").addEventListener("change", (e) => {
      sim.startMode = e.target.value;
      $("manual-wrap").style.display = e.target.value === "manual" ? "flex" : "none";
      reset();
    });
    $("manual-phi").addEventListener("input", (e) => {
      sim.manualDeg = +e.target.value;
      $("manual-phi-val").textContent = sim.manualDeg + "°";
    });
    $("sim-speed").addEventListener("input", (e) => {
      sim.speed = +e.target.value;
      $("sim-speed-val").textContent = sim.speed.toFixed(2) + "×";
    });

    // params
    bindSlider("p-lA", "v-lA", (v) => v.toFixed(2) + " m", (v) => { params.lA = v; onParams(); });
    bindSlider("p-lB", "v-lB", (v) => v.toFixed(2) + " m", (v) => { params.lB = v; onParams(); });
    bindSlider("p-mA", "v-mA", (v) => v.toFixed(3) + " kg", (v) => { params.mA = v; onParams(); });
    bindSlider("p-mB", "v-mB", (v) => v.toFixed(3) + " kg", (v) => { params.mB = v; onParams(); });

    // LQR weights
    bindSlider("q-phi", "v-qphi", (v) => String(Math.round(v)), (v) => { ctrl.Q[0][0] = v; recomputeGains(); });
    bindSlider("q-theta", "v-qtheta", (v) => String(Math.round(v)), (v) => { ctrl.Q[1][1] = v; recomputeGains(); });
    bindSlider("q-dphi", "v-qdphi", (v) => String(Math.round(v)), (v) => { ctrl.Q[2][2] = v; recomputeGains(); });
    bindSlider("q-dtheta", "v-qdtheta", (v) => v.toFixed(1), (v) => { ctrl.Q[3][3] = v; recomputeGains(); });
    bindSlider("q-r", "v-qr", (v) => v.toFixed(3), (v) => { ctrl.R = v; recomputeGains(); });

    // PID gains
    bindSlider("pid-kpphi", "v-pidkpphi", (v) => v.toFixed(2), (v) => { ctrl.pid.kpPhi = v; });
    bindSlider("pid-kdphi", "v-pidkdphi", (v) => v.toFixed(3), (v) => { ctrl.pid.kdPhi = v; });
    bindSlider("pid-kiphi", "v-pidkiphi", (v) => v.toFixed(2), (v) => { ctrl.pid.kiPhi = v; });
    bindSlider("pid-kptheta", "v-pidkptheta", (v) => v.toFixed(3), (v) => { ctrl.pid.kpTheta = v; });
    bindSlider("pid-kdtheta", "v-pidkdtheta", (v) => v.toFixed(3), (v) => { ctrl.pid.kdTheta = v; });

    // swing-up
    bindSlider("p-kE", "v-kE", (v) => v.toFixed(1), (v) => { ctrl.kE = v; });
    bindSlider("p-kArm", "v-kArm", (v) => v.toFixed(3), (v) => { ctrl.kArm = v; });
    bindSlider("p-Mmax", "v-Mmax", (v) => v.toFixed(2) + " N·m", (v) => { ctrl.Mmax = v; });
    bindSlider("p-capture", "v-capture", (v) => v.toFixed(2) + " rad", (v) => { ctrl.capture = v; });
    bindSlider("p-noise", "v-noise", (v) => v.toFixed(3) + " rad", (v) => { ctrl.noise.level = v; });

    // controller mode
    document.querySelectorAll("#ctrl-mode .seg-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll("#ctrl-mode .seg-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        ctrl.mode = b.dataset.mode;
        $("lqr-controls").style.display = ctrl.mode === "lqr" ? "block" : "none";
        $("pid-controls").style.display = ctrl.mode === "pid" ? "block" : "none";
      });
    });
    // pump mode
    document.querySelectorAll("#pump-mode .seg-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll("#pump-mode .seg-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        ctrl.pump = b.dataset.pump;
        $("kE-row").style.opacity = ctrl.pump === "prop" ? 1 : 0.45;
      });
    });
    $("noise-toggle").addEventListener("change", (e) => { ctrl.noise.on = e.target.checked; });
    $("v-cam").addEventListener("change", (e) => { autorotateFlag = e.target.checked; $("view-autorotate").checked = e.target.checked; });
    $("view-autorotate").addEventListener("change", (e) => { autorotateFlag = e.target.checked; $("v-cam").checked = e.target.checked; });

    // overlays
    const overlayMap = [
      ["v-bases", "bases"], ["v-arcs", "arcs"], ["v-gravity", "gravity"],
      ["v-velocity", "velocity"], ["v-torque", "torque"], ["v-trail", "trail"], ["v-grid", "grid"],
    ];
    overlayMap.forEach(([id, key]) => {
      $(id).addEventListener("change", (e) => {
        const flags = {}; flags[key] = e.target.checked;
        scene && scene.setOverlays(flags);
      });
    });

    // view presets (both HUD and panel)
    const setView = (name) => scene && scene.setView(name);
    document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    document.querySelectorAll(".view-buttons [data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

    // tabs
    document.querySelectorAll(".sim-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".sim-tab").forEach((t) => {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        document.querySelectorAll(".sim-tabpane").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        $(tab.dataset.tab).classList.add("active");
      });
    });

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.key === "k" || e.key === "K") { if (sim.state) sim.state.phd += sim.kickStrength; }
      else if (e.key === "r" || e.key === "R") reset();
    });

    // play/pause icon
    function updateIcon() {
      document.getElementById("ico-play").style.display = sim.running ? "none" : "block";
      document.getElementById("ico-pause").style.display = sim.running ? "block" : "none";
    }
    updatePlayIcon = updateIcon;
    window.__setPlayIcon = updateIcon;
  }

  function togglePlay() {
    sim.running = !sim.running;
    lastFrame = performance.now();
    updatePlayIcon();
    updateTelemetry();
  }
  let updatePlayIcon = () => {};

  function bindSlider(id, valId, fmtVal, fn) {
    const el = $(id), vEl = $(valId);
    if (!el || !vEl) return;
    const apply = () => { const v = +el.value; vEl.textContent = fmtVal(v); fn(v); };
    el.addEventListener("input", apply);
    apply();
  }

  function onParams() {
    D = P.deriveParams(params);
    recomputeGains();
    if (scene) scene.setParams(params);
    updateDerived();
  }

  function updateDerived() {
    $("derived-readout").innerHTML =
      "<span>J<sub>θ</sub> = " + D.Jt.toFixed(4) + "</span>" +
      "<span>J<sub>φ</sub> = " + D.Jp.toFixed(4) + "</span>" +
      "<span>B = " + D.Bc.toFixed(4) + "</span>" +
      "<span>L = " + D.L.toFixed(4) + "</span>";
  }

  /* ---------------- boot ---------------- */
  function init() {
    initCharts();
    bindUI();
    recomputeGains();
    updateDerived();
    reset();

    const viewport = $("sim-viewport");
    try {
      scene = S3D.create(viewport, { interactive: true });
      scene.setOverlays({ bases: true, arcs: true, gravity: true, velocity: true, torque: true, trail: true, grid: true });
      scene.setParams(params);
    } catch (err) {
      console.error("WebGL init failed:", err);
      viewport.innerHTML = '<div class="fig-loading mono">WebGL unavailable in this browser — the 3D scene could not start.<br>Physics still runs: ' + err.message + "</div>";
    }

    lastFrame = performance.now();
    requestAnimationFrame(frame);

    // testing hook
    root.__furutaSim = {
      get telemetry() {
        return {
          t: sim.time, th: sim.state.th, ph: P.wrapPi(sim.state.ph),
          thd: sim.state.thd, phd: sim.state.phd, M: sim.torque,
          E: P.pendEnergy(D, sim.state), mode: sim.ctrlMode, running: sim.running,
        };
      },
      start: () => { sim.running = true; updatePlayIcon(); },
      pause: togglePlay,
      reset,
      kick: () => { if (sim.state) sim.state.phd += sim.kickStrength; },
      setStartMode: (m) => { sim.startMode = m; $("start-mode").value = m; reset(); },
      get gains() { return ctrl.K; },
      setSpeed: (v) => { sim.speed = v; $("sim-speed").value = v; $("sim-speed-val").textContent = v.toFixed(2) + "×"; },
      setNoise: (on, lvl) => { ctrl.noise.on = on; if (lvl != null) { ctrl.noise.level = lvl; $("p-noise").value = lvl; } },
      setKick: (v) => { sim.kickStrength = v; },
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof self !== "undefined" ? self : this);
