/* Visual & kinematic probes: fonts, canvas pixels, renderer-scene consistency.
 *
 * Multi-page: the hero scene lives on index.html, the system figure on
 * system.html, and the simulator (charts, orbit, presets) on simulator.html —
 * so the probes navigate between pages instead of assuming one long document.
 */
"use strict";
const puppeteer = require("puppeteer-core");

const SITE = process.env.SITE_URL || "http://127.0.0.1:8123/";
const BASE = SITE.replace(/[^/]*$/, "");
const url = (p) => BASE + p;
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";

let passed = 0, failed = 0;
function ok(cond, name, extra) {
  if (cond) { passed++; console.log("  \u2713 " + name); }
  else { failed++; console.log("  \u2717 " + name + (extra ? "  -> " + JSON.stringify(extra) : "")); }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    defaultViewport: { width: 1680, height: 1050 },
  });
  const page = await browser.newPage();

  /* three.js draw stats for whatever scenes the current page created */
  const sceneStats = () => page.evaluate(() => {
    const stats = {};
    for (const s of window.__furutaScenes || []) {
      stats[s.container.id] = {
        triangles: s.renderer.info.render.triangles,
        calls: s.renderer.info.render.calls,
      };
    }
    return stats;
  });

  /* ================= index.html: fonts + design tokens ================= */
  await page.goto(url("index.html"), { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2500));

  console.log("\n[1] Web fonts loaded (vendored, offline-capable)");
  const fonts = await page.evaluate(() => ({
    inter: document.fonts.check('400 16px "Inter"'),
    fraunces: document.fonts.check('600 16px "Fraunces"'),
    plex: document.fonts.check('400 16px "IBM Plex Mono"'),
    caveat: document.fonts.check('600 16px "Caveat"'),
  }));
  ok(fonts.inter, "Inter loaded");
  ok(fonts.fraunces, "Fraunces loaded");
  ok(fonts.plex, "IBM Plex Mono loaded");
  ok(fonts.caveat, "Caveat loaded");

  console.log("\n[2] Fonts served from local repo (no Google CDN dependency)");
  const fontSrcs = await page.evaluate(() => {
    const rules = [];
    for (const sheet of document.styleSheets) {
      try { for (const r of sheet.cssRules) if (r.cssText && /src:/.test(r.cssText)) rules.push(r.cssText); } catch (e) {}
    }
    return rules;
  });
  ok(fontSrcs.length > 20 && fontSrcs.every((s) => /fonts\/[A-Za-z0-9_-]+\.woff2/.test(s)) && !fontSrcs.some((s) => /https?:\/\//.test(s)),
    "font URLs all local (no http)", { count: fontSrcs.length, sample: fontSrcs[0].slice(0, 80) });

  console.log("\n[3] Paper design tokens applied");
  const styles = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const hero = getComputedStyle(document.querySelector(".hero"));
    return {
      bodyBg: body.backgroundColor,
      bodyFont: body.fontFamily.slice(0, 40),
      heroBg: hero.backgroundImage.slice(0, 60),
    };
  });
  ok(styles.bodyBg === "rgb(248, 245, 239)", "body background is paper #F8F5EF", styles.bodyBg);
  ok(/linear-gradient/.test(styles.heroBg), "hero uses grid-paper gradients");
  ok(/Fraunces/.test(styles.bodyFont) || /Inter/.test(styles.bodyFont), "body uses Inter stack", styles.bodyFont);

  const homeScenes = await sceneStats();
  ok(homeScenes["hero-3d"] && homeScenes["hero-3d"].triangles > 50,
    "hero scene draws geometry (" + JSON.stringify(homeScenes["hero-3d"]) + ")");

  /* ================= system.html: the §1 figure ================= */
  await page.goto(url("system.html"), { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2000));

  console.log("\n[4] 3D scenes render geometry (three.js draw stats)");
  const sysScenes = await sceneStats();
  ok(sysScenes["fig-system-3d"] && sysScenes["fig-system-3d"].triangles > 50,
    "system figure draws geometry (" + JSON.stringify(sysScenes["fig-system-3d"]) + ")");

  /* ================= simulator.html: kinematics + charts + camera ================= */
  await page.goto(url("simulator.html"), { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2500));

  const simScenes = await sceneStats();
  ok(simScenes["sim-viewport"] && simScenes["sim-viewport"].triangles > 50,
    "simulator scene draws geometry (" + JSON.stringify(simScenes["sim-viewport"]) + ")");

  console.log("\n[5] Renderer kinematics match the model (upright / hanging / arm angle)");
  const kin = await page.evaluate(() => {
    const scenes = window.__furutaScenes || [];
    const sim = scenes.find((s) => s.container && s.container.id === "sim-viewport");
    if (!sim) return { err: "no sim scene" };
    const out = {};
    const probe = (th, ph) => {
      sim.setState({ th, ph, thd: 0, phd: 0 }, 0);
      const arm = sim.scene.getObjectByName("armGroup");
      const pend = sim.scene.getObjectByName("pendGroup");
      arm.updateMatrixWorld(true);
      pend.updateMatrixWorld(true);
      const armEnd = new THREE.Vector3(0.2, 0, 0).applyMatrix4(arm.matrixWorld); // arm tip at local (lB, 0, 0)
      const tip = new THREE.Vector3(0, 0.25, 0).applyMatrix4(pend.matrixWorld); // tip sphere at local (0, lA, 0)
      const pivot = new THREE.Vector3(0, 0, 0).applyMatrix4(arm.matrixWorld);   // arm/pendulum rotation centre
      return {
        arm: { x: +armEnd.x.toFixed(3), z: +armEnd.z.toFixed(3) },
        tip: { x: +tip.x.toFixed(3), y: +tip.y.toFixed(3), z: +tip.z.toFixed(3) },
        pivot: { x: +pivot.x.toFixed(3), y: +pivot.y.toFixed(3), z: +pivot.z.toFixed(3) },
        tipRelY: +(tip.y - pivot.y).toFixed(3),   // signed pendulum reach about the pivot
      };
    };
    out.upright = probe(0, 0);
    out.hanging = probe(0, Math.PI);
    out.quarter = probe(Math.PI / 2, 0);

    // The arm must be mounted ON the stand, not lying at the ground plane: its
    // pivot has to sit on the stand's vertical axis, at the top of its column.
    const stand = sim.scene.children.find((c) => c.isGroup && c.children.length && c.children.every((k) => k.isMesh));
    if (stand) {
      const b = new THREE.Box3().setFromObject(stand);
      out.standTop = +b.max.y.toFixed(4);
      out.pivotY = +sim.scene.getObjectByName("armGroup").position.y.toFixed(4);
    }

    // Basis frames. {E} is fixed at O, which sits on the motor axis in the plane
    // of the arm (main.tex top view). {e} is attached to the pendulum at its FREE
    // end, not at joint S (main.tex front view draws {e} near the far tip).
    const basesIn = (p) => p.children.filter((c) => c.isGroup && c.children.some((k) => k.isSprite));
    probe(0, Math.PI);   // hold the pendulum hanging so {e} has a well-defined place
    const pend2 = sim.scene.getObjectByName("pendGroup");
    const w = (o) => o.getWorldPosition(new THREE.Vector3()).toArray().map((v) => +v.toFixed(4));
    out.basisE = w(basesIn(sim.scene)[0]);
    out.basisE2 = w(basesIn(pend2)[0]);
    out.pendPivot = w(pend2);

    // Gravity vector: anchored on the pendulum COM but always world-vertical,
    // so it must live in the scene -- NOT in pendGroup, whose phi rotation would
    // swing it (at phi = pi a local (0,-1,0) points straight UP in the world).
    const grav = sim.scene.children.find((c) => c.type === "ArrowHelper" &&
      c.line.material.color.getHex() === 0x7A8894);
    out.gravInScene = !!grav;
    out.gravSamples = [];
    if (grav) {
      for (const ph of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 0.7]) {
        sim.setState({ th: 1.1, ph, thd: 0, phd: 0 }, 0);
        sim.scene.updateMatrixWorld(true);
        const com = new THREE.Vector3(0, 0.125, 0).applyMatrix4(sim.scene.getObjectByName("pendGroup").matrixWorld);
        const dir = new THREE.Vector3(0, 1, 0)
          .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(grav.quaternion)).normalize();
        out.gravSamples.push({
          ph: +ph.toFixed(3),
          dir: [+dir.x.toFixed(5), +dir.y.toFixed(5), +dir.z.toFixed(5)],
          anchorErr: +grav.position.distanceTo(com).toFixed(5),
        });
      }
    }
    return out;
  });
  ok(kin.upright && Math.abs(kin.upright.tipRelY - 0.25) < 0.02 && Math.abs(kin.upright.tip.x - 0.2) < 0.02,
    "upright: tip is lA above the pivot, lB out along the arm", kin.upright && kin.upright.tip);
  ok(kin.hanging && Math.abs(kin.hanging.tipRelY + 0.25) < 0.02,
    "hanging: tip is lA below the pivot", kin.hanging && kin.hanging.tip);
  ok(kin.quarter && Math.abs(kin.quarter.arm.z + 0.2) < 0.02 && Math.abs(kin.quarter.arm.x) < 0.02,
    "theta=90\u00b0: arm end at (0,0,-lB) (model: E2=-Z)", kin.quarter && kin.quarter.arm);
  ok(kin.upright && Math.abs(kin.upright.pivot.x) < 1e-6 && Math.abs(kin.upright.pivot.z) < 1e-6,
    "arm pivot lies on the stand's vertical axis (x = z = 0)", kin.upright && kin.upright.pivot);
  ok(kin.standTop != null && kin.pivotY > kin.standTop && kin.pivotY - kin.standTop < 0.02,
    "arm mounted on top of the stand, not at the ground plane (pivot=" + kin.pivotY + ", standTop=" + kin.standTop + ")");
  ok(kin.hanging && kin.hanging.tip.y > 0,
    "hanging pendulum tip stays above the ground plane (y=" + (kin.hanging && kin.hanging.tip.y) + ")");
  ok(kin.basisE && Math.abs(kin.basisE[0]) < 1e-6 && Math.abs(kin.basisE[2]) < 1e-6 &&
     Math.abs(kin.basisE[1] - kin.pivotY) < 0.03,
    "{E} sits at O on the motor axis, in the arm's plane (y=" + (kin.basisE && kin.basisE[1]) + ", pivot=" + kin.pivotY + ")");
  ok(kin.basisE2 && kin.pendPivot && Math.abs((kin.pendPivot[1] - kin.basisE2[1]) - 0.25) < 0.02,
    "{e} is attached to the pendulum's free end, lA from joint S (offset=" +
    (kin.basisE2 && kin.pendPivot ? (kin.pendPivot[1] - kin.basisE2[1]).toFixed(3) : "-") + ")");
  ok(kin.gravInScene, "gravity arrow lives in the scene, not in the rotating pendGroup");
  ok(kin.gravSamples && kin.gravSamples.length === 5 &&
     kin.gravSamples.every((g) => Math.abs(g.dir[0]) < 1e-4 && Math.abs(g.dir[1] + 1) < 1e-4 && Math.abs(g.dir[2]) < 1e-4),
    "gravity points world-down (0,-1,0) at every pendulum angle",
    kin.gravSamples && kin.gravSamples.map((g) => g.ph + ":" + g.dir.join(",")));
  ok(kin.gravSamples && kin.gravSamples.every((g) => g.anchorErr < 1e-3),
    "gravity is anchored on the pendulum centre of mass (max err=" +
    (kin.gravSamples ? Math.max(...kin.gravSamples.map((g) => g.anchorErr)).toExponential(1) : "-") + ")");

  console.log("\n[6] Charts have colored trace pixels (sim running)");
  await page.evaluate(() => { window.__furutaSim.setStartMode("upright"); window.__furutaSim.reset(); window.__furutaSim.start(); });
  await new Promise((r) => setTimeout(r, 2500));
  const chartPix = await page.evaluate(() => {
    const res = {};
    for (const id of ["chart-angles", "chart-torque", "chart-energy"]) {
      const cv = document.getElementById(id);
      const ctx = cv.getContext("2d");
      const img = ctx.getImageData(0, 0, cv.width, cv.height);
      const d = img.data;
      let colored = 0;
      for (let i = 0; i < d.length; i += 16) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx - mn > 24 && (mx > 60 || mn < 200)) colored++;   // saturated, non-background
      }
      res[id] = colored;
    }
    return res;
  });
  ok(chartPix["chart-angles"] > 20, "angles chart has traces (" + chartPix["chart-angles"] + " sampled px)");
  ok(chartPix["chart-torque"] > 10, "torque chart has traces");
  ok(chartPix["chart-energy"] > 10, "energy chart has traces");

  console.log("\n[7] OrbitControls drag works (camera moves on mouse drag)");
  await page.evaluate(() => {
    const el = document.getElementById("sim-viewport");
    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: y, behavior: "instant" });
  });
  await new Promise((r) => setTimeout(r, 400));
  const camBefore = await page.evaluate(() => {
    const sim = (window.__furutaScenes || []).find((s) => s.container.id === "sim-viewport");
    return { x: sim.camera.position.x, y: sim.camera.position.y, z: sim.camera.position.z,
             d: sim.camera.position.distanceTo(sim.controls.target) };
  });
  const vp = await page.evaluate(() => {
    const r = document.getElementById("sim-viewport").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.move(vp.x + vp.w / 2, vp.y + vp.h / 2);
  await page.mouse.down();
  for (let i = 0; i < 10; i++) { await page.mouse.move(vp.x + vp.w / 2 + i * 8, vp.y + vp.h / 2 + i * 5); await new Promise((r) => setTimeout(r, 30)); }
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 400));
  const camAfter = await page.evaluate(() => {
    const sim = (window.__furutaScenes || []).find((s) => s.container.id === "sim-viewport");
    return { x: sim.camera.position.x, y: sim.camera.position.y, z: sim.camera.position.z };
  });
  const moved = Math.abs(camBefore.x - camAfter.x) + Math.abs(camBefore.y - camAfter.y) + Math.abs(camBefore.z - camAfter.z);
  ok(moved > 0.01, "camera moved after orbit drag (delta=" + moved.toFixed(3) + ")");

  console.log("\n[8] Wheel zoom works");
  await page.mouse.move(vp.x + vp.w / 2, vp.y + vp.h / 2);
  for (let i = 0; i < 5; i++) { await page.mouse.wheel({ deltaY: -120 }); await new Promise((r) => setTimeout(r, 40)); }
  await new Promise((r) => setTimeout(r, 300));
  const camZoom = await page.evaluate(() => {
    const sim = (window.__furutaScenes || []).find((s) => s.container.id === "sim-viewport");
    return sim.camera.position.distanceTo(sim.controls.target);   // orbit distance, not |position|
  });
  const camBeforeDist = camBefore.d;
  ok(camZoom < camBeforeDist - 0.05, "camera zoomed in after wheel (dist " + camBeforeDist.toFixed(2) + " -> " + camZoom.toFixed(2) + ")");

  console.log("\n[9] View presets");
  await page.evaluate(() => { document.querySelector(".view-buttons [data-view=\"top\"]").click(); });
  await new Promise((r) => setTimeout(r, 400));
  const camTop = await page.evaluate(() => {
    const sim = (window.__furutaScenes || []).find((s) => s.container.id === "sim-viewport");
    return { x: sim.camera.position.x, y: sim.camera.position.y, z: sim.camera.position.z };
  });
  ok(Math.abs(camTop.x) < 0.05 && Math.abs(camTop.z) < 0.05 && camTop.y > 0.5,
    "top view looks straight down", camTop);

  await browser.close();
  console.log("\n======================================");
  console.log(`PROBE PASS ${passed}  FAIL ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("probe crashed:", e); process.exit(2); });
