/* ============================================================================
 * scene3d.js — Three.js scene factory for the Furuta pendulum.
 * Builds the physical rig (base, standoffs, motor, arm with yoke joint,
 * pendulum), the basis arrows {E}, {e'}, {e}, angle arcs, gravity / velocity /
 * torque vectors, a tip trail, and a ground grid. Camera: CAD-style
 * orbit (left-drag rotate, right-drag pan, wheel zoom) via OrbitControls.
 *
 * Coordinate mapping (right-handed, Y up):
 *   E1 = +X,  E2 = -Z,  E3 = +Y
 *   e'1 = arm axis = (cos th, 0, -sin th)
 *   e'2 = (-sin th, 0, -cos th),  e'3 = +Y
 *   e3 (pendulum axis) = (sin ph sin th, cos ph, sin ph cos th)
 *   armGroup.rotation.y = th ; pendGroup.rotation.x = ph
 * ========================================================================== */
(function (root) {
  "use strict";

  const COL = {
    paper: 0xF8F5EF,
    paperCard: 0xFDFBF6,
    ink: 0x22303C,
    inkSoft: 0x5A6B78,
    inkFaint: 0x93A1AC,
    hairline: 0xD8D2C4,
    gridMinor: 0xE4E0D5,
    gridMajor: 0xCFC8B8,
    engineBlue: 0x33475B,
    engineBlueDeep: 0x26374A,
    signalRed: 0xC2452D,
    brown: 0x8A6D3B,
    green: 0x2F9E6E,
    orange: 0xE08A3C,
    amber: 0xE9B949,
    gravity: 0x7A8894,
    motorGray: 0x4A5863,
    shaftGray: 0x93A1AC,
  };

  /* ---------- canvas-text sprite labels ---------- */
  function makeLabel(text, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 96);
    ctx.font = "600 44px 'IBM Plex Mono', Inter, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(248,245,239,0.9)";
    ctx.strokeText(text, 128, 48);
    ctx.fillStyle = color || "#22303C";
    ctx.fillText(text, 128, 48);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, sizeAttenuation: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.085, 0.032, 1);
    return sprite;
  }

  /* ---------- basis frame ---------- */
  function makeBasis(prefix, len, color) {
    const g = new THREE.Group();
    const axes = [
      ["x", new THREE.Vector3(1, 0, 0)],
      ["y", new THREE.Vector3(0, 1, 0)],
      ["z", new THREE.Vector3(0, 0, 1)],
    ];
    for (const [axis, dir] of axes) {
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), len, color, len * 0.22, len * 0.13);
      arrow.line.material.linewidth = 1;
      g.add(arrow);
      const lbl = makeLabel(prefix + axis, "#" + color.toString(16).padStart(6, "0"));
      lbl.position.copy(dir.clone().multiplyScalar(len + 0.02));
      g.add(lbl);
    }
    return g;
  }

  /* ---------- kinematics helpers ---------- */
  function tipPos(th, ph, lB, lA) {
    const st = Math.sin(th), ct = Math.cos(th), sp = Math.sin(ph), cp = Math.cos(ph);
    return new THREE.Vector3(lB * ct + lA * sp * st, lA * cp, -lB * st + lA * sp * ct);
  }
  function comPos(th, ph, lB, lA) {
    const st = Math.sin(th), ct = Math.cos(th), sp = Math.sin(ph), cp = Math.cos(ph);
    return new THREE.Vector3(lB * ct + (lA / 2) * sp * st, (lA / 2) * cp, -lB * st + (lA / 2) * sp * ct);
  }
  function armDir(th) {
    return new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
  }

  /* ======================================================================== */
  function create(container, opts) {
    opts = opts || {};
    const autoRotate = !!opts.autoRotate;
    const interactive = opts.interactive !== false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.6;
    controls.enablePan = interactive;
    controls.minDistance = 0.15;
    controls.maxDistance = 4;

    /* ---- lights ---- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(1.4, 2.6, 1.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 8;
    const sc = 1.4;
    sun.shadow.camera.left = -sc; sun.shadow.camera.right = sc;
    sun.shadow.camera.top = sc; sun.shadow.camera.bottom = -sc;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xfff2e0, 0.28);
    fill.position.set(-1.5, 0.6, -1.2);
    scene.add(fill);

    /* ---- ground ---- */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 64),
      new THREE.MeshStandardMaterial({ color: COL.paperCard, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(1.6, 16, COL.gridMajor, COL.gridMinor);
    grid.position.y = 0.0005;
    grid.material.transparent = true;
    grid.material.opacity = 0.85;
    scene.add(grid);
    scene.gridHelper = grid;

    /* ---- static rig ---- */
    function box(w, h, d, color, y) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15 })
      );
      m.position.y = y;
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    function cyl(r, h, color, y) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, h, 24),
        new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2 })
      );
      m.position.y = y;
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    const base = new THREE.Group();
    base.add(box(0.3, 0.028, 0.3, COL.inkSoft, 0.014));          // acrylic base plate
    const standoffs = [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]];
    for (const [x, z] of standoffs) {
      const st = cyl(0.0065, 0.09, COL.engineBlue, 0.028 + 0.045);
      st.position.x = x; st.position.z = z;
      base.add(st);
    }
    base.add(box(0.24, 0.018, 0.24, COL.inkSoft, 0.028 + 0.09)); // mid plate
    const motor = box(0.052, 0.085, 0.052, COL.motorGray, 0.028 + 0.09 + 0.018 + 0.0425);
    base.add(motor);
    const shaft = cyl(0.009, 0.034, COL.shaftGray, 0.028 + 0.09 + 0.018 + 0.085 + 0.017);
    base.add(shaft);
    const shaftCap = cyl(0.014, 0.008, COL.engineBlueDeep, 0.028 + 0.09 + 0.018 + 0.085 + 0.034 + 0.004);
    base.add(shaftCap);
    scene.add(base);

    /* ---- arm + pendulum (rebuilt when params change) ---- */
    const armGroup = new THREE.Group();
    const pendGroup = new THREE.Group();
    armGroup.name = "armGroup";
    pendGroup.name = "pendGroup";
    armGroup.add(pendGroup);
    scene.add(armGroup);
    let armMeshes = [];
    let params = { lA: 0.25, lB: 0.2 };

    function buildRig(lA, lB) {
      for (const m of armMeshes) {
        (m.parent || armGroup).remove(m);
        m.geometry.dispose();
        m.material.dispose();
      }
      armMeshes = [];
      pendGroup.position.x = lB + 0.013;   // pendulum pivots on the yoke axle at the arm tip
      const H = 0.013, W = 0.022;                    // arm cross-section
      const armBar = box(lB, H, W, COL.engineBlue, 0);
      armBar.position.x = lB / 2;
      armMeshes.push(armBar);
      // yoke: two side plates + axle at the tip
      const plate = box(0.026, 0.036, 0.006, COL.engineBlueDeep, 0);
      plate.position.set(lB + 0.013, 0, 0.013);
      armMeshes.push(plate);
      const plate2 = plate.clone();
      plate2.position.z = -0.013;
      armMeshes.push(plate2);
      const axle = cyl(0.0045, 0.036, COL.shaftGray, 0);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(lB + 0.013, 0, 0);
      armMeshes.push(axle);
      // pendulum
      const pH = 0.014, pW = 0.014;
      const pend = box(pH, lA, pW, COL.brown, lA / 2);
      pend.castShadow = true;
      pendGroup.add(pend);
      armMeshes.push(pend);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.006, 20),
        new THREE.MeshStandardMaterial({ color: COL.inkFaint, roughness: 0.4, metalness: 0.3 })
      );
      disc.rotation.x = Math.PI / 2;
      pendGroup.add(disc);
      armMeshes.push(disc);
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 16, 16),
        new THREE.MeshStandardMaterial({ color: COL.signalRed, roughness: 0.35, metalness: 0.1 })
      );
      tip.position.y = lA;
      pendGroup.add(tip);
      armMeshes.push(tip);
    }
    buildRig(params.lA, params.lB);

    /* ---- overlays ---- */
    const overlays = {};

    // fixed basis E at O
    const basisE = makeBasis("E", 0.16, COL.signalRed);
    basisE.position.y = 0.001;
    scene.add(basisE);

    // body basis e' at the joint (attached to arm, at tip)
    const basisEp = makeBasis("e′", 0.13, 0x4A7FB5);
    basisEp.position.x = 0.001; // moved by update
    armGroup.add(basisEp);

    // body basis e at the pendulum COM (attached to pendulum)
    const basisE2 = makeBasis("e", 0.13, 0x4A7FB5);
    basisE2.position.y = 0.001;
    pendGroup.add(basisE2);

    // labels O, S
    const lblO = makeLabel("O", "#22303C");
    lblO.position.set(-0.03, -0.01, 0.03);
    scene.add(lblO);

    // theta arc (red, in horizontal plane at origin)
    const thetaArcMat = new THREE.LineBasicMaterial({ color: COL.signalRed, transparent: true, opacity: 0.9 });
    const thetaArc = new THREE.Line(new THREE.BufferGeometry(), thetaArcMat);
    scene.add(thetaArc);

    // phi arc (red, dashed, in arm local YZ plane at the joint)
    const phiArcMat = new THREE.LineDashedMaterial({ color: COL.signalRed, dashSize: 0.012, gapSize: 0.008, transparent: true, opacity: 0.9 });
    const phiArc = new THREE.Line(new THREE.BufferGeometry(), phiArcMat);
    armGroup.add(phiArc);

    // gravity arrow at pendulum COM
    const gravArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 0.1, COL.gravity, 0.03, 0.018);
    pendGroup.add(gravArrow);
    const lblG = makeLabel("mg", "#7A8894");
    lblG.position.set(0.01, -0.075, 0);
    pendGroup.add(lblG);

    // torque arrow at O (curved arc + head), orange
    const torqueGroup = new THREE.Group();
    const torqueArcMat = new THREE.LineBasicMaterial({ color: COL.orange, transparent: true, opacity: 0.95 });
    const torqueArc = new THREE.Line(new THREE.BufferGeometry(), torqueArcMat);
    torqueGroup.add(torqueArc);
    const torqueHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.008, 0.02, 10),
      new THREE.MeshBasicMaterial({ color: COL.orange })
    );
    torqueGroup.add(torqueHead);
    torqueGroup.position.y = 0.001;
    scene.add(torqueGroup);

    // velocity arrow at tip (world frame, computed per frame)
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.05, COL.green, 0.03, 0.016);
    scene.add(velArrow);
    const lblV = makeLabel("v", "#2F9E6E");
    scene.add(lblV);

    // tip trail
    const TRAIL_N = 240;
    const trailPos = new Float32Array(TRAIL_N * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
    const trail = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({ color: COL.amber, transparent: true, opacity: 0.55 })
    );
    trail.frustumCulled = false;
    scene.add(trail);

    const overlayFlags = {
      bases: true, arcs: true, gravity: true, velocity: true, torque: true, trail: true, grid: true,
    };
    function applyOverlayFlags() {
      basisE.visible = overlays.bases;
      basisEp.visible = overlays.bases;
      basisE2.visible = overlays.bases;
      thetaArc.visible = overlays.arcs;
      phiArc.visible = overlays.arcs;
      gravArrow.visible = overlays.gravity;
      lblG.visible = overlays.gravity;
      velArrow.visible = overlays.velocity;
      lblV.visible = overlays.velocity;
      torqueGroup.visible = overlays.torque;
      trail.visible = overlays.trail;
      grid.visible = overlays.grid;
    }

    /* ---- state ---- */
    let state = { th: 0, ph: Math.PI, thd: 0, phd: 0 };
    let currentTorque = 0;
    let trailHead = 0;
    let trailCount = 0;
    for (let i = 0; i < TRAIL_N; i++) trailPos[i * 3 + 1] = -999; // init "empty"

    function arcPoints(cx, cy, cz, r, a0, a1, n, plane) {
      const pts = [];
      const steps = Math.max(2, Math.round(n * Math.abs(a1 - a0) / (Math.PI / 2)));
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (a1 - a0) * i / steps;
        if (plane === "xz") pts.push(new THREE.Vector3(cx + r * Math.cos(a), cy, cz - r * Math.sin(a)));
        else if (plane === "yz") pts.push(new THREE.Vector3(cx, cy + r * Math.cos(a), cz + r * Math.sin(a)));
      }
      return pts;
    }

    function updateOverlays() {
      const { th, ph, thd, phd } = state;
      const lB = params.lB, lA = params.lA;
      const r = 0.001;
      const vTip = tipPos(th + r, ph, lB, lA).sub(tipPos(th - r, ph, lB, lA)).multiplyScalar(1 / (2 * r));
      const vTipOld = tipPos(th, ph + r, lB, lA).sub(tipPos(th, ph - r, lB, lA)).multiplyScalar(1 / (2 * r));
      vTip.add(vTipOld); // total velocity from both angles
      const speed = vTip.length();

      // theta arc: from E1 to current arm dir, radius slightly beyond arm
      if (overlays.arcs) {
        const rA = lB + 0.035;
        const pts = arcPoints(0, 0.001, 0, rA, 0, th, 32, "xz");
        thetaArc.geometry.setFromPoints(pts);
        // phi arc at joint in arm-local YZ plane: from +Y to current e3 direction (ph measured from +Y toward +Z in local)
        const rP = 0.075;
        const pPts = arcPoints(lB + 0.013, 0, 0, rP, 0, ph, 24, "yz");
        phiArc.geometry.setFromPoints(pPts);
        phiArc.computeLineDistances();
        const phiLbl = armGroup.getObjectByName && null;
      }
      // basis positions
      basisEp.position.set(lB + 0.02, 0, 0);
      basisE2.position.y = lA / 2;
      // gravity arrow length proportional to mA g
      const gLen = Math.min(0.16, 0.05 + params.mA * params.g * 0.08);
      gravArrow.setLength(gLen, gLen * 0.25, gLen * 0.14);
      gravArrow.position.y = lA / 2 - 0.012;
      lblG.position.set(0.012, lA / 2 - gLen - 0.015, 0);
      // velocity arrow
      if (overlays.velocity) {
        const vl = Math.min(0.28, 0.03 + speed * 0.035);
        if (speed > 0.02) {
          velArrow.setDirection(vTip.clone().normalize());
          velArrow.setLength(vl, vl * 0.25, vl * 0.14);
          velArrow.position.copy(tipPos(th, ph, lB, lA));
          lblV.position.copy(tipPos(th, ph, lB, lA).clone().add(vTip.clone().normalize().multiplyScalar(vl + 0.025)));
          velArrow.visible = true; lblV.visible = true;
        } else {
          velArrow.visible = false; lblV.visible = false;
        }
      }
      // torque arrow at O
      if (overlays.torque) {
        const M = currentTorque;
        const Mmax = 0.5;
        const amp = Math.min(1, Math.abs(M) / (Mmax || 0.5));
        if (Math.abs(M) > 0.002) {
          const a0 = th - Math.sign(M) * 0.12, a1 = th + Math.sign(M) * (0.14 + 0.3 * amp);
          const tPts = arcPoints(0, 0.003, 0, 0.05, a0, a1, 12, "xz");
          torqueArc.geometry.setFromPoints(tPts);
          const dir = new THREE.Vector3(-Math.sin(a1), 0, -Math.cos(a1)).normalize();
          torqueHead.position.set(0.05 * Math.cos(a1), 0.003, -0.05 * Math.sin(a1));
          torqueHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          torqueGroup.visible = true;
        } else {
          torqueGroup.visible = false;
        }
      }
      // trail
      if (overlays.trail) {
        const p = tipPos(th, ph, lB, lA);
        trailPos[trailHead * 3] = p.x;
        trailPos[trailHead * 3 + 1] = p.y;
        trailPos[trailHead * 3 + 2] = p.z;
        trailHead = (trailHead + 1) % TRAIL_N;
        if (trailCount < TRAIL_N) trailCount++;
        // reorder buffer so oldest point is first (ring buffer -> contiguous)
        const arr = trailGeo.attributes.position.array;
        for (let i = 0; i < trailCount; i++) {
          const idx = (trailHead - trailCount + i + TRAIL_N) % TRAIL_N;
          arr[i * 3] = trailPos[idx * 3];
          arr[i * 3 + 1] = trailPos[idx * 3 + 1];
          arr[i * 3 + 2] = trailPos[idx * 3 + 2];
        }
        trailGeo.setDrawRange(0, trailCount);
        trailGeo.attributes.position.needsUpdate = true;
      }
      // grid size follows scale
      const span = Math.max(lB + lA, 0.4);
      grid.scale.setScalar(Math.max(1, span / 0.5));
    }

    /* ---- animation loop ---- */
    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    function resize() {
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      controls.update();
    }

    /* ---- public API ---- */
    const api = {
      setState(nextState, torque) {
        state = nextState;
        currentTorque = torque || 0;
        armGroup.rotation.y = state.th;
        pendGroup.rotation.x = state.ph;
        updateOverlays();
      },
      setParams(p) {
        params = { lA: p.lA, lB: p.lB };
        buildRig(p.lA, p.lB);
        const dist = 1.25 * (p.lA + p.lB + 0.3);
        if (camera.position.length() < dist * 0.6) {
          // zoom out to fit
          camera.position.copy(new THREE.Vector3(0.62, 0.45, 0.8).normalize().multiplyScalar(dist));
        }
        controls.minDistance = 0.2;
        controls.maxDistance = dist * 3;
        updateOverlays();
      },
      setOverlays(flags) {
        Object.assign(overlays, flags);
        applyOverlayFlags();
      },
      setView(name) {
        const dist = camera.position.length() || 1;
        const t = new THREE.Vector3(0, 0.16, 0);
        const pos = {
          iso: new THREE.Vector3(0.62, 0.5, 0.8),
          top: new THREE.Vector3(0, 1, 0.001),
          front: new THREE.Vector3(0, 0.35, 1),
          side: new THREE.Vector3(1, 0.35, 0),
        }[name] || new THREE.Vector3(0.62, 0.5, 0.8);
        camera.position.copy(pos.normalize().multiplyScalar(dist).add(t));
        controls.target.copy(t);
        controls.update();
      },
      setAutoRotate(on) {
        controls.autoRotate = on;
      },
      resize,
      animate,
      renderer,
      camera,
      controls,
      scene,
      container,
      get state() { return state; },
      dispose() {
        cancelAnimationFrame(raf);
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      },
    };

    /* initial framing */
    camera.position.set(0.55, 0.42, 0.75).multiplyScalar(1.15);
    controls.target.set(0, 0.16, 0);
    controls.update();
    applyOverlayFlags();
    resize();
    animate();
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(resize).observe(container);
    } else {
      window.addEventListener("resize", resize);
    }

    root.__furutaScenes = root.__furutaScenes || [];
    root.__furutaScenes.push(api);

    return api;
  }

  root.FurutaScene3D = { create, tipPos, comPos, armDir };
})(typeof self !== "undefined" ? self : this);
